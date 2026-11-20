import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_6_BOILING_COMPOUNDS,
  shuffleArray,
  type BoilingPointCompound,
} from '../../game/chemistry/checkpointData';

interface BoilingPointsTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

function getInitialNonSolvedOrder(): BoilingPointCompound[] {
  let candidate = shuffleArray(TASK_6_BOILING_COMPOUNDS);
  let guard = 0;
  while (
    candidate.every((c, idx) => c.rank === idx) &&
    guard < 10
  ) {
    candidate = shuffleArray(TASK_6_BOILING_COMPOUNDS);
    guard++;
  }
  if (candidate.every((c, idx) => c.rank === idx)) {
    candidate = [candidate[2], candidate[0], candidate[1]];
  }
  return candidate;
}

export function BoilingPointsTask({
  onSolved,
  onAttempt,
  solved,
}: BoilingPointsTaskProps) {
  const initialOrder = useMemo(() => getInitialNonSolvedOrder(), []);
  const [order, setOrder] = useState<BoilingPointCompound[]>(initialOrder);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const swapPositions = (a: number, b: number) => {
    if (solved || a === b) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
    setSelectedIdx(null);
  };

  const handleCardTap = (idx: number) => {
    if (solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      swapPositions(selectedIdx, idx);
    }
  };

  const handleCheck = () => {
    if (solved) return;
    const isCorrect = order.every((item, idx) => item.rank === idx);
    if (isCorrect) {
      onAttempt(
        true,
        'Helyes sorrend! CH₃Cl (−24 °C) < CH₃Br (+4 °C) < CH₃I (+42 °C). A halogénatom tömegének és elektronszámának növekedésével erősödnek a molekulák közötti diszperziós kölcsönhatások.',
      );
      onSolved();
    } else {
      onAttempt(
        false,
        'Még nem jó a sorrend. Gondold végig: a periódusos rendszer VII. főcsoportjában lefelé (Cl → Br → I) nő a moláris tömeg és az elektronfelhő polarizálhatósága, ami erősebb másodrendű kötést és magasabb forráspontot eredményez.',
      );
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Rendezd a három monohalogén-metánt{' '}
        <strong className="text-orange-400">növekvő forráspont</strong> szerint! Húzd át a
        kártyákat, koppints kettőre a cseréhez, vagy használd a nyilakat.
      </p>

      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-1">
        <span>Legalacsonyabb forráspont</span>
        <span>Legmagasabb forráspont</span>
      </div>

      {/* Három kártya sorban */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {order.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <div
              key={item.id}
              draggable={!solved}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) swapPositions(dragIdx, idx);
                setDragIdx(null);
              }}
              onClick={() => handleCardTap(idx)}
              className={`flex flex-col justify-between rounded-xl border p-2.5 sm:p-3 transition-colors select-none ${
                solved
                  ? 'border-emerald-400/60 bg-emerald-950/25'
                  : isSelected
                    ? 'cursor-pointer border-orange-400 bg-orange-500/20'
                    : 'cursor-pointer border-white/15 bg-zinc-900/85 hover:border-white/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono-num text-zinc-400">
                  <span>{idx + 1}. hely</span>
                  {!solved && <GripVertical className="h-3.5 w-3.5 text-zinc-500" />}
                </div>
                <div className="mt-1.5 text-center font-mono-num text-xl sm:text-2xl font-bold text-white">
                  {item.formula}
                </div>
                <div className="mt-0.5 text-center text-[11px] text-zinc-300">
                  {item.name}
                </div>
                {solved && (
                  <div className="mt-1 text-center font-mono-num text-xs font-bold text-emerald-300">
                    fp.: {item.bpReveal}
                  </div>
                )}
              </div>

              {!solved && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      swapPositions(idx, idx - 1);
                    }}
                    aria-label={`${item.formula} mozgatása balra`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-zinc-950 text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === order.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      swapPositions(idx, idx + 1);
                    }}
                    aria-label={`${item.formula} mozgatása jobbra`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-zinc-950 text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Aktuális sorrend vizuális összefoglalása */}
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 font-mono-num text-xs sm:text-sm font-bold text-zinc-200">
        <span>{order[0].formula}</span>
        <span className="text-orange-400">&lt;</span>
        <span>{order[1].formula}</span>
        <span className="text-orange-400">&lt;</span>
        <span>{order[2].formula}</span>
      </div>

      {!solved && (
        <button
          type="button"
          onClick={handleCheck}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Sorrend ellenőrzése
        </button>
      )}
    </div>
  );
}
