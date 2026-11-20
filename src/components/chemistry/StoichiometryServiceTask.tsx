import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { TASK_15_STOICHIOMETRY } from '../../game/chemistry/checkpointData';

interface StoichiometryServiceTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

function parseLocalizedNumber(raw: string): number | null {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const val = Number(normalized);
  return Number.isFinite(val) ? val : null;
}

export function StoichiometryServiceTask({
  onSolved,
  onAttempt,
  solved,
}: StoichiometryServiceTaskProps) {
  const [mass1Input, setMass1Input] = useState('');
  const [mass2Input, setMass2Input] = useState('');
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (solved) return;

    const m1 = parseLocalizedNumber(mass1Input);
    const m2 = parseLocalizedNumber(mass2Input);

    if (m1 === null || m2 === null) {
      onAttempt(
        false,
        'Adj meg érvényes számértéket mindkét vegyület tömegéhez (tizedesvesszőt és tizedespontot is használhatsz)!',
      );
      return;
    }

    const ok1 =
      Math.abs(m1 - TASK_15_STOICHIOMETRY.expectedMass1) <=
      TASK_15_STOICHIOMETRY.tolerance;
    const ok2 =
      Math.abs(m2 - TASK_15_STOICHIOMETRY.expectedMass2) <=
      TASK_15_STOICHIOMETRY.tolerance;

    if (ok1 && ok2) {
      onAttempt(
        true,
        'Hibátlan számítás! x = 0,10 mol 1-klórpropán (7,85 g) és y = 0,15 mol 2,2-diklórpropán (16,95 g) — a szervizpark mérlege pontos.',
      );
      onSolved();
      return;
    }

    const nextHint: 1 | 2 = hintLevel === 0 ? 1 : 2;
    setHintLevel(nextHint);

    if (ok1 && !ok2) {
      onAttempt(
        false,
        'Az 1-klórpropán tömege jó! Ellenőrizd a 2,2-diklórpropán tömegét (ne feledd: az elegy össztömege 24,8 g).',
      );
      return;
    }

    if (!ok1 && ok2) {
      onAttempt(
        false,
        'A 2,2-diklórpropán tömege jó! Ellenőrizd az 1-klórpropán tömegét.',
      );
      return;
    }

    onAttempt(
      false,
      nextHint === 1
        ? 'Még nem pontos az eredmény. Megjelent az 1. segítség a keletkező hidrolízistermékekről!'
        : 'Még nem pontos az eredmény. Megjelent a 2. segítség az egyenletrendszer felállításához!',
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Pontos feladat-szöveg */}
      <div className="rounded-xl border border-white/15 bg-zinc-900/80 p-3 text-xs sm:text-sm text-zinc-100 leading-relaxed whitespace-pre-line">
        {TASK_15_STOICHIOMETRY.problemText}
      </div>

      {/* Fokozatos segítség hibás próbálkozásnál */}
      {hintLevel >= 1 && !solved && (
        <div className="space-y-1.5 rounded-xl border border-amber-500/35 bg-amber-950/30 p-2.5 text-xs text-amber-100">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>1. segítség · Hidrolízistermékek</span>
          </div>
          <p className="leading-snug">
            Az <strong className="text-white">1-klórpropán</strong> hidrolízisével 1:1 mólarányban{' '}
            <strong className="text-white">propán-1-ol</strong> (M = 60 g/mol), míg a geminális{' '}
            <strong className="text-white">2,2-diklórpropán</strong> hidrolízisével vízkilépés után{' '}
            <strong className="text-white">propanon</strong> (M = 58 g/mol) keletkezik.
          </p>

          {hintLevel >= 2 && (
            <div className="mt-1.5 border-t border-amber-500/25 pt-1.5">
              <div className="font-bold text-amber-300">2. segítség · Egyenletrendszer</div>
              <div className="mt-0.5 font-mono-num text-[11px] text-amber-50">
                <div>Legyen x = n(1-klórpropán), y = n(2,2-diklórpropán) molban:</div>
                <div>78,5·x + 113·y = 24,8</div>
                <div>60·x + 58·y = 14,7</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Két numerikus válaszmező */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="block rounded-xl border border-white/15 bg-zinc-900/75 p-2.5">
          <span className="block text-xs font-semibold text-zinc-200">
            1-klórpropán tömege (g)
          </span>
          <input
            type="text"
            inputMode="decimal"
            disabled={solved}
            value={mass1Input}
            onChange={(e) => setMass1Input(e.target.value)}
            placeholder="pl. 0,00"
            className="mt-1.5 h-10 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 font-mono-num text-sm font-bold text-white outline-none focus:border-orange-400 disabled:opacity-70"
          />
        </label>

        <label className="block rounded-xl border border-white/15 bg-zinc-900/75 p-2.5">
          <span className="block text-xs font-semibold text-zinc-200">
            2,2-diklórpropán tömege (g)
          </span>
          <input
            type="text"
            inputMode="decimal"
            disabled={solved}
            value={mass2Input}
            onChange={(e) => setMass2Input(e.target.value)}
            placeholder="pl. 0,00"
            className="mt-1.5 h-10 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 font-mono-num text-sm font-bold text-white outline-none focus:border-orange-400 disabled:opacity-70"
          />
        </label>
      </div>

      {!solved && (
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Számítás ellenőrzése
        </button>
      )}
    </form>
  );
}
