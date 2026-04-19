import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-surface-900 border border-surface-700 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}
