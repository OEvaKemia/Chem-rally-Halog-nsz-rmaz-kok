import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_8_TOKENS_A,
  TASK_8_TOKENS_B,
  shuffleArray,
  type FunctionalToken,
  type FunctionalTokenId,
} from '../../game/chemistry/checkpointData';

interface GeminalHydrolysesTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

function samePair(
  a: FunctionalTokenId | null,
  b: FunctionalTokenId | null,
  x: FunctionalTokenId,
  y: FunctionalTokenId,
): boolean {
  return (a === x && b === y) || (a === y && b === x);
}

export function GeminalHydrolysesTask({
  onSolved,
  onAttempt,
  solved,
}: GeminalHydrolysesTaskProps) {
  const tokensA = useMemo<FunctionalToken[]>(() => shuffleArray(TASK_8_TOKENS_A), []);
  const tokensB = useMemo<FunctionalToken[]>(() => shuffleArray(TASK_8_TOKENS_B), []);

  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [selectedToken, setSelectedToken] = useState<FunctionalTokenId | null>(null);

  // 1. reakció: 1,1-dibrómpropán -> propanal (CH3-CH2-CHO)
  const [solvedA, setSolvedA] = useState(false);
  const [slotsA, setSlotsA] = useState<[FunctionalTokenId | null, FunctionalTokenId | null]>([
    null,
    null,
  ]);

  // 2. reakció: 1,1,1-triklórpropán -> lúgos propanoát (-COONa), savas propánsav (-COOH)
  const [solvedB, setSolvedB] = useState(false);
  const [slotsBAlk, setSlotsBAlk] = useState<
    [FunctionalTokenId | null, FunctionalTokenId | null]
  >([null, null]);
  const [slotsBAcid, setSlotsBAcid] = useState<
    [FunctionalTokenId | null, FunctionalTokenId | null]
  >([null, null]);

  const tokenList = activeTab === 'A' ? tokensA : tokensB;
  const labelOf = (id: FunctionalTokenId | null) =>
    [...TASK_8_TOKENS_A, ...TASK_8_TOKENS_B].find((t) => t.id === id)?.label ?? '?';

  const handleCheckA = () => {
    if (solvedA) return;
    const [s1, s2] = slotsA;
    if (!s1 || !s2) {
      onAttempt(
        false,
        'Az 1,1-dibrómpropán végállású szénatomján mindkét kötőhelyet töltsd ki!',
      );
      return;
    }

    if (samePair(s1, s2, 'O_DBL', 'H')) {
      setSolvedA(true);
      setSelectedToken(null);
      if (solvedB) {
        onAttempt(
          true,
          'Mindkét geminális hidrolízis hibátlan! 1,1-dibrómpropán → propanal (CH₃–CH₂–CHO), és az 1,1,1-triklórpropánból lúggal propanoát, savanyítással propánsav keletkezik.',
        );
        onSolved();
      } else {
        setActiveTab('B');
        onAttempt(
          true,
          '1. reakció helyes! A geminális diol vízkilépéssel alakul át, így propanal (CH₃–CH₂–CHO) képződik. Most oldd meg a 2. reakciót is!',
        );
      }
      return;
    }

    if (s1 === 'OH' && s2 === 'OH') {
      onAttempt(
        false,
        'A két –OH csoport ugyanazon a szénatomon (geminális diol) instabil: azonnal egy vízmolekula (H₂O) lép ki, és oxovegyület alakul ki! Mely két csoport marad a C1 szénatomon?',
      );
      return;
    }

    onAttempt(
      false,
      '1,1-dibrómpropán hidrolízisekor a végállású C1 szénatomon először instabil diol képződik, majd vízkilépéssel aldehidcsoport (–CHO, azaz =O és –H) alakul ki.',
    );
  };

  const handleCheckB = () => {
    if (solvedB) return;
    const [a1, a2] = slotsBAlk;
    const [c1, c2] = slotsBAcid;

    if (!a1 || !a2 || !c1 || !c2) {
      onAttempt(
        false,
        'Állítsd össze mind a lúgos hidrolízis termékét, mind a savas feldolgozás utáni terméket!',
      );
      return;
    }

    const alkOk = samePair(a1, a2, 'O_DBL', 'ONa');
    const acidOk = samePair(c1, c2, 'O_DBL', 'OH');

    if (alkOk && acidOk) {
      setSolvedB(true);
      setSelectedToken(null);
      if (solvedA) {
        onAttempt(
          true,
          'Mindkét geminális hidrolízis hibátlan! 1,1-dibrómpropán → propanal (CH₃–CH₂–CHO), és 1,1,1-triklórpropán → nátrium-propanoát (CH₃–CH₂–COONa), savanyítás után propánsav (CH₃–CH₂–COOH).',
        );
        onSolved();
      } else {
        setActiveTab('A');
        onAttempt(
          true,
          '2. reakció helyes! Lúgos közegben propanoát (CH₃–CH₂–COONa), savas feldolgozás után propánsav (CH₃–CH₂–COOH) keletkezik. Most ellenőrizd az 1. reakciót is!',
        );
      }
      return;
    }

    if (!alkOk && acidOk) {
      onAttempt(
        false,
        'A savas feldolgozás utáni termék (propánsav, –COOH) jó, de lúgos közegben (NaOH) a keletkező karbonsav sóvá alakul: milyen csoport szerepel a –COONa-ban az –OH helyett?',
      );
      return;
    }

    if (alkOk && !acidOk) {
      onAttempt(
        false,
        'A lúgos hidrolízis terméke (propanoát, –COONa) helyes! Savas feldolgozás (+ H⁺) után azonban a karboxilátion protonálódik: milyen karbonsavcsoport alakul ki?',
      );
      return;
    }

    onAttempt(
      false,
      'Három halogénatom ugyanazon a láncvégi C1 szénatomon hidrolízissel karbonsavszármazékot ad: lúgos közegben karboxilátot (=O és –ONa, azaz –COONa), savas feldolgozás után karbonsavat (=O és –OH, azaz –COOH).',
    );
  };

  const renderSlotButton = (
    value: FunctionalTokenId | null,
    isCorrectLocked: boolean,
    onSet: (id: FunctionalTokenId) => void,
    onClear: () => void,
    placeholder: string,
  ) => (
    <button
      type="button"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (isCorrectLocked) return;
        const id = e.dataTransfer.getData('text/plain') as FunctionalTokenId;
        if (id) onSet(id);
      }}
      onClick={() => {
        if (isCorrectLocked) return;
        if (selectedToken) onSet(selectedToken);
        else if (value) onClear();
      }}
      className={`flex h-10 min-w-[64px] items-center justify-center rounded-xl border-2 px-2 font-mono-num text-xs sm:text-sm font-bold transition-colors ${
        isCorrectLocked
          ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
          : value
            ? 'border-orange-400 bg-orange-500/20 text-white'
            : selectedToken
              ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
              : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
      }`}
    >
      {value ? labelOf(value) : placeholder}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Külön reakció fülek */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('A');
            setSelectedToken(null);
          }}
          className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'A'
              ? 'border-orange-500 bg-orange-500/20 text-white'
              : 'border-white/15 bg-zinc-900/75 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span className="truncate">1. 1,1-dibrómpropán</span>
          {solvedA && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('B');
            setSelectedToken(null);
          }}
          className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'B'
              ? 'border-orange-500 bg-orange-500/20 text-white'
              : 'border-white/15 bg-zinc-900/75 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span className="truncate">2. 1,1,1-triklórpropán</span>
          {solvedB && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
        </button>
      </div>

      {/* 1. reakció panel */}
      {activeTab === 'A' && (
        <div className="space-y-2.5 rounded-xl border border-white/15 bg-zinc-900/80 p-3">
          <div className="text-xs text-zinc-200 leading-snug">
            Állítsd össze az <strong className="text-orange-400">1,1-dibrómpropán</strong>{' '}
            (<span className="font-mono-num">CH₃–CH₂–CHBr₂</span>) stabilis hidrolízistermékét!
            {solvedA && (
              <span className="ml-1.5 font-semibold text-emerald-300">
                ✓ Propanal (CH₃–CH₂–CHO)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/70 p-2.5">
            <div className="flex h-10 items-center rounded-xl border border-white/20 bg-zinc-900 px-2.5 font-mono-num text-sm font-bold text-white">
              CH₃–CH₂
            </div>
            <div className="h-0.5 w-4 bg-zinc-500" />
            <div className="flex flex-col items-center gap-1.5">
              {renderSlotButton(
                slotsA[0],
                solvedA,
                (id) => setSlotsA(([, b]) => [id, b]),
                () => setSlotsA(([, b]) => [null, b]),
                'Kötés 1',
              )}
              <div className="flex items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/50 bg-zinc-900 font-mono-num text-sm font-bold text-orange-300">
                  C
                </div>
                <div className="h-0.5 w-3 bg-zinc-500" />
                {renderSlotButton(
                  slotsA[1],
                  solvedA,
                  (id) => setSlotsA(([a]) => [a, id]),
                  () => setSlotsA(([a]) => [a, null]),
                  'Kötés 2',
                )}
              </div>
            </div>
          </div>

          {!solvedA && (
            <button
              type="button"
              onClick={handleCheckA}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-orange-500"
            >
              1. reakció ellenőrzése
            </button>
          )}
        </div>
      )}

      {/* 2. reakció panel */}
      {activeTab === 'B' && (
        <div className="space-y-2.5 rounded-xl border border-white/15 bg-zinc-900/80 p-3">
          <div className="text-xs text-zinc-200 leading-snug">
            Állítsd össze az <strong className="text-orange-400">1,1,1-triklórpropán</strong>{' '}
            (<span className="font-mono-num">CH₃–CH₂–CCl₃</span>) termékét lúgos hidrolízisben és
            savas feldolgozás után!
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {/* Lúgos hidrolízis */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/75 p-2.5">
              <div className="text-[11px] font-bold text-orange-300">
                1. Lúgos hidrolízis (+ NaOH, aq)
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <div className="flex h-10 items-center rounded-lg border border-white/20 bg-zinc-900 px-2 font-mono-num text-xs font-bold text-white">
                  CH₃–CH₂–C
                </div>
                <div className="flex flex-col gap-1.5">
                  {renderSlotButton(
                    slotsBAlk[0],
                    solvedB,
                    (id) => setSlotsBAlk(([, b]) => [id, b]),
                    () => setSlotsBAlk(([, b]) => [null, b]),
                    '1. csoport',
                  )}
                  {renderSlotButton(
                    slotsBAlk[1],
                    solvedB,
                    (id) => setSlotsBAlk(([a]) => [a, id]),
                    () => setSlotsBAlk(([a]) => [a, null]),
                    '2. csoport',
                  )}
                </div>
              </div>
              {solvedB && (
                <div className="mt-1.5 text-center font-mono-num text-[11px] text-emerald-300">
                  CH₃–CH₂–COONa (propanoát)
                </div>
              )}
            </div>

            {/* Savas feldolgozás */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/75 p-2.5">
              <div className="text-[11px] font-bold text-sky-300">
                2. Savas feldolgozás után (+ H⁺)
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <div className="flex h-10 items-center rounded-lg border border-white/20 bg-zinc-900 px-2 font-mono-num text-xs font-bold text-white">
                  CH₃–CH₂–C
                </div>
                <div className="flex flex-col gap-1.5">
                  {renderSlotButton(
                    slotsBAcid[0],
                    solvedB,
                    (id) => setSlotsBAcid(([, b]) => [id, b]),
                    () => setSlotsBAcid(([, b]) => [null, b]),
                    '1. csoport',
                  )}
                  {renderSlotButton(
                    slotsBAcid[1],
                    solvedB,
                    (id) => setSlotsBAcid(([a]) => [a, id]),
                    () => setSlotsBAcid(([a]) => [a, null]),
                    '2. csoport',
                  )}
                </div>
              </div>
              {solvedB && (
                <div className="mt-1.5 text-center font-mono-num text-[11px] text-emerald-300">
                  CH₃–CH₂–COOH (propánsav)
                </div>
              )}
            </div>
          </div>

          {!solvedB && (
            <button
              type="button"
              onClick={handleCheckB}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-orange-500"
            >
              2. reakció ellenőrzése
            </button>
          )}
        </div>
      )}

      {/* Közös atomcsoport-paletta az aktív reakcióhoz */}
      {!solved && ((activeTab === 'A' && !solvedA) || (activeTab === 'B' && !solvedB)) && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {tokenList.map((t) => {
            const active = selectedToken === t.id;
            return (
              <button
                key={t.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                onClick={() => setSelectedToken((prev) => (prev === t.id ? null : t.id))}
                className={`flex min-h-[40px] items-center gap-1.5 rounded-xl border px-2.5 py-1 transition-colors ${
                  active
                    ? 'border-orange-400 bg-orange-500/25 text-white'
                    : 'border-white/15 bg-zinc-950/85 text-zinc-200 hover:border-white/35'
                }`}
              >
                <span className="font-mono-num text-xs sm:text-sm font-bold">{t.label}</span>
                <span className="text-[10px] text-zinc-400">{t.desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
