export interface Dashboard {
  id: string;
  name: string;
  order: number;
  ownerId: string;
  createdAt: any; // Firebase Timestamp or Date
}

export interface Category {
  id: string;
  name: string;
  dashboardId: string;
  order: number;
  column: number; // For multi-column layout (e.g., 0, 1, 2)
  ownerId: string;
  createdAt: any; // Firebase Timestamp or Date
  sortBy?: 'custom' | 'az' | 'za' | 'newest';
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  categoryId: string;
  dashboardId: string;
  tags: string[];
  order: number;
  ownerId: string;
  createdAt: any; // Firebase Timestamp or Date
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
