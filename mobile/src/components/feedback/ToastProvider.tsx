import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Toast,
  type ToastMessage,
  type ToastVariant,
} from "@/src/components/feedback/Toast";
import { spacing } from "@/src/theme";

export type ShowToastInput = {
  dedupeKey?: string;
  variant?: ToastVariant;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => string;
  dismissToast: (id: string) => void;
};

const DEFAULT_DURATION_MS = 5_000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const nextId = useRef(0);
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setQueue((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = `toast-${Date.now()}-${nextId.current++}`;

    const toast: ToastMessage = {
      id,
      dedupeKey: input.dedupeKey ?? null,
      variant: input.variant ?? "info",
      title: input.title.trim(),
      message: input.message?.trim() || null,
      actionLabel: input.actionLabel?.trim() || null,
      onAction: input.onAction ?? null,
      durationMs: Math.max(1_500, input.durationMs ?? DEFAULT_DURATION_MS),
    };

    setQueue((current) => {
      const withoutDuplicate = toast.dedupeKey
        ? current.filter((item) => item.dedupeKey !== toast.dedupeKey)
        : current;

      return [...withoutDuplicate, toast];
    });

    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  const activeToast = queue[0] ?? null;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}

        <View
          pointerEvents="box-none"
          style={[
            styles.viewport,
            {
              paddingTop: insets.top + spacing.sm,
            },
          ]}
        >
          {activeToast ? (
            <Toast
              key={activeToast.id}
              toast={activeToast}
              onDismiss={() => {
                dismissToast(activeToast.id);
              }}
            />
          ) : null}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 1000,
    paddingHorizontal: spacing.md,
  },
});
