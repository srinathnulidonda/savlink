// src/dashboard/modals/ImportLinks/ImportLinksModal.jsx

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExportService from '../../../services/export.service';
import toast from 'react-hot-toast';

const ACCEPT = '.json,.csv,.html';
const MAX_SIZE = 10 * 1024 * 1024;

const FORMATS = [
  { ext: 'HTML', desc: 'Browser bookmarks export', icon: '🌐' },
  { ext: 'JSON', desc: 'Savlink or custom JSON', icon: '📋' },
  { ext: 'CSV', desc: 'Spreadsheet export', icon: '📊' },
];

export default function ImportLinksModal({ isOpen, onClose, onComplete }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const reset = () => { setFile(null); setResult(null); setDragOver(false); };

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File too large (max 10MB)'); return; }
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['json', 'csv', 'html', 'htm'].includes(ext)) {
      toast.error('Unsupported format. Use JSON, CSV, or HTML.');
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (!file || importing) return;
    setImporting(true);
    try {
      const res = await ExportService.importFile(file);
      if (res.success) {
        setResult(res.data);
        toast.success(`Imported ${res.data.created || 0} links`);
      } else {
        toast.error(res.error || 'Import failed');
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [file, importing]);

  const handleDone = () => {
    onComplete?.();
    onClose();
    reset();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#111] border border-gray-800/60 rounded-xl shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Import Links</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Upload bookmarks or link files</p>
                </div>
              </div>
              <button onClick={() => { onClose(); reset(); }}
                className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/[0.05]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {result ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Import Complete</h3>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <Stat label="Created" value={result.created || 0} color="text-emerald-400" />
                    <Stat label="Skipped" value={result.skipped || 0} color="text-amber-400" />
                    <Stat label="Errors" value={result.errors || 0} color="text-red-400" />
                  </div>
                  <button onClick={handleDone}
                    className="w-full py-2.5 text-[13px] font-medium text-white bg-primary hover:bg-primary-light rounded-lg">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${dragOver ? 'border-primary bg-primary/5' : file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-gray-800 hover:border-gray-700 hover:bg-white/[0.02]'}`}
                  >
                    <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])} />

                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <span className="text-lg">📄</span>
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-medium text-white truncate max-w-[200px]">{file.name}</p>
                          <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="p-1 text-gray-500 hover:text-gray-300 rounded">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-[13px] text-gray-400 mb-1">Drop file here or click to browse</p>
                        <p className="text-[11px] text-gray-600">JSON, CSV, or HTML bookmarks (max 10MB)</p>
                      </>
                    )}
                  </div>

                  {/* Supported Formats */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {FORMATS.map(f => (
                      <div key={f.ext} className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-800/40 text-center">
                        <span className="text-lg">{f.icon}</span>
                        <p className="text-[11px] font-medium text-gray-400 mt-1">{f.ext}</p>
                        <p className="text-[10px] text-gray-600">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!result && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800/40">
                <button onClick={() => { onClose(); reset(); }}
                  className="px-4 py-2 text-[13px] font-medium text-gray-400 hover:text-gray-200 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleImport} disabled={!file || importing}
                  className="px-5 py-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded-lg flex items-center gap-2">
                  {importing ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                  ) : 'Import'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800/40">
      <p className={`text-xl font-bold ${color} tabular-nums`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}