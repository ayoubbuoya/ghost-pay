// ========================================================
// PrivacyBadge — Visual indicator for data privacy level
//
// Displays whether a piece of data is:
//   🟣 PRIVATE  — Only visible to the record owner (encrypted on-chain)
//   🔵 PUBLIC   — Visible to anyone on the Aleo network
//   🟡 SELECTIVE — Visible to authorized parties via ZK selective disclosure
//
// This component is critical for the demo: it shows judges
// exactly what data is protected and what is publicly verifiable.
// ========================================================

import { Lock, Globe, Eye } from 'lucide-react';
import type { PrivacyLevel } from '../../types/ghostpay';

interface Props {
  level: PrivacyLevel;
  label?: string;
  className?: string;
}

const config: Record<PrivacyLevel, {
  icon: React.ReactNode;
  text: string;
  colors: string;
}> = {
  private: {
    icon: <Lock className="h-3 w-3" />,
    text: 'Private',
    colors: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  },
  public: {
    icon: <Globe className="h-3 w-3" />,
    text: 'Public',
    colors: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  selective: {
    icon: <Eye className="h-3 w-3" />,
    text: 'Selective',
    colors: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
};

export default function PrivacyBadge({ level, label, className = '' }: Props) {
  const c = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.colors} ${className}`}
      title={`This data is ${c.text.toLowerCase()}`}
    >
      {c.icon}
      {label || c.text}
    </span>
  );
}

