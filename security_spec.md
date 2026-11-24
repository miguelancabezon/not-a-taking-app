# Security Specification — Not-a taking app

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/notes/{noteId}` must carry `ownerId == request.auth.uid` on creation, preserve `ownerId` immutably on update, and only be readable/updatable/deletable by that verified owner.
2. **Scoped Preferences**: Every document in `/studioPreferences/{userId}` must have `userId == request.auth.uid`, `ownerId == request.auth.uid`, and cannot be listed across users (`allow list: if false`).
3. **Verified Identity**: Write operations require `request.auth != null && request.auth.token.email_verified == true`.
4. **Temporal & Schema Integrity**: `createdAt` is immutable and equals `request.time` on create; `updatedAt` equals `request.time` on create and update; no shadow/extra keys are permitted (`hasOnly`).
5. **Bounded Payloads & Enum Allowlists**: `title <= 160`, `content <= 20000`, `tags.size() <= 10`, `stickers.size() <= 20` with bounded coordinates/scale/rotation, document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128`), and `paperColor`, `fontFamily`, `themeId`, `textureId`, `fontId`, `fontSize`, and `unlockedThemes` are enforced against strict allowlists.
6. **End-to-End & At-Rest Encryption**: Local storage notes and deletion lists are encrypted at rest with a non-extractable `AES-256-GCM` Web Crypto key stored in IndexedDB (`__E2EE_V1__:` cloud notes encrypted in memory via PBKDF2-SHA256 210k iterations + AES-256-GCM bound with AAD `ownerId:noteId`).

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write**: `request.auth == null` reading `/notes/note_1` or creating a note.
2. **Unverified email write**: `request.auth.token.email_verified == false` creating a note.
3. **Identity spoofing on create**: `ownerId: "victim_uid"` while `request.auth.uid == "attacker_uid"`.
4. **Cross-user read (`get`)**: Authenticated user `"attacker"` fetching a note owned by `"victim"`.
5. **Unfiltered `list` query**: Authenticated user listing `/notes` without `where("ownerId", "==", request.auth.uid)`.
6. **Shadow/Ghost field injection**: Creating `/notes/n1` with extra field `isAdmin: true` or `sharedPublicly: true`.
7. **Update ownership hijack**: Updating `ownerId` or `createdAt` on an existing note.
8. **ID Poisoning**: Creating `/notes/bad$id` or a 200-char document ID.
9. **Denial-of-Wallet oversized content**: Creating a note with `content` length > 20,000 characters.
10. **Unbounded tags array / invalid tag type**: Creating a note with 11 tags or `[123]` as first tag.
11. **Sticker/Enum poisoning**: Creating a note with `paperColor: "<script>"`, out-of-range sticker coordinates (`x: 999`), or `unlockedThemes: ["evil-theme"]`.
12. **Client-forged timestamp**: Creating or updating a note where `updatedAt != request.time`, or listing `/studioPreferences`.
