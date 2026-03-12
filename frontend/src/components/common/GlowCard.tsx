// ========================================================
// GlowCard — Reusable card with animated border glow
//
// Used throughout the app for dashboard cards, forms, and
// data display panels. The glow effect uses the Aleo cyan
// brand color to reinforce the privacy-tech aesthetic.
// ========================================================

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'emerald' | 'amber';
  hover?: boolean;
}

const glowColors = {
  cyan: 'hover:border-aleo-cyan/30 hover:shadow-aleo-cyan/5',
  purple: 'hover:border-purple-500/30 hover:shadow-purple-500/5',
  emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
  amber: 'hover:border-amber-500/30 hover:shadow-amber-500/5',
};

export default function GlowCard({
  children,
  className = '',
  glowColor = 'cyan',
  hover = true,
}: Props) {
  return (
    <div
      className={`rounded-xl border border-aleo-border bg-aleo-card p-6 transition-all duration-300 ${
        hover ? `hover:shadow-lg ${glowColors[glowColor]}` : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

