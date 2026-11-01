import React from 'react';

interface CreditsProps {
  className?: string;
  variant?: 'footer' | 'inline' | 'compact';
}

export const Credits: React.FC<CreditsProps> = ({
  className = '',
  variant = 'footer',
}) => {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center gap-3 text-[11px] text-zinc-400 select-none ${className}`}>
        <span>
          Created by <strong className="text-[#FACC15] font-semibold">Malik Shahmeer</strong>
        </span>
        <span className="text-zinc-600">•</span>
        <span>
          Idea of <strong className="text-[#FACC15] font-semibold">Awais Ahmadani</strong>
        </span>
      </div>
    );
  }

  return (
    <footer className={`w-full py-2.5 px-4 text-center select-none ${className}`}>
      <div className="flex flex-col items-center justify-center text-[11px] leading-relaxed text-zinc-400">
        <p>
          Created by <span className="text-[#FACC15] font-semibold">Malik Shahmeer</span>
        </p>
        <p>
          Idea of <span className="text-[#FACC15] font-semibold">Awais Ahmadani</span>
        </p>
      </div>
    </footer>
  );
};
