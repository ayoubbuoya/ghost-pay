import { useEffect, useState, useCallback } from "react";
import { Spinner } from "./Spinner";

type ToastType = "success" | "error" | "pending";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

export function showToast(message: string, type: ToastType) {
  const id = ++toastId;
  toasts = [...toasts, { id, message, type }];
  emit();
  if (type !== "pending") {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    }, 5000);
  }
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const iconColor: Record<ToastType, string> = {
  success: "text-success",
  error: "text-danger",
  pending: "text-warning",
};

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  const listener = useCallback((t: Toast[]) => setItems(t), []);

  useEffect(() => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listener]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className="bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3"
        >
          {t.type === "pending" && <Spinner />}
          {t.type === "success" && (
            <svg className={`w-5 h-5 ${iconColor[t.type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {t.type === "error" && (
            <svg className={`w-5 h-5 ${iconColor[t.type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm text-surface-200">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
