# Security Specification for MangleMarks

## 1. Data Invariants
1. **Ownership Lock**: Every resource (Dashboard, Category, Bookmark) must have an immutable `ownerId` that matches the authenticated user `request.auth.uid`.
2. **Dashboard Scope**: Categories can only be created within valid dashboards.
3. **Category Scope**: Bookmarks can only be created within valid categories and dashboards owned by the same authenticated user.
4. **Strict Sizes**: All string fields like names, titles, and descriptions must have reasonable size limits to prevent Denial of Wallet string spam attacks.
5. **No Open Query Scrapes**: Standard `list` queries of bookmarks, category, or dashboards must be strictly filtered by `ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Poison Payloads to Prevent
1. Create a dashboard with `ownerId` set to a victim's user ID. (Identity Spoofing)
2. Create a dashboard with an excessively long name (e.g. 50,000 chars). (Resource Poisoning)
3. Update a dashboard's `ownerId` after creation. (Immutability Violation)
4. Create a category for a dashboard owned by another user.
5. Create a category with a negative column or order index.
6. Create a bookmark under a category owned by another user.
7. Create a bookmark with an excessively long URL or title.
8. Update a bookmark to change its `ownerId`.
9. Update a bookmark to inject a custom system admin field or privilege.
10. Query all bookmarks across all users without an `ownerId` filter. (Scraping)
11. Read another user's single bookmark or dashboard document. (PII Private Read Leak)
12. Update the `createdAt` timestamp of a bookmark (Temporal Integrity Violation).

## 3. Firestore Rules Mapping
We will block all of the above using strict Firestore rules that:
- Verify `request.auth.uid != null`.
- Call a helper `isValidDashboard`, `isValidCategory`, and `isValidBookmark` to match exact properties, verify sizes, and validate that `ownerId == request.auth.uid`.
- Require `updatedAt` to be `request.time` on updates, and `createdAt` to be `request.time` on creation.
