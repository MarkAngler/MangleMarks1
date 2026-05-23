import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { Dashboard, Category, Bookmark, OperationType } from '../types';

// ==========================================
// DASHBOARDS
// ==========================================

export async function createDashboard(name: string, userId: string, order: number): Promise<string> {
  const collectionPath = 'dashboards';
  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      name,
      order,
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

export async function updateDashboardName(id: string, name: string): Promise<void> {
  const path = `dashboards/${id}`;
  try {
    await updateDoc(doc(db, 'dashboards', id), {
      name
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateDashboardOrder(id: string, order: number): Promise<void> {
  const path = `dashboards/${id}`;
  try {
    await updateDoc(doc(db, 'dashboards', id), {
      order
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDashboard(id: string, categoryIds: string[], bookmarkIds: string[]): Promise<void> {
  const path = `dashboards/${id}`;
  try {
    const batch = writeBatch(db);
    // Delete parent dashboard
    batch.delete(doc(db, 'dashboards', id));
    
    // Delete nested categories
    categoryIds.forEach(catId => {
      batch.delete(doc(db, 'categories', catId));
    });

    // Delete nested bookmarks
    bookmarkIds.forEach(bId => {
      batch.delete(doc(db, 'bookmarks', bId));
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// CATEGORIES
// ==========================================

export async function createCategory(
  name: string,
  dashboardId: string,
  userId: string,
  column: number,
  order: number
): Promise<string> {
  const collectionPath = 'categories';
  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      name,
      dashboardId,
      column,
      order,
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

export async function updateCategory(
  id: string, 
  data: Partial<Category>
): Promise<void> {
  const path = `categories/${id}`;
  try {
    await updateDoc(doc(db, 'categories', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(id: string, bookmarkIds: string[]): Promise<void> {
  const path = `categories/${id}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'categories', id));
    
    bookmarkIds.forEach(bId => {
      batch.delete(doc(db, 'bookmarks', bId));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// BOOKMARKS
// ==========================================

export async function createBookmark(data: {
  url: string;
  title: string;
  description: string;
  categoryId: string;
  dashboardId: string;
  tags: string[];
  order: number;
  ownerId: string;
}): Promise<string> {
  const collectionPath = 'bookmarks';
  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

export async function updateBookmark(
  id: string,
  data: Partial<Pick<Bookmark, 'url' | 'title' | 'description' | 'categoryId' | 'dashboardId' | 'tags' | 'order'>>
): Promise<void> {
  const path = `bookmarks/${id}`;
  try {
    await updateDoc(doc(db, 'bookmarks', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  const path = `bookmarks/${id}`;
  try {
    await deleteDoc(doc(db, 'bookmarks', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
