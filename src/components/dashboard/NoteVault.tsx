import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Tag, Search, Trash2, X, ChevronDown, ChevronUp,
  Loader2, BookOpen, ExternalLink, CloudOff, Cloud, FileText,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { extractText } from '../../lib/extractors';
import {
  getDriveSettings,
  saveDriveSettings,
  createOperatorFolder,
  syncNoteToDrive,
  trashDriveFile,
  DriveTokenExpiredError,
  type DriveSettings,
} from '../../lib/googleDrive';

// ─── Types ───────────────────────────────────────────────────
type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source_type: string;
  drive_file_id: string | null;
  drive_link: string | null;
  created_at: string;
};

type Toast = { msg: string; type: 'success' | 'error' | 'warn' };

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,.docx,.pptx';

export function NoteVault({ session }: { session: Session }) {
  // ── Notes ────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Search / filter ──────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // ── Upload / extraction ──────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);

  // ── Editor ───────────────────────────────────────────────
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [sourceType, setSourceType] = useState('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // ── Drive ────────────────────────────────────────────────
  const [driveSettings, setDriveSettings] = useState<DriveSettings>({
    drive_folder_id: null,
    drive_sync_enabled: false,
  });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalConsent, setApprovalConsent] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [pendingSaveAfterApproval, setPendingSaveAfterApproval] = useState(false);

  // ── Delete with Drive confirm ────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleteDriveToo, setDeleteDriveToo] = useState(true);

  // ── Toast ────────────────────────────────────────────────
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ─────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const hasGoogleToken = !!session.provider_token;

  // ─── Fetch notes ─────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setNotes((data as Note[]) || []);
    setIsLoadingNotes(false);
  }, []);

  // ─── Fetch Drive settings ─────────────────────────────────
  const fetchDriveSettings = useCallback(async () => {
    if (!hasGoogleToken) return;
    try {
      const settings = await getDriveSettings(session.user.id);
      setDriveSettings(settings);
    } catch { /* non-fatal */ }
  }, [session.user.id, hasGoogleToken]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchDriveSettings(); }, [fetchDriveSettings]);

  // ─── Derived ─────────────────────────────────────────────
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));
  const filtered = notes.filter(n => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || n.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  // ─── File handling ────────────────────────────────────────
  const processFile = async (file: File) => {
    setExtractError(null);
    setIsExtracting(true);
    setExtractProgress(0);
    setShowEditor(false);
    try {
      const result = await extractText(file, pct => setExtractProgress(pct));
      setEditTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      setEditContent(result.text || '');
      setEditTags('');
      setSourceType(
        file.type.startsWith('image/') || file.name.endsWith('.pdf') ? 'ocr' : 'extracted'
      );
      setShowEditor(true);
    } catch (e: unknown) {
      setExtractError((e as Error).message);
    }
    setIsExtracting(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ─── Drive approval flow ──────────────────────────────────
  const triggerApprovalModal = () => {
    setApprovalConsent(false);
    setPendingSaveAfterApproval(true);
    setShowApprovalModal(true);
  };

  const handleApproveAndEnable = async () => {
    if (!session.provider_token) return;
    setIsCreatingFolder(true);
    try {
      const folderId = await createOperatorFolder(session.provider_token);
      await saveDriveSettings(session.user.id, {
        drive_folder_id: folderId,
        drive_sync_enabled: true,
      });
      const newSettings: DriveSettings = { drive_folder_id: folderId, drive_sync_enabled: true };
      setDriveSettings(newSettings);
      setShowApprovalModal(false);
      showToast('✅ "Operator — Notes" folder created in your Google Drive!', 'success');

      // Continue with the pending save
      if (pendingSaveAfterApproval) {
        await performSave(newSettings);
      }
    } catch (e: unknown) {
      showToast(`Failed to create Drive folder: ${(e as Error).message}`, 'error');
    }
    setIsCreatingFolder(false);
    setPendingSaveAfterApproval(false);
  };

  const handleCancelApproval = async () => {
    setShowApprovalModal(false);
    setPendingSaveAfterApproval(false);
    // Save locally only
    await performSave({ drive_folder_id: null, drive_sync_enabled: false });
  };

  // ─── Save note ────────────────────────────────────────────
  const handleSaveClick = async () => {
    if (!editContent.trim()) return;

    // Drive enabled + folder exists → save directly
    if (driveSettings.drive_sync_enabled && driveSettings.drive_folder_id) {
      await performSave(driveSettings);
      return;
    }

    // Drive enabled but no folder yet → first time, need approval
    if (hasGoogleToken && !driveSettings.drive_sync_enabled) {
      triggerApprovalModal();
      return;
    }

    // No Google token or Drive disabled → local only
    await performSave({ drive_folder_id: null, drive_sync_enabled: false });
  };

  const performSave = async (settings: DriveSettings) => {
    setIsSaving(true);
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const title = editTitle.trim() || 'Untitled Note';
    const content = editContent.trim();

    // 1 — Insert into Supabase
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        user_id: session.user.id,
        title,
        content,
        tags,
        source_type: sourceType,
      }])
      .select()
      .single();

    if (error || !data) {
      showToast('Failed to save note to database.', 'error');
      setIsSaving(false);
      return;
    }

    let savedNote: Note = data as Note;

    // 2 — Upload to Drive if enabled
    if (settings.drive_sync_enabled && settings.drive_folder_id && session.provider_token) {
      try {
        const result = await syncNoteToDrive(
          session.provider_token,
          session.user.id,
          settings.drive_folder_id,
          new File([content], `${title}.md`, { type: 'text/markdown' })
        );
        // Persist Drive metadata back to note row
        await supabase
          .from('notes')
          .update({ drive_file_id: result.fileId, drive_link: result.webViewLink })
          .eq('id', savedNote.id);
        savedNote = { ...savedNote, drive_file_id: result.fileId, drive_link: result.webViewLink };
        showToast('✅ Note saved & synced to Google Drive!', 'success');
      } catch (e: unknown) {
        if (e instanceof DriveTokenExpiredError) {
          setDriveSettings(prev => ({ ...prev, drive_sync_enabled: false }));
          showToast(e.message, 'warn');
        } else {
          showToast(`Note saved locally. Drive upload failed: ${(e as Error).message}`, 'warn');
        }
      }
    } else {
      showToast('Note saved to vault.', 'success');
    }

    setNotes(prev => [savedNote, ...prev]);
    setShowEditor(false);
    setIsSaving(false);
  };

  // ─── Delete note ──────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const note = deleteTarget;
    setDeleteTarget(null);

    setNotes(prev => prev.filter(n => n.id !== note.id));
    await supabase.from('notes').delete().eq('id', note.id);

    if (deleteDriveToo && note.drive_file_id && session.provider_token) {
      try {
        await trashDriveFile(session.provider_token, note.drive_file_id);
        showToast('Note deleted & Drive copy moved to Trash.', 'success');
      } catch {
        showToast('Note deleted locally. Drive copy could not be trashed.', 'warn');
      }
    } else {
      showToast('Note deleted.', 'success');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-grow h-full overflow-hidden gap-3 relative">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`absolute top-0 left-0 right-0 z-50 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all
          ${toast.type === 'success' ? 'bg-green-50 border border-green-300 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border border-red-300 text-red-800' :
            'bg-yellow-50 border border-yellow-300 text-yellow-800'}`}>
          {toast.type === 'success' && <CheckCircle2 size={12} className="shrink-0" />}
          {toast.type === 'error' && <AlertTriangle size={12} className="shrink-0" />}
          {toast.type === 'warn' && <AlertTriangle size={12} className="shrink-0" />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={12} /></button>
        </div>
      )}

      {/* ── DRIVE STATUS BANNER ── */}
      {hasGoogleToken && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0
          ${driveSettings.drive_sync_enabled
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-neutral-800 border border-neutral-700 text-neutral-500'}`}>
          {driveSettings.drive_sync_enabled
            ? <><Cloud size={11} /> Drive Sync Active</>
            : <><CloudOff size={11} /> Drive Sync Disabled — save a note to enable</>}
        </div>
      )}

      {/* ── APPROVAL MODAL ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-700">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-start">
              <div>
                <h2 className="text-base font-black text-neutral-200">Enable Google Drive Sync?</h2>
                <p className="text-xs text-neutral-500 mt-1">One-time setup required</p>
              </div>
              <button onClick={handleCancelApproval} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">What will happen</p>
                <ul className="text-xs text-indigo-800 space-y-1">
                  <li>📁 A folder called <strong>"Operator — Notes"</strong> will be created in your Google Drive root.</li>
                  <li>📝 Each saved note will be uploaded as a <strong>.md (Markdown) file</strong> into that folder.</li>
                  <li>🔗 A link to the Drive file will appear in your vault.</li>
                </ul>
              </div>
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-neutral-400 uppercase tracking-wider">Access Constraints</p>
                <ul className="text-xs text-neutral-400 space-y-1">
                  <li>🛡 Operator uses <code className="bg-neutral-800 px-1 rounded">drive.file</code> scope — it can <strong>only</strong> access files it creates.</li>
                  <li>🚫 It cannot read, list, or modify any of your existing Drive files.</li>
                  <li>🗑 Deleting a note moves the Drive copy to <strong>Trash</strong>, not permanent deletion.</li>
                </ul>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalConsent}
                  onChange={e => setApprovalConsent(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 shrink-0"
                />
                <span className="text-xs text-neutral-300">
                  I understand that Operator will only access files it creates in my Drive.
                </span>
              </label>
            </div>
            <div className="p-6 bg-neutral-800 border-t border-neutral-800 flex gap-3">
              <button
                onClick={handleCancelApproval}
                className="flex-1 py-2 text-xs font-bold text-neutral-400 border border-neutral-600 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Save Locally Only
              </button>
              <button
                onClick={handleApproveAndEnable}
                disabled={!approvalConsent || isCreatingFolder}
                className="flex-1 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isCreatingFolder
                  ? <><Loader2 size={12} className="animate-spin" /> Creating Folder...</>
                  : '✅ Approve & Enable Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full border border-neutral-700 p-6 space-y-4">
            <h2 className="text-sm font-black text-neutral-200">Delete Note?</h2>
            <p className="text-xs text-neutral-400">
              <strong className="text-neutral-200">"{deleteTarget.title}"</strong> will be permanently removed from your vault.
            </p>
            {deleteTarget.drive_file_id && (
              <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={deleteDriveToo}
                  onChange={e => setDeleteDriveToo(e.target.checked)}
                  className="accent-yellow-600 shrink-0"
                />
                <span className="text-xs text-yellow-800 font-medium">
                  Also move the Google Drive copy to <strong>Trash</strong>
                </span>
              </label>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-bold text-neutral-400 border border-neutral-600 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDITOR ── */}
      {showEditor && (
        <div className="bg-indigo-900/20 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">New Note</p>
            <button onClick={() => setShowEditor(false)} className="text-indigo-300 hover:text-indigo-400">
              <X size={14} />
            </button>
          </div>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full text-sm font-bold bg-neutral-900 border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-neutral-200"
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={6}
            placeholder="Extracted text (editable)..."
            className="w-full text-xs bg-neutral-900 border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-neutral-300 resize-none font-mono leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-indigo-400 shrink-0" />
            <input
              value={editTags}
              onChange={e => setEditTags(e.target.value)}
              placeholder="tags, comma, separated"
              className="flex-1 text-xs bg-neutral-900 border border-indigo-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 text-neutral-400"
            />
          </div>
          {hasGoogleToken && !driveSettings.drive_sync_enabled && (
            <p className="text-[10px] text-indigo-500 font-medium">
              ☁ First save will prompt you to enable Google Drive sync.
            </p>
          )}
          <button
            onClick={handleSaveClick}
            disabled={isSaving || !editContent.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            {isSaving
              ? 'Saving...'
              : driveSettings.drive_sync_enabled
                ? '💾 Save & Sync to Drive'
                : 'Save to Vault'}
          </button>
        </div>
      )}

      {/* ── DROP ZONE ── */}
      {!showEditor && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer shrink-0
            ${isDragging ? 'border-indigo-500 bg-indigo-900/20 scale-[1.01]' : 'border-neutral-600 bg-neutral-900 hover:border-indigo-400 hover:bg-indigo-900/20'}`}
        >
          <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={onFileChange} className="hidden" />
          {isExtracting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-indigo-400">Processing... {extractProgress}%</p>
              <div className="w-full bg-neutral-800 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${extractProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <Upload size={22} className="mx-auto mb-2 text-indigo-400" />
              <p className="text-xs font-bold text-neutral-300">Drop file or click to upload</p>
              <p className="text-[10px] text-neutral-500 mt-1">JPG · PNG · PDF · DOCX · PPTX</p>
            </>
          )}
        </div>
      )}

      {extractError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shrink-0">
          ⚠ {extractError}
        </p>
      )}

      {/* ── SEARCH + TAG FILTER ── */}
      {notes.length > 0 && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-700 rounded-lg outline-none focus:border-indigo-400 bg-neutral-900"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors
                    ${activeTag === tag ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-indigo-100 hover:text-indigo-400'}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES LIST ── */}
      <div className="flex-grow overflow-y-auto pr-1">
        {isLoadingNotes ? null : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center animate-smooth-pop">
            <BookOpen size={28} className="text-neutral-500 mb-2" />
            <p className="text-xs font-bold text-neutral-500">
              {notes.length === 0 ? 'Vault empty.' : 'No results.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-smooth-pop">
          {filtered.map(note => (
            <div key={note.id} className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-sm transition-all hover:border-indigo-300">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-neutral-200 truncate">{note.title}</p>
                    {note.drive_link && (
                      <a
                        href={note.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open in Google Drive"
                        className="text-indigo-400 hover:text-indigo-400 shrink-0"
                      >
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">{formatDate(note.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {note.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-[9px] bg-indigo-900/20 text-indigo-500 px-1.5 py-0.5 rounded-full font-bold">
                      #{t}
                    </span>
                  ))}
                  {note.tags.length > 2 && <span className="text-[9px] text-neutral-500">+{note.tags.length - 2}</span>}
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteDriveToo(!!note.drive_file_id); setDeleteTarget(note); }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                  {expandedId === note.id ? <ChevronUp size={12} className="text-neutral-500" /> : <ChevronDown size={12} className="text-neutral-500" />}
                </div>
              </div>
              {expandedId === note.id && (
                <div className="px-3 pb-3 border-t border-neutral-800">
                  <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap leading-relaxed mt-2 max-h-48 overflow-y-auto">
                    {note.content}
                  </pre>
                  <div className="flex items-center gap-3 mt-2">
                    {note.source_type === 'ocr' && (
                      <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <FileText size={9} />OCR extracted
                      </p>
                    )}
                    {note.drive_link && (
                      <a
                        href={note.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1 hover:underline"
                      >
                        <Cloud size={9} />View in Drive
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
