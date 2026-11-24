# Security Summary

**Reviewed Files**: 14  
**Issues Resolved**: 5  

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Plaintext Local Storage | `src/hooks/useCozyNotesSync.ts` | 40 | Notes and deleted IDs were persisted in `localStorage` in plaintext JSON. | Medium | Fixed | Added automatic `AES-256-GCM` at-rest encryption in `src/utils/cryptoVault.ts` using a non-extractable `CryptoKey` stored in IndexedDB, plus automatic migration from legacy plaintext keys. |
| Plaintext Cloud Sync & Tamper Risk | `src/hooks/useCozyNotesSync.ts` | 199 | Note titles, bodies, tags, and stickers synced to Firestore without optional client-side end-to-end encryption. | High | Fixed | Implemented memory-only PBKDF2-SHA256 (210,000 iterations) + `AES-256-GCM` E2EE encryption (`__E2EE_V1__:`) bound with AAD (`ownerId:noteId`) to block server leaks and cross-document tampering. |
| Missing CSP & Transport Upgrade | `index.html` / `src/main.tsx` | 12 / 5 | No Content Security Policy or automatic HTTP-to-HTTPS upgrade was declared for static hosting (such as Neocities). | Medium | Fixed | Added strict `Content-Security-Policy` and `strict-origin-when-cross-origin` referrer policy meta tags in `index.html`, plus `enforceHttpsTransport()` in `src/main.tsx`. |
| Unvalidated Storage / Cross-Tab Inputs | `src/hooks/useCozyNotesSync.ts` | 137 | Data parsed from `localStorage`, `BroadcastChannel`, and Firestore snapshots trusted object keys and enum strings without allowlist or prototype checks. | Medium | Fixed | Added `safeJsonParse`, `sanitizePlainText`, `sanitizeNoteRecord`, `sanitizeStudioPreferences`, `isSafeHttpsUrl`, and `validateBroadcastMessage` in `src/utils/security.ts`. |
| Unconstrained Enum Fields in Rules | `firestore.rules` | 67 | Note paper/font fields, sticker bounds, and studio preference enums relied only on string lengths in Firestore rules. | Low | Fixed | Added explicit enum allowlists (`in [...]`), `hasOnly` checks for `unlockedThemes`, and numeric coordinate/scale/rotation bounds in `firestore.rules` and `firebase-blueprint.json`. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Local & Cloud Encryption | `src/utils/cryptoVault.ts` | Encrypts local notes at rest (`AES-256-GCM`, non-extractable IndexedDB key) and provides optional memory-only E2EE (`PBKDF2-SHA256` + `AES-256-GCM` with `ownerId:noteId` AAD). |
| XSS & Code Injection | `index.html`, `src/utils/security.ts` | React escapes all rendered text (zero `dangerouslySetInnerHTML`), CSP disables `object-src` and inline scripts, and `sanitizePlainText` strips control and BiDi spoofing characters. |
| URL & Avatar Validation | `src/components/SyncPanelModal.tsx` | Google profile avatar URLs pass through `isSafeHttpsUrl()` rejecting `javascript:`, `data:`, and `http:` schemes. |
| Firestore Access Control | `firestore.rules` | Requires Google Sign-In (`request.auth != null`), verified email on writes, strict `ownerId == request.auth.uid` ownership, immutable `createdAt`, and server `request.time` validation. |
| Predictable ID Generation | `src/utils/notesLogic.ts` | Upgraded `generateSafeId()` to use `crypto.getRandomValues()` CSPRNG bytes. |

## PoC Verification

### 1. Cross-Document / Tampered Ciphertext Replay (`AES-GCM` AAD Binding)
#### Summary
| Field | Value |
|---|---|
| Issue Type | Ciphertext Tampering & Cross-Record Replay |
| Impact | High |
| Affected File | `src/utils/cryptoVault.ts:195` |
| Test Scenario | Encrypt note `nota-secreta-1` for `uid-miguel`, then attempt to decrypt that ciphertext under `otra-nota-id` or with an incorrect passphrase. |

#### How It Was Fixed
Each E2EE cloud payload is encrypted with `AES-256-GCM` using a fresh 96-bit random IV and `additionalData` bound to `${ownerId}:${noteId}`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `encryptNoteForCloud` encrypts `{ title, content, tags, stickers }` with AAD `uid-miguel:nota-secreta-1`. | Produces authenticated `__E2EE_V1__:` envelope. |
| 2 | `decryptNoteFromCloud` is invoked with `otra-nota-id` (or wrong passphrase). | Recomputes AAD `uid-miguel:otra-nota-id`. |
| 3 | `crypto.subtle.decrypt` verifies the 128-bit GCM authentication tag. | **Rejected cleanly (`OperationError`)**. |

#### Conclusion
**Fix Verified** - Any packet modification, bit-flip, or cross-note/cross-user ciphertext swap fails AES-GCM authentication before plaintext is ever returned.

### 2. Prototype Pollution & Injected Cross-Tab / Storage Payloads
#### Summary
| Field | Value |
|---|---|
| Issue Type | JSON Prototype Pollution & Forged Schema Injection |
| Impact | Medium |
| Affected File | `src/utils/security.ts:38` |
| Test Scenario | Parse `{"title":"hola","__proto__":{"polluted":true},"constructor":{"bad":1}}` and validate `sanitizeNoteRecord({ id: "../../etc/passwd", stickers: [{ stickerKey: "<script>" }] })`. |

#### How It Was Fixed
`safeJsonParse` recursively removes `__proto__`, `constructor`, and `prototype` keys, while `sanitizeNoteRecord` and `validateBroadcastMessage` enforce regex ID allowlists and explicit sticker/theme allowlists.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Malicious JSON enters `safeJsonParse` or `validateBroadcastMessage`. | `stripDangerousKeys` drops `__proto__`, `constructor`, `prototype`. |
| 2 | `sanitizeNoteRecord` checks `/^[a-zA-Z0-9_-]+$/` on `id` and `VALID_STICKER_KEYS.has(stickerKey)`. | Forged ID returns `null`; unknown sticker keys are dropped. |
| 3 | Final note/preferences objects contain only safe allowlisted fields. | **Handled Safely**. |

#### Conclusion
**Fix Verified** - Untrusted JSON from storage, cross-tab messages, or forged records cannot pollute `Object.prototype` or inject unapproved keys.
