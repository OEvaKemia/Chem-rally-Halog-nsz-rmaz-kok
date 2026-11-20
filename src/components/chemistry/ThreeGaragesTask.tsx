import { useMemo, useState } from 'react';
import {
  TASK_2_GARAGE_COMPOUNDS,
  shuffleArray,
  type GarageCategory,
  type GarageCompound,
} from '../../game/chemistry/checkpointData';

interface ThreeGaragesTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const GARAGES: Array<{ id: GarageCategory; title: string; hint: string }> = [
  { id: 'primer', title: 'Primer garázs', hint: 'Halogénes C → 1 C-szomszéd' },
  { id: 'szekunder', title: 'Szekunder garázs', hint: 'Halogénes C → 2 C-szomszéd' },
  { id: 'tercier', title: 'Tercier garázs', hint: 'Halogénes C → 3 C-szomszéd' },
];

export function ThreeGaragesTask({ onSolved, onAttempt, solved }: ThreeGaragesTaskProps) {
  const compounds = useMemo<GarageCompound[]>(
    () => shuffleArray(TASK_2_GARAGE_COMPOUNDS),
    [],
  );

  const [assignments, setAssignments] = useState<Record<string, GarageCategory | null>>(() =>
    Object.fromEntries(TASK_2_GARAGE_COMPOUNDS.map((c) => [c.id, null])),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [wrongCardIds, setWrongCardIds] = useState<Set<string>>(new Set());

  const unplaced = compounds.filter((c) => assignments[c.id] === null);

  const assignToGarage = (cardId: string, garage: GarageCategory | null) => {
    if (solved) return;
    setAssignments((prev) => ({ ...prev, [cardId]: garage }));
    setSelectedCardId(null);
    setWrongCardIds((prev) => {
      if (!prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  const handleCardTap = (cardId: string) => {
    if (solved) return;
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  };

  const handleGarageTap = (garage: GarageCategory) => {
    if (solved || !selectedCardId) return;
    assignToGarage(selectedCardId, garage);
  };

  const handleCheck = () => {
    if (solved) return;
    const missing = compounds.filter((c) => assignments[c.id] === null);
    if (missing.length > 0) {
      onAttempt(
        false,
        `Még ${missing.length} vegyület nincs besorolva valamelyik garázsba.`,
      );
      return;
    }

    const misplaced = compounds.filter((c) => assignments[c.id] !== c.category);
    if (misplaced.length > 0) {
      setWrongCardIds(new Set(misplaced.map((c) => c.id)));
      const sample = misplaced[0];
      onAttempt(
        false,
        `${misplaced.length} vegyület rossz garázsba került (kiemelve). Nézd meg például a(z) ${sample.name} molekulában, hány szénatom kapcsolódik közvetlenül a halogént hordozó szénatomhoz!`,
      );
      return;
    }

    setWrongCardIds(new Set());
    onAttempt(
      true,
      'Tökéletes besorolás! Mind a hat halogénszármazék a halogént viselő szénatom rendűségének megfelelő garázsba került.',
    );
    onSolved();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Sorold be a hat halogénszármazékot a{' '}
        <strong className="text-orange-400">halogénatomot hordozó szénatom</strong> kapcsolódása szerint!
        Koppints egy kártyára, majd a cél garázsra (vagy húzd át egérrel).
      </p>

      {/* Várakozó vegyületkártyák */}
      {unplaced.length > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (id) assignToGarage(id, null);
          }}
          className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-zinc-900/60 p-2.5"
        >
          {unplaced.map((c) => {
            const isSelected = selectedCardId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                draggable={!solved}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                onClick={() => handleCardTap(c.id)}
                className={`min-h-[44px] rounded-xl border px-3 py-1.5 text-left transition-colors ${
                  isSelected
                    ? 'border-orange-400 bg-orange-500/25 text-white'
                    : 'border-white/15 bg-zinc-950/85 text-zinc-100 hover:border-white/30'
                }`}
              >
                <div className="text-xs sm:text-sm font-semibold">{c.name}</div>
                <div className="font-mono-num text-[11px] text-zinc-400">{c.formula}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Három garázs */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {GARAGES.map((g) => {
          const cardsHere = compounds.filter((c) => assignments[c.id] === g.id);
          return (
            <div
              key={g.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) assignToGarage(id, g.id);
              }}
              onClick={() => handleGarageTap(g.id)}
              className={`min-h-[116px] rounded-xl border p-2.5 transition-colors ${
                selectedCardId
                  ? 'cursor-pointer border-orange-400/50 bg-zinc-900/90 hover:border-orange-400'
                  : 'border-white/15 bg-zinc-900/75'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold text-orange-300">{g.title}</div>
              <div className="text-[10px] sm:text-[11px] text-zinc-400">{g.hint}</div>

              <div className="mt-2 space-y-1.5">
                {cardsHere.map((c) => {
                  const isWrong = wrongCardIds.has(c.id);
                  const isSelected = selectedCardId === c.id;
                  return (
                    <div
                      key={c.id}
                      draggable={!solved}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardTap(c.id);
                      }}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left ${
                        isWrong
                          ? 'border-red-400 bg-red-950/50 text-red-100'
                          : isSelected
                            ? 'border-orange-400 bg-orange-500/25 text-white'
                            : 'border-white/15 bg-zinc-950/80 text-zinc-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{c.name}</div>
                        <div className="truncate font-mono-num text-[10px] text-zinc-400">
                          {c.formula}
                        </div>
                      </div>
                      {!solved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignToGarage(c.id, null);
                          }}
                          aria-label={`${c.name} eltávolítása`}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!solved && (
        <button
          type="button"
          onClick={handleCheck}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Ellenőrzés
        </button>
      )}
    </div>
  );
}
