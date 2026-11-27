import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <img
    src="/logo.png"
    alt="Huiman Ark"
    width={32}
    height={32}
    decoding="async"
    className={`${className} select-none object-contain`}
  />
);
