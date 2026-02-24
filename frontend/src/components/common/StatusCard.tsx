// ========================================================
// StatusCard — Metric display card for dashboard summaries
//
// Shows a key metric with icon, value, label, and optional
// privacy indicator. Used in all three role dashboards.
// ========================================================

import type { ReactNode } from 'react';
import PrivacyBadge from './PrivacyBadge';
import type { PrivacyLevel } from '../../types/ghostpay';

interface Props {
  icon: ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  privacy?: PrivacyLevel;
  iconColor?: string;
}

export default function StatusCard({
  icon,
  label,
  value,
  subValue,
  privacy,
  iconColor = 'text-aleo-cyan',
}: Props) {
  return (
    <div className="glow-card p-5">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg bg-gray-800 p-2.5 ${iconColor}`}>
          {icon}
        </div>
        {privacy && <PrivacyBadge level={privacy} />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-sm text-gray-400">{label}</p>
        {subValue && (
          <p className="mt-0.5 text-xs text-gray-500">{subValue}</p>
        )}
      </div>
    </div>
  );
}

