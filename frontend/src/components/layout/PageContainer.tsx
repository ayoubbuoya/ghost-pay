import { type ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
      {children}
    </main>
  );
}
