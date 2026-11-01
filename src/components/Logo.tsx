import React from 'react';

interface LogoProps {
  variant?: 'full' | 'badge' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  animated = false,
  className = '',
}) => {
  const badgePixelSizes = {
    xs: 26,
    sm: 34,
    md: 46,
    lg: 64,
    xl: 92,
  };

  const titleSizes = {
    xs: 'text-xs tracking-[0.25em]',
    sm: 'text-sm tracking-[0.3em]',
    md: 'text-lg tracking-[0.35em]',
    lg: 'text-2xl tracking-[0.38em]',
    xl: 'text-4xl tracking-[0.4em]',
  };

  const taglineSizes = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  const badgeSize = badgePixelSizes[size];

  return (
    <div className={`inline-flex items-center ${variant === 'full' ? 'flex-col sm:flex-row' : ''} gap-3 select-none ${className}`}>
      {/* SVG Premium Badge based on official reference */}
      <div className="relative group shrink-0">
        <svg
          width={badgeSize}
          height={badgeSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`drop-shadow-[0_4px_12px_rgba(250,204,21,0.25)] ${
            animated ? 'transition-transform duration-300 group-hover:scale-105' : ''
          }`}
        >
          <defs>
            {/* Metallic Gold Gradient for M */}
            <linearGradient id="goldGradient" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FACC15" />
              <stop offset="70%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>

            {/* Subtle Metallic Border Gradient */}
            <linearGradient id="borderGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>

            {/* Shine shimmer mask for animation */}
            {animated && (
              <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.4)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            )}
          </defs>

          {/* Chamfered angular Badge Base: Top-left, Top-right, Down to 75% on right, Angled cut to 75% on bottom, Bottom-left */}
          <polygon
            points="3,3 97,3 97,73 73,97 3,97"
            fill="#0D0D0D"
            stroke="url(#borderGold)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Bold Angular Metallic Gold "M" */}
          <path
            d="M 14 19 L 30 19 L 50 49 L 70 19 L 86 19 L 86 78 L 72 78 L 72 41 L 54 66 L 46 66 L 28 41 L 28 78 L 14 78 Z"
            fill="url(#goldGradient)"
          />

          {/* Red Accent Strip on Bottom-Left with 45-degree angle */}
          <polygon
            points="3,82 52,82 40,97 3,97"
            fill="#EF4444"
          />

          {/* Subtle Corner Chamfer line accent */}
          <line
            x1="73"
            y1="97"
            x2="97"
            y2="73"
            stroke="url(#borderGold)"
            strokeWidth="2"
          />

          {/* Animated Shine Sweep */}
          {animated && (
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill="url(#shimmer)"
              className="animate-pulse opacity-40 pointer-events-none"
            />
          )}
        </svg>

        {/* Ambient Underglow */}
        <div className="absolute -bottom-1 left-2 right-2 h-1 bg-[#FACC15]/20 blur-sm rounded-full pointer-events-none" />
      </div>

      {/* Typography: Wordmark + Tagline */}
      {variant !== 'badge' && (
        <div className="flex flex-col text-left">
          {/* Wordmark "MEHFIL" */}
          <div className={`${titleSizes[size]} font-black text-white uppercase tracking-[0.32em] font-sans flex items-center leading-none`}>
            <span>MEHFIL</span>
          </div>

          {/* Tagline "Apna andaz. Apni mehfil." */}
          {variant === 'full' && (
            <p className={`${taglineSizes[size]} text-zinc-400 font-normal tracking-wide mt-1.5`}>
              Apna andaz. Apni mehfil.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
