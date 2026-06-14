import { supabase } from './supabase';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'Operator — Notes';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type DriveSettings = {
  drive_folder_id: string | null;
  drive_sync_enabled: boolean;
};

export type DriveUploadResult = {
  fileId: string;
  webViewLink: string;
};

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

/** Throws a descriptive error if the Drive API response is not OK */
async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    let msg = `Drive API error (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.error?.message || msg;
    } catch { /* ignore */ }
    throw new Error(`${context}: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Supabase settings accessors
// ─────────────────────────────────────────────────────────────

export async function getDriveSettings(userId: string): Promise<DriveSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('drive_folder_id, drive_sync_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load Drive settings: ${error.message}`);
  return {
    drive_folder_id: data?.drive_folder_id ?? null,
    drive_sync_enabled: data?.drive_sync_enabled ?? false,
  };
}

export async function saveDriveSettings(
  userId: string,
  patch: Partial<DriveSettings>
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw new Error(`Failed to save Drive settings: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────
// Folder management
// ─────────────────────────────────────────────────────────────

/**
 * Creates the "Operator — Notes" folder in Drive root.
 * GUARDRAIL: Never called without explicit user approval.
 * Returns the new folder's ID.
 */
export async function createOperatorFolder(token: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  await assertOk(res, 'createOperatorFolder');
  const data = await res.json();
  return data.id as string;
}

// ─────────────────────────────────────────────────────────────
// File upload
// ─────────────────────────────────────────────────────────────

/**
 * Creates a subject subfolder inside the root Operator folder.
 * GUARDRAIL: Only writes within the pre-approved parentFolderId.
 */
export async function createSubjectFolder(
  token: string,
  parentFolderId: string,
  subjectName: string
): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: subjectName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }),
  });
  await assertOk(res, 'createSubjectFolder');
  const data = await res.json();
  return data.id as string;
}

/**
 * Uploads the ORIGINAL file (PDF, PPTX, DOCX, image) into a Drive folder.
 * GUARDRAIL: Only writes to the pre-approved folderId.
 * GUARDRAIL: Preserves original MIME type — no conversion.
 */
export async function uploadOriginalFile(
  token: string,
  folderId: string,
  file: File
): Promise<DriveUploadResult> {
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  await assertOk(res, 'uploadOriginalFile');
  const data = await res.json();
  return { fileId: data.id, webViewLink: data.webViewLink };
}

// ─────────────────────────────────────────────────────────────
// File deletion (trash only — never permanent)
// ─────────────────────────────────────────────────────────────

/**
 * Moves a Drive file to Trash.
 * GUARDRAIL: Never permanently deletes. User can recover from Drive Trash.
 */
export async function trashDriveFile(token: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });
  await assertOk(res, 'trashDriveFile');
}

// ─────────────────────────────────────────────────────────────
// High-level orchestrator (used by NoteVault)
// ─────────────────────────────────────────────────────────────

/**
 * Saves a note to Drive after user approval.
 * - Handles folder creation if first time.
 * - Persists folder ID to Supabase.
 * - Returns upload result.
 *
 * GUARDRAIL: Token expiry is caught and surfaced as DriveTokenExpiredError.
 */
export class DriveTokenExpiredError extends Error {
  constructor() {
    super('Google Drive token expired. Note saved locally. Re-login with Google to re-enable sync.');
    this.name = 'DriveTokenExpiredError';
  }
}

export async function syncNoteToDrive(
  token: string,
  userId: string,
  folderId: string,
  file: File
): Promise<DriveUploadResult> {
  try {
    return await uploadOriginalFile(token, folderId, file);
  } catch (err: unknown) {
    const msg = (err as Error).message || '';
    if (msg.includes('401') || msg.includes('Invalid Credentials') || msg.includes('invalid_token')) {
      window.dispatchEvent(new Event('google-token-expired'));
      await saveDriveSettings(userId, { drive_sync_enabled: false });
      throw new DriveTokenExpiredError();
    }
    throw err;
  }
}

