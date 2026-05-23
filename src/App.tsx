import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { createDashboard, createCategory, updateDashboardName, updateDashboardOrder, deleteDashboard, createBookmark, updateCategory } from './lib/db';
import { Dashboard, Category, Bookmark } from './types';
import AuthPage from './components/AuthPage';
import CategoryCard from './components/CategoryCard';
import AddEditBookmarkModal from './components/AddEditBookmarkModal';
import ImportModal from './components/ImportModal';
import BookmarkletSection from './components/BookmarkletSection';
import ConfirmationModal from './components/ConfirmationModal';
import { 
  Sparkles, 
  Plus, 
  Upload, 
  LogOut, 
  Search, 
  Hash, 
  Layout, 
  Settings, 
  Trash2, 
  Grid,
  TrendingUp,
  Columns,
  ChevronRight,
  HelpCircle,
  FileCode,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Firestore Data State
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // UI state
  const [activeDashboardId, setActiveDashboardId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals state
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [bookmarkToEdit, setBookmarkToEdit] = useState<Bookmark | null>(null);
  const [defaultCategoryIdForNew, setDefaultCategoryIdForNew] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showBookmarkletGuide, setShowBookmarkletGuide] = useState(false);

  // Dynamic Dashboard controls
  const [showNewTabInput, setShowNewTabInput] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [tabToDelete, setTabToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add category card input
  const [showNewCatInput, setShowNewCatInput] = useState<number | null>(null); // column index
  const [newCatName, setNewCatName] = useState('');

  // Drag over column tracking state
  const [draggedOverCol, setDraggedOverCol] = useState<number | null>(null);

  // Bookmarklet popup flows state
  const [isBookmarkletMode, setIsBookmarkletMode] = useState(false);
  const [bmlUrl, setBmlUrl] = useState('');
  const [bmlTitle, setBmlTitle] = useState('');
  const [bmlSaved, setBmlSaved] = useState(false);
  const [bmlError, setBmlError] = useState('');

  // Helper to extract a URL from shared text parameter
  const extractUrlFromText = (input: string | null): string => {
    if (!input) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = input.match(urlRegex);
    return match ? match[0] : input;
  };

  // Check URL parameters on mount and cache them securely
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check possible url parameters sent by web share targets or bookmarklets
    const rawUrl = params.get('url') || params.get('add_url') || params.get('text');
    const rawTitle = params.get('title') || params.get('add_title');
    
    if (rawUrl) {
      const cleanUrl = extractUrlFromText(rawUrl);
      if (cleanUrl && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
        sessionStorage.setItem('pending_share_url', cleanUrl);
        sessionStorage.setItem('pending_share_title', rawTitle || '');
        
        // Clean URL params immediately so subsequent interactions don't trigger share target again
        const cleanUri = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUri);
      }
    }
  }, []);

  // Hydrate pending share from sessionStorage once user login state resolves
  useEffect(() => {
    if (user) {
      const pendingUrl = sessionStorage.getItem('pending_share_url');
      const pendingTitle = sessionStorage.getItem('pending_share_title');
      if (pendingUrl) {
        setIsBookmarkletMode(true);
        setBmlUrl(pendingUrl);
        setBmlTitle(pendingTitle || '');
        // Clear pending session items once hydrated
        sessionStorage.removeItem('pending_share_url');
        sessionStorage.removeItem('pending_share_title');
      }
    }
  }, [user]);

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync state data in real-time when user logged in
  useEffect(() => {
    if (!user) {
      setDashboards([]);
      setCategories([]);
      setBookmarks([]);
      setInitialLoadComplete(false);
      return;
    }

    setDataLoading(true);

    const uid = user.uid;

    // Realtime Dashboards
    const qDash = query(collection(db, 'dashboards'), where('ownerId', '==', uid));
    const unsubDash = onSnapshot(qDash, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dashboard));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setDashboards(list);

      // Default active tab if none set
      if (list.length > 0) {
        setActiveDashboardId((prev) => {
          if (prev && list.some(d => d.id === prev)) return prev;
          return list[0].id;
        });
      }
      setInitialLoadComplete(true);
    });

    // Realtime Categories
    const qCat = query(collection(db, 'categories'), where('ownerId', '==', uid));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
    });

    // Realtime Bookmarks
    const qBook = query(collection(db, 'bookmarks'), where('ownerId', '==', uid));
    const unsubBook = onSnapshot(qBook, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark));
      setBookmarks(list);
      setDataLoading(false);
    });

    return () => {
      unsubDash();
      unsubCat();
      unsubBook();
    };
  }, [user]);

  // Handle bootstrap if user logins but database has no dashboards
  useEffect(() => {
    if (user && initialLoadComplete && dashboards.length === 0) {
      // auto bootstrap initial layout
      bootstrapDefaultSchema(user.uid);
    }
  }, [user, dashboards, initialLoadComplete]);

  async function bootstrapDefaultSchema(uid: string) {
    try {
      const d1Id = await createDashboard('Work', uid, 0);
      const d2Id = await createDashboard('Personal', uid, 1);
      
      const c1Id = await createCategory('Coding Workspace', d1Id, uid, 0, 0);
      const c2Id = await createCategory('Tech News & Feeds', d1Id, uid, 1, 0);
      const c3Id = await createCategory('Search Engines', d1Id, uid, 2, 0);

      const pc1Id = await createCategory('Entertainment', d2Id, uid, 0, 0);

      // Seed bookmarks
      await createBookmark({
        url: 'https://github.com',
        title: 'GitHub Developer Platform',
        description: 'Where the world builds software',
        categoryId: c1Id,
        dashboardId: d1Id,
        tags: ['workspace', 'dev'],
        order: 0,
        ownerId: uid
      });

      await createBookmark({
        url: 'https://news.ycombinator.com',
        title: 'Hacker News',
        description: 'Social aggregate for devs and start-ups.',
        categoryId: c2Id,
        dashboardId: d1Id,
        tags: ['news', 'dev'],
        order: 0,
        ownerId: uid
      });

      await createBookmark({
        url: 'https://google.com',
        title: 'Google Search Engine',
        description: 'Explore web resources.',
        categoryId: c3Id,
        dashboardId: d1Id,
        tags: ['workspace'],
        order: 0,
        ownerId: uid
      });

    } catch (e) {
      console.error('Bootstrapping error:', e);
    }
  }

  // Handle bookmarklet saving in isolated view
  async function handleBookmarkletSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!activeDashboardId) {
      setBmlError('Please wait for dashboards to load.');
      return;
    }

    // Capture standard categories inside active dashboard
    const activeCats = categories.filter(c => c.dashboardId === activeDashboardId);
    let targetCatId = defaultCategoryIdForNew;
    
    try {
      setBmlError('');
      // If no category exists or selected, make one on the fly
      if (!targetCatId) {
        if (activeCats.length > 0) {
          targetCatId = activeCats[0].id;
        } else {
          // Create "Inbox" category
          targetCatId = await createCategory('Inbox', activeDashboardId, user.uid, 0, 0);
        }
      }

      await createBookmark({
        url: bmlUrl,
        title: bmlTitle,
        description: 'Saved via Bookmarking Bar',
        categoryId: targetCatId,
        dashboardId: activeDashboardId,
        tags: ['bookmarklet'],
        order: 9999,
        ownerId: user.uid
      });

      setBmlSaved(true);
      setTimeout(() => {
        window.close();
      }, 1600);
    } catch (err) {
      setBmlError('Could not save bookmarklet. Ensure you are logged in correctly.');
    }
  }

  // Sign out helper
  const handleLogout = () => signOut(auth);

  // Top tabs addition controls
  async function handleAddTab() {
    if (!newTabName.trim() || !user) return;
    try {
      const order = dashboards.length;
      const newId = await createDashboard(newTabName.trim(), user.uid, order);
      setNewTabName('');
      setShowNewTabInput(false);
      setActiveDashboardId(newId);
    } catch (e) {
      alert('Error creating dashboard tab.');
    }
  }

  async function handleRenameTab() {
    if (!editingTabId || !editingTabName.trim()) return;
    try {
      await updateDashboardName(editingTabId, editingTabName.trim());
      setEditingTabId(null);
    } catch (e) {
      alert('Error renaming tab.');
    }
  }

  async function confirmDeleteTab() {
    if (!tabToDelete) return;
    const { id } = tabToDelete;
    try {
      const matchingCategories = categories.filter(c => c.dashboardId === id).map(c => c.id);
      const matchingBookmarks = bookmarks.filter(b => b.dashboardId === id).map(b => b.id);
      
      await deleteDashboard(id, matchingCategories, matchingBookmarks);
      
      if (activeDashboardId === id && dashboards.length > 1) {
        const remaining = dashboards.filter(d => d.id !== id);
        setActiveDashboardId(remaining[0].id);
      }
    } catch (e) {
      console.error('Error deleting dashboard:', e);
    } finally {
      setTabToDelete(null);
    }
  }

  // Category addition
  async function handleAddCategoryInColumn(colIndex: number) {
    if (!newCatName.trim() || !user || !activeDashboardId) return;
    try {
      const colCats = categories.filter(c => c.dashboardId === activeDashboardId && c.column === colIndex);
      await createCategory(
        newCatName.trim(),
        activeDashboardId,
        user.uid,
        colIndex,
        colCats.length
      );
      setNewCatName('');
      setShowNewCatInput(null);
    } catch (e) {
      alert('Error creating category.');
    }
  }

  // Handle category card moving across columns & reordering
  async function handleCategoryMove(draggedId: string, targetCol: number, targetIdx: number) {
    try {
      const activeCats = categories.filter(c => c.dashboardId === activeDashboardId);
      
      // Separate target column categories (sorted by order, excluding the dragged item itself)
      let targetColCats = activeCats
        .filter(c => c.column === targetCol && c.id !== draggedId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const draggedCat = categories.find(c => c.id === draggedId);
      if (!draggedCat) return;

      // Drop on a specific index, or append if targetIdx is out of bounds
      if (targetIdx >= 0 && targetIdx < targetColCats.length) {
        targetColCats.splice(targetIdx, 0, draggedCat);
      } else {
        targetColCats.push(draggedCat);
      }

      // Bulk write database elements to sync correct columns and orders
      for (let i = 0; i < targetColCats.length; i++) {
        const catItem = targetColCats[i];
        if (catItem.id === draggedId) {
          await updateCategory(draggedId, { column: targetCol, order: i });
        } else if (catItem.order !== i || catItem.column !== targetCol) {
          await updateCategory(catItem.id, { column: targetCol, order: i });
        }
      }

      // If dragged from another column, also fix sequential orders for the source column categories
      const sourceCol = draggedCat.column;
      if (sourceCol !== targetCol) {
        const sourceColCats = activeCats
          .filter(c => c.column === sourceCol && c.id !== draggedId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        for (let i = 0; i < sourceColCats.length; i++) {
          const catItem = sourceColCats[i];
          if (catItem.order !== i) {
            await updateCategory(catItem.id, { order: i });
          }
        }
      }
    } catch (err) {
      console.error('Failed to move category card:', err);
    }
  }

  // Tag list extract
  const allTags = Array.from(
    new Set(bookmarks.flatMap(b => b.tags || []))
  ).filter((t): t is string => typeof t === 'string' && t.length > 0);

  // Search filter and tag filtering
  const filteredBookmarks = bookmarks.filter(b => {
    // Check search queries
    const searchLow = searchText.toLowerCase();
    const matchesSearch = 
      b.title.toLowerCase().includes(searchLow) ||
      b.url.toLowerCase().includes(searchLow) ||
      (b.description || '').toLowerCase().includes(searchLow) ||
      b.tags.some(t => t.toLowerCase().includes(searchLow));

    const matchesTag = selectedTag ? b.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  // Groups/Categories inside the active, filtered workspace
  const activeCategories = categories.filter(c => c.dashboardId === activeDashboardId);

  // Columns layout sorting
  const categoriesInCol = (colIdx: number) => {
    return activeCategories.filter(c => c.column === colIdx);
  };

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
  const activeDashboardBookmarksCount = bookmarks.filter(b => b.dashboardId === activeDashboardId).length;
  const activeDashboardCategoriesCount = activeCategories.length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center font-sans">
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded bg-indigo-500 animate-spin flex items-center justify-center text-white font-bold text-lg">
            M
          </div>
          <span className="text-xs font-bold text-slate-500 tracking-wider uppercase animate-pulse">
            Booting MangleMarks...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Check if Bookmarklet or Mobile Share Target Mode
  if (isBookmarkletMode) {
    const activeCats = categories.filter(c => c.dashboardId === activeDashboardId);
    
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans flex flex-col max-w-md mx-auto justify-between shadow-2xl">
        
        {/* Header toolbar */}
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center bg-slate-900 sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-500 fill-white flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/20">
              M
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight">Quick Link Saver</h3>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider leading-none">Shared from device</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsBookmarkletMode(false);
              setBmlSaved(false);
            }}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold px-2.5 py-1.5 rounded transition cursor-pointer"
          >
            Dashboard
          </button>
        </div>
 
        {/* Content widget */}
        <div className="flex-1 py-6 flex flex-col justify-center overflow-y-auto">
          {bmlSaved ? (
            <div className="flex flex-col items-center justify-center text-center space-y-5 py-8">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-xl text-white">Bookmark Saved!</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Your shared link is safely stored in MangleMarks under your selected category.
                </p>
              </div>
              
              <div className="flex flex-col gap-2.5 w-full pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookmarkletMode(false);
                    setBmlSaved(false);
                    setBmlUrl('');
                    setBmlTitle('');
                  }}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                >
                  Open My Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBmlSaved(false);
                    setBmlUrl('');
                    setBmlTitle('');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-lg transition cursor-pointer"
                >
                  Save Another Link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBookmarkletSave} className="space-y-4">
              {bmlError && (
                <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg p-3 text-xs flex gap-2 items-center">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bmlError}</span>
                </div>
              )}
 
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Page Title</label>
                <input
                  type="text"
                  required
                  value={bmlTitle}
                  onChange={e => setBmlTitle(e.target.value)}
                  placeholder="Enter page title..."
                  className="w-full text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition placeholder-slate-500"
                />
              </div>
 
              <div className="space-y-1.5 font-mono">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Page URL</label>
                <input
                  type="text"
                  required
                  value={bmlUrl}
                  onChange={e => setBmlUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition placeholder-slate-600"
                />
              </div>
 
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Dashboard Tab</label>
                  <select
                    value={activeDashboardId}
                    onChange={e => {
                      setActiveDashboardId(e.target.value);
                      setDefaultCategoryIdForNew('');
                    }}
                    className="w-full text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2.5 focus:border-indigo-500 focus:outline-none transition"
                  >
                    {dashboards.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                    ))}
                  </select>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Category Card</label>
                  <select
                    value={defaultCategoryIdForNew}
                    onChange={e => setDefaultCategoryIdForNew(e.target.value)}
                    className="w-full text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2.5 focus:border-indigo-500 focus:outline-none transition"
                  >
                    <option value="" className="bg-slate-900">(Auto: First Space Card)</option>
                    {activeCats.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
 
              <button
                type="submit"
                className="w-full mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Add to MangleMarks
              </button>
            </form>
          )}
        </div>
 
        {/* Footer info switcher */}
        <div className="border-t border-slate-800 pt-3 text-center text-[10px] text-slate-400">
          Logged in as <span className="font-bold text-slate-300">{user.email}</span> &middot; Secure PWA Saver
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col selection:bg-indigo-100 selection:text-indigo-900 select-none">
      
      {/* 1. Header Toolbar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 shadow-md border-b border-slate-700 z-40 sticky top-0">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-505 rounded flex items-center justify-center font-bold text-lg text-white bg-indigo-500">M</div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            MangleMarks
          </h1>
        </div>

        {/* Core Search Frame */}
        <div className="flex-1 max-w-md mx-8 relative">
          <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-slate-800 text-xs rounded border border-slate-700 py-1.5 pl-8 pr-3 outline-none text-slate-100 placeholder-slate-400 focus:border-indigo-505 focus:border-indigo-500 transition"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-2 rounded-full p-0.5 hover:bg-slate-700 text-xs text-slate-400 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* User & Settings Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBookmarkToEdit(null);
              setIsBookmarkModalOpen(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded text-xs font-bold text-white transition active:scale-95 duration-100 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            + ADD
          </button>

          {/* Importer helper tab trigger */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-slate-700 text-xs px-3 py-1.5 rounded border border-slate-600 font-medium hover:bg-slate-650 hover:bg-slate-600 text-white transition cursor-pointer flex items-center gap-1"
            title="Import Bookmarks HTML"
          >
            <Upload className="h-4 w-4" />
            IMPORT FILE
          </button>

          {/* Bookmarklet Section guide trigger */}
          <button
            onClick={() => setShowBookmarkletGuide(!showBookmarkletGuide)}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition cursor-pointer flex items-center gap-1 ${
              showBookmarkletGuide 
                ? 'bg-indigo-600 border-indigo-500 text-white' 
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-white'
            }`}
            title="Install Bookmarklet"
          >
            <FileCode className="h-4 w-4" />
            BOOKMARKLET
          </button>

          {/* Log out details layout */}
          <div className="border-l border-slate-700 pl-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center text-xs text-white uppercase font-bold font-mono" title={user.email || ''}>
              {user.email ? user.email.slice(0, 2) : 'JD'}
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1.5 bg-slate-800 hover:bg-rose-950/20 text-rose-450 text-rose-400 hover:text-rose-300 cursor-pointer transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6 flex flex-col md:overflow-hidden min-h-0">
        
        {/* Toggle Bookmarklet Instructions Panel */}
        <AnimatePresence>
          {showBookmarkletGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2 shrink-0"
            >
              <BookmarkletSection />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Dashboards and Navigation Tabs Row */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-4 select-none shrink-0">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {dashboards.map((dash, index) => {
              const isActive = dash.id === activeDashboardId;
              const isEditing = dash.id === editingTabId;

              return (
                <div key={dash.id} className="relative group flex items-center">
                  {isEditing ? (
                    <div className="flex items-center bg-white border border-indigo-500 rounded px-2.5 py-1.5 shadow-sm text-xs">
                      <input
                        type="text"
                        value={editingTabName}
                        onChange={e => setEditingTabName(e.target.value)}
                        onBlur={handleRenameTab}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameTab();
                          if (e.key === 'Escape') setEditingTabId(null);
                        }}
                        className="font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveDashboardId(dash.id);
                        setSelectedTag(null); // clear tag filtering on tab switch
                      }}
                      onDoubleClick={() => {
                        setEditingTabId(dash.id);
                        setEditingTabName(dash.name);
                      }}
                      className={`relative font-semibold text-xs px-3 py-1.5 rounded transition duration-150 flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-indigo-500 text-white shadow shadow-indigo-500/20'
                          : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      <Grid className="h-3.5 w-3.5" />
                      {dash.name}
                      
                      {/* Secondary reordering index details on tabs bar */}
                      <span className="text-[9px] opacity-40 font-mono">#{index + 1}</span>
                    </button>
                  )}

                  {/* Secondary settings action button when hovering tab */}
                  {!isEditing && (
                    <div className="absolute right-1.5 top-1 opacity-0 group-hover:opacity-100 flex gap-0.5 rounded bg-slate-100 z-10 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTabId(dash.id);
                          setEditingTabName(dash.name);
                        }}
                        className="p-0.5 text-slate-500 hover:text-slate-850 text-[10px]"
                        title="Rename Tab"
                      >
                        ✎
                      </button>
                      {dashboards.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTabToDelete({ id: dash.id, name: dash.name });
                          }}
                          className="p-0.5 text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                          title="Delete Tab"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Inline Dashboard creation trigger */}
            {showNewTabInput ? (
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
                <input
                  type="text"
                  placeholder="New tab name..."
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTab();
                    if (e.key === 'Escape') setShowNewTabInput(false);
                  }}
                  className="text-xs text-slate-700 focus:outline-hidden"
                  autoFocus
                />
                <button onClick={handleAddTab} className="text-indigo-600 hover:text-indigo-700 text-xs font-bold">
                  Add
                </button>
                <button onClick={() => setShowNewTabInput(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewTabName('');
                  setShowNewTabInput(true);
                }}
                className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-705 flex items-center gap-1 bg-transparent transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New Tab
              </button>
            )}
          </div>

          {/* Quick Stats overview tag lists */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 text-xs shrink-0 max-w-full overflow-x-auto py-1 whitespace-nowrap scrollbar-none">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mr-1.5 flex items-center gap-0.5">
                <Hash className="h-3 w-3 inline text-slate-400" /> Filter Tags:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`rounded px-2.5 py-1 text-xs font-bold tracking-wide border transition ${
                  !selectedTag 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`rounded px-2.5 py-1 text-xs font-bold tracking-wide border transition flex items-center gap-1 ${
                    selectedTag === tag 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3.1 Dynamic High-Density Dashboard Heading Row */}
        <div className="flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{activeDashboard?.name || 'Workspace'}</h2>
            <div className="flex gap-1">
              <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] text-slate-650 font-bold uppercase tracking-wider">
                {activeDashboardBookmarksCount} Bookmarks
              </span>
              <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] text-slate-650 font-bold uppercase tracking-wider">
                {activeDashboardCategoriesCount} Groups
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Sort by:</span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 font-semibold shadow-xs select-none">
              Manual Drag
            </span>
          </div>
        </div>

        {/* 4. Kanban-Style Category Multi-Column Grid Layout */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden min-h-0 flex flex-col md:flex-row gap-6">
          
          {/* Main Desktop Columns Frame: Standard columns (0, 1, 2) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto md:overflow-y-auto pr-0 md:pr-1 custom-scrollbar">
            {[0, 1, 2].map((colIndex) => {
              const colCategories = categoriesInCol(colIndex);

              return (
                <div 
                  key={colIndex} 
                  className={`space-y-6 flex flex-col pt-1 rounded-xl p-2 transition-all duration-200 ${
                    draggedOverCol === colIndex ? 'bg-slate-100/60 ring-2 ring-dashed ring-indigo-300' : ''
                  }`}
                  onDragOver={(e) => {
                    if ((window as any).draggedItemType === 'category') {
                      e.preventDefault();
                      setDraggedOverCol(colIndex);
                    }
                  }}
                  onDragLeave={() => {
                    setDraggedOverCol(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggedOverCol(null);
                    try {
                      const rawData = e.dataTransfer.getData('text/plain');
                      if (!rawData) return;
                      const data = JSON.parse(rawData);
                      if (data.type === 'category') {
                        const draggedId = data.categoryId;
                        handleCategoryMove(draggedId, colIndex, -1);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  
                  {/* Column Header Metadata indicator */}
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      <Columns className="h-3.5 w-3.5 text-zinc-350" /> Column {colIndex + 1}
                    </span>
                    <button
                      onClick={() => setShowNewCatInput(colIndex)}
                      className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Add Card
                    </button>
                  </div>

                  {/* Inline creation field inside matching columns */}
                  {showNewCatInput === colIndex && (
                    <div className="bg-white rounded-xl border border-teal-200 p-3 shadow-xl space-y-2 shrink-0">
                      <input
                        type="text"
                        placeholder="Category Card title..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCategoryInColumn(colIndex);
                          if (e.key === 'Escape') setShowNewCatInput(null);
                        }}
                        className="w-full text-xs font-medium border rounded px-2.5 py-1.5 focus:border-teal-500 focus:outline-hidden"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setShowNewCatInput(null)}
                          className="px-2 py-1 text-[10px] text-zinc-500 rounded hover:bg-zinc-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddCategoryInColumn(colIndex)}
                          className="px-2.5 py-1 text-[10px] bg-teal-600 text-white font-semibold rounded hover:bg-teal-700"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render Categories assigned inside col */}
                  <div className="space-y-6">
                    {colCategories.map((cat) => {
                      // Filter bookmarks inside this category card
                      const catBookmarks = filteredBookmarks.filter(b => b.categoryId === cat.id);

                      return (
                        <CategoryCard
                          key={cat.id}
                          category={cat}
                          bookmarks={catBookmarks}
                          onAddBookmarkToCategory={(catId) => {
                            setDefaultCategoryIdForNew(catId);
                            setBookmarkToEdit(null);
                            setIsBookmarkModalOpen(true);
                          }}
                          onEditBookmark={(bookmark) => {
                            setBookmarkToEdit(bookmark);
                            setIsBookmarkModalOpen(true);
                          }}
                          onRefreshData={() => {}} // handeled dynamically by onSnapshot
                          allCategories={activeCategories}
                          onCategoryDrop={async (e, targetCatId) => {
                            try {
                              const rawData = e.dataTransfer.getData('text/plain');
                              if (!rawData) return;
                              const data = JSON.parse(rawData);
                              if (data.type !== 'category') return;

                              const draggedId = data.categoryId;
                              if (draggedId === targetCatId) return;

                              const targetCat = categories.find(c => c.id === targetCatId);
                              if (!targetCat) return;

                              // Find all category cards in target column
                              const colCats = categories
                                .filter(c => c.dashboardId === activeDashboardId && c.column === targetCat.column)
                                .sort((a, b) => (a.order || 0) - (b.order || 0));
                              
                              const targetIdx = colCats.findIndex(c => c.id === targetCatId);
                              await handleCategoryMove(draggedId, targetCat.column, targetIdx);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Simple Help instructions when column is empty */}
                  {colCategories.length === 0 && showNewCatInput !== colIndex && (
                    <div className="border border-dashed border-zinc-200 rounded-xl py-12 px-4 flex flex-col items-center justify-center text-center text-zinc-400">
                      <Layout className="h-5 w-5 stroke-1 text-zinc-300 mb-1" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-350">Column Empty</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5 max-w-[160px] leading-snug">
                        Create a Category Card grouping here to place links.
                      </p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* 5. Modals Container */}
      
      {/* Add / Edit Link Modal */}
      <AddEditBookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => {
          setIsBookmarkModalOpen(false);
          setBookmarkToEdit(null);
        }}
        bookmarkToEdit={bookmarkToEdit}
        dashboards={dashboards}
        categories={categories}
        userId={user.uid}
        onBookmarkSaved={() => {}} // dynamic real-time snapshots trigger updates
        defaultUrl={bmlUrl}
        defaultTitle={bmlTitle}
      />

      {/* Import Netscape HTML files / JSON backup modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        userId={user.uid}
        onImportComplete={() => {}}
      />

      {/* Confirmation Modal for Tab Deletion */}
      <ConfirmationModal
        isOpen={tabToDelete !== null}
        onClose={() => setTabToDelete(null)}
        onConfirm={confirmDeleteTab}
        title="Delete Tab Dashboard"
        message={`Are you sure you want to delete tab "${tabToDelete?.name}"? This will recursively delete all categories and bookmarks inside it.`}
      />

      {/* Footer Branding line */}
      <footer className="shrink-0 text-center py-4 text-xs text-zinc-450 border-t bg-white border-zinc-150 font-mono">
        MangleMarks Workspace &middot; Logged in as <span className="text-zinc-550 font-bold">{user.email}</span>
      </footer>

    </div>
  );
}
