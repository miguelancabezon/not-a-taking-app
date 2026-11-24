import React from 'react';

export type StickerCategory = 'acogedor' | 'naturaleza' | 'papeleria' | 'noche';

export interface StickerDefinition {
  key: string;
  label: string;
  category: StickerCategory;
  render: (className?: string) => React.ReactNode;
}

export const STICKER_CATEGORIES: { id: StickerCategory | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'acogedor', label: 'Acogedor' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'papeleria', label: 'Papelería' },
  { id: 'noche', label: 'Noche' },
];

export const COZY_STICKERS: StickerDefinition[] = [
  {
    key: 'taza-te',
    label: 'Taza de té',
    category: 'acogedor',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M23 16c-2-3 1-6 0-9M31 15c-2-3 1-6 0-9M39 16c-2-3 1-6 0-9" stroke="#E8D8C4" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
        <ellipse cx="30" cy="52" rx="18" ry="4.5" fill="#D9C5B2" stroke="#5A4638" strokeWidth="2" />
        <path d="M16 25h28v13c0 8-6 13-14 13s-14-5-14-13V25Z" fill="#FAF3E8" stroke="#5A4638" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M44 28h4.5c3.5 0 5.5 2.4 5.5 5.5S52 39 48.5 39H44" stroke="#5A4638" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="30" cy="25" rx="14" ry="3.5" fill="#C97B4B" stroke="#5A4638" strokeWidth="2" />
        <path d="M29 33c1.5-2 4.5-1.5 4.5 1 0 2-3.5 4-4.5 5-1-1-4.5-3-4.5-5 0-2.5 3-3 4.5-1Z" fill="#D87A6B" />
      </svg>
    ),
  },
  {
    key: 'washi-flor',
    label: 'Cinta washi floral',
    category: 'papeleria',
    render: (className = 'w-12 h-9') => (
      <svg viewBox="0 0 80 42" className={className} fill="none" aria-hidden="true">
        <path d="M4 9l6-3-2 7 4 5-5 6 3 7-6 3 66-2-4-7 5-5-4-6 3-7-6-2L4 9Z" fill="#F2D7B6" stroke="#6B5340" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="23" cy="21" r="4.5" fill="#E39784" />
        <circle cx="23" cy="21" r="1.8" fill="#F9E5A7" />
        <circle cx="42" cy="18" r="4" fill="#8EAD88" />
        <circle cx="42" cy="18" r="1.5" fill="#FAF3E8" />
        <circle cx="59" cy="22" r="4.5" fill="#E39784" />
        <circle cx="59" cy="22" r="1.8" fill="#F9E5A7" />
      </svg>
    ),
  },
  {
    key: 'gato-siesta',
    label: 'Gatito dormido',
    category: 'acogedor',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M16 44c-3-10 4-19 16-19s20 8 18 19c-1 5-6 8-17 8s-15-3-17-8Z" fill="#E9B886" stroke="#574031" strokeWidth="2.2" />
        <path d="M18 29l-2-10 9 5M39 24l9-5-2 10" fill="#E9B886" stroke="#574031" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M23 36c1.5 1.5 3.5 1.5 5 0M36 36c1.5 1.5 3.5 1.5 5 0" stroke="#574031" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="39" r="1.8" fill="#D57A6C" />
        <path d="M47 44c5 0 8 3 6 6-2 3-8 2-11 1" stroke="#574031" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="22" cy="40" r="2.3" fill="#F39B8F" opacity="0.7" />
        <circle cx="42" cy="40" r="2.3" fill="#F39B8F" opacity="0.7" />
      </svg>
    ),
  },
  {
    key: 'luna-creciente',
    label: 'Luna creciente',
    category: 'noche',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M39 14c-11 2-19 12-17 24 2 10 11 17 22 16-9 5-21 3-28-5-7-9-6-22 3-30 6-5 13-7 20-5Z" fill="#F3D27A" stroke="#5B4B34" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M46 21l1.5 3.5L51 26l-3.5 1.5L46 31l-1.5-3.5L41 26l3.5-1.5L46 21Z" fill="#FAF0CA" stroke="#5B4B34" strokeWidth="1.4" />
        <circle cx="41" cy="39" r="2" fill="#FAF0CA" />
      </svg>
    ),
  },
  {
    key: 'helecho',
    label: 'Hoja de helecho',
    category: 'naturaleza',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M18 52c4-14 14-28 28-38" stroke="#456448" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 41c-6-1-9-4-10-8 5-1 9 1 11 5M28 33c-6-1-9-4-9-8 5-1 8 1 10 5M34 25c-5-1-8-4-8-7 4-1 7 1 9 4M28 43c5 2 10 1 13-2-3-4-7-5-11-3M33 35c5 2 10 1 12-2-2-4-6-5-10-3M39 27c4 1 8 0 10-2-2-3-5-4-8-2" fill="#8BB286" stroke="#456448" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'margarita',
    label: 'Margarita prensada',
    category: 'naturaleza',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <g stroke="#5D5146" strokeWidth="1.8">
          <ellipse cx="32" cy="17" rx="5" ry="9" fill="#FFFDF7" />
          <ellipse cx="32" cy="47" rx="5" ry="9" fill="#FFFDF7" />
          <ellipse cx="17" cy="32" rx="9" ry="5" fill="#FFFDF7" />
          <ellipse cx="47" cy="32" rx="9" ry="5" fill="#FFFDF7" />
          <ellipse cx="21" cy="21" rx="5" ry="8" transform="rotate(-45 21 21)" fill="#FAF5EA" />
          <ellipse cx="43" cy="43" rx="5" ry="8" transform="rotate(-45 43 43)" fill="#FAF5EA" />
          <ellipse cx="43" cy="21" rx="5" ry="8" transform="rotate(45 43 21)" fill="#FAF5EA" />
          <ellipse cx="21" cy="43" rx="5" ry="8" transform="rotate(45 21 43)" fill="#FAF5EA" />
        </g>
        <circle cx="32" cy="32" r="7.5" fill="#EDC166" stroke="#5D5146" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'sello-postal',
    label: 'Sello postal',
    category: 'papeleria',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <rect x="13" y="11" width="38" height="42" rx="3" fill="#FAF2E4" stroke="#6B5849" strokeWidth="2.2" strokeDasharray="3 2" />
        <rect x="19" y="17" width="26" height="30" fill="#DFC7B0" stroke="#6B5849" strokeWidth="1.5" />
        <path d="M22 41c4-6 8-10 11-10s6 5 9 10" fill="#8CA88D" />
        <circle cx="38" cy="24" r="3.5" fill="#E3976B" />
      </svg>
    ),
  },
  {
    key: 'lacre',
    label: 'Sello de lacre',
    category: 'papeleria',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M32 10c7-1 14 2 18 8 4 5 5 12 2 18-2 6-6 13-13 15-7 3-15 2-20-3-6-5-9-13-7-20 2-8 10-16 20-18Z" fill="#B84B47" stroke="#5E2321" strokeWidth="2.2" />
        <circle cx="32" cy="31" r="12" fill="#CC5C57" stroke="#7A2D2A" strokeWidth="1.8" />
        <path d="M32 25c2-2.5 6-2 6 1.5 0 3-4.5 6-6 7.5-1.5-1.5-6-4.5-6-7.5 0-3.5 4-4 6-1.5Z" fill="#F7DFD6" />
      </svg>
    ),
  },
  {
    key: 'libro-abierto',
    label: 'Libro abierto',
    category: 'papeleria',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M10 18c8-2 16 0 22 4 6-4 14-6 22-4v29c-8-2-16 0-22 4-6-4-14-6-22-4V18Z" fill="#FAF4E6" stroke="#5A4A3B" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M32 22v29" stroke="#5A4A3B" strokeWidth="2" />
        <path d="M16 25c4-1 8 0 11 1M16 31c4-1 8 0 11 1M16 37c4-1 8 0 11 1M37 26c3-1 7-2 11-1M37 32c3-1 7-2 11-1M37 38c3-1 7-2 11-1" stroke="#A69583" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M40 16v14l3-2.5 3 2.5V16" fill="#D57A6C" stroke="#5A4A3B" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: 'vinilo',
    label: 'Disco de vinilo',
    category: 'noche',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="21" fill="#2B2E36" stroke="#16181D" strokeWidth="2.2" />
        <circle cx="32" cy="32" r="15" stroke="#454A57" strokeWidth="1.2" strokeDasharray="24 12" />
        <circle cx="32" cy="32" r="11" stroke="#454A57" strokeWidth="1.2" />
        <circle cx="32" cy="32" r="7.5" fill="#E39D6B" stroke="#16181D" strokeWidth="1.8" />
        <circle cx="32" cy="32" r="2.2" fill="#FAF4E6" />
      </svg>
    ),
  },
  {
    key: 'pluma',
    label: 'Pluma estilográfica',
    category: 'papeleria',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M45 11l8 8-20 20-12 4 4-12 20-20Z" fill="#5D7D8C" stroke="#303E45" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M21 43l-7 7 11-3-4-4Z" fill="#E8C77B" stroke="#303E45" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M39 17l8 8" stroke="#E8C77B" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    key: 'croissant',
    label: 'Croissant tibio',
    category: 'acogedor',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M12 38c1-11 10-18 20-18s19 7 20 18c-3 3-8 2-11-1-3 3-6 4-9 4s-6-1-9-4c-3 3-8 4-11 1Z" fill="#DF9C56" stroke="#634020" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M24 22l2 14M40 22l-2 14M32 20v19" stroke="#8C5828" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'vela',
    label: 'Vela aromática',
    category: 'acogedor',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M32 10c3 4 5 8 3 11-1 2-5 2-6 0-2-3 0-7 3-11Z" fill="#F2BE5C" stroke="#7A5322" strokeWidth="1.6" />
        <rect x="20" y="25" width="24" height="27" rx="4" fill="#FAF0DF" stroke="#6B5440" strokeWidth="2.2" />
        <path d="M20 31c4 3 8 0 12 2s8 2 12-1" stroke="#E3C9A8" strokeWidth="2" strokeLinecap="round" />
        <rect x="24" y="36" width="16" height="10" rx="2" fill="#D8B392" opacity="0.55" />
      </svg>
    ),
  },
  {
    key: 'nube-lluvia',
    label: 'Nube de lluvia',
    category: 'naturaleza',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M19 37h26c5 0 8-3.5 8-8 0-4-3-7.5-7-8-1.5-6-7-10-13.5-9.5C26 12 21 16.5 20 22c-4.5.5-8 4-8 8.5 0 4 3 6.5 7 6.5Z" fill="#EBF3F9" stroke="#4D667B" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M23 44l-2 6M32 45l-2 6M41 44l-2 6" stroke="#7CA7CC" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'estrellas',
    label: 'Destellos suaves',
    category: 'noche',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M27 14l3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Z" fill="#F2CE74" stroke="#614E2A" strokeWidth="2" strokeLinejoin="round" />
        <path d="M46 33l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#F6DF9D" stroke="#614E2A" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="19" cy="45" r="2.5" fill="#F2CE74" />
      </svg>
    ),
  },
  {
    key: 'polaroid',
    label: 'Foto instantánea',
    category: 'papeleria',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <rect x="13" y="10" width="38" height="44" rx="2.5" fill="#FCF8F0" stroke="#5A4B3E" strokeWidth="2.2" />
        <rect x="18" y="15" width="28" height="26" fill="#9BB5B0" stroke="#5A4B3E" strokeWidth="1.6" />
        <path d="M18 35l8-7 7 6 6-5 7 6v6H18v-6Z" fill="#5F7E72" />
        <circle cx="38" cy="22" r="3" fill="#F4D37C" />
      </svg>
    ),
  },
  {
    key: 'seta',
    label: 'Seta del bosque',
    category: 'naturaleza',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M27 33h10v15c0 2.5-2 4-5 4s-5-1.5-5-4V33Z" fill="#F3E5D0" stroke="#5C4435" strokeWidth="2.2" />
        <path d="M12 34c0-12 9-20 20-20s20 8 20 20H12Z" fill="#D46F5A" stroke="#5C4435" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="3" fill="#FAF0E1" />
        <circle cx="37" cy="21" r="2.5" fill="#FAF0E1" />
        <circle cx="42" cy="29" r="2" fill="#FAF0E1" />
      </svg>
    ),
  },
  {
    key: 'mariposa',
    label: 'Mariposa de papel',
    category: 'naturaleza',
    render: (className = 'w-11 h-11') => (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <path d="M32 28c-6-10-18-12-20-3-2 7 5 11 12 11-5 2-9 7-6 12 3 5 11 2 14-6 3 8 11 11 14 6 3-5-1-10-6-12 7 0 14-4 12-11-2-9-14-7-20 3Z" fill="#DFB288" stroke="#5B4435" strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 22v23" stroke="#5B4435" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function getStickerByKey(key: string): StickerDefinition {
  return COZY_STICKERS.find((s) => s.key === key) ?? COZY_STICKERS[0];
}
