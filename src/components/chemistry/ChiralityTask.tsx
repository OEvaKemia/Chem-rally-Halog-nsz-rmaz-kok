import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_4_ISOMERS,
  shuffleArray,
  type IsomerCardData,
} from '../../game/chemistry/checkpointData';
import { SvgStructureCard } from './SvgStructureCard';

interface ChiralityTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

type CardEvaluation =
  | { status: 'unanswered' }
  | { status: 'achiral' }
  | { status: 'chiral'; carbonId: string };

export function ChiralityTask({ onSolved, onAttempt, solved }: ChiralityTaskProps) {
  const isomers = useMemo<IsomerCardData[]>(() => shuffleArray(TASK_4_ISOMERS), []);
  const [cardIndex, setCardIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<string, CardEvaluation>>(() =>
    Object.fromEntries(TASK_4_ISOMERS.map((iso) => [iso.id, { status: 'unanswered' }])),
  );
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());

  const current = isomers[cardIndex];
  const currentEval = evaluations[current.id];

  const evaluatedCount = isomers.filter(
    (iso) => evaluations[iso.id].status !== 'unanswered',
  ).length;

  const clearWrongFlag = (id: string) => {
    setWrongIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectCarbon = (carbonId: string) => {
    if (solved) return;
    clearWrongFlag(current.id);
    setEvaluations((prev) => {
      const existing = prev[current.id];
      if (existing.status === 'chiral' && existing.carbonId === carbonId) {
        return { ...prev, [current.id]: { status: 'unanswered' } };
      }
      return { ...prev, [current.id]: { status: 'chiral', carbonId } };
    });
  };

  const handleMarkAchiral = () => {
    if (solved) return;
    clearWrongFlag(current.id);
    setEvaluations((prev) => ({
      ...prev,
      [current.id]:
        prev[current.id].status === 'achiral'
          ? { status: 'unanswered' }
          : { status: 'achiral' },
    }));
  };

  const handleCheckAll = () => {
    if (solved) return;

    const firstUnansweredIdx = isomers.findIndex(
      (iso) => evaluations[iso.id].status === 'unanswered',
    );
    if (firstUnansweredIdx !== -1) {
      setCardIndex(firstUnansweredIdx);
      onAttempt(
        false,
        `Még ${8 - evaluatedCount} izomer nincs kiértékelve! Lapozz végig mind a 8 kártyán: jelölj meg egy királis szénatomot, vagy jelöld akirálisnak.`,
      );
      return;
    }

    const errors: IsomerCardData[] = [];
    for (const iso of isomers) {
      const ev = evaluations[iso.id];
      if (iso.chiralCarbonId === null) {
        if (ev.status !== 'achiral') errors.push(iso);
      } else {
        if (ev.status !== 'chiral' || ev.carbonId !== iso.chiralCarbonId) {
          errors.push(iso);
        }
      }
    }

    if (errors.length > 0) {
      setWrongIds(new Set(errors.map((e) => e.id)));
      const firstErrIdx = isomers.findIndex((iso) => iso.id === errors[0].id);
      if (firstErrIdx !== -1) setCardIndex(firstErrIdx);

      onAttempt(
        false,
        `${errors.length} izomernél eltérés van (pirossal jelölt kártyák). Emlékeztető: egy szénatom csak akkor aszimmetrikus, ha négy KÜLÖNBÖZŐ atom vagy atomcsoport kapcsolódik hozzá!`,
      );
      return;
    }

    setWrongIds(new Set());
    onAttempt(
      true,
      'Kiváló! Mind a 8 C₅H₁₁Cl izomer közül pontosan megtaláltad a 3 királis molekulát (2-klórpentán, 2-klór-3-metilbután, 1-klór-2-metilbután) és az aszimmetrikus szénatomjukat.',
    );
    onSolved();
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Vizsgáld meg a <strong className="text-orange-400">C₅H₁₁Cl</strong> mind a 8 konstitúciós izomerjét!
        Ha van benne királis szénatom, <strong className="text-white">koppints közvetlenül rá a képleten</strong>; ha nincs, jelöld akirálisnak!
      </p>

      {/* Lapozó sáv (1–8 kártya állapota) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {isomers.map((iso, idx) => {
            const ev = evaluations[iso.id];
            const isActive = idx === cardIndex;
            const isWrong = wrongIds.has(iso.id);
            const stateClass = isWrong
              ? 'border-red-400 bg-red-950/60 text-red-200'
              : ev.status === 'chiral'
                ? 'border-orange-400/70 bg-orange-500/20 text-orange-200'
                : ev.status === 'achiral'
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                  : 'border-white/15 bg-zinc-900 text-zinc-400';

            return (
              <button
                key={iso.id}
                type="button"
                onClick={() => setCardIndex(idx)}
                className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 font-mono-num text-xs font-bold transition-colors ${stateClass} ${
                  isActive ? 'ring-2 ring-white/80' : ''
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="font-mono-num text-[11px] text-zinc-400">
          Kiértékelve: {evaluatedCount} / 8
        </div>
      </div>

      {/* Aktuális izomer kártya */}
      <div
        className={`rounded-xl border p-3 ${
          wrongIds.has(current.id)
            ? 'border-red-400/80 bg-red-950/25'
            : 'border-white/15 bg-zinc-900/85'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm sm:text-base font-bold text-white">
              {cardIndex + 1}. {current.name}
            </div>
            <div className="font-mono-num text-[11px] text-zinc-400">{current.condensed}</div>
          </div>

          <div className="text-[11px] font-semibold">
            {currentEval.status === 'chiral' ? (
              <span className="text-orange-300">Királis C megjelölve</span>
            ) : currentEval.status === 'achiral' ? (
              <span className="text-sky-300">Akirálisnak jelölve</span>
            ) : (
              <span className="text-zinc-400">Válassz C-atomot vagy akirális gombot</span>
            )}
          </div>
        </div>

        {/* Interaktív kattintható szerkezeti képlet */}
        <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950/80 p-1.5">
          <SvgStructureCard
            nodes={current.nodes}
            bonds={current.bonds}
            selectedCarbonId={currentEval.status === 'chiral' ? currentEval.carbonId : null}
            onSelectCarbon={solved ? undefined : handleSelectCarbon}
            heightClass="h-28 sm:h-32"
          />
        </div>

        {/* Kártyavezérlők */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCardIndex((i) => (i - 1 + isomers.length) % isomers.length)}
              className="flex h-10 items-center gap-1 rounded-xl border border-white/15 bg-zinc-950 px-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Előző</span>
            </button>

            <button
              type="button"
              onClick={() => setCardIndex((i) => (i + 1) % isomers.length)}
              className="flex h-10 items-center gap-1 rounded-xl border border-white/15 bg-zinc-950 px-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              <span>Következő</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!solved && (
            <button
              type="button"
              onClick={handleMarkAchiral}
              className={`flex h-10 items-center justify-center rounded-xl border px-3 text-xs sm:text-sm font-semibold transition-colors ${
                currentEval.status === 'achiral'
                  ? 'border-sky-400 bg-sky-600/30 text-sky-100'
                  : 'border-white/20 bg-zinc-950 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              Nincs királis C (Akirális)
            </button>
          )}
        </div>
      </div>

      {!solved && (
        <button
          type="button"
          onClick={handleCheckAll}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Mind a 8 izomer ellenőrzése
        </button>
      )}
    </div>
  );
}
