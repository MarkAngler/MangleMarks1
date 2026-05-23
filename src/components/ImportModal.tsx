import React, { useState, useRef } from 'react';
import { parseBookmarkExport, ParsedDashboardInput } from '../lib/parser';
import { createDashboard, createCategory, createBookmark } from '../lib/db';
import { X, Upload, CheckCircle2, AlertCircle, FileCode, ArrowRight, BookOpen } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onImportComplete: () => void;
}

export default function ImportModal({ isOpen, onClose, userId, onImportComplete }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedDashboardInput[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  }

  function handleFileSelected(file: File) {
    setFileName(file.name);
    setError('');
    setSuccess(false);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      try {
        const results = parseBookmarkExport(text);
        if (results.length === 0) {
          setError('Could not extract any valid bookmarks or categories. Check your file format.');
        } else {
          setParsedData(results);
        }
      } catch (err) {
        setError('Error parsing file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  }

  // Count parsed metrics
  const totalDashboards = parsedData ? parsedData.length : 0;
  const totalCategories = parsedData 
    ? parsedData.reduce((acc, d) => acc + d.categories.length, 0)
    : 0;
  const totalBookmarks = parsedData
    ? parsedData.reduce((acc, d) => 
        acc + d.categories.reduce((acc2, c) => acc2 + c.bookmarks.length, 0), 0)
    : 0;

  async function triggerImport() {
    if (!parsedData || parsedData.length === 0) return;

    try {
      setImporting(true);
      setError('');
      setSuccess(false);

      let createdDashboardsCount = 0;
      let createdCategoriesCount = 0;
      let createdBookmarksCount = 0;

      const totalItems = totalDashboards + totalCategories + totalBookmarks;
      let itemsProcessed = 0;

      for (let dIdx = 0; dIdx < parsedData.length; dIdx++) {
        const d = parsedData[dIdx];
        setStatusText(`Importing Dashboard Tab: "${d.name}"...`);
        
        // Create Dashboard
        const dId = await createDashboard(d.name, userId, dIdx);
        createdDashboardsCount++;
        itemsProcessed++;
        setProgress(Math.round((itemsProcessed / totalItems) * 100));

        // Create Categories
        for (let cIdx = 0; cIdx < d.categories.length; cIdx++) {
          const c = d.categories[cIdx];
          setStatusText(`Adding group "${c.name}" under ${d.name}...`);
          
          const cId = await createCategory(c.name, dId, userId, c.column, cIdx);
          createdCategoriesCount++;
          itemsProcessed++;
          setProgress(Math.round((itemsProcessed / totalItems) * 100));

          // Create Bookmarks
          for (let bIdx = 0; bIdx < c.bookmarks.length; bIdx++) {
            const b = c.bookmarks[bIdx];
            
            // Standardizing URL
            let finalUrl = b.url;
            if (!/^https?:\/\//i.test(finalUrl)) {
              finalUrl = 'https://' + finalUrl;
            }

            await createBookmark({
              url: finalUrl,
              title: b.title,
              description: b.description,
              categoryId: cId,
              dashboardId: dId,
              tags: b.tags,
              order: bIdx,
              ownerId: userId
            });

            createdBookmarksCount++;
            itemsProcessed++;
            setProgress(Math.round((itemsProcessed / totalItems) * 100));
          }
        }
      }

      setStatusText(`Complete! Imported ${createdDashboardsCount} tabs, ${createdCategoriesCount} categories, and ${createdBookmarksCount} bookmarks.`);
      setSuccess(true);
      onImportComplete();
    } catch (err: any) {
      let finalErrorMessage = 'An error occurred during import. Check your Firestore connection or quota.';
      if (err instanceof Error && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && typeof parsed === 'object' && parsed.error) {
            finalErrorMessage = `Import Failed: ${parsed.error} (Action: ${parsed.operationType}, Path: /${parsed.path || ''})`;
          } else {
            finalErrorMessage = err.message;
          }
        } catch (e) {
          finalErrorMessage = err.message;
        }
      } else if (typeof err === 'string') {
        finalErrorMessage = err;
      }
      setError(finalErrorMessage);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-900">
              Import MangleMarks Export
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-rose-700 text-sm border border-rose-100">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-teal-50/70 p-6 text-teal-800 border border-teal-100/50 text-center">
              <CheckCircle2 className="h-10 w-10 text-teal-600 animate-bounce" />
              <div className="space-y-1">
                <h4 className="font-semibold text-lg">Import Successful!</h4>
                <p className="text-sm text-teal-700">
                  Your exported dashboard tabs, categories, and links have been uploaded to your secure database.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg bg-teal-600 text-white px-5 py-2 text-sm font-semibold hover:bg-teal-700 transition"
              >
                Close and View
              </button>
            </div>
          )}

          {!success && !importing && (
            <>
              {/* Box or Drag Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-zinc-200 hover:border-teal-400 bg-zinc-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,.json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <FileCode className="h-10 w-10 text-zinc-400 mb-3" />
                <h4 className="font-semibold text-zinc-800 text-sm">
                  Drag and drop export file here, or click to browse
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-[280px]">
                  Supports standard Netscape HTML backups (.html) and custom JSON exported files.
                </p>
                {fileName && (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs text-teal-700 font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    Selected: {fileName}
                  </div>
                )}
              </div>

              {/* Parsed Summary Details */}
              {parsedData && (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Detection Preview</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-white p-2.5 border border-zinc-100">
                      <div className="text-2xl font-bold font-mono text-zinc-850">{totalDashboards}</div>
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">Dashboard Tabs</div>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-zinc-100">
                      <div className="text-2xl font-bold font-mono text-zinc-850">{totalCategories}</div>
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">Categories</div>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-zinc-100">
                      <div className="text-2xl font-bold font-mono text-zinc-850">{totalBookmarks}</div>
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">Bookmarks</div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 leading-relaxed flex items-center justify-center gap-1">
                    Ready to migrate to clouds database. Click below to confirm.
                    <ArrowRight className="h-3.5 w-3.5 inline text-teal-600" />
                  </div>

                  <button
                    type="button"
                    onClick={triggerImport}
                    className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 transition cursor-pointer shadow-md shadow-teal-600/15"
                  >
                    Import All Bookmarks
                  </button>
                </div>
              )}
            </>
          )}

          {/* Importing Progress state */}
          {importing && (
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-700 animate-pulse">{statusText}</span>
                <span className="font-mono text-zinc-500">{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-zinc-400 text-center">
                Please do not close this modal or refresh the page while write operations execute.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
