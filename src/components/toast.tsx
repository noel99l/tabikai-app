"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { IconCheck } from "./icons";

// 画面上部に表示する完了トースト(Snackbar)。
// クライアントコンポーネントから useToast().show("保存しました") で表示する。
type ToastState = { id: number; message: string } | null;

const ToastContext = createContext<{ show: (message: string) => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[70] flex justify-center px-4"
        >
          <div className="animate-[pop-in_300ms_cubic-bezier(0.34,1.56,0.64,1)] flex max-w-md items-center gap-2 rounded-full border-2 border-line bg-ok px-4 py-2.5 text-[13px] font-bold text-white shadow-[3px_3px_0_var(--color-line)]">
            <IconCheck className="h-4 w-4 shrink-0" strokeWidth={2.6} />
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
