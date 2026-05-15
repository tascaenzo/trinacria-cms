import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { Notification, NotificationStack } from "../notification/notification.js";
import type {
  ToastContextValue,
  ToastInput,
  ToastProviderProps,
  ToastRecord
} from "./toast.types.js";

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return `toast-${Math.random().toString(36).slice(2, 10)}`;
}

export function ToastProvider({
  children,
  maxVisible = 4,
  placement = "top-right"
}: ToastProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setMounted(true);

    return () => {
      for (const timeout of timeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, []);

  function dismissToast(id: string) {
    const timeout = timeoutsRef.current.get(id);

    if (timeout) {
      window.clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function pushToast(toast: ToastInput) {
    const id = toast.id ?? createToastId();
    const duration = toast.duration ?? 5000;
    const nextToast: ToastRecord = { ...toast, id };

    setToasts((current) => [nextToast, ...current].slice(0, maxVisible));

    if (duration > 0 && typeof window !== "undefined") {
      const timeout = window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      pushToast,
      dismissToast,
      dismissAll: () => {
        for (const timeout of timeoutsRef.current.values()) {
          window.clearTimeout(timeout);
        }
        timeoutsRef.current.clear();
        setToasts([]);
      }
    }),
    [toasts]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <ToastViewport placement={placement}>
              {toasts.map((toast) => (
                <Notification
                  key={toast.id}
                  title={toast.title}
                  description={toast.description}
                  tone={toast.tone}
                  icon={toast.icon}
                  meta={toast.meta}
                  action={toast.action}
                  onDismiss={() => dismissToast(toast.id)}
                />
              ))}
            </ToastViewport>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

export function ToastViewport({
  children,
  placement
}: {
  children: ReactNode;
  placement: NonNullable<ToastProviderProps["placement"]>;
}) {
  return (
    <div
      className={[
        "pointer-events-none fixed z-[70] w-full max-w-sm p-4",
        placement.startsWith("top") ? "top-0" : "bottom-0",
        placement.endsWith("right") ? "right-0" : "left-0"
      ].join(" ")}
    >
      <NotificationStack className="pointer-events-auto">{children}</NotificationStack>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
