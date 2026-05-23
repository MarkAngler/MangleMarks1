import React, { useState } from 'react';
import { Category, Bookmark } from '../types';
import { deleteBookmark, deleteCategory, updateCategory, updateBookmark } from '../lib/db';
import ConfirmationModal from './ConfirmationModal';
import { 
  MoreVertical, 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Folder, 
  Check, 
  X,
  ExternalLink,
  ChevronRight,
  ArrowDownAz,
  ArrowUpAz,
  ArrowUpDown,
  Clock
} from 'lucide-react';

interface CategoryCardProps {
  key?: any;
  category: Category;
  bookmarks: Bookmark[];
  onAddBookmarkToCategory: (categoryId: string) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
  onRefreshData: () => void;
  allCategories: Category[];
  onCategoryDrop?: (e: React.DragEvent, targetCategoryId: string) => void;
}

export default function CategoryCard({
  category,
  bookmarks,
  onAddBookmarkToCategory,
  onEditBookmark,
  onRefreshData,
  allCategories,
  onCategoryDrop
}: CategoryCardProps): React.JSX.Element {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showBookmarkMenuId, setShowBookmarkMenuId] = useState<string | null>(null);
  const [isDeleteCatModalOpen, setIsDeleteCatModalOpen] = useState(false);
  const [bookmarkIdToDelete, setBookmarkIdToDelete] = useState<string | null>(null);

  // Local drag highlights states
  const [isDragOverBookmarkArea, setIsDragOverBookmarkArea] = useState(false);
  const [isDragOverCardCategory, setIsDragOverCardCategory] = useState(false);
  const [draggedOverBookmarkId, setDraggedOverBookmarkId] = useState<string | null>(null);

  // Sorting bookmarks strictly by order parameter matching or selected sort mode
  const sortBy = category.sortBy || 'custom';
  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (sortBy === 'az') {
      const valA = (a.title || a.url || '').trim().toLowerCase();
      const valB = (b.title || b.url || '').trim().toLowerCase();
      return valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
    }
    if (sortBy === 'za') {
      const valA = (a.title || a.url || '').trim().toLowerCase();
      const valB = (b.title || b.url || '').trim().toLowerCase();
      return valB.localeCompare(valA, undefined, { sensitivity: 'base', numeric: true });
    }
    if (sortBy === 'newest') {
      let timeA = 0;
      let timeB = 0;
      if (a.createdAt) {
        if (typeof a.createdAt.toMillis === 'function') {
          timeA = a.createdAt.toMillis();
        } else if (a.createdAt.seconds) {
          timeA = a.createdAt.seconds * 1000;
        } else {
          timeA = new Date(a.createdAt).getTime();
        }
      }
      if (b.createdAt) {
        if (typeof b.createdAt.toMillis === 'function') {
          timeB = b.createdAt.toMillis();
        } else if (b.createdAt.seconds) {
          timeB = b.createdAt.seconds * 1000;
        } else {
          timeB = new Date(b.createdAt).getTime();
        }
      }
      return timeB - timeA;
    }
    return (a.order || 0) - (b.order || 0);
  });

  const handleUpdateSort = async (newSortMode: 'custom' | 'az' | 'za' | 'newest') => {
    try {
      await updateCategory(category.id, { sortBy: newSortMode });
      setShowCatMenu(false);
      onRefreshData();
    } catch (e) {
      console.error('Failed to update sorting mode:', e);
    }
  };

  // Category card dragging handlers
  const handleCategoryDragStart = (e: React.DragEvent) => {
    (window as any).draggedItemType = 'category';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'category',
      categoryId: category.id,
      sourceColumn: category.column
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragEnd = () => {
    (window as any).draggedItemType = null;
  };

  // Bookmark dragging handlers
  const handleBookmarkDragStart = (e: React.DragEvent, bookmark: Bookmark) => {
    e.stopPropagation(); // Avoid triggering card-level dragging
    (window as any).draggedItemType = 'bookmark';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'bookmark',
      bookmarkId: bookmark.id,
      sourceCategoryId: bookmark.categoryId
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBookmarkDragEnd = () => {
    (window as any).draggedItemType = null;
    setDraggedOverBookmarkId(null);
  };

  // Card drop areas
  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const type = (window as any).draggedItemType;
    if (type === 'bookmark') {
      setIsDragOverBookmarkArea(true);
    } else if (type === 'category') {
      setIsDragOverCardCategory(true);
    }
  };

  const handleCardDragLeave = () => {
    setIsDragOverBookmarkArea(false);
    setIsDragOverCardCategory(false);
  };

  const handleCardDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBookmarkArea(false);
    setIsDragOverCardCategory(false);
    
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      
      if (data.type === 'bookmark') {
        const draggedId = data.bookmarkId;
        const sourceCategoryId = data.sourceCategoryId;
        const targetCategoryId = category.id;

        if (category.sortBy && category.sortBy !== 'custom') {
          await updateCategory(category.id, { sortBy: 'custom' });
        }

        if (sourceCategoryId === targetCategoryId) {
          // Reorder within active card at the end
          let list = [...bookmarks].sort((a, b) => (a.order || 0) - (b.order || 0));
          const draggedItem = list.find(b => b.id === draggedId);
          if (!draggedItem) return;
          list = list.filter(b => b.id !== draggedId);
          list.push(draggedItem);
          for (let i = 0; i < list.length; i++) {
            if (list[i].order !== i) {
              await updateBookmark(list[i].id, { order: i });
            }
          }
        } else {
          // Switch card and append to end
          const maxOrder = bookmarks.length > 0 ? Math.max(...bookmarks.map(b => b.order || 0)) + 1 : 0;
          await updateBookmark(draggedId, { categoryId: targetCategoryId, order: maxOrder });
        }
        onRefreshData();
      } else if (data.type === 'category') {
        const draggedId = data.categoryId;
        if (draggedId === category.id) return;
        
        if (onCategoryDrop) {
          onCategoryDrop(e, category.id);
        }
      }
    } catch (err) {
      console.error('Error on card drop handler:', err);
    }
  };

  // Drop on precise bookmark row reordering
  const handleBookmarkDropOnBookmark = async (e: React.DragEvent, targetBookmark: Bookmark, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverBookmarkId(null);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data.type !== 'bookmark') return;

      const draggedId = data.bookmarkId;
      const sourceCategoryId = data.sourceCategoryId;
      const targetCategoryId = category.id;

      if (draggedId === targetBookmark.id) return;

      if (category.sortBy && category.sortBy !== 'custom') {
        await updateCategory(category.id, { sortBy: 'custom' });
      }

      let list = [...bookmarks].sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedItem = list.find(b => b.id === draggedId) || { id: draggedId, categoryId: sourceCategoryId } as Bookmark;
      
      list = list.filter(b => b.id !== draggedId);
      list.splice(targetIdx, 0, draggedItem);

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const newOrder = i;
        const isDragged = item.id === draggedId;
        
        if (isDragged) {
          await updateBookmark(draggedId, { categoryId: targetCategoryId, order: newOrder });
        } else if (item.order !== newOrder) {
          await updateBookmark(item.id, { order: newOrder });
        }
      }
      onRefreshData();
    } catch (err) {
      console.error('Error in drop-on-bookmark:', err);
    }
  };

  async function handleRenameCategory() {
    if (!editedName.trim() || editedName.trim() === category.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateCategory(category.id, { name: editedName.trim() });
      setIsEditingName(false);
      onRefreshData();
    } catch (e) {
      console.error('Failed to rename category:', e);
    }
  }

  async function confirmDeleteCategory() {
    try {
      await deleteCategory(category.id, bookmarks.map(b => b.id));
      onRefreshData();
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  }

  async function handleMoveCategoryColumn(direction: 'left' | 'right') {
    let currentColumn = category.column || 0;
    let targetColumn = direction === 'left' ? currentColumn - 1 : currentColumn + 1;
    if (targetColumn < 0) targetColumn = 0;
    if (targetColumn > 2) targetColumn = 2; // bound to 3 columns max

    try {
      await updateCategory(category.id, { column: targetColumn });
      onRefreshData();
      setShowCatMenu(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function confirmDeleteBookmark() {
    if (!bookmarkIdToDelete) return;
    try {
      await deleteBookmark(bookmarkIdToDelete);
      onRefreshData();
    } catch (e) {
      console.error('Failed to delete bookmark:', e);
    } finally {
      setBookmarkIdToDelete(null);
    }
  }

  async function handleMoveBookmark(bookmark: Bookmark, direction: 'up' | 'down') {
    const list = sortedBookmarks;
    const index = list.findIndex(b => b.id === bookmark.id);
    if (index === -1) return;

    let targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap sorting order
    const currentItem = list[index];
    const siblingItem = list[targetIndex];
    
    // Save current orders
    const currentOrder = currentItem.order || 0;
    const siblingOrder = siblingItem.order || 0;

    try {
      // Invert orders
      await updateBookmark(currentItem.id, { order: siblingOrder });
      await updateBookmark(siblingItem.id, { order: currentOrder });
      onRefreshData();
      setShowBookmarkMenuId(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMoveBookmarkToCategory(bookmark: Bookmark, targetCategoryId: string) {
    try {
      await updateBookmark(bookmark.id, { categoryId: targetCategoryId });
      onRefreshData();
      setShowBookmarkMenuId(null);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div 
      draggable={!isEditingName}
      onDragStart={handleCategoryDragStart}
      onDragEnd={handleCategoryDragEnd}
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
      className={`rounded border bg-white shadow-xs flex flex-col max-h-[480px] transition-all duration-200 ${
        isDragOverCardCategory ? 'ring-2 ring-teal-500 scale-[1.01] shadow-md border-teal-300' : 'border-slate-200'
      }`}
    >
      
      {/* Category Header */}
      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-3 py-2 rounded-t shrink-0 cursor-grab active:cursor-grabbing">
        <div className="flex-1 flex items-center min-w-0 mr-2">
          <Folder className="h-3.5 w-3.5 text-indigo-500 mr-1.5 shrink-0" />
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full">
              <input
                type="text"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameCategory();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-indigo-400 rounded px-1.5 py-0.5 focus:outline-hidden"
                autoFocus
              />
              <button onClick={handleRenameCategory} className="text-indigo-600 hover:text-indigo-700">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setIsEditingName(false)} className="text-slate-400 hover:text-slate-655">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <h4 
              className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-indigo-600 flex items-center gap-1.5 w-full"
              onClick={() => {
                setEditedName(category.name);
                setIsEditingName(true);
              }}
              title="Click to rename"
            >
              <span className="truncate">{category.name}</span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono shrink-0">({bookmarks.length})</span>
              {category.sortBy === 'az' && <ArrowDownAz className="h-3 w-3 text-indigo-500 shrink-0" title="Sorted Alphabetically (A-Z)" />}
              {category.sortBy === 'za' && <ArrowUpAz className="h-3 w-3 text-indigo-500 shrink-0" title="Sorted Reverse Alphabetically (Z-A)" />}
              {category.sortBy === 'newest' && <Clock className="h-3 w-3 text-indigo-500 shrink-0" title="Sorted by Newest Added" />}
            </h4>
          )}
        </div>

        {/* Header Actions Menu */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => onAddBookmarkToCategory(category.id)}
            title="Add link to card"
            className="rounded p-1 hover:bg-slate-150 text-indigo-550 hover:text-indigo-600 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => {
              setShowCatMenu(!showCatMenu);
              setShowBookmarkMenuId(null);
            }}
            className="rounded p-1 hover:bg-slate-150 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {/* Category Dropdown Context Menu */}
          {showCatMenu && (
            <div className="absolute right-0 top-6 z-20 w-44 rounded bg-white py-1 shadow-md border border-slate-200 text-xs text-slate-700">
              <button
                onClick={() => {
                  setIsEditingName(true);
                  setShowCatMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="h-3 w-3" /> Rename Card
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              
              {/* Column shift triggers */}
              <div className="px-3 py-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Shift Column
              </div>
              <div className="flex px-2 pb-1.5 gap-1 justify-between">
                <button
                  onClick={() => handleMoveCategoryColumn('left')}
                  disabled={category.column === 0}
                  className="flex-1 rounded border py-0.5 flex justify-center text-slate-600 hover:bg-slate-50 border-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] font-mono font-bold pt-0.5 text-slate-500">Col {category.column + 1}</span>
                <button
                  onClick={() => handleMoveCategoryColumn('right')}
                  disabled={category.column === 2}
                  className="flex-1 rounded border py-0.5 flex justify-center text-slate-600 hover:bg-slate-50 border-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="border-t border-slate-100 my-1"></div>
              
              {/* Sorting options */}
              <div className="px-3 py-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Sort Bookmarks
              </div>
              <button
                onClick={() => handleUpdateSort('custom')}
                className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${(category.sortBy || 'custom') === 'custom' ? 'text-indigo-600 font-bold' : 'text-slate-650 font-medium'}`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="h-3 w-3" /> Custom (Manual)
                </span>
                {(category.sortBy || 'custom') === 'custom' && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => handleUpdateSort('az')}
                className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${category.sortBy === 'az' ? 'text-indigo-600 font-bold' : 'text-slate-650 font-medium'}`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowDownAz className="h-3 w-3" /> Alphabetical A-Z
                </span>
                {category.sortBy === 'az' && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => handleUpdateSort('za')}
                className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${category.sortBy === 'za' ? 'text-indigo-600 font-bold' : 'text-slate-650 font-medium'}`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpAz className="h-3 w-3" /> Alphabetical Z-A
                </span>
                {category.sortBy === 'za' && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => handleUpdateSort('newest')}
                className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${category.sortBy === 'newest' ? 'text-indigo-600 font-bold' : 'text-slate-650 font-medium'}`}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Date Added (New)
                </span>
                {category.sortBy === 'newest' && <Check className="h-3.5 w-3.5" />}
              </button>

              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setIsDeleteCatModalOpen(true);
                  setShowCatMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-semibold cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-rose-500" /> Delete Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bookmarks List Container */}
      <div className={`flex-1 overflow-y-auto px-1 py-1 divide-y divide-slate-100 custom-scrollbar transition-colors duration-250 ${
        isDragOverBookmarkArea ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-200' : ''
      }`}>
        {sortedBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <Folder className="h-5 w-5 text-slate-300 stroke-1 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold">No links in this card</span>
            <button
              onClick={() => onAddBookmarkToCategory(category.id)}
              className="mt-1 pb-0.5 text-[9px] font-bold text-indigo-500 hover:underline cursor-pointer"
            >
              Add Link
            </button>
          </div>
        ) : (
          sortedBookmarks.map((bookmark, idx) => {
            // Obtain Domain from URL for beautiful details visualization
            let domain = '';
            try {
              domain = new URL(bookmark.url).hostname;
            } catch (e) {
              domain = bookmark.url;
            }

            const isBookmarkRowHovered = draggedOverBookmarkId === bookmark.id;

            return (
              <div
                key={bookmark.id}
                draggable={true}
                onDragStart={(e) => handleBookmarkDragStart(e, bookmark)}
                onDragEnd={handleBookmarkDragEnd}
                onDragOver={(e) => {
                  if ((window as any).draggedItemType === 'bookmark') {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggedOverBookmarkId(bookmark.id);
                  }
                }}
                onDragLeave={() => {
                  setDraggedOverBookmarkId(null);
                }}
                onDrop={(e) => handleBookmarkDropOnBookmark(e, bookmark, idx)}
                className={`group relative flex items-start py-1.5 px-2 rounded cursor-grab active:cursor-grabbing transition-all duration-150 ${
                  isBookmarkRowHovered 
                    ? 'bg-indigo-100/55 border-b-2 border-dashed border-indigo-400 pb-3 h-[72px]' 
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Visual favicon / icon fallback */}
                <div className="mt-0.5 h-4 w-4 bg-slate-100 text-indigo-700 rounded shrink-0 flex items-center justify-center font-bold text-[9px] border border-slate-200 mr-2 overflow-hidden">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="h-3 w-3"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Info summary */}
                <div className="flex-1 min-w-0 space-y-0.5 leading-snug">
                  <div className="flex items-center justify-start gap-1">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-900 hover:text-indigo-650 hover:underline break-all truncate block"
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </a>
                    <ExternalLink className="h-2.5 w-2.5 text-slate-400 inline shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                  
                  {bookmark.description && (
                    <p className="text-[10px] text-slate-450 leading-tight line-clamp-2 pr-1" title={bookmark.description}>
                      {bookmark.description}
                    </p>
                  )}

                  {/* List Tag badging */}
                  {bookmark.tags && bookmark.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 pt-0.5">
                      {bookmark.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mini context settings for bookmark */}
                <div className="relative shrink-0 select-none">
                  <button
                    onClick={() => {
                      setShowBookmarkMenuId(showBookmarkMenuId === bookmark.id ? null : bookmark.id);
                      setShowCatMenu(false);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>

                  {/* Bookmark Menu List */}
                  {showBookmarkMenuId === bookmark.id && (
                    <div className="absolute right-0 top-5 z-30 w-44 rounded bg-white py-1 shadow-md border border-slate-200 text-[11px] font-medium text-slate-700">
                      <button
                        onClick={() => {
                          onEditBookmark(bookmark);
                          setShowBookmarkMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-left hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" /> Edit Link
                      </button>

                      {(category.sortBy || 'custom') === 'custom' && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          {/* Direction reordering inside card */}
                          <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            Reorder Link
                          </div>
                          <div className="flex px-1.5 pb-1 gap-1">
                            <button
                              onClick={() => handleMoveBookmark(bookmark, 'up')}
                              disabled={idx === 0}
                              className="flex-1 rounded border py-0.5 flex justify-center text-slate-500 hover:bg-slate-50 border-slate-200 disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => handleMoveBookmark(bookmark, 'down')}
                              disabled={idx === sortedBookmarks.length - 1}
                              className="flex-1 rounded border py-0.5 flex justify-center text-slate-500 hover:bg-slate-50 border-slate-200 disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Move to another category container */}
                      {allCategories.length > 1 && (
                        <>
                          <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            Move Container
                          </div>
                          <div className="max-h-24 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
                            {allCategories
                              .filter(c => c.id !== category.id && c.dashboardId === category.dashboardId)
                              .map(otherCat => (
                                <button
                                  key={otherCat.id}
                                  onClick={() => handleMoveBookmarkToCategory(bookmark, otherCat.id)}
                                  className="w-full text-left truncate px-1.5 py-1 rounded hover:bg-indigo-50 text-slate-655 hover:text-indigo-600 flex items-center gap-0.5 text-[10px] cursor-pointer"
                                >
                                  <ChevronRight className="h-2.5 w-2.5 text-indigo-500" />
                                  {otherCat.name}
                                </button>
                              ))}
                          </div>
                          <div className="border-t border-slate-100 my-1"></div>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setBookmarkIdToDelete(bookmark.id);
                          setShowBookmarkMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 text-rose-500" /> Remove Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={isDeleteCatModalOpen}
        onClose={() => setIsDeleteCatModalOpen(false)}
        onConfirm={confirmDeleteCategory}
        title="Delete Card Category"
        message={`Are you sure you want to delete "${category.name}"? This will recursively delete all ${bookmarks.length} links inside it.`}
      />

      <ConfirmationModal
        isOpen={bookmarkIdToDelete !== null}
        onClose={() => setBookmarkIdToDelete(null)}
        onConfirm={confirmDeleteBookmark}
        title="Remove Bookmark Link"
        message="Are you sure you want to remove this link from your bookmarks?"
      />
    </div>
  );
}
