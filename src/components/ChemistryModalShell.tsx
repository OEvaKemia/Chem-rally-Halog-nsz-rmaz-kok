import type { ReactNode } from 'react';

export interface ChemistryModalShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}

/**
 * Reszponzív felületi keret a 2. fázisban érkező kémiai feladatokhoz.
 * Fekvő mobilképernyőn is teljes egészében látható marad, a tartalma pedig belül görgethető.
 */
export function ChemistryModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: ChemistryModalShellProps) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/75 p-2 sm:p-5"
      style={{
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chem-modal-title"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 text-zinc-100 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
        {/* Compact sticky header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 sm:px-6 sm:py-3.5">
          <div className="min-w-0">
            {subtitle && (
              <div className="truncate text-[11px] font-medium text-orange-400">
                {subtitle}
              </div>
            )}
            <h2
              id="chem-modal-title"
              className="truncate font-display text-lg font-bold text-white sm:text-2xl"
            >
              {title}
            </h2>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Bezárás
            </button>
          )}
        </div>

        {/* Internally scrollable content body */}
        <div className="scrollable-panel min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          {children}
        </div>

        {/* Optional sticky footer for action buttons */}
        {footer && (
          <div className="shrink-0 border-t border-white/10 px-4 py-2.5 sm:px-6 sm:py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
