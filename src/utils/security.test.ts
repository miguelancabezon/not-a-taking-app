import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptNoteFromCloud,
  encryptNoteForCloud,
  isEncryptedCloudContent,
} from './cryptoVault';
import {
  isSafeHttpsUrl,
  safeJsonParse,
  sanitizeNoteRecord,
  sanitizePlainText,
  sanitizeStudioPreferences,
  validateBroadcastMessage,
} from './security';
import { Note } from '../types/notes';

test('AES-256-GCM E2EE encrypts note payload and detects tampering or wrong passphrase', async () => {
  const note: Note = {
    id: 'nota-secreta-1',
    title: 'Diario privado',
    content: 'Ideas confidenciales de proyecto.',
    tags: ['diario', 'privado'],
    stickers: [{ id: 'stk-1', stickerKey: 'taza-te', x: 80, y: 22, scale: 1, rotation: 5 }],
    paperColor: 'crema',
    fontFamily: 'editorial',
    pinned: true,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };

  const encrypted = await encryptNoteForCloud(note, 'uid-miguel', 'mi-clave-segura-2026');
  assert.equal(encrypted.title, 'Nota cifrada (E2EE)');
  assert.deepEqual(encrypted.tags, []);
  assert.equal(isEncryptedCloudContent(encrypted.content), true);
  assert.equal(encrypted.content.includes('confidenciales'), false);

  const decrypted = await decryptNoteFromCloud(
    encrypted.content,
    note.id,
    'uid-miguel',
    'mi-clave-segura-2026'
  );
  assert.equal(decrypted.title, note.title);
  assert.equal(decrypted.content, note.content);
  assert.deepEqual(decrypted.tags, note.tags);
  assert.equal(decrypted.stickers.length, 1);

  // Wrong passphrase must fail AES-GCM verification
  await assert.rejects(() =>
    decryptNoteFromCloud(encrypted.content, note.id, 'uid-miguel', 'clave-incorrecta')
  );

  // Tampering / cross-document AAD replay must fail AES-GCM verification
  await assert.rejects(() =>
    decryptNoteFromCloud(encrypted.content, 'otra-nota-id', 'uid-miguel', 'mi-clave-segura-2026')
  );
});

test('safeJsonParse strips prototype pollution keys', () => {
  const malicious = '{"title":"hola","__proto__":{"polluted":true},"constructor":{"bad":1}}';
  const parsed = safeJsonParse<Record<string, unknown>>(malicious);
  assert.ok(parsed);
  assert.equal(parsed.title, 'hola');
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), false);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('sanitizePlainText removes control and BiDi spoofing chars', () => {
  const dirty = 'Hola\u0000\u0007\u202Emundo\u2066!';
  assert.equal(sanitizePlainText(dirty, 50), 'Holamundo!');
});

test('isSafeHttpsUrl blocks javascript, data, and http URLs', () => {
  assert.equal(isSafeHttpsUrl('https://lh3.googleusercontent.com/avatar.png'), true);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpsUrl('http://example.com/avatar.png'), false);
});

test('sanitizeNoteRecord and validateBroadcastMessage reject forged IDs, invalid stickers, and unknown fields', () => {
  const forged = sanitizeNoteRecord({
    id: '../../etc/passwd',
    title: 'Malicioso',
    content: 'texto',
  });
  assert.equal(forged, null);

  const valid = sanitizeNoteRecord({
    id: 'nota-123',
    title: 'Nota válida',
    content: 'Contenido seguro',
    paperColor: 'desconocido',
    fontFamily: 'inyectado',
    stickers: [
      { id: 'stk-ok', stickerKey: 'taza-te', x: 999, y: -50, scale: 9, rotation: 90 },
      { id: 'stk-bad', stickerKey: '<script>', x: 50, y: 50, scale: 1, rotation: 0 },
    ],
  });
  assert.ok(valid);
  assert.equal(valid.paperColor, 'default');
  assert.equal(valid.fontFamily, 'studio');
  assert.equal(valid.stickers.length, 1);
  assert.equal(valid.stickers[0].x, 94);
  assert.equal(valid.stickers[0].scale, 1.8);

  const prefs = sanitizeStudioPreferences({
    themeId: 'evil-theme',
    unlockedThemes: ['gameboy-clasica', 'admin-theme'],
    fontSize: 'xl',
  });
  assert.equal(prefs.themeId, 'pizarra-nocturna');
  assert.deepEqual(prefs.unlockedThemes, ['gameboy-clasica']);
  assert.equal(prefs.fontSize, 'md');

  assert.equal(validateBroadcastMessage({ type: 'UNKNOWN' }), null);
  assert.ok(validateBroadcastMessage({ type: 'PREFS_UPDATED', preferences: { themeId: 'miel-canela' } }));
});
