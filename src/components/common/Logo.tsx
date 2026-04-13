import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <rect width="100" height="100" rx="22" fill="#09090B"/>
    
    {/* Stylized Pen Nib / Ark shape */}
    <path 
      d="M50 16 L22 50 L32 80 L50 66 L68 80 L78 50 Z" 
      fill="url(#ark_gradient)"
    />
    
    {/* Inner Deck / Folded paper sails */}
    <path 
      d="M50 28 L34 54 L40 70 L50 61 Z" 
      fill="#FFFFFF" 
      fillOpacity="0.95"
    />
    <path 
      d="M50 28 L66 54 L60 70 L50 61 Z" 
      fill="#E2E8F0" 
      fillOpacity="0.95"
    />
    
    {/* Split line down the center for the pen nib */}
    <path 
      d="M50 16 L50 45" 
      stroke="#09090B" 
      strokeWidth="3" 
      strokeLinecap="round"
    />
    
    {/* AI Sparkle / Ink Hole at the center */}
    <path 
      d="M50 35 Q50 46 39 46 Q50 46 50 57 Q50 46 61 46 Q50 46 50 35 Z" 
      fill="#09090B"
    />

    <defs>
      <linearGradient id="ark_gradient" x1="50" y1="16" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A855F7"/>
        <stop offset="1" stopColor="#3B82F6"/>
      </linearGradient>
    </defs>
  </svg>
);
