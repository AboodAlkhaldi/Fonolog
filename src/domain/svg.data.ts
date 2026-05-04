// SVG content for words that have illustration.
// Map: word text (lowercase) → SVG string
// 82 words have SVGs. Others use emoji fallback.
// NOTE: Replace placeholder SVGs with real illustrations.
// Format: simple flat-style SVGs, 100x100 viewBox, warm colors.

export const SVG_DATA: Record<string, string> = {
  // These are placeholder SVGs. Replace with real illustrations.
  // The app falls back to emoji if SVG is not found.
  'kedi': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="55" r="30" fill="#C4A882"/>
    <circle cx="50" cy="35" r="20" fill="#C4A882"/>
    <polygon points="32,20 38,5 44,20" fill="#C4A882"/>
    <polygon points="56,20 62,5 68,20" fill="#C4A882"/>
    <circle cx="43" cy="33" r="4" fill="#2C1810"/>
    <circle cx="57" cy="33" r="4" fill="#2C1810"/>
    <ellipse cx="50" cy="40" rx="3" ry="2" fill="#FF8A65"/>
  </svg>`,
  'kalem': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="42" y="10" width="16" height="65" rx="3" fill="#F5A623"/>
    <polygon points="42,75 58,75 50,95" fill="#2C1810"/>
    <rect x="42" y="10" width="16" height="12" rx="3" fill="#9E9E9E"/>
  </svg>`,
  'elma': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="58" rx="30" ry="32" fill="#F44336"/>
    <path d="M50 28 Q55 15 65 18" stroke="#4CAF50" stroke-width="3" fill="none"/>
    <ellipse cx="40" cy="50" rx="8" ry="12" fill="rgba(255,255,255,0.2)"/>
  </svg>`,
  'araba': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="50" width="80" height="30" rx="8" fill="#2196F3"/>
    <rect x="20" y="35" width="60" height="25" rx="6" fill="#42A5F5"/>
    <circle cx="25" cy="82" r="10" fill="#2C1810"/>
    <circle cx="75" cy="82" r="10" fill="#2C1810"/>
    <rect x="25" y="42" width="22" height="16" rx="3" fill="#B3E5FC"/>
    <rect x="53" y="42" width="22" height="16" rx="3" fill="#B3E5FC"/>
  </svg>`,
  'top': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="38" fill="#F44336"/>
    <path d="M50 12 Q30 30 30 50 Q30 70 50 88" stroke="white" stroke-width="3" fill="none"/>
    <path d="M50 12 Q70 30 70 50 Q70 70 50 88" stroke="white" stroke-width="3" fill="none"/>
    <path d="M12 50 Q50 30 88 50" stroke="white" stroke-width="3" fill="none"/>
  </svg>`,
  'güneş': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="22" fill="#FFB800"/>
    <g stroke="#FFB800" stroke-width="4" stroke-linecap="round">
      <line x1="50" y1="8" x2="50" y2="20"/>
      <line x1="50" y1="80" x2="50" y2="92"/>
      <line x1="8" y1="50" x2="20" y2="50"/>
      <line x1="80" y1="50" x2="92" y2="50"/>
      <line x1="22" y1="22" x2="30" y2="30"/>
      <line x1="70" y1="70" x2="78" y2="78"/>
      <line x1="78" y1="22" x2="70" y2="30"/>
      <line x1="30" y1="70" x2="22" y2="78"/>
    </g>
  </svg>`,
  // Add more SVGs here as illustrations are created.
  // The 76 remaining words use emoji fallback automatically.
}
