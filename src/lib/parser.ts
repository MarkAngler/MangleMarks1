export interface ParsedBookmarkInput {
  title: string;
  url: string;
  description: string;
  tags: string[];
}

export interface ParsedCategoryInput {
  name: string;
  column: number;
  bookmarks: ParsedBookmarkInput[];
}

export interface ParsedDashboardInput {
  name: string;
  categories: ParsedCategoryInput[];
}

interface TempFolder {
  title: string;
  bookmarks: ParsedBookmarkInput[];
  subfolders: TempFolder[];
}

/**
 * Parses MangleMarks JSON or standard HTML (Netscape format) bookmark exports.
 */
export function parseBookmarkExport(text: string): ParsedDashboardInput[] {
  // 1. Try JSON parsing
  try {
    const json = JSON.parse(text);
    if (json && Array.isArray(json)) {
      // Direct array of dashboards
      return parseJsonData(json);
    } else if (json && typeof json === 'object') {
      if (Array.isArray(json.dashboards)) {
        return parseJsonData(json.dashboards);
      } else if (Array.isArray(json.bookmarks)) {
        // Flat bookmarks array
        return [{
          name: 'Imported Bookmarks',
          categories: [{
            name: 'General',
            column: 0,
            bookmarks: json.bookmarks.map((b: any) => ({
              title: b.title || b.name || 'Untitled',
              url: b.url || b.href || '',
              description: b.description || b.notes || '',
              tags: Array.isArray(b.tags) ? b.tags : []
            }))
          }]
        }];
      }
    }
  } catch (e) {
    // Not JSON, proceed to HTML Netscape parsing
  }

  // 2. Parse Netscape HTML Bookmark
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  
  // Find first DL element
  const firstDl = doc.querySelector('dl');
  if (!firstDl) {
    return [];
  }

  // Traverse and build a tree of folders and bookmarks
  const rootFolders: TempFolder[] = [];
  const rootBookmarks: ParsedBookmarkInput[] = [];

  traverseDl(firstDl, rootFolders, rootBookmarks);

  // Map the tree of folders into MangleMarks (Dashboards -> Categories) model
  const dashboards: ParsedDashboardInput[] = [];

  // Rules of mapping:
  // If we have top-level folders, let's explore their depth.
  if (rootFolders.length > 0) {
    rootFolders.forEach(folder => {
      // Determine if this folder has nested subfolders (depth >= 2)
      if (folder.subfolders.length > 0) {
        // Folder level 1 = Dashboard
        const categories: ParsedCategoryInput[] = [];

        // Level 2 subfolders = Categories
        folder.subfolders.forEach((sub, subIdx) => {
          categories.push({
            name: sub.title,
            column: subIdx % 3, // Distribute evenly across columns (0, 1, 2)
            bookmarks: sub.bookmarks
          });
        });

        // If there are bookmarks directly in this top-level folder (not nested in subfolders)
        if (folder.bookmarks.length > 0) {
          categories.push({
            name: 'General',
            column: 0,
            bookmarks: folder.bookmarks
          });
        }

        dashboards.push({
          name: folder.title,
          categories
        });
      } else {
        // If there are no subfolders, we treat root folder as Category
        // inside a single default Dashboard "Imported Bookmarks"
        let defaultDashboard = dashboards.find(d => d.name === 'Imported Bookmarks');
        if (!defaultDashboard) {
          defaultDashboard = {
            name: 'Imported Bookmarks',
            categories: []
          };
          dashboards.push(defaultDashboard);
        }

        defaultDashboard.categories.push({
          name: folder.title,
          column: defaultDashboard.categories.length % 3,
          bookmarks: folder.bookmarks
        });
      }
    });

    // If there were root level bookmarks not in any folders, add them to default
    if (rootBookmarks.length > 0) {
      let defaultDashboard = dashboards.find(d => d.name === 'Imported Bookmarks');
      if (!defaultDashboard) {
        defaultDashboard = {
          name: 'Imported Bookmarks',
          categories: []
        };
        dashboards.push(defaultDashboard);
      }

      defaultDashboard.categories.push({
        name: 'General',
        column: 0,
        bookmarks: rootBookmarks
      });
    }
  } else {
    // No folders found, only flat links (flat HTML bookmark export)
    if (rootBookmarks.length > 0) {
      dashboards.push({
        name: 'Imported Bookmarks',
        categories: [{
          name: 'General',
          column: 0,
          bookmarks: rootBookmarks
        }]
      });
    }
  }

  return dashboards;
}

function traverseDl(dl: Element, subfoldersList: TempFolder[], bookmarksList: ParsedBookmarkInput[]): void {
  let child = dl.firstElementChild;
  while (child) {
    if (child.tagName === 'DT') {
      const h3 = child.querySelector(':scope > h3');
      const a = child.querySelector(':scope > a');
      const nestedDl = child.querySelector(':scope > dl, :scope > div'); // some bookmarks bar backups have div or dl inside

      if (a) {
        // It's a bookmark
        const href = a.getAttribute('href') || '';
        const title = a.textContent?.trim() || 'Untitled';
        const description = a.getAttribute('note') || a.getAttribute('description') || '';
        const tagsStr = a.getAttribute('tags') || a.getAttribute('rel') || '';
        const tags = tagsStr ? tagsStr.split(/,/).map(t => t.trim()).filter(Boolean) : [];

        bookmarksList.push({
          title,
          url: href,
          description,
          tags
        });
      } else if (h3) {
        // It's a folder/category header
        const title = h3.textContent?.trim() || 'Untitled Folder';
        const folder: TempFolder = {
          title,
          bookmarks: [],
          subfolders: []
        };

        const dlInside = child.querySelector(':scope > dl');
        if (dlInside) {
          traverseDl(dlInside, folder.subfolders, folder.bookmarks);
        } else {
          // If DL is not inside DT, it might be the next sibling
          const sibling = child.nextElementSibling;
          if (sibling && (sibling.tagName === 'DL' || sibling.tagName === 'UL')) {
            traverseDl(sibling, folder.subfolders, folder.bookmarks);
          }
        }

        subfoldersList.push(folder);
      }
    }
    child = child.nextElementSibling;
  }
}

function parseJsonData(arr: any[]): ParsedDashboardInput[] {
  return arr.map(dash => {
    const categoriesList = Array.isArray(dash.categories) ? dash.categories : [];
    
    return {
      name: dash.name || dash.title || 'Untitled Tab',
      categories: categoriesList.map((cat: any, cIdx: number) => {
        const bookmarksList = Array.isArray(cat.bookmarks) ? cat.bookmarks : [];
        return {
          name: cat.name || cat.title || 'Untitled Category',
          column: typeof cat.column === 'number' ? cat.column : (cIdx % 3),
          bookmarks: bookmarksList.map((b: any) => ({
            title: b.title || b.name || 'Untitled Bookmark',
            url: b.url || b.href || '',
            description: b.description || b.notes || '',
            tags: Array.isArray(b.tags) ? b.tags : []
          }))
        };
      })
    };
  });
}
