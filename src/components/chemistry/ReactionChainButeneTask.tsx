import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_14_SOLUTION,
  TASK_14_TOKENS,
  shuffleArray,
  type Task14SlotKey,
  type Task14Token,
} from '../../game/chemistry/checkpointData';

interface ReactionChainButeneTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const SLOT_LABELS: Record<Task14SlotKey, string> = {
  reagent1: '1. reagens',
  intermediate: 'Köztes termék',
  reagent2: '2. reagens + közeg',
  finalProduct: 'Fő végtermék',
};

type IsomerModelKind = 'cis' | 'trans';

function But2eneIsomerSvg({ kind }: { kind: IsomerModelKind }) {
  // Chemically accurate trigonal planar (~120°) sp2 geometry around C=C
  const isCis = kind === 'cis';
  return (
    <svg viewBox="0 0 220 130" className="h-24 sm:h-28 w-full select-none">
      {/* C=C kettős kötés */}
      <line x1="78" y1="62" x2="142" y2="62" stroke="#34d399" strokeWidth="3.2" />
      <line x1="78" y1="70" x2="142" y2="70" stroke="#34d399" strokeWidth="3.2" />

      {/* Bal oldali sp2 kötések (120°) */}
      <line x1="78" y1="66" x2="42" y2="26" stroke="#a1a1aa" strokeWidth="2.8" />
      <line x1="78" y1="66" x2="42" y2="106" stroke="#a1a1aa" strokeWidth="2.8" />

      {/* Jobb oldali sp2 kötések (120°) */}
      <line x1="142" y1="66" x2="178" y2="26" stroke="#a1a1aa" strokeWidth="2.8" />
      <line x1="142" y1="66" x2="178" y2="106" stroke="#a1a1aa" strokeWidth="2.8" />

      {/* C2 és C3 szénatom */}
      <circle cx="78" cy="66" r="14" fill="#18181b" stroke="#71717a" strokeWidth="1.6" />
      <text x="78" y="71" textAnchor="middle" fill="#fafafa" fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">C</text>

      <circle cx="142" cy="66" r="14" fill="#18181b" stroke="#71717a" strokeWidth="1.6" />
      <text x="142" y="71" textAnchor="middle" fill="#fafafa" fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">C</text>

      {/* Bal felső: mindig CH3 */}
      <rect x="14" y="12" width="44" height="24" rx="7" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />
      <text x="36" y="29" textAnchor="middle" fill="#ffedd5" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">CH₃</text>

      {/* Bal alsó: mindig H */}
      <circle cx="38" cy="106" r="13" fill="#27272a" stroke="#71717a" strokeWidth="1.4" />
      <text x="38" y="111" textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">H</text>

      {/* Jobb felső és jobb alsó: cisz-nél fent CH3 / lent H; transz-nál fent H / lent CH3 */}
      {isCis ? (
        <>
          <rect x="162" y="12" width="44" height="24" rx="7" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />
          <text x="184" y="29" textAnchor="middle" fill="#ffedd5" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">CH₃</text>

          <circle cx="182" cy="106" r="13" fill="#27272a" stroke="#71717a" strokeWidth="1.4" />
          <text x="182" y="111" textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">H</text>
        </>
      ) : (
        <>
          <circle cx="182" cy="24" r="13" fill="#27272a" stroke="#71717a" strokeWidth="1.4" />
          <text x="182" y="29" textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">H</text>

          <rect x="162" y="94" width="44" height="24" rx="7" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />
          <text x="184" y="111" textAnchor="middle" fill="#ffedd5" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">CH₃</text>
        </>
      )}
    </svg>
  );
}

