import React, { useState, useEffect } from 'react';
import { Bookmark, Category, Dashboard } from '../types';
import { createBookmark, updateBookmark, createCategory } from '../lib/db';
import { X, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface AddEditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkToEdit?: Bookmark | null;
  dashboards: Dashboard[];
  categories: Category[];
  userId: string;
  onBookmarkSaved: () => void;
  defaultUrl?: string;
  defaultTitle?: string;
}

export default function AddEditBookmarkModal({
  isOpen,
  onClose,
  bookmarkToEdit,
  dashboards,
  categories,
  userId,
  onBookmarkSaved,
  defaultUrl = '',
  defaultTitle = ''
}: AddEditBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedDashboardId, setSelectedDashboardId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // New Category inline field
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Sync inputs
  useEffect(() => {
    if (bookmarkToEdit) {
      setUrl(bookmarkToEdit.url);
      setTitle(bookmarkToEdit.title);
      setDescription(bookmarkToEdit.description || '');
      setTagInput(bookmarkToEdit.tags?.join(', ') || '');
      setSelectedDashboardId(bookmarkToEdit.dashboardId || '');
      setSelectedCategoryId(bookmarkToEdit.categoryId || '');
    } else {
      setUrl(defaultUrl);
      setTitle(defaultTitle);
      setDescription('');
      setTagInput('');
      
      // Select first dashboard and its first category as default
      if (dashboards.length > 0) {
        setSelectedDashboardId(dashboards[0].id);
      } else {
        setSelectedDashboardId('');
      }
      setSelectedCategoryId('');
    }
    setError('');
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  }, [bookmarkToEdit, defaultUrl, defaultTitle, dashboards, isOpen]);

  // Handle filtering of categories based on selected dashboard
  const filteredCategories = categories.filter(c => c.dashboardId === selectedDashboardId);

  // Auto-select category if none selected and categories exist
  useEffect(() => {
    if (selectedDashboardId && filteredCategories.length > 0 && !selectedCategoryId) {
      // If we are editing, we don't overwrite if it already matches.
      const isStillInList = filteredCategories.some(c => c.id === selectedCategoryId);
      if (!isStillInList) {
        setSelectedCategoryId(filteredCategories[0].id);
      }
    }
  }, [selectedDashboardId, filteredCategories, selectedCategoryId]);

  if (!isOpen) return null;

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      setError('');
      setLoading(true);
      const categoryId = await createCategory(
        newCategoryName.trim(),
        selectedDashboardId,
        userId,
        0, // default column index
        filteredCategories.length // append to the end
      );
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      setSelectedCategoryId(categoryId);
      onBookmarkSaved(); // refresh categories list
    } catch (e: any) {
      setError('Failed to create category. Ensure fields are valid.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim()) {
      setError('Title and URL are required.');
      return;
    }
    if (!selectedDashboardId) {
      setError('Please select/create a dashboard tab first.');
      return;
    }
    if (!selectedCategoryId && !showNewCategoryInput) {
      setError('Please select or create a category container.');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const parsedTags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Verify URL starts with http/https
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      let activeCategoryId = selectedCategoryId;

      // Handle category inline creation if input is active
      if (showNewCategoryInput && newCategoryName.trim()) {
        activeCategoryId = await createCategory(
          newCategoryName.trim(),
          selectedDashboardId,
          userId,
          0,
          filteredCategories.length
        );
      }

      if (bookmarkToEdit) {
        await updateBookmark(bookmarkToEdit.id, {
          url: finalUrl,
          title: title.trim(),
          description: description.trim(),
          categoryId: activeCategoryId,
          dashboardId: selectedDashboardId,
          tags: parsedTags,
        });
      } else {
        // Create new bookmark - order is end of categories bookmarks
        await createBookmark({
          url: finalUrl,
          title: title.trim(),
          description: description.trim(),
          categoryId: activeCategoryId,
          dashboardId: selectedDashboardId,
          tags: parsedTags,
          order: 9999, // default appended to end
          ownerId: userId
        });
      }

      onBookmarkSaved();
      onClose();
    } catch (e: any) {
      setError('Permission denied or invalid fields. Check your input size boundaries.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded bg-white shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="rounded bg-indigo-50 p-2 text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {bookmarkToEdit ? 'Edit Bookmark' : 'Add New Bookmark'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded bg-rose-50 p-3 text-rose-700 text-xs border border-rose-100">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL</label>
            <input
              type="text"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g. gmail.com, https://github.com"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition text-slate-850"
            />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Gmail Inbox, Github Account"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition text-slate-850"
            />
          </div>

          {/* Destination Dashboard Tab Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dashboard Tab</label>
              <select
                value={selectedDashboardId}
                onChange={e => {
                  setSelectedDashboardId(e.target.value);
                  setSelectedCategoryId(''); // trigger reset
                }}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition text-slate-850 cursor-pointer"
              >
                <option value="" disabled>Select tab...</option>
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Category selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Card</label>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> New Card
                </button>
              </div>

              {!showNewCategoryInput ? (
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition text-slate-850 cursor-pointer"
                >
                  <option value="" disabled>Select category...</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="New Card Name..."
                    className="flex-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-hidden transition text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={loading || !newCategoryName.trim()}
                    className="rounded bg-indigo-500 text-white px-2.5 py-1 text-xs font-bold hover:bg-indigo-600 disabled:opacity-50 transition cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description / Notes</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add optional notes about this utility site..."
              rows={2}
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition resize-none text-slate-850"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. dev, workspace, social, daily"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden transition text-slate-855"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-indigo-500 text-white px-5 py-2 text-xs font-bold hover:bg-indigo-600 shadow-md shadow-indigo-500/10 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Saving...' : bookmarkToEdit ? 'Save Changes' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
