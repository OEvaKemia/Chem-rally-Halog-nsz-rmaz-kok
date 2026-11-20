import { useMemo, useState } from 'react';
import {
  TASK_12_CONCLUSIONS,
  shuffleArray,
  type DeadEndConclusionOption,
} from '../../game/chemistry/checkpointData';

interface EliminationDeadEndTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

type InspectAtomId = 'c1-h' | 'c2' | 'gamma-h' | 'br';

const INSPECT_HINTS: Record<InspectAtomId, string> = {
  'c1-h': 'C1-hez kötött hidrogén (ugyanazon a szénatomon van, mint a Br → α-helyzetű atom)',
  c2: 'Középső C2 szénatom: 1 db C1 és 3 db –CH₃ kapcsolódik hozzá (4 darab C–C kötés, 0 H)',
  'gamma-h': 'Szélső –CH₃ csoport hidrogénje (két C–C kötésre van a brómos szénatomtól)',
  br: 'Kilépő –Br atom a C1 szénatomon',
};

export function EliminationDeadEndTask({
  onSolved,
  onAttempt,
  solved,
}: EliminationDeadEndTaskProps) {
  const conclusions = useMemo<DeadEndConclusionOption[]>(
    () => shuffleArray(TASK_12_CONCLUSIONS),
    [],
  );

  const [inspected, setInspected] = useState<InspectAtomId | null>(null);
  const [selectedConclusionId, setSelectedConclusionId] = useState<string | null>(null);

  const handleCheck = () => {
    if (solved) return;
    if (!selectedConclusionId) {
      onAttempt(
        false,
        'Vizsgáld meg a molekulamodellt (koppints az atomokra), majd válaszd ki a helyes következtetést!',
      );
      return;
    }

    const chosen = conclusions.find((c) => c.id === selectedConclusionId);
    if (!chosen) return;

    if (chosen.isCorrect) {
      onAttempt(true, chosen.feedback);
      onSolved();
    } else {
      onAttempt(false, chosen.feedback);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Vizsgáld meg az <strong className="text-orange-400">1-bróm-2,2-dimetilpropán</strong>{' '}
        (<span className="font-mono-num">BrCH₂–C(CH₃)₃</span>) molekulamodelljét! Koppints az
        atomokra, keresd meg, van-e eltávolítható β-hidrogén, majd válaszd ki a helyes megállapítást.
      </p>

      {/* Interaktív molekulamodell */}
      <div className="rounded-xl border border-white/15 bg-zinc-950/85 p-2">
        <svg viewBox="0 0 320 155" className="h-32 sm:h-36 w-full select-none">
          {/* Kötések */}
          <line x1="36" y1="78" x2="96" y2="78" stroke="#f87171" strokeWidth="3" />
          <line x1="96" y1="78" x2="96" y2="28" stroke="#71717a" strokeWidth="2.4" />
          <line x1="96" y1="78" x2="180" y2="78" stroke="#a1a1aa" strokeWidth="3.2" />
          <line x1="180" y1="78" x2="180" y2="28" stroke="#a1a1aa" strokeWidth="3.2" />
          <line x1="180" y1="78" x2="180" y2="128" stroke="#a1a1aa" strokeWidth="3.2" />
          <line x1="180" y1="78" x2="262" y2="78" stroke="#a1a1aa" strokeWidth="3.2" />

          {/* Br */}
          <g onClick={() => setInspected('br')} className="cursor-pointer">
            <rect
              x="18"
              y="64"
              width="34"
              height="28"
              rx="8"
              fill="#7f1d1d"
              stroke={inspected === 'br' ? '#fde047' : '#f87171'}
              strokeWidth={inspected === 'br' ? 2.6 : 1.6}
            />
            <text
              x="35"
              y="83"
              textAnchor="middle"
              fill="#fecaca"
              fontSize="13"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              Br
            </text>
          </g>

          {/* C1 (CH2) */}
          <g onClick={() => setInspected('c1-h')} className="cursor-pointer">
            <rect
              x="76"
              y="64"
              width="40"
              height="28"
              rx="8"
              fill="#18181b"
              stroke={inspected === 'c1-h' ? '#fde047' : '#71717a'}
              strokeWidth={inspected === 'c1-h' ? 2.6 : 1.6}
            />
            <text
              x="96"
              y="83"
              textAnchor="middle"
              fill="#fafafa"
              fontSize="13"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              CH
            </text>
            <circle
              cx="96"
              cy="28"
              r="14"
              fill="#27272a"
              stroke={inspected === 'c1-h' ? '#fde047' : '#71717a'}
              strokeWidth={inspected === 'c1-h' ? 2.4 : 1.5}
            />
            <text
              x="96"
              y="33"
              textAnchor="middle"
              fill="#fafafa"
              fontSize="12"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              H
            </text>
          </g>

          {/* Középső C2 (kvaterner, 0 H!) */}
          <g onClick={() => setInspected('c2')} className="cursor-pointer">
            <rect
              x="162"
              y="64"
              width="36"
              height="28"
              rx="8"
              fill={inspected === 'c2' ? '#7c2d12' : '#18181b'}
              stroke={inspected === 'c2' ? '#fdba74' : '#71717a'}
              strokeWidth={inspected === 'c2' ? 2.6 : 1.6}
            />
            <text
              x="180"
              y="83"
              textAnchor="middle"
              fill="#fafafa"
              fontSize="14"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              C
            </text>
          </g>

          {/* Három szélső CH3 (gamma) */}
          {[
            { x: 180, y: 28 },
            { x: 180, y: 128 },
            { x: 262, y: 78 },
          ].map((pos, idx) => (
            <g
              key={idx}
              onClick={() => setInspected('gamma-h')}
              className="cursor-pointer"
            >
              <rect
                x={pos.x - 22}
                y={pos.y - 14}
                width="44"
                height="28"
                rx="8"
                fill="#18181b"
                stroke={inspected === 'gamma-h' ? '#fde047' : '#71717a'}
                strokeWidth={inspected === 'gamma-h' ? 2.4 : 1.5}
              />
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fill="#fafafa"
                fontSize="12.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                CH₃
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-1 min-h-[20px] text-center text-[11px] font-medium text-amber-200">
          {inspected
            ? INSPECT_HINTS[inspected]
            : 'Koppints a modell egyes atomjaira vagy csoportjaira a kötések megvizsgálásához!'}
        </div>
      </div>

      {/* Kevert következtetéskártyák */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {conclusions.map((c) => {
          const active = selectedConclusionId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={solved}
              onClick={() => setSelectedConclusionId(c.id)}
              className={`min-h-[46px] rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                solved && c.isCorrect
                  ? 'border-emerald-400 bg-emerald-950/50 text-emerald-100'
                  : active
                    ? 'border-orange-400 bg-orange-500/20 text-white'
                    : 'border-white/15 bg-zinc-900/75 text-zinc-200 hover:border-white/30'
              }`}
            >
              {c.text}
            </button>
          );
        })}
      </div>

      {!solved && (
        <button
          type="button"
          onClick={handleCheck}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Következtetés ellenőrzése
        </button>
      )}
    </div>
  );
}