export function ReactionChainButeneTask({
  onSolved,
  onAttempt,
  solved,
}: ReactionChainButeneTaskProps) {
  const tokens = useMemo<Task14Token[]>(() => shuffleArray(TASK_14_TOKENS), []);
  const isomerModels = useMemo<IsomerModelKind[]>(
    () => shuffleArray<IsomerModelKind>(['cis', 'trans']),
    [],
  );

  const [step, setStep] = useState<'chain' | 'isomers'>('chain');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<Task14SlotKey, string | null>>({
    reagent1: null,
    intermediate: null,
    reagent2: null,
    finalProduct: null,
  });
  const [wrongSlots, setWrongSlots] = useState<Set<Task14SlotKey>>(new Set());

  // Step 2: modelKind -> selected label ('cis' | 'trans' | null)
  const [modelGuess, setModelGuess] = useState<Record<IsomerModelKind, IsomerModelKind | null>>({
    cis: null,
    trans: null,
  });

  const usedTokens = new Set(Object.values(slots).filter((v): v is string => v !== null));
  const availableTokens = tokens.filter((t) => !usedTokens.has(t.id));

  const placeInSlot = (key: Task14SlotKey, tokenId: string | null) => {
    if (step !== 'chain' || solved) return;
    setSlots((prev) => {
      const next = { ...prev };
      if (tokenId !== null) {
        for (const k of Object.keys(next) as Task14SlotKey[]) {
          if (next[k] === tokenId) next[k] = null;
        }
      }
      next[key] = tokenId;
      return next;
    });
    setSelectedTokenId(null);
    setWrongSlots((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleCheckChain = () => {
    const empty = (Object.keys(slots) as Task14SlotKey[]).filter((k) => !slots[k]);
    if (empty.length > 0) {
      onAttempt(
        false,
        `Még ${empty.length} kártya hiányzik a but-1-én → but-2-én reakcióláncból!`,
      );
      return;
    }

    const errors = new Set<Task14SlotKey>();
    for (const k of Object.keys(TASK_14_SOLUTION) as Task14SlotKey[]) {
      if (slots[k] !== TASK_14_SOLUTION[k]) errors.add(k);
    }

    if (errors.size > 0) {
      setWrongSlots(errors);
      if (errors.has('intermediate')) {
        onAttempt(
          false,
          'Figyelj a Markovnyikov-szabályra! A but-1-én + HBr addíció főterméke a 2-brómbután, mert a hidrogén a több hidrogént hordozó C1 szénatomhoz kapcsolódik.',
        );
      } else if (errors.has('reagent2')) {
        onAttempt(
          false,
          'A 2. lépés elimináció: ehhez alkoholos KOH és melegítés szükséges (a vizes KOH szubsztitúcióval alkoholt adna!).',
        );
      } else {
        onAttempt(
          false,
          'Ellenőrizd a reakciólánc sorrendjét: 1. lépés HBr-addíció (2-brómbután), 2. lépés alkoholos KOH-s elimináció (Zajcev-főtermék: but-2-én, kevés but-1-én mellett).',
        );
      }
      return;
    }

    setWrongSlots(new Set());
    setStep('isomers');
    onAttempt(
      true,
      'A reakciólánc helyes! (Megjegyzés: a 2. lépésben kis mennyiségben but-1-én is keletkezhet, a Zajcev-főtermék a but-2-én.) Most azonosítsd a but-2-én cisz- és transz-izomerjét!',
    );
  };

  const handleCheckIsomers = () => {
    if (solved) return;
    if (!modelGuess.cis || !modelGuess.trans) {
      onAttempt(
        false,
        'Mindkét szerkezeti modellnél válaszd ki, hogy cisz- vagy transz-but-2-én!',
      );
      return;
    }

    if (modelGuess.cis !== 'cis' || modelGuess.trans !== 'trans') {
      onAttempt(
        false,
        'Nem pontos! A cisz-izomerben a két metilcsoport (–CH₃) a C=C kettős kötés AZONOS oldalán helyezkedik el, míg a transz-izomerben ELLENTÉTES oldalakon.',
      );
      return;
    }

    onAttempt(
      true,
      'Tökéletes! Mind a but-1-én → 2-brómbután → but-2-én reakcióláncot, mind a cisz–transz geometriai izomereket hibátlanul azonosítottad.',
    );
    onSolved();
  };

  const renderSlot = (key: Task14SlotKey) => {
    const tid = slots[key];
    const tok = tid ? tokens.find((t) => t.id === tid) : null;
    const isWrong = wrongSlots.has(key);
    return (
      <button
        type="button"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData('text/plain');
          if (id) placeInSlot(key, id);
        }}
        onClick={() => {
          if (selectedTokenId) placeInSlot(key, selectedTokenId);
          else if (slots[key]) placeInSlot(key, null);
        }}
        className={`flex min-h-[46px] min-w-[118px] flex-col items-center justify-center rounded-xl border-2 px-2.5 py-1 text-center transition-colors ${
          isWrong
            ? 'border-red-400 bg-red-950/45 text-red-100'
            : tok
              ? 'border-orange-400 bg-orange-500/20 text-white'
              : selectedTokenId
                ? 'border-dashed border-orange-400 bg-zinc-950 text-orange-300'
                : 'border-dashed border-white/30 bg-zinc-950 text-zinc-400'
        }`}
      >
        {tok ? (
          <>
            <span className="font-mono-num text-xs font-bold leading-tight">{tok.label}</span>
            {tok.sublabel && (
              <span className="text-[9px] text-zinc-300 leading-tight">{tok.sublabel}</span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-medium">{SLOT_LABELS[key]}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {step === 'chain' && (
        <>
          <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
            Állítsd össze a <strong className="text-orange-400">but-1-énből but-2-ént</strong>{' '}
            létrehozó kétlépéses reakcióláncot! Válassz ki egy kártyát, majd koppints (vagy húzd) a
            helyére.
          </p>

          <div className="space-y-2 rounded-xl border border-white/15 bg-zinc-900/80 p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <div className="rounded-xl border border-white/20 bg-zinc-950 px-2.5 py-2 font-mono-num text-xs font-bold text-white">
                But-1-én · CH₂=CH–CH₂–CH₃
              </div>
              <span className="font-bold text-zinc-400">+</span>
              {renderSlot('reagent1')}
              <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
              {renderSlot('intermediate')}
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-lg border border-white/10 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300">
                Köztes termék
              </span>
              <span className="font-bold text-zinc-400">+</span>
              {renderSlot('reagent2')}
              <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
              {renderSlot('finalProduct')}
              <span className="font-mono-num text-[11px] text-zinc-400">+ KBr + H₂O</span>
            </div>
          </div>

          {availableTokens.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              {availableTokens.map((t) => {
                const active = selectedTokenId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                    onClick={() =>
                      setSelectedTokenId((prev) => (prev === t.id ? null : t.id))
                    }
                    className={`flex min-h-[42px] flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition-colors ${
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

          <button
            type="button"
            onClick={handleCheckChain}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
          >
            Reakciólánc ellenőrzése
          </button>
        </>
      )}

      {step === 'isomers' && (
        <>
          <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
            <strong className="text-orange-400">Kiegészítő kihívás:</strong> A keletkezett{' '}
            <strong className="text-white">but-2-én</strong> két térizomerje látható. Állapítsd meg
            a térbeli elrendezés alapján, melyik a <em>cisz</em>- és melyik a <em>transz</em>-izomer!
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {isomerModels.map((kind, idx) => {
              const chosen = modelGuess[kind];
              return (
                <div
                  key={kind}
                  className={`rounded-xl border p-2.5 ${
                    solved
                      ? 'border-emerald-400/60 bg-emerald-950/25'
                      : 'border-white/15 bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span>{idx + 1}. térszerkezeti modell</span>
                    {solved && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </div>

                  <div className="mt-1 rounded-lg border border-white/10 bg-zinc-950/85 p-1">
                    <But2eneIsomerSvg kind={kind} />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {(['cis', 'trans'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={solved}
                        onClick={() =>
                          setModelGuess((prev) => ({ ...prev, [kind]: opt }))
                        }
                        className={`h-9 rounded-lg border text-xs font-bold transition-colors ${
                          chosen === opt
                            ? 'border-orange-400 bg-orange-500/25 text-white'
                            : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {opt === 'cis' ? 'cisz-but-2-én' : 'transz-but-2-én'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {!solved && (
            <button
              type="button"
              onClick={handleCheckIsomers}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
            >
              Izomerek ellenőrzése
            </button>
          )}
        </>
      )}
    </div>
  );
}
