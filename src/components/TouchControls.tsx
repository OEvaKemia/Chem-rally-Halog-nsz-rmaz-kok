import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TouchInputState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  brake: boolean;
}

interface TouchControlsProps {
  visible: boolean;
  onChange: (state: TouchInputState) => void;
}

type ControlKey = keyof TouchInputState;

export function TouchControls({ visible, onChange }: TouchControlsProps) {
  const activePointers = useRef<Map<number, ControlKey>>(new Map());
  const [pressed, setPressed] = useState<TouchInputState>({
    left: false,
    right: false,
    throttle: false,
    brake: false,
  });

  const syncState = useCallback(() => {
    const next: TouchInputState = {
      left: false,
      right: false,
      throttle: false,
      brake: false,
    };
    activePointers.current.forEach((key) => {
      next[key] = true;
    });
    setPressed(next);
    onChange(next);
  }, [onChange]);

  const handlePointerDown = (key: ControlKey) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported on older WebKit
    }
    activePointers.current.set(e.pointerId, key);
    syncState();
  };

  const handlePointerRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (activePointers.current.delete(e.pointerId)) {
      syncState();
    }
  };

  useEffect(() => {
    if (!visible && activePointers.current.size > 0) {
      activePointers.current.clear();
      syncState();
    }
  }, [visible, syncState]);

  useEffect(() => {
    const clearAll = () => {
      if (activePointers.current.size > 0) {
        activePointers.current.clear();
        syncState();
      }
    };
    const handleVisibility = () => {
      if (document.hidden) clearAll();
    };
    window.addEventListener('blur', clearAll);
    window.addEventListener('pagehide', clearAll);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', clearAll);
      window.removeEventListener('pagehide', clearAll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncState]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-2.5 pb-2.5 sm:px-5 sm:pb-4"
      style={{
        paddingLeft: 'max(0.625rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.625rem, env(safe-area-inset-right))',
        paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Bal alsó sarok: két nagy, áttetsző kormányzógomb */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Balra kormányzás"
          onPointerDown={handlePointerDown('left')}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
          onLostPointerCapture={handlePointerRelease}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-control flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border transition-transform duration-75 ${
            pressed.left
              ? 'scale-95 border-orange-400/90 bg-orange-500/65 text-white shadow-lg'
              : 'border-white/30 bg-zinc-950/35 text-white/90 active:bg-orange-500/55'
          }`}
        >
          <ChevronLeft className="h-9 w-9 sm:h-11 sm:w-11 stroke-[2.5]" />
        </button>

        <button
          type="button"
          aria-label="Jobbra kormányzás"
          onPointerDown={handlePointerDown('right')}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
          onLostPointerCapture={handlePointerRelease}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-control flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border transition-transform duration-75 ${
            pressed.right
              ? 'scale-95 border-orange-400/90 bg-orange-500/65 text-white shadow-lg'
              : 'border-white/30 bg-zinc-950/35 text-white/90 active:bg-orange-500/55'
          }`}
        >
          <ChevronRight className="h-9 w-9 sm:h-11 sm:w-11 stroke-[2.5]" />
        </button>
      </div>

      {/* Jobb alsó sarok: külön fék- és gázpedál */}
      <div className="pointer-events-auto flex items-end gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Fék és hátramenet"
          onPointerDown={handlePointerDown('brake')}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
          onLostPointerCapture={handlePointerRelease}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-control flex h-16 w-16 sm:h-20 sm:w-20 flex-col items-center justify-center rounded-2xl border font-display text-xs sm:text-sm font-bold tracking-wider transition-transform duration-75 ${
            pressed.brake
              ? 'scale-95 border-red-400/90 bg-red-600/70 text-white shadow-lg'
              : 'border-white/30 bg-zinc-950/35 text-red-200 active:bg-red-600/60'
          }`}
        >
          <span>FÉK</span>
          <span className="mt-0.5 text-[10px] font-normal text-white/75">HÁTRA</span>
        </button>

        <button
          type="button"
          aria-label="Gázpedál"
          onPointerDown={handlePointerDown('throttle')}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
          onLostPointerCapture={handlePointerRelease}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-control flex h-20 w-18 sm:h-24 sm:w-22 flex-col items-center justify-center rounded-2xl border font-display text-sm sm:text-base font-bold tracking-wider transition-transform duration-75 ${
            pressed.throttle
              ? 'scale-95 border-emerald-400/90 bg-emerald-600/70 text-white shadow-lg'
              : 'border-white/30 bg-zinc-950/35 text-emerald-200 active:bg-emerald-600/60'
          }`}
        >
          <span>GÁZ</span>
          <span className="mt-0.5 text-[10px] font-normal text-white/75">ELŐRE</span>
        </button>
      </div>
    </div>
  );
}
