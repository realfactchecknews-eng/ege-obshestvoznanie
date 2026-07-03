/** Розовый слоник — логотип сайта (тот же, что в заставке и favicon). */
export function ElephantLogo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-label="Логотип — розовый слоник">
      {/* тело */}
      <ellipse cx="38" cy="34" rx="20" ry="16" fill="#f9a8d4" />
      {/* ноги */}
      <rect x="26" y="42" width="7" height="14" rx="3.5" fill="#f472b6" />
      <rect x="42" y="42" width="7" height="14" rx="3.5" fill="#f9a8d4" />
      {/* хвост */}
      <path d="M57 32 q6 1 4 7" stroke="#f472b6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* голова */}
      <circle cx="20" cy="26" r="14" fill="#f9a8d4" />
      {/* ухо */}
      <ellipse cx="28" cy="24" rx="8" ry="10" fill="#f472b6" />
      <ellipse cx="28.5" cy="24.5" rx="4.5" ry="6" fill="#fbcfe8" />
      {/* глаз */}
      <circle cx="14.5" cy="23" r="2" fill="#831843" />
      <circle cx="14" cy="22.4" r="0.7" fill="#fff" />
      {/* хобот */}
      <path
        d="M11 30 q-8 4 -6 13 q1 6 7 7 q3 0.5 3.5 -2 q0.4 -2.3 -2 -3 q-3.5 -1 -3.5 -4.5 q0 -5 5 -7 z"
        fill="#f9a8d4"
        stroke="#f472b6"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
