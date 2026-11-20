import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_10_SOLUTION,
  TASK_10_TOKENS,
  shuffleArray,
  type GrignardSlotKey,
  type GrignardToken,
} from '../../game/chemistry/checkpointData';

interface GrignardReagentTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const SLOT_LABELS: Record<GrignardSlotKey, string> = {
  step1Reagent: '1. reagens',
  step1Medium: 'Reakcióközeg',
  intermediate: 'Köztitermék',
  step2Reagent: '2. reagens',
  finalProduct: 'Fő szerves termék',
  byproduct: 'Melléktermék',
};

export function GrignardReagentTask({
  onSolved,
  onAttempt,
  solved,
}: GrignardReagentTaskProps) {
  const tokens = useMemo<GrignardToken[]>(() => shuffleArray(TASK_10_TOKENS), []);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<GrignardSlotKey, string | null>>({
    step1Reagent: null,
    step1Medium: null,
    intermediate: null,
    step2Reagent: null,
    finalProduct: null,
    byproduct: null,
  });
  const [wrongSlots, setWrongSlots] = useState<Set<GrignardSlotKey>>(new Set());

  const placedIds = new Set(Object.values(slots).filter((v): v is string => v !== null));
  const availableTokens = tokens.filter((t) => !placedIds.has(t.id));

  const placeInSlot = (slotKey: GrignardSlotKey, tokenId: string | null) => {
    if (solved) return;
    setSlots((prev) => {
      const next = { ...prev };
      if (tokenId !== null) {
        for (const k of Object.keys(next) as GrignardSlotKey[]) {
          if (next[k] === tokenId) next[k] = null;
        }
      }
      next[slotKey] = tokenId;
      return next;
    });
    setSelectedTokenId(null);
    setWrongSlots((prev) => {
      if (!prev.has(slotKey)) return prev;
      const next = new Set(prev);
      next.delete(slotKey);
      return next;
    });
  };

  const handleSlotTap = (slotKey: GrignardSlotKey) => {
    if (solved) return;
    if (selectedTokenId) {
      placeInSlot(slotKey, selectedTokenId);
    } else if (slots[slotKey]) {
      placeInSlot(slotKey, null);
    }
  };

  const handleCheck = () => {
    if (solved) return;
    const emptyKeys = (Object.keys(slots) as GrignardSlotKey[]).filter((k) => !slots[k]);
    if (emptyKeys.length > 0) {
      onAttempt(
        false,
        `Még ${emptyKeys.length} mező hiányzik a kétlépéses Grignard-reakcióláncból!`,
      );
      return;
    }

    const errors = new Set<GrignardSlotKey>();
    for (const k of Object.keys(TASK_10_SOLUTION) as GrignardSlotKey[]) {
      if (slots[k] !== TASK_10_SOLUTION[k]) {
        errors.add(k);
      }
    }

    if (errors.size > 0) {
      setWrongSlots(errors);
      if (errors.has('step1Medium')) {
        onAttempt(
          false,
          'Figyelj az 1. lépés reakcióközegére! A Grignard-reagens vízzel vagy alkohollal azonnal elbomlik, ezért szigorúan vízmentes éterben állítható elő.',
        );
      } else if (errors.has('finalProduct') || errors.has('byproduct')) {
        onAttempt(
          false,
          'A 2. lépésben a CH₃–CH(MgBr)–CH₃ vízzel reagál: a szénatomhoz proton kapcsolódik, így alkán (propán) és bázisos magnéziumsó (MgBrOH) keletkezik.',
        );
      } else {
        onAttempt(
          false,
          `${errors.size} elem rossz helyre került (pirossal jelölve). Ellenőrizd az 1. lépésben a fém beépülését (C–MgBr), majd a 2. lépésben a vizes hidrolízist!`,
        );
      }
      return;
    }

    setWrongSlots(new Set());
    onAttempt(
      true,
      'Tökéletes reakciólánc! 2-brómpropán + Mg (vízmentes éter) → CH₃–CH(MgBr)–CH₃, majd vízzel reagálva propán (CH₃–CH₂–CH₃) és MgBrOH keletkezik.',
    );
    onSolved();
  };

  const renderSlot = (slotKey: GrignardSlotKey, minWidthClass = 'min-w-[108px]') => {
    const tokenId = slots[slotKey];
    const token = tokenId ? tokens.find((t) => t.id === tokenId) : null;
    const isWrong = wrongSlots.has(slotKey);

    return (
      <button
        type="button"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData('text/plain');
          if (id) placeInSlot(slotKey, id);
        }}
        onClick={() => handleSlotTap(slotKey)}
        className={`flex min-h-[46px] ${minWidthClass} flex-col items-center justify-center rounded-xl border-2 px-2.5 py-1 text-center transition-colors ${
          solved
            ? 'border-emerald-400 bg-emerald-950/50 text-emerald-100'
            : isWrong
              ? 'border-red-400 bg-red-950/45 text-red-100'
              : token
                ? 'border-orange-400 bg-orange-500/20 text-white'
                : selectedTokenId
                  ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                  : 'border-dashed border-white/30 bg-zinc-950/80 text-zinc-400'
        }`}
      >
        {token ? (
          <>
            <span className="font-mono-num text-xs font-bold leading-tight">{token.label}</span>
            {token.sublabel && (
              <span className="text-[9px] text-zinc-300 leading-tight">{token.sublabel}</span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-medium">{SLOT_LABELS[slotKey]}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Állítsd össze a <strong className="text-orange-400">2-brómpropánból</strong> kiinduló
        kétlépéses Grignard-reakcióláncot! Válassz ki egy elemet, majd koppints (vagy húzd) a
        megfelelő helyre.
      </p>

      {/* Kétlépéses reakciólánc */}
      <div className="space-y-2 rounded-xl border border-white/15 bg-zinc-900/80 p-2.5 sm:p-3">
        {/* 1. lépés */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <div className="rounded-xl border border-white/20 bg-zinc-950 px-2.5 py-2 font-mono-num text-xs font-bold text-white">
            CH₃–CHBr–CH₃
          </div>
          <span className="text-zinc-400 font-bold">+</span>
          {renderSlot('step1Reagent', 'min-w-[78px]')}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-zinc-400">közeg</span>
            {renderSlot('step1Medium', 'min-w-[116px]')}
          </div>
          <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
          {renderSlot('intermediate', 'min-w-[144px]')}
        </div>

        <div className="h-px bg-white/10" />

        {/* 2. lépés */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400">2. lépés:</span>
          <span className="rounded-lg border border-white/10 bg-zinc-950/70 px-2 py-1 font-mono-num text-[11px] text-zinc-300">
            Köztitermék
          </span>
          <span className="text-zinc-400 font-bold">+</span>
          {renderSlot('step2Reagent', 'min-w-[82px]')}
          <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
          {renderSlot('finalProduct', 'min-w-[132px]')}
          <span className="text-zinc-400 font-bold">+</span>
          {renderSlot('byproduct', 'min-w-[92px]')}
        </div>
      </div>

      {/* Választható elemek kevert készlete */}
      {!solved && availableTokens.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
          {availableTokens.map((t) => {
            const active = selectedTokenId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                onClick={() => setSelectedTokenId((prev) => (prev === t.id ? null : t.id))}
                className={`flex min-h-[40px] flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition-colors ${
                  active
                    ? 'border-orange-400 bg-orange-500/25 text-white'
                    : 'border-white/15 bg-zinc-950/85 text-zinc-200 hover:border-white/35'
                }`}
              >
                <span className="font-mono-num text-xs font-bold leading-tight">{t.label}</span>
                {t.sublabel && (
                  <span className="text-[9px] text-zinc-400 leading-tight">{t.sublabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!solved && (
        <button
          type="button"
          onClick={handleCheck}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Reakciólánc ellenőrzése
        </button>
      )}
    </div>
  );
}
