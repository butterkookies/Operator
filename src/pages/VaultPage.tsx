import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Search, Trash2, X, ExternalLink, Cloud, CloudOff,
  Plus, FolderOpen, File, FileText, Image, AlertTriangle,
  CheckCircle2, ChevronRight, Loader2, Key, Pencil, BookOpen,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  saveDriveSettings, createOperatorFolder,
  createSubjectFolder, trashDriveFile, type DriveSettings,
} from '../lib/googleDrive';
import { useUpload } from '../contexts/UploadContext';

// ─── Types ───────────────────────────────────────────────────
type Subject = {
  id: string;
  name: string;
  color: string;
  drive_folder_id: string | null;
};

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source_type: string;
  subject_id: string | null;
  original_filename: string | null;
  original_mime: string | null;
  drive_file_id: string | null;
  drive_link: string | null;
  created_at: string;
};

type Toast = { msg: string; type: 'success' | 'error' | 'warn' };

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,.docx,.pptx';

const SUBJECT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  'application/pdf': <FileText size={20} className="text-red-500" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    <FileText size={20} className="text-blue-500" />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    <FileText size={20} className="text-orange-500" />,
};

function getFileIcon(mime: string | null) {
  if (!mime) return <File size={20} className="text-neutral-500" />;
  if (mime.startsWith('image/')) return <Image size={20} className="text-purple-500" />;
  return FILE_ICONS[mime] || <File size={20} className="text-neutral-500" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────
export function VaultPage({ session }: { session: Session }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');

  // Drive + Gemini
  const [driveSettings, setDriveSettings] = useState<DriveSettings>({
    drive_folder_id: null, drive_sync_enabled: false,
  });
  const [geminiKey, setGeminiKey] = useState<string | null>(null);

  // Upload state
  const { enqueueUpload } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);

  // Subject creation
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  // Drive approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalConsent, setApprovalConsent] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleteDriveToo, setDeleteDriveToo] = useState(true);

  // Editing extracted text
  const [editingContent, setEditingContent] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasGoogleToken = !!session.provider_token;

  // ── Toast helper ─────────────────────────────────────────
  const showToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Load data ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [subjectsRes, notesRes, settingsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('created_at'),
        supabase.from('notes').select('*').order('created_at', { ascending: false }),
        supabase.from('user_settings').select('drive_folder_id, drive_sync_enabled, gemini_api_key')
          .eq('user_id', session.user.id).maybeSingle(),
      ]);
      if (!subjectsRes.error) setSubjects((subjectsRes.data as Subject[]) || []);
      if (!notesRes.error) setNotes((notesRes.data as Note[]) || []);
      if (!settingsRes.error && settingsRes.data) {
        setDriveSettings({
          drive_folder_id: settingsRes.data.drive_folder_id ?? null,
          drive_sync_enabled: settingsRes.data.drive_sync_enabled ?? false,
        });
        setGeminiKey(settingsRes.data.gemini_api_key ?? null);
      }
      setIsLoading(false);
    };
    load();
  }, [session.user.id]);

  // When a note is selected, sync its content to the editor
  useEffect(() => {
    if (selectedNote) setEditingContent(selectedNote.content);
  }, [selectedNote?.id]);

  // ── Derived ──────────────────────────────────────────────
  const filteredNotes = notes.filter(n => {
    const matchSubject = selectedSubjectId === 'all' || n.subject_id === selectedSubjectId;
    const matchSearch = !search ||
      (n.original_filename || n.title).toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  const noteCountBySubject = (subjectId: string) =>
    notes.filter(n => n.subject_id === subjectId).length;

  // ── Subject creation ─────────────────────────────────────
  const createSubject = async () => {
    if (!newSubjectName.trim() || isCreatingSubject) return;
    setIsCreatingSubject(true);

    let driveFolderId: string | null = null;

    if (driveSettings.drive_sync_enabled && driveSettings.drive_folder_id && session.provider_token) {
      try {
        driveFolderId = await createSubjectFolder(
          session.provider_token,
          driveSettings.drive_folder_id,
          newSubjectName.trim()
        );
      } catch { /* non-fatal */ }
    }

    const { data, error } = await supabase.from('subjects').insert([{
      user_id: session.user.id,
      name: newSubjectName.trim(),
      color: newSubjectColor,
      drive_folder_id: driveFolderId,
    }]).select().single();

    if (!error && data) {
      setSubjects(prev => [...prev, data as Subject]);
      setNewSubjectName('');
      setShowNewSubject(false);
      showToast(`Subject "${(data as Subject).name}" created.`);
    }
    setIsCreatingSubject(false);
  };

  // ── File handling ────────────────────────────────────────
  const handleFilePick = (file: File) => {
    setPendingFile(file);
    setPendingSubjectId(selectedSubjectId === 'all' ? null : selectedSubjectId);
    setShowUploadModal(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFilePick(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFilePick(file);
    e.target.value = '';
  };

  // ── Drive approval ───────────────────────────────────────
  const handleApproveAndEnable = async () => {
    if (!session.provider_token) return;
    setIsCreatingFolder(true);
    try {
      const folderId = await createOperatorFolder(session.provider_token);
      await saveDriveSettings(session.user.id, { drive_folder_id: folderId, drive_sync_enabled: true });
      setDriveSettings({ drive_folder_id: folderId, drive_sync_enabled: true });
      setShowApprovalModal(false);
      showToast('✅ "Operator — Notes" folder created in Google Drive!');
      // Retry upload if there's a pending file
      if (pendingFile) {
        const subject = subjects.find(s => s.id === pendingSubjectId);
        enqueueUpload(pendingFile, pendingSubjectId, subject?.name, { drive_folder_id: folderId, drive_sync_enabled: true }, geminiKey, session, (note: Note) => {
          setNotes(prev => [note, ...prev]);
          setSelectedNote(note);
        });
      }
    } catch (e: unknown) {
      showToast(`Failed to create Drive folder: ${(e as Error).message}`, 'error');
    }
    setIsCreatingFolder(false);
    setPendingFile(null);
  };

  // ── Upload + extract ─────────────────────────────────────
  const startUpload = async () => {
    if (!pendingFile) return;
    setShowUploadModal(false);

    // First use: offer Drive setup
    if (hasGoogleToken && !driveSettings.drive_sync_enabled && !driveSettings.drive_folder_id) {
      setApprovalConsent(false);
      setShowApprovalModal(true);
      return;
    }

    const subject = subjects.find(s => s.id === pendingSubjectId);
    enqueueUpload(pendingFile, pendingSubjectId, subject?.name, driveSettings, geminiKey, session, (note: Note) => {
      setNotes(prev => [note, ...prev]);
      setSelectedNote(note);
    });
    setPendingFile(null);
  };

  // ── Edit content ─────────────────────────────────────────
  const saveContent = async () => {
    if (!selectedNote) return;
    setIsSavingContent(true);
    await supabase.from('notes').update({ content: editingContent }).eq('id', selectedNote.id);
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content: editingContent } : n));
    setSelectedNote(prev => prev ? { ...prev, content: editingContent } : null);
    setIsSavingContent(false);
  };

  // ── Delete ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const note = deleteTarget;
    setDeleteTarget(null);
    if (selectedNote?.id === note.id) setSelectedNote(null);
    setNotes(prev => prev.filter(n => n.id !== note.id));
    await supabase.from('notes').delete().eq('id', note.id);
    if (deleteDriveToo && note.drive_file_id && session.provider_token) {
      try {
        await trashDriveFile(session.provider_token, note.drive_file_id);
        showToast('Note deleted & Drive copy moved to Trash.');
      } catch {
        showToast('Note deleted. Drive copy could not be trashed.', 'warn');
      }
    } else {
      showToast('Note deleted.');
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full overflow-hidden bg-neutral-900 relative"
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {/* ── DRAG OVERLAY ── */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-500/10 border-4 border-dashed border-indigo-400 flex items-center justify-center pointer-events-none rounded-none">
          <div className="text-center">
            <Upload size={48} className="text-indigo-500 mx-auto mb-3" />
            <p className="text-xl font-black text-indigo-400">Drop to add to vault</p>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`absolute top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg
          ${toast.type === 'success' ? 'bg-neutral-900 border border-green-300 text-green-800' :
            toast.type === 'error' ? 'bg-neutral-900 border border-red-300 text-red-700' :
            'bg-neutral-900 border border-yellow-300 text-yellow-800'}`}>
          {toast.type === 'success' && <CheckCircle2 size={14} className="shrink-0 text-green-500" />}
          {toast.type !== 'success' && <AlertTriangle size={14} className="shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* ── DRIVE APPROVAL MODAL ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full border border-neutral-700">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-base font-black text-neutral-200">Enable Google Drive Sync?</h2>
              <p className="text-xs text-neutral-500 mt-1">One-time setup — your files will be preserved in their original format.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-200 rounded-xl p-4 space-y-2 text-xs text-indigo-800">
                <p>📁 Creates <strong>"Operator — Notes"</strong> folder in your Google Drive root.</p>
                <p>📂 Each subject gets its own subfolder inside.</p>
                <p>📄 Your <strong>original files</strong> (PDF, PPTX, DOCX, images) are uploaded — no conversion.</p>
                <p>🛡 Uses <code className="bg-indigo-100 px-1 rounded">drive.file</code> scope — cannot access any existing Drive files.</p>
                <p>🗑 Deleting a note moves Drive copy to <strong>Trash only</strong>.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={approvalConsent} onChange={e => setApprovalConsent(e.target.checked)} className="mt-0.5 accent-indigo-600 shrink-0" />
                <span className="text-xs text-neutral-300">I understand Operator can only access files it creates.</span>
              </label>
            </div>
            <div className="p-6 bg-neutral-800 border-t border-neutral-800 flex gap-3">
              <button onClick={() => { setShowApprovalModal(false); if (pendingFile) { const subject = subjects.find(s => s.id === pendingSubjectId); enqueueUpload(pendingFile, pendingSubjectId, subject?.name, { drive_folder_id: null, drive_sync_enabled: false }, geminiKey, session, (note: Note) => { setNotes(prev => [note, ...prev]); setSelectedNote(note); }); } setPendingFile(null); }}
                className="flex-1 py-2 text-xs font-bold text-neutral-400 border border-neutral-600 rounded-lg hover:bg-neutral-800 transition-colors">
                Save Locally Only
              </button>
              <button onClick={handleApproveAndEnable} disabled={!approvalConsent || isCreatingFolder}
                className="flex-1 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg flex items-center justify-center gap-2">
                {isCreatingFolder ? <><Loader2 size={12} className="animate-spin" />Creating...</> : '✅ Approve & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && pendingFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full border border-neutral-700">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="font-black text-neutral-200 text-sm">Add to Vault</h2>
              <button onClick={() => { setShowUploadModal(false); setPendingFile(null); }}><X size={16} className="text-neutral-500 hover:text-neutral-300" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3">
                {getFileIcon(pendingFile.type)}
                <div>
                  <p className="text-xs font-bold text-neutral-200 truncate max-w-[200px]">{pendingFile.name}</p>
                  <p className="text-[10px] text-neutral-500">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">Add to Subject</label>
                <select
                  value={pendingSubjectId || ''}
                  onChange={e => setPendingSubjectId(e.target.value || null)}
                  className="w-full text-sm border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 bg-neutral-900"
                >
                  <option value="">No subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {!geminiKey && (pendingFile.type.startsWith('image/') || pendingFile.name.endsWith('.pdf')) && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <Key size={12} className="text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-800">No Gemini API key set. OCR will use Tesseract (lower quality for handwriting). Add your key in Account Settings for best results.</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-neutral-800">
              <button onClick={startUpload}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-lg transition-colors flex items-center justify-center gap-2">
                <Upload size={14} />
                {driveSettings.drive_sync_enabled ? 'Upload & Sync to Drive' : 'Upload to Vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full border border-neutral-700 p-6 space-y-4">
            <h2 className="text-sm font-black text-neutral-200">Delete Note?</h2>
            <p className="text-xs text-neutral-400"><strong>"{deleteTarget.original_filename || deleteTarget.title}"</strong> will be removed from your vault.</p>
            {deleteTarget.drive_file_id && (
              <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <input type="checkbox" checked={deleteDriveToo} onChange={e => setDeleteDriveToo(e.target.checked)} className="accent-yellow-600 shrink-0" />
                <span className="text-xs text-yellow-800 font-medium">Also move Google Drive copy to <strong>Trash</strong></span>
              </label>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-xs font-bold text-neutral-400 border border-neutral-600 rounded-lg hover:bg-neutral-800">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT SUBJECT SIDEBAR ── */}
      <div className="w-56 shrink-0 bg-neutral-950 border-r border-neutral-600 flex flex-col h-full">
        <div className="p-4 border-b border-neutral-700">
          <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest">Note Vault</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* All Notes */}
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-1
              ${selectedSubjectId === 'all' ? 'bg-neutral-900 shadow-sm font-bold text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} />
              <span>All Notes</span>
            </div>
            <span className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full font-bold">
              {notes.length}
            </span>
          </button>

          {/* Subject list */}
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubjectId(subject.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-0.5
                ${selectedSubjectId === subject.id ? 'bg-neutral-900 shadow-sm font-bold text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                <span className="truncate">{subject.name}</span>
              </div>
              <span className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                {noteCountBySubject(subject.id)}
              </span>
            </button>
          ))}

          {/* New Subject */}
          {showNewSubject ? (
            <div className="mt-2 p-2 bg-neutral-900 rounded-lg border border-neutral-700 space-y-2">
              <input
                autoFocus
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSubject(); if (e.key === 'Escape') setShowNewSubject(false); }}
                placeholder="Subject name..."
                className="w-full text-xs border border-neutral-700 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
              />
              <div className="flex gap-1 flex-wrap">
                {SUBJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewSubjectColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newSubjectColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowNewSubject(false)} className="flex-1 text-[10px] py-1 text-neutral-500 border border-neutral-700 rounded-md hover:bg-neutral-800">Cancel</button>
                <button onClick={createSubject} disabled={!newSubjectName.trim() || isCreatingSubject}
                  className="flex-1 text-[10px] py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-bold">
                  {isCreatingSubject ? '...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewSubject(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors mt-2">
              <Plus size={12} /> New Subject
            </button>
          )}
        </div>

        {/* Drive status */}
        <div className={`m-2 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold
          ${driveSettings.drive_sync_enabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-800 text-neutral-500'}`}>
          {driveSettings.drive_sync_enabled ? <Cloud size={10} /> : <CloudOff size={10} />}
          {driveSettings.drive_sync_enabled ? 'Drive Sync Active' : 'Drive Sync Off'}
        </div>
      </div>

      {/* ── MAIN FILE GRID ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 bg-neutral-900 border-b border-neutral-700 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-700 rounded-lg outline-none focus:border-indigo-400 bg-neutral-900 shadow-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={onFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              <Upload size={14} />
              Upload
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? null : filteredNotes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center opacity-50 cursor-pointer animate-smooth-pop"
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpen size={48} className="text-gray-300 mb-4" />
              <p className="text-base font-black text-neutral-500">
                {search ? 'No results found.' : 'Vault is empty.'}
              </p>
              {!search && <p className="text-sm text-neutral-500 mt-1">Click Upload or drag a file here to begin.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-smooth-pop">
              {filteredNotes.map(note => {
                const subject = subjects.find(s => s.id === note.subject_id);
                const isSelected = selectedNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(isSelected ? null : note)}
                    className={`relative bg-neutral-900 rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md
                      ${isSelected ? 'border-indigo-500 shadow-indigo-100' : 'border-transparent hover:border-neutral-700'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-neutral-800 rounded-lg">
                        {getFileIcon(note.original_mime)}
                      </div>
                      <div className="flex items-center gap-1">
                        {note.drive_link && (
                          <a href={note.drive_link} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1 text-gray-300 hover:text-indigo-500 transition-colors">
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteDriveToo(!!note.drive_file_id); setDeleteTarget(note); }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-neutral-200 truncate leading-tight mb-1">
                      {note.original_filename || note.title}
                    </p>
                    <p className="text-[10px] text-neutral-500 mb-2">{formatDate(note.created_at)}</p>
                    {subject && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL DRAWER ── */}
      {selectedNote && (
        <div className="w-96 shrink-0 bg-neutral-900 border-l border-neutral-700 flex flex-col h-full shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-neutral-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-neutral-800 rounded-lg shrink-0">
                {getFileIcon(selectedNote.original_mime)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">
                  {selectedNote.original_filename || selectedNote.title}
                </p>
                <p className="text-[10px] text-neutral-500">{formatDate(selectedNote.created_at)}</p>
              </div>
            </div>
            <button onClick={() => setSelectedNote(null)} className="text-neutral-500 hover:text-neutral-300 shrink-0 ml-2">
              <X size={16} />
            </button>
          </div>

          {/* Drive link + badges */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-800 flex-wrap">
            {selectedNote.drive_link ? (
              <a href={selectedNote.drive_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-400 bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors">
                <ExternalLink size={12} /> Open in Drive
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
                <CloudOff size={12} /> Not in Drive
              </span>
            )}
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border
              ${selectedNote.source_type === 'gemini_ocr' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                selectedNote.source_type === 'tesseract_ocr' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
              {selectedNote.source_type === 'gemini_ocr' ? '✨ Gemini OCR' :
                selectedNote.source_type === 'tesseract_ocr' ? '🔍 Tesseract OCR' : '📄 Text Extracted'}
            </span>
          </div>

          {/* Extracted text editor */}
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-neutral-500 uppercase tracking-wider">Extracted Text</p>
              <div className="flex items-center gap-2">
                {isSavingContent && <Loader2 size={11} className="animate-spin text-indigo-400" />}
                <button
                  onClick={saveContent}
                  disabled={editingContent === selectedNote.content || isSavingContent}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Pencil size={10} /> Save edits
                </button>
              </div>
            </div>
            {!selectedNote.content && !editingContent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 bg-neutral-800 rounded-lg border border-dashed border-neutral-700">
                <Key size={24} className="text-gray-300 mb-2" />
                <p className="text-xs font-bold text-neutral-500">No text extracted.</p>
                <p className="text-[10px] text-neutral-500 mt-1">Add a Gemini API key in Account Settings for image/PDF OCR.</p>
              </div>
            ) : (
              <textarea
                value={editingContent}
                onChange={e => setEditingContent(e.target.value)}
                className="flex-1 text-xs text-neutral-300 font-mono leading-relaxed bg-neutral-800 border border-neutral-700 rounded-lg p-3 outline-none focus:border-indigo-300 resize-none"
                placeholder="No extracted text. Edit manually here..."
              />
            )}
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 shrink-0">
            <button
              onClick={() => {
                const idx = filteredNotes.findIndex(n => n.id === selectedNote.id);
                if (idx > 0) setSelectedNote(filteredNotes[idx - 1]);
              }}
              disabled={filteredNotes.findIndex(n => n.id === selectedNote.id) === 0}
              className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30 flex items-center gap-1 font-bold transition-colors"
            >
              ← Prev
            </button>
            <span className="text-[10px] text-neutral-500">
              {filteredNotes.findIndex(n => n.id === selectedNote.id) + 1} / {filteredNotes.length}
            </span>
            <button
              onClick={() => {
                const idx = filteredNotes.findIndex(n => n.id === selectedNote.id);
                if (idx < filteredNotes.length - 1) setSelectedNote(filteredNotes[idx + 1]);
              }}
              disabled={filteredNotes.findIndex(n => n.id === selectedNote.id) === filteredNotes.length - 1}
              className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30 flex items-center gap-1 font-bold transition-colors"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
