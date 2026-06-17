import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { extractText } from '../lib/extractors';
import { GeminiNoKeyError, GeminiInvalidKeyError, GeminiQuotaError } from '../lib/geminiOcr';
import {
  createSubjectFolder, syncNoteToDrive,
  type DriveSettings,
} from '../lib/googleDrive';
import { File, CheckCircle2, XCircle, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export type UploadJob = {
  id: string;
  file: File;
  subjectId: string | null;
  subjectName?: string;
  settings: DriveSettings;
  geminiKey: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  onSuccess?: (note: any) => void;
};

interface UploadContextType {
  jobs: UploadJob[];
  enqueueUpload: (
    file: File,
    subjectId: string | null,
    subjectName: string | undefined,
    settings: DriveSettings,
    geminiKey: string | null,
    session: Session,
    onSuccess?: (note: any) => void
  ) => void;
  dismissJob: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const updateJob = (id: string, updates: Partial<UploadJob>) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, ...updates } : job));
  };

  const enqueueUpload = async (
    file: File,
    subjectId: string | null,
    subjectName: string | undefined,
    settings: DriveSettings,
    geminiKey: string | null,
    session: Session,
    onSuccess?: (note: any) => void
  ) => {
    const id = crypto.randomUUID();
    const newJob: UploadJob = {
      id, file, subjectId, subjectName, settings, geminiKey,
      progress: 0, status: 'pending', onSuccess
    };
    
    setJobs(prev => [...prev, newJob]);

    // Start processing immediately
    updateJob(id, { status: 'uploading' });

    try {
      let extractedText = '';
      let sourceType = 'extracted';
      try {
        const result = await extractText(file, (pct) => updateJob(id, { progress: pct }), geminiKey);
        extractedText = result.text;
        if (file.type.startsWith('image/') || file.name.endsWith('.pdf')) {
          sourceType = geminiKey ? 'gemini_ocr' : 'tesseract_ocr';
        }
      } catch (e: unknown) {
        if (!(e instanceof GeminiNoKeyError || e instanceof GeminiInvalidKeyError || e instanceof GeminiQuotaError)) {
          throw new Error(`Extraction failed: ${(e as Error).message}`);
        }
      }

      updateJob(id, { progress: 80 });

      let targetFolderId = settings.drive_folder_id;
      if (subjectId && targetFolderId && session.provider_token) {
        // Find subject folder from DB or create it
        const { data: subjectData } = await supabase.from('subjects').select('drive_folder_id').eq('id', subjectId).single();
        if (subjectData?.drive_folder_id) {
          targetFolderId = subjectData.drive_folder_id;
        } else {
          try {
            const sfId = await createSubjectFolder(session.provider_token, targetFolderId, subjectName || 'Notes');
            await supabase.from('subjects').update({ drive_folder_id: sfId }).eq('id', subjectId);
            targetFolderId = sfId;
          } catch { /* use root */ }
        }
      }

      const { data, error } = await supabase.from('notes').insert([{
        user_id: session.user.id,
        title: file.name.replace(/\.[^.]+$/, ''),
        content: extractedText,
        tags: [],
        source_type: sourceType,
        subject_id: subjectId,
        original_filename: file.name,
        original_mime: file.type,
      }]).select().single();

      if (error || !data) throw new Error('Failed to save note to database.');

      let savedNote = data;

      if (settings.drive_sync_enabled && targetFolderId && session.provider_token) {
        try {
          const result = await syncNoteToDrive(session.provider_token, session.user.id, targetFolderId, file);
          await supabase.from('notes').update({ drive_file_id: result.fileId, drive_link: result.webViewLink }).eq('id', savedNote.id);
          savedNote = { ...savedNote, drive_file_id: result.fileId, drive_link: result.webViewLink };
        } catch (e: unknown) {
          console.warn('Drive upload failed', e);
        }
      }

      updateJob(id, { progress: 100, status: 'success' });
      if (onSuccess) onSuccess(savedNote);

      // Auto dismiss success after 5s
      setTimeout(() => dismissJob(id), 5000);

    } catch (error: unknown) {
      updateJob(id, { status: 'error', error: (error as Error).message });
    }
  };

  const dismissJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  return (
    <UploadContext.Provider value={{ jobs, enqueueUpload, dismissJob }}>
      {children}
      {/* RENDER FLOATING UI HERE */}
      {jobs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 overflow-hidden flex flex-col max-h-96 animate-in slide-in-from-bottom-5">
          <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-black">Upload Manager</h3>
            <span className="text-[10px] bg-gray-800 px-2 py-1 rounded-full font-bold">{jobs.filter(j => j.status === 'uploading').length} Active</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="p-3 bg-neutral-800 border border-neutral-800 rounded-lg relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden pr-4">
                    <File size={14} className="text-indigo-500 shrink-0" />
                    <p className="text-xs font-bold text-neutral-200 truncate">{job.file.name}</p>
                  </div>
                  {job.status === 'error' && (
                     <button onClick={() => dismissJob(job.id)} className="absolute top-2 right-2 text-neutral-500 hover:text-red-500 transition-colors"><X size={14}/></button>
                  )}
                  {job.status === 'success' && (
                     <button onClick={() => dismissJob(job.id)} className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-300 transition-colors"><X size={14}/></button>
                  )}
                </div>
                
                {job.status === 'uploading' && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${job.progress}%` }} />
                    </div>
                    <p className="text-[10px] text-neutral-500 text-right">{job.progress}%</p>
                  </div>
                )}
                {job.status === 'success' && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Upload complete</p>
                )}
                {job.status === 'error' && (
                  <p className="text-[10px] text-red-600 font-bold flex items-start gap-1"><XCircle size={12} className="shrink-0 mt-0.5" /> <span className="break-words line-clamp-2">{job.error}</span></p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
