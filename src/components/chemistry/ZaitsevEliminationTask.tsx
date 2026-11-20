import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_11_ALKENES,
  shuffleArray,
  type ZaitsevAlkeneOption,
} from '../../game/chemistry/checkpointData';

interface ZaitsevEliminationTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

type HNodeId = 'h-c1' | 'h-c2' | 'h-c3' | 'h-c3me' | 'h-c4';

const BETA_HYDROGENS = new Set<HNodeId>(['h-c1', 'h-c3']);

export function ZaitsevEliminationTask({
  onSolved,
  onAttempt,
  solved,
}: ZaitsevEliminationTaskProps) {
  const alkeneOptions = useMemo<ZaitsevAlkeneOption[]>(
    () => shuffleArray(TASK_11_ALKENES),
    [],
  );

  const [step, setStep] = useState<'beta-h' | 'alkenes'>('beta-h');
  const [selectedHs, setSelectedHs] = useState<Set<HNodeId>>(new Set());
  const [previewPath, setPreviewPath] = useState<'none' | 'c1-c2' | 'c2-c3'>('none');
  const [chosenAlkenes, setChosenAlkenes] = useState<Set<string>>(new Set());
  const [majorId, setMajorId] = useState<string | null>(null);

  const toggleH = (id: HNodeId) => {
    if (step !== 'beta-h' || solved) return;
    setSelectedHs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCheckBetaH = () => {
    if (selectedHs.size === 0) {
      onAttempt(
        false,
        'Jelölj meg hidrogénatomokat a molekulán! Keresd a brómot hordozó szénatommal (C2) közvetlenül szomszédos szénatomokon lévő hidrogéneket.',
      );
      return;
    }

    if (selectedHs.has('h-c2')) {
      onAttempt(
        false,
        'A C2 szénatomon lévő H ugyanazon a szénatomon van, mint a Br (ez α-hidrogén, nem β-hidrogén).',
      );
      return;
    }

    if (selectedHs.has('h-c4') || selectedHs.has('h-c3me')) {
      onAttempt(
        false,
        'A C4 és a C3-as metilcsoport szénatomjai már két kötésre vannak a C2–Br csoporttól (γ-hidrogének). A β-hidrogének a C2 közvetlen szomszédain (C1 és C3) találhatók!',
      );
      return;
    }

    const hasAllBeta =
      selectedHs.size === BETA_HYDROGENS.size &&
      [...BETA_HYDROGENS].every((id) => selectedHs.has(id));

    if (!hasAllBeta) {
      onAttempt(
        false,
        'Még nem jelölted meg az összes β-hidrogént! A C2 szénatomnak két hidrogént hordozó szomszédja is van (balra C1, jobbra C3).',
      );
      return;
    }

    setStep('alkenes');
    setPreviewPath('c2-c3');
    onAttempt(
      true,
      'Helyes! A C1 és a C3 szénatomon található β-hidrogének távozhatnak a brómmal. Nézd meg a kettős kötés kialakulását, majd válaszd ki a két keletkező alként és a Zajcev-főterméket!',
    );
  };

  const toggleAlkene = (opt: ZaitsevAlkeneOption) => {
    if (solved) return;
    if (opt.doubleBondPath) setPreviewPath(opt.doubleBondPath);
    setChosenAlkenes((prev) => {
      const next = new Set(prev);
      if (next.has(opt.id)) {
        next.delete(opt.id);
        if (majorId === opt.id) setMajorId(null);
      } else {
        next.add(opt.id);
      }
      return next;
    });
  };

  const handleCheckAlkenes = () => {
    if (solved) return;

    const correctSet = new Set(
      TASK_11_ALKENES.filter((a) => a.isFormed).map((a) => a.id),
    );
    const sameProducts =
      chosenAlkenes.size === correctSet.size &&
      [...correctSet].every((id) => chosenAlkenes.has(id));

    if (!sameProducts) {
      onAttempt(
        false,
        'A két lehetséges β-eliminációs irány (C1=C2 és C2=C3) alapján pontosan két alkén keletkezik: a 3-metilbut-1-én és a 2-metilbut-2-én.',
      );
      return;
    }

    if (!majorId) {
      onAttempt(
        false,
        'Mindkét keletkező alként eltaláltad! Jelöld meg azt is, melyik a Zajcev-szabály szerinti főtermék!',
      );
      return;
    }

    if (majorId !== '2-methylbut-2-ene') {
      onAttempt(
        false,
        'A Zajcev-szabály szerint az a főtermék, amelyben a kettős kötés szénatomjaihoz több alkilcsoport (kevesebb hidrogén) kapcsolódik. Hasonlítsd össze a C1=C2 és a C2=C3 kötést!',
      );
      return;
    }

    setPreviewPath('c2-c3');
    onAttempt(
      true,
      'Kiváló! Alkoholos KOH hatására 3-metilbut-1-én (C1=C2) és 2-metilbut-2-én (C2=C3) keletkezik; a Zajcev-főtermék a jobban szubsztituált 2-metilbut-2-én.',
    );
    onSolved();
  };

  const showC1C2Double = step === 'alkenes' && previewPath === 'c1-c2';
  const showC2C3Double = step === 'alkenes' && previewPath === 'c2-c3';

  const hBadge = (id: HNodeId, x: number, y: number) => {
    const active = selectedHs.has(id);
    const isRemovedByPreview =
      (showC1C2Double && id === 'h-c1') || (showC2C3Double && id === 'h-c3');
    return (
      <g
        onClick={() => toggleH(id)}
        className={step === 'beta-h' ? 'cursor-pointer' : undefined}
      >
        <circle cx={x} cy={y} r={18} fill="transparent" />
        <circle
          cx={x}
          cy={y}
          r={13}
          fill={isRemovedByPreview ? '#18181b' : active ? '#ea580c' : '#27272a'}
          stroke={isRemovedByPreview ? '#52525b' : active ? '#fdba74' : '#71717a'}
          strokeWidth={active ? 2.4 : 1.5}
          strokeDasharray={isRemovedByPreview ? '3 2' : undefined}
        />
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fill={isRemovedByPreview ? '#71717a' : '#fafafa'}
          fontSize="12"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          H
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200 leading-snug">
        <strong className="text-orange-400">2-bróm-3-metilbután</strong> + alkoholos KOH, melegítés ·{' '}
        {step === 'beta-h' ? (
          <span>
            <strong className="text-white">1. lépés:</strong> Koppints a molekulán a két
            lehetséges <strong className="text-orange-300">β-hidrogénre</strong>!
          </span>
        ) : (
          <span>
            <strong className="text-white">2. lépés:</strong> Válaszd ki a keletkező két
            alként, és jelöld meg a <strong className="text-emerald-300">Zajcev-főterméket</strong>!
          </span>
        )}
      </div>

      {/* Interaktív molekulamodell kettős kötés szemléltetéssel */}
      <div className="rounded-xl border border-white/15 bg-zinc-950/85 p-2">
        <svg viewBox="0 0 340 155" className="h-32 sm:h-36 w-full select-none">
          {/* C1 - C2 kötés (egyes vagy kettős) */}
          {showC1C2Double ? (
            <>
              <line x1="60" y1="73" x2="132" y2="73" stroke="#34d399" strokeWidth="3.2" />
              <line x1="60" y1="81" x2="132" y2="81" stroke="#34d399" strokeWidth="3.2" />
            </>
          ) : (
            <line x1="60" y1="77" x2="132" y2="77" stroke="#a1a1aa" strokeWidth="3.2" />
          )}

          {/* C2 - C3 kötés (egyes vagy kettős) */}
          {showC2C3Double ? (
            <>
              <line x1="132" y1="73" x2="210" y2="73" stroke="#34d399" strokeWidth="3.2" />
              <line x1="132" y1="81" x2="210" y2="81" stroke="#34d399" strokeWidth="3.2" />
            </>
          ) : (
            <line x1="132" y1="77" x2="210" y2="77" stroke="#a1a1aa" strokeWidth="3.2" />
          )}

          {/* C3 - C4 és C3 - CH3 kötések */}
          <line x1="210" y1="77" x2="286" y2="77" stroke="#a1a1aa" strokeWidth="3.2" />
          <line x1="210" y1="77" x2="210" y2="124" stroke="#a1a1aa" strokeWidth="3.2" />

          {/* Br kötés (halványul eliminációkor) */}
          <line
            x1="132"
            y1="77"
            x2="132"
            y2="30"
            stroke={step === 'alkenes' ? '#52525b' : '#f87171'}
            strokeWidth="2.6"
            strokeDasharray={step === 'alkenes' ? '3 3' : undefined}
          />

          {/* H kötések */}
          <line x1="60" y1="77" x2="60" y2="30" stroke="#71717a" strokeWidth="2.2" />
          <line x1="132" y1="77" x2="132" y2="124" stroke="#71717a" strokeWidth="2.2" />
          <line x1="210" y1="77" x2="210" y2="30" stroke="#71717a" strokeWidth="2.2" />
          <line x1="286" y1="77" x2="286" y2="30" stroke="#71717a" strokeWidth="2.2" />
          <line x1="210" y1="124" x2="256" y2="124" stroke="#71717a" strokeWidth="2.2" />

          {/* Szénatomok */}
          {[
            { x: 60, y: 77, label: showC1C2Double ? 'CH₂' : 'CH₂' },
            { x: 132, y: 77, label: 'C' },
            { x: 210, y: 77, label: showC2C3Double ? 'C' : 'C' },
            { x: 286, y: 77, label: 'CH₂' },
            { x: 210, y: 124, label: 'CH₂' },
          ].map((c, idx) => (
            <g key={idx}>
              <rect
                x={c.x - 19}
                y={c.y - 14}
                width="38"
                height="28"
                rx="8"
                fill="#18181b"
                stroke="#71717a"
                strokeWidth="1.6"
              />
              <text
                x={c.x}
                y={c.y + 5}
                textAnchor="middle"
                fill="#fafafa"
                fontSize="12.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {c.label}
              </text>
            </g>
          ))}

          {/* Bróm */}
          <rect
            x="116"
            y="14"
            width="32"
            height="24"
            rx="7"
            fill={step === 'alkenes' ? '#27272a' : '#7f1d1d'}
            stroke={step === 'alkenes' ? '#52525b' : '#f87171'}
            strokeWidth="1.6"
          />
          <text
            x="132"
            y="30"
            textAnchor="middle"
            fill={step === 'alkenes' ? '#71717a' : '#fecaca'}
            fontSize="12.5"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            Br
          </text>

          {/* Kattintható hidrogénatomok */}
          {hBadge('h-c1', 60, 26)}
          {hBadge('h-c2', 132, 128)}
          {hBadge('h-c3', 210, 26)}
          {hBadge('h-c4', 286, 26)}
          {hBadge('h-c3me', 258, 124)}
        </svg>

        {step === 'alkenes' && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewPath('c1-c2')}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                previewPath === 'c1-c2'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Kettős kötés szemléltetése: C1=C2
            </button>
            <button
              type="button"
              onClick={() => setPreviewPath('c2-c3')}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                previewPath === 'c2-c3'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Kettős kötés szemléltetése: C2=C3
            </button>
          </div>
        )}
      </div>

      {step === 'beta-h' && (
        <button
          type="button"
          onClick={handleCheckBetaH}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          β-hidrogének ellenőrzése
        </button>
      )}

      {step === 'alkenes' && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {alkeneOptions.map((opt) => {
              const isChosen = chosenAlkenes.has(opt.id);
              const isMajor = majorId === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleAlkene(opt)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors ${
                    isChosen
                      ? 'border-orange-400 bg-orange-500/15 text-white'
                      : 'border-white/15 bg-zinc-900/75 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                      {solved && opt.isMajor && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      )}
                      <span className="truncate">{opt.name}</span>
                    </div>
                    <div className="font-mono-num text-[11px] text-zinc-400">
                      {opt.formula}
                    </div>
                  </div>

                  {isChosen && !solved && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMajorId((prev) => (prev === opt.id ? null : opt.id));
                        if (opt.doubleBondPath) setPreviewPath(opt.doubleBondPath);
                      }}
                      className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                        isMajor
                          ? 'border-emerald-400 bg-emerald-600 text-white'
                          : 'border-white/20 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {isMajor ? 'Főtermék ★' : 'Főterméknek jelöl'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!solved && (
            <button
              type="button"
              onClick={handleCheckAlkenes}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
            >
              Alkének és főtermék ellenőrzése
            </button>
          )}
        </>
      )}
    </div>
  );
}
