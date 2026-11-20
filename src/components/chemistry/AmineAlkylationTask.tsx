import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_9_STEPS,
  TASK_9_TOKENS,
  shuffleArray,
  type AmineBondTokenId,
  type AmineDegree,
} from '../../game/chemistry/checkpointData';

interface AmineAlkylationTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const DEGREE_OPTIONS: Array<{ id: AmineDegree; label: string }> = [
  { id: 'primer', label: 'Primer amin' },
  { id: 'szekunder', label: 'Szekunder amin' },
  { id: 'tercier', label: 'Tercier amin' },
];

export function AmineAlkylationTask({
  onSolved,
  onAttempt,
  solved,
}: AmineAlkylationTaskProps) {
  const tokens = useMemo(() => shuffleArray(TASK_9_TOKENS), []);
  const degrees = useMemo(() => shuffleArray(DEGREE_OPTIONS), []);

  const [stepIdx, setStepIdx] = useState(0);
  const [bonds, setBonds] = useState<[AmineBondTokenId | null, AmineBondTokenId | null, AmineBondTokenId | null]>([
    null,
    null,
    null,
  ]);
  const [selectedToken, setSelectedToken] = useState<AmineBondTokenId | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<AmineDegree | null>(null);

  const currentStep = TASK_9_STEPS[stepIdx];

  const tokenLabel = (id: AmineBondTokenId | null) =>
    tokens.find((t) => t.id === id)?.label ?? '?';

  const setBondSlot = (idx: 0 | 1 | 2, token: AmineBondTokenId | null) => {
    if (solved) return;
    setBonds((prev) => {
      const next: [AmineBondTokenId | null, AmineBondTokenId | null, AmineBondTokenId | null] = [
        ...prev,
      ];
      next[idx] = token;
      return next;
    });
  };

  const handleSlotTap = (idx: 0 | 1 | 2) => {
    if (solved) return;
    if (selectedToken) {
      setBondSlot(idx, selectedToken);
    } else if (bonds[idx] !== null) {
      setBondSlot(idx, null);
    }
  };

  const handleCheckStep = () => {
    if (solved) return;

    const filledCount = bonds.filter((b) => b !== null).length;
    if (filledCount < 3) {
      onAttempt(
        false,
        `A semleges nitrogénatom három kovalens kötést alakít ki (plusz egy nemkötő elektronpárja van). Még ${3 - filledCount} kötőhely üres!`,
      );
      return;
    }

    if (bonds.includes('Br')) {
      onAttempt(
        false,
        'Az alkilezés során a brómatom bromidionként (Br⁻) távozik az 1-brómbutánból, nem kötődik közvetlenül a nitrogénhez! A nitrogénhez csak butilcsoport (–C₄H₉) vagy hidrogén (–H) kapcsolódhat.',
      );
      return;
    }

    const butylCount = bonds.filter((b) => b === 'C4H9').length;
    const hCount = bonds.filter((b) => b === 'H').length;

    if (
      butylCount !== currentStep.requiredButylCount ||
      hCount !== currentStep.requiredHCount
    ) {
      onAttempt(
        false,
        `A(z) ${currentStep.name} (${currentStep.formula}) felépítéséhez a nitrogénatomhoz ${currentStep.requiredButylCount} db butilcsoportnak (–C₄H₉) és ${currentStep.requiredHCount} db hidrogénatomnak (–H) kell kapcsolódnia.`,
      );
      return;
    }

    if (!selectedDegree) {
      onAttempt(
        false,
        'A nitrogén kötései rendben vannak! Válaszd ki az amin rendűségét is (primer, szekunder vagy tercier).',
      );
      return;
    }

    if (selectedDegree !== currentStep.degree) {
      onAttempt(
        false,
        `A kötött szerves csoportok száma (${butylCount} db –C₄H₉) határozza meg az amin rendűségét: ha ${currentStep.requiredButylCount} szénhidrogéncsoport kapcsolódik a nitrogénhez, az amin ${currentStep.degree}!`,
      );
      return;
    }

    if (stepIdx < TASK_9_STEPS.length - 1) {
      const nextStep = TASK_9_STEPS[stepIdx + 1];
      setStepIdx(stepIdx + 1);
      setBonds([null, null, null]);
      setSelectedDegree(null);
      setSelectedToken(null);
      onAttempt(
        true,
        `${currentStep.stepNumber}. lépés kész (${currentStep.name}, ${currentStep.degree} amin)! A reakció tovább folytatódhat 1-brómbutánnal: most építsd fel a(z) ${nextStep.name}t!`,
      );
    } else {
      onAttempt(
        true,
        'Mindhárom amin felépítve! Fontos: az 1-brómbutánnal végzett alkilezés nem áll meg automatikusan az első lépésnél — a folyamat tovább folytatódhat egészen tercier aminig, sőt kvaterner ammóniumsóig is, ezért a reakcióban általában aminok termékelegye képződik.',
      );
      onSolved();
    }
  };

  return (
    <div className="space-y-3">
      {/* Lépésjelző */}
      <div className="grid grid-cols-3 gap-1.5">
        {TASK_9_STEPS.map((s, idx) => {
          const done = solved || idx < stepIdx;
          const active = !solved && idx === stepIdx;
          return (
            <div
              key={s.stepNumber}
              className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold ${
                done
                  ? 'border-emerald-500/50 bg-emerald-950/35 text-emerald-200'
                  : active
                    ? 'border-orange-500 bg-orange-500/20 text-white'
                    : 'border-white/10 bg-zinc-900/60 text-zinc-400'
              }`}
            >
              <span className="truncate">
                {s.stepNumber}. {s.name}
              </span>
              {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200">
        <div>
          Kiindulás: <strong className="text-orange-300">1-brómbután</strong> ·{' '}
          <span className="font-mono-num text-zinc-300">{currentStep.equation}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-zinc-400">
          Építsd fel a(z) <strong className="text-white">{currentStep.name}</strong> ({currentStep.formula}) nitrogénatomjának 3 kötését, majd add meg az amin rendűségét!
        </div>
      </div>

      {/* Nitrogénatom 3 kötése */}
      <div className="rounded-xl border border-white/15 bg-zinc-900/80 p-3">
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-mono-num text-amber-300">·· (nemkötő elektronpár)</div>
          <div className="mt-1 flex items-center justify-center gap-2">
            {/* 1. kötés (bal) */}
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') as AmineBondTokenId;
                if (id) setBondSlot(0, id);
              }}
              onClick={() => handleSlotTap(0)}
              className={`flex h-11 min-w-[74px] items-center justify-center rounded-xl border-2 font-mono-num text-xs sm:text-sm font-bold transition-colors ${
                solved
                  ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200'
                  : bonds[0]
                    ? 'border-orange-400 bg-orange-500/20 text-white'
                    : selectedToken
                      ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                      : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
              }`}
            >
              {bonds[0] ? tokenLabel(bonds[0]) : '1. kötés'}
            </button>

            <div className="h-0.5 w-3 bg-zinc-500" />

            {/* Központi N atom */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-950/70 font-mono-num text-lg font-bold text-sky-200">
              N
            </div>

            <div className="h-0.5 w-3 bg-zinc-500" />

            {/* 2. kötés (jobb) */}
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') as AmineBondTokenId;
                if (id) setBondSlot(1, id);
              }}
              onClick={() => handleSlotTap(1)}
              className={`flex h-11 min-w-[74px] items-center justify-center rounded-xl border-2 font-mono-num text-xs sm:text-sm font-bold transition-colors ${
                solved
                  ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200'
                  : bonds[1]
                    ? 'border-orange-400 bg-orange-500/20 text-white'
                    : selectedToken
                      ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                      : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
              }`}
            >
              {bonds[1] ? tokenLabel(bonds[1]) : '2. kötés'}
            </button>
          </div>

          <div className="h-3.5 w-0.5 bg-zinc-500" />

          {/* 3. kötés (alsó) */}
          <button
            type="button"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain') as AmineBondTokenId;
              if (id) setBondSlot(2, id);
            }}
            onClick={() => handleSlotTap(2)}
            className={`flex h-11 min-w-[74px] items-center justify-center rounded-xl border-2 font-mono-num text-xs sm:text-sm font-bold transition-colors ${
              solved
                ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200'
                : bonds[2]
                  ? 'border-orange-400 bg-orange-500/20 text-white'
                  : selectedToken
                    ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                    : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
            }`}
          >
            {bonds[2] ? tokenLabel(bonds[2]) : '3. kötés'}
          </button>
        </div>
      </div>

      {!solved && (
        <>
          {/* Csoport-paletta + rendűség választó */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              {tokens.map((t) => {
                const active = selectedToken === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                    onClick={() => setSelectedToken((prev) => (prev === t.id ? null : t.id))}
                    className={`flex min-h-[40px] items-center gap-1 rounded-xl border px-2.5 py-1 transition-colors ${
                      active
                        ? 'border-orange-400 bg-orange-500/25 text-white'
                        : 'border-white/15 bg-zinc-950/85 text-zinc-200 hover:border-white/30'
                    }`}
                  >
                    <span className="font-mono-num text-xs sm:text-sm font-bold">{t.label}</span>
                    <span className="text-[10px] text-zinc-400">{t.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              {degrees.map((d) => {
                const active = selectedDegree === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDegree(d.id)}
                    className={`flex min-h-[40px] items-center justify-center rounded-xl border px-2 text-center text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-sky-400 bg-sky-500/25 text-white'
                        : 'border-white/15 bg-zinc-950/85 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckStep}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
          >
            {currentStep.stepNumber}. lépés ellenőrzése
          </button>
        </>
      )}
    </div>
  );
}
