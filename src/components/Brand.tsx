import React from 'react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="vai-brand">
    <svg className="vai-brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 7L16 26L27 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
      <path d="M12 7L16 14L20 7" stroke="currentColor" strokeWidth="3.5" />
    </svg>
    {!compact && <span className="vai-wordmark">visibility<span className="vai-brand-dot">.</span></span>}
  </span>;
}
