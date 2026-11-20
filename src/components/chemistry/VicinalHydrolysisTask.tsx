import { useMemo, useState } from 'react';
import {
  TASK_7_TOKENS,
  shuffleArray,
  type FunctionalToken,
  type FunctionalTokenId,
} from '../../game/chemistry/checkpointData';

interface VicinalHydrolysisTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

type SlotKey = 'c2' | 'c1';

export function VicinalHydrolysisTask({
  onSolved,
  onAttempt,
  solved,
}: VicinalHydrolysisTaskProps) {
  const tokens = useMemo<FunctionalToken[]>(() => shuffleArray(TASK_7_TOKENS), []);
  const [selectedToken, setSelectedToken] = useState<FunctionalTokenId | null>(null);
  const [slots, setSlots] = useState<Record<SlotKey, FunctionalTokenId | null>>({
    c2: null,
    c1: null,
  });

  const tokenLabel = (id: FunctionalTokenId | null) =>
    tokens.find((t) => t.id === id)?.label ?? '?';

  const handlePlaceInSlot = (slot: SlotKey, tokenId: FunctionalTokenId) => {
    if (solved) return;
    setSlots((prev) => ({ ...prev, [slot]: tokenId }));
  };

  const handleSlotTap = (slot: SlotKey) => {
    if (solved) return;
    if (selectedToken) {
      handlePlaceInSlot(slot, selectedToken);
    } else if (slots[slot] !== null) {
      setSlots((prev) => ({ ...prev, [slot]: null }));
    }
  };

  const handleCheck = () => {
    if (solved) return;
    if (!slots.c2 || !slots.c1) {
      onAttempt(
        false,
        'Mindkét kijelölt kötési helyre (C2 és C1) helyezz el egy funkciós csoportot!',
      );
      return;
    }

    if (slots.c2 === 'OH' && slots.c1 === 'OH') {
      onAttempt(
        true,
        'Helyes! A vicinális 1,2-dibrómpropán lúgos hidrolízisekor mindkét brómatom helyére –OH csoport lép, így propán-1,2-diol (CH₃–CH(OH)–CH₂OH) keletkezik.',
      );
      onSolved();
      return;
    }

    if (slots.c2 === 'O_DBL' || slots.c1 === 'O_DBL') {
      onAttempt(
        false,
        'Vigyázz: itt a két brómatom szomszédos szénatomokon (vicinális helyzetben) van, nem ugyanazon a szénatomon! Két szomszédos szénatomon külön-külön stabil hidroxilcsoport alakul ki, nem oxovegyület.',
      );
      return;
    }

    if (slots.c2 === 'Br' || slots.c1 === 'Br') {
      onAttempt(
        false,
        'Vizes NaOH-oldatban mindkét –Br kilépő csoport szubsztituálódik. Milyen csoportot visz be a hidroxidion (OH⁻)?',
      );
      return;
    }

    onAttempt(
      false,
      'A vizes lúgos hidrolízis során a halogénatomok helyére nukleofil szubsztitúcióval –OH (hidroxil) csoportok kerülnek, így kétértékű alkohol keletkezik.',
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Egészítsd ki az <strong className="text-orange-400">1,2-dibrómpropán</strong> lúgos
        hidrolízisének termékét! Válassz ki egy funkciós csoportot, majd koppints (vagy húzd) a
        molekula két üres helyére.
      </p>

      {/* Kiindulási egyenlet összefoglaló */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 font-mono-num text-xs sm:text-sm text-zinc-200">
        <span>CH₃–CH(Br)–CH₂Br</span>
        <span className="text-orange-400">+ 2 NaOH (aq) →</span>
        <span className={solved ? 'font-bold text-emerald-300' : 'text-zinc-400'}>
          {solved ? 'CH₃–CH(OH)–CH₂OH (propán-1,2-diol)' : 'Termék összeállítása'}
        </span>
        <span className="text-zinc-400">+ 2 NaBr</span>
      </div>

      {/* Interaktív molekula-tábla */}
      <div className="rounded-xl border border-white/15 bg-zinc-900/80 p-3">
        <div className="mx-auto flex max-w-md items-start justify-center gap-1.5 sm:gap-3">
          {/* C3: CH3 */}
          <div className="flex flex-col items-center">
            <div className="flex h-11 min-w-[54px] items-center justify-center rounded-xl border border-white/20 bg-zinc-950 px-2.5 font-mono-num text-sm sm:text-base font-bold text-white">
              CH₃
            </div>
          </div>

          <div className="mt-5 h-0.5 w-4 sm:w-7 bg-zinc-500" />

          {/* C2: CH + slot */}
          <div className="flex flex-col items-center">
            <div className="flex h-11 min-w-[52px] items-center justify-center rounded-xl border border-white/20 bg-zinc-950 px-2.5 font-mono-num text-sm sm:text-base font-bold text-white">
              CH
            </div>
            <div className="h-4 w-0.5 bg-zinc-500" />
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') as FunctionalTokenId;
                if (id) handlePlaceInSlot('c2', id);
              }}
              onClick={() => handleSlotTap('c2')}
              className={`flex h-11 min-w-[68px] items-center justify-center rounded-xl border-2 font-mono-num text-sm font-bold transition-colors ${
                solved
                  ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                  : slots.c2
                    ? 'border-orange-400 bg-orange-500/20 text-white'
                    : selectedToken
                      ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                      : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
              }`}
            >
              {slots.c2 ? tokenLabel(slots.c2) : 'C2: ?'}
            </button>
          </div>

          <div className="mt-5 h-0.5 w-4 sm:w-7 bg-zinc-500" />

          {/* C1: CH2 + slot */}
          <div className="flex flex-col items-center">
            <div className="flex h-11 min-w-[54px] items-center justify-center rounded-xl border border-white/20 bg-zinc-950 px-2.5 font-mono-num text-sm sm:text-base font-bold text-white">
              CH₂
            </div>
            <div className="h-4 w-0.5 bg-zinc-500" />
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') as FunctionalTokenId;
                if (id) handlePlaceInSlot('c1', id);
              }}
              onClick={() => handleSlotTap('c1')}
              className={`flex h-11 min-w-[68px] items-center justify-center rounded-xl border-2 font-mono-num text-sm font-bold transition-colors ${
                solved
                  ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                  : slots.c1
                    ? 'border-orange-400 bg-orange-500/20 text-white'
                    : selectedToken
                      ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                      : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
              }`}
            >
              {slots.c1 ? tokenLabel(slots.c1) : 'C1: ?'}
            </button>
          </div>
        </div>
      </div>

      {/* Választható funkciós csoportok */}
      {!solved && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {tokens.map((t) => {
              const active = selectedToken === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                  onClick={() => setSelectedToken((prev) => (prev === t.id ? null : t.id))}
                  className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-colors ${
                    active
                      ? 'border-orange-400 bg-orange-500/25 text-white'
                      : 'border-white/15 bg-zinc-950/85 text-zinc-200 hover:border-white/35'
                  }`}
                >
                  <span className="font-mono-num text-sm font-bold">{t.label}</span>
                  <span className="text-[11px] text-zinc-400">{t.desc}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCheck}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
          >
            Termék ellenőrzése
          </button>
        </>
      )}
    </div>
  );
}
