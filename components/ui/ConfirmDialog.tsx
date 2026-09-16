"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  /** Optional async work to run when user confirms. Dialog stays open with a
   *  spinner until it resolves. If it throws, the dialog stays open and shows
   *  the error inline so the user can retry or cancel. */
  onConfirm?: () => Promise<void> | void;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setLoading(false);
    setError(null);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function finish(result: boolean) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    setLoading(false);
    setError(null);
    resolve?.(result);
  }

  async function handleConfirm() {
    if (!opts) return;
    if (opts.onConfirm) {
      setLoading(true);
      setError(null);
      try {
        await opts.onConfirm();
      } catch (err) {
        // Keep the dialog open so the user can retry or cancel.
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
    }
    finish(true);
  }

  const isDestructive = opts?.variant === "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(v) => { if (!v && !loading) finish(false); }}>
        <DialogContent className="
          bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
          shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[440px]
          max-h-[92vh] flex flex-col overflow-hidden">
          {opts && (
            <>
              <div className="flex items-start gap-3 px-5 pt-5 pb-4 shrink-0
                border-b border-[var(--border-subtle)]">
                <div className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isDestructive
                    ? "bg-[var(--tint-red)] text-[var(--priority-urgent)]"
                    : "bg-[var(--tint-accent)] text-[var(--accent)]",
                ].join(" ")}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-medium text-[var(--text-primary)] leading-tight">
                    {opts.title}
                  </h3>
                </div>
              </div>

              {(opts.description || error) && (
                <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3">
                  {opts.description && (
                    <div className="text-[12.5px] text-[var(--text-muted)] leading-relaxed">
                      {opts.description}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-[var(--tint-red-border)] bg-[var(--tint-red)]
                      px-3 py-2 text-[12.5px] text-[var(--priority-urgent)] leading-relaxed">
                      {error}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 shrink-0
                border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => finish(false)}
                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)]
                    hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)]
                    transition-colors duration-150 disabled:opacity-50"
                >
                  {opts.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirm}
                  className={[
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2",
                    "px-3 py-2 sm:py-1.5 rounded-lg text-[12px] font-medium text-white",
                    "transition-colors duration-150 active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isDestructive
                      ? "bg-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/90"
                      : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
                  ].join(" ")}
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {error
                    ? "Retry"
                    : (opts.confirmLabel ?? "Confirm")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
