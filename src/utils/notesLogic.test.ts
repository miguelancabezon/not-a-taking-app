import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addStickerToNote,
  addTagToList,
  createNoteRecord,
  extractTagCounts,
  filterAndSortNotes,
  MAX_STICKERS_PER_NOTE,
  MAX_TAGS_PER_NOTE,
  mergeSyncedNotes,
  normalizeTag,
  removeStickerFromList,
  removeTagFromList,
  resolveModeSwitchTheme,
  sanitizeNotePayload,
  updateStickerInList,
} from './notesLogic';

test('resolveModeSwitchTheme returns remembered light or dark theme ID', () => {
  assert.equal(resolveModeSwitchTheme('light', 'miel-canela', 'pizarra-nocturna'), 'miel-canela');
  assert.equal(resolveModeSwitchTheme('dark', 'naranja-albaricoque', 'pizarra-nocturna'), 'pizarra-nocturna');
});

test('normalizeTag cleans #, spaces, and enforces max length', () => {
  assert.equal(normalizeTag('  #Ideas de Otoño! '), 'ideas-de-otoño');
  assert.equal(normalizeTag('###   '), '');
  assert.equal(normalizeTag('a'.repeat(50)).length, 32);
});

test('addTagToList deduplicates and caps at MAX_TAGS_PER_NOTE', () => {
  let tags: string[] = [];
  tags = addTagToList(tags, '#Ideas');
  tags = addTagToList(tags, 'ideas');
  assert.deepEqual(tags, ['ideas']);

  for (let i = 0; i < 15; i++) {
    tags = addTagToList(tags, `tag-${i}`);
  }
  assert.equal(tags.length, MAX_TAGS_PER_NOTE);
  assert.deepEqual(removeTagFromList(['ideas', 'diario'], 'ideas'), ['diario']);
});

test('filterAndSortNotes matches accent-insensitively and puts pinned first', () => {
  const n1 = createNoteRecord({
    id: 'n-1',
    title: 'Café de mañana',
    content: 'Leer poesía',
    tags: ['diario'],
    pinned: false,
    now: 2000,
  });
  const n2 = createNoteRecord({
    id: 'n-2',
    title: 'Lista de lectura',
    content: 'Ensayos de tipografía',
    tags: ['lecturas'],
    pinned: true,
    now: 1000,
  });
  const n3 = createNoteRecord({
    id: 'n-3',
    title: 'Sin etiqueta',
    content: 'Borrador libre',
    tags: [],
    pinned: false,
    now: 3000,
  });

  const allSorted = filterAndSortNotes([n1, n2, n3], {
    query: '',
    activeTag: null,
    view: 'all',
  });
  assert.deepEqual(
    allSorted.map((n) => n.id),
    ['n-2', 'n-3', 'n-1']
  );

  const searchCafe = filterAndSortNotes([n1, n2, n3], {
    query: 'cafe',
    activeTag: null,
    view: 'all',
  });
  assert.deepEqual(searchCafe.map((n) => n.id), ['n-1']);

  const untagged = filterAndSortNotes([n1, n2, n3], {
    query: '',
    activeTag: null,
    view: 'untagged',
  });
  assert.deepEqual(untagged.map((n) => n.id), ['n-3']);
});

test('extractTagCounts aggregates and sorts tags by frequency', () => {
  const notes = [
    createNoteRecord({ title: 'A', content: '', tags: ['ideas', 'diario'] }),
    createNoteRecord({ title: 'B', content: '', tags: ['ideas'] }),
    createNoteRecord({ title: 'C', content: '', tags: ['lecturas'] }),
  ];
  assert.deepEqual(extractTagCounts(notes), [
    { tag: 'ideas', count: 2 },
    { tag: 'diario', count: 1 },
    { tag: 'lecturas', count: 1 },
  ]);
});

test('sticker placement, clamping, updating, and removal respect bounds', () => {
  let stickers = addStickerToNote([], 'taza-te', { x: 150, y: -20 });
  assert.equal(stickers.length, 1);
  assert.equal(stickers[0].x, 94);
  assert.equal(stickers[0].y, 8);

  const id = stickers[0].id;
  stickers = updateStickerInList(stickers, id, { scale: 5, rotation: 90, x: 50, y: 50 });
  assert.equal(stickers[0].scale, 1.8);
  assert.equal(stickers[0].rotation, 35);
  assert.equal(stickers[0].x, 50);

  stickers = removeStickerFromList(stickers, id);
  assert.equal(stickers.length, 0);

  let maxed = stickers;
  for (let i = 0; i < 25; i++) {
    maxed = addStickerToNote(maxed, 'estrellas');
  }
  assert.equal(maxed.length, MAX_STICKERS_PER_NOTE);
});

test('mergeSyncedNotes resolves conflicts by newest updatedAt and respects deletions', () => {
  const localOld = createNoteRecord({ id: 'n-1', title: 'V1', content: 'old', now: 100 });
  const remoteNew = createNoteRecord({ id: 'n-1', title: 'V2', content: 'new', now: 200 });
  const localOnly = createNoteRecord({ id: 'n-2', title: 'Local', content: 'keep', now: 150 });
  const deletedRemote = createNoteRecord({ id: 'n-3', title: 'Borrar', content: 'x', now: 500 });

  const merged = mergeSyncedNotes([localOld, localOnly], [remoteNew, deletedRemote], ['n-3']);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((n) => n.id === 'n-1')?.title, 'V2');
  assert.equal(merged.find((n) => n.id === 'n-2')?.title, 'Local');
  assert.equal(merged.find((n) => n.id === 'n-3'), undefined);
});

test('sanitizeNotePayload enforces Firestore blueprint limits', () => {
  const oversized = createNoteRecord({
    id: 'n-big',
    title: 'T'.repeat(300),
    content: 'C'.repeat(25000),
    tags: Array.from({ length: 15 }, (_, i) => `etiqueta-${i}`),
  });
  const payload = sanitizeNotePayload(oversized, 'user-123');
  assert.equal(payload.ownerId, 'user-123');
  assert.equal(payload.title.length, 160);
  assert.equal(payload.content.length, 20000);
  assert.equal(payload.tags.length, 10);
});
