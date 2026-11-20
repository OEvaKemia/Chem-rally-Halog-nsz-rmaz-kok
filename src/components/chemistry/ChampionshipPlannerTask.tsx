import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { shuffleArray, type StationId } from '../../game/chemistry/checkpointData';

interface ChampionshipPlannerTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const REAGENT_OPTIONS = [
  { id: 'aq-koh', label: 'Vizes KOH' },
  { id: 'alc-koh', label: 'Alkoholos KOH, melegítés' },
  { id: 'mg-ether', label: 'Mg, vízmentes éter' },
  { id: 'h2o', label: 'H₂O' },
  { id: 'hcl', label: 'Tömény HCl' },
] as const;

const TYPE_OPTIONS = [
  { id: 'substitution', label: 'Szubsztitúció' },
  { id: 'elimination', label: 'Elimináció' },
  { id: 'grignard-hydrolysis', label: 'Grignard-képződés + reakció vízzel' },
] as const;

const PRODUCT_OPTIONS = [
  { id: 'butan-2-ol', label: 'CH₃–CH(OH)–CH₂–CH₃', name: 'Bután-2-ol' },
  { id: 'but-2-ene', label: 'CH₃–CH=CH–CH₃', name: 'But-2-én' },
  { id: 'butane', label: 'CH₃–CH₂–CH₂–CH₃', name: 'Bután' },
  { id: 'grignard-int', label: 'CH₃–CH(MgBr)–CH₂–CH₃', name: 'Szek-butil-magnézium-bromid' },
  { id: 'but-1-ene', label: 'CH₂=CH–CH₂–CH₃', name: 'But-1-én' },
] as const;

export function ChampionshipPlannerTask({
  onSolved,
  onAttempt,
  solved,
}: ChampionshipPlannerTaskProps) {
  const reagents = useMemo(() => shuffleArray(REAGENT_OPTIONS), []);
  const types = useMemo(() => shuffleArray(TYPE_OPTIONS), []);
  const products = useMemo(() => shuffleArray(PRODUCT_OPTIONS), []);

  const [activeStation, setActiveStation] = useState<StationId>('A');
  const [stationDone, setStationDone] = useState<Record<StationId, boolean>>({
    A: false,
    B: false,
    C: false,
  });

  // Állapotok állomásonként
  const [reagentA, setReagentA] = useState<string | null>(null);
  const [typeA, setTypeA] = useState<string | null>(null);
  const [productA, setProductA] = useState<string | null>(null);

  const [reagentB, setReagentB] = useState<string | null>(null);
  const [typeB, setTypeB] = useState<string | null>(null);
  const [productB, setProductB] = useState<string | null>(null);

  const [step1C, setStep1C] = useState<string | null>(null);
  const [step2C, setStep2C] = useState<string | null>(null);
  const [typeC, setTypeC] = useState<string | null>(null);
  const [intermediateC, setIntermediateC] = useState<string | null>(null);
  const [productC, setProductC] = useState<string | null>(null);

  const markStationSolved = (st: StationId, msg: string) => {
    const next = { ...stationDone, [st]: true };
    setStationDone(next);
    if (next.A && next.B && next.C) {
      onAttempt(
        true,
        'Minden szerelőállomás kész! A 2-brómbutánból mindhárom célvegyületet (bután-2-ol, but-2-én és bután) pontosan megtervezted.',
      );
      onSolved();
    } else {
      const nextTodo: StationId = !next.A ? 'A' : !next.B ? 'B' : 'C';
      setActiveStation(nextTodo);
      onAttempt(true, msg);
    }
  };

  const checkA = () => {
    if (stationDone.A) return;
    if (!reagentA || !typeA || !productA) {
      onAttempt(false, 'Az A állomáson válaszd ki a reagenst, a reakciótípust és a terméket is!');
      return;
    }
    if (reagentA !== 'aq-koh') {
      onAttempt(false, 'A bután-2-ol előállításához vizes KOH szükséges (az alkoholos KOH eliminációt okozna!).');
      return;
    }
    if (typeA !== 'substitution') {
      onAttempt(false, 'A –Br csoport –OH-ra cserélődése nukleofil szubsztitúció.');
      return;
    }
    if (productA !== 'butan-2-ol') {
      onAttempt(false, 'A termék szerkezete CH₃–CH(OH)–CH₂–CH₃ (bután-2-ol).');
      return;
    }
    markStationSolved('A', 'A út (Bután-2-ol) kész! Folytasd a következő szerelőállomáson.');
  };

  const checkB = () => {
    if (stationDone.B) return;
    if (!reagentB || !typeB || !productB) {
      onAttempt(false, 'A B állomáson válaszd ki a reagenst, a reakciótípust és a főterméket is!');
      return;
    }
    if (reagentB !== 'alc-koh') {
      onAttempt(false, 'Alkén előállításához alkoholos KOH-s melegítés kell, mert vizes közegben szubsztitúció menne végbe.');
      return;
    }
    if (typeB !== 'elimination') {
      onAttempt(false, 'HBr kilépésével telítetlen kötés alakul ki: ez elimináció.');
      return;
    }
    if (productB !== 'but-2-ene') {
      onAttempt(false, 'A Zajcev-szabály szerinti főtermék a but-2-én (CH₃–CH=CH–CH₃).');
      return;
    }
    markStationSolved('B', 'B út (But-2-én) kész! Folytasd a következő szerelőállomáson.');
  };

  const checkC = () => {
    if (stationDone.C) return;
    if (!step1C || !step2C || !typeC || !intermediateC || !productC) {
      onAttempt(false, 'A C állomáson töltsd ki az 1. és 2. lépést, a reakciótípust, a köztiterméket és a végterméket is!');
      return;
    }
    if (step1C !== 'mg-ether' || step2C !== 'h2o') {
      onAttempt(false, 'Ellenőrizd a sorrendet: 1. lépésben Mg és vízmentes éter adja a Grignard-reagenst, majd 2. lépésben H₂O bontja el butánná.');
      return;
    }
    if (typeC !== 'grignard-hydrolysis') {
      onAttempt(false, 'A reakciótípus: Grignard-reagens képződése, majd reakció vízzel.');
      return;
    }
    if (intermediateC !== 'grignard-int' || productC !== 'butane') {
      onAttempt(false, 'A köztitermék CH₃–CH(MgBr)–CH₂–CH₃, a végtermék pedig bután (CH₃–CH₂–CH₂–CH₃).');
      return;
    }
    markStationSolved('C', 'C út (Bután) kész! Folytasd a többi állomással.');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200">
        Kiindulási vegyület mindhárom állomáson:{' '}
        <strong className="text-orange-400">2-brómbután</strong>{' '}
        <span className="font-mono-num text-zinc-300">(CH₃–CHBr–CH₂–CH₃)</span>
      </div>

      {/* Három szerelőállomás fül */}
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { id: 'A', title: 'A út · Bután-2-ol' },
            { id: 'B', title: 'B út · But-2-én' },
            { id: 'C', title: 'C út · Bután' },
          ] as const
        ).map((s) => {
          const done = stationDone[s.id];
          const active = activeStation === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStation(s.id)}
              className={`flex min-h-[42px] items-center justify-between gap-1 rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold transition-colors ${
                done
                  ? 'border-emerald-500/50 bg-emerald-950/35 text-emerald-200'
                  : active
                    ? 'border-orange-500 bg-orange-500/20 text-white'
                    : 'border-white/15 bg-zinc-900/75 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="truncate">{s.title}</span>
              {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* A ÁLLOMÁS */}
      {activeStation === 'A' && (
        <div className="space-y-2.5 rounded-xl border border-white/15 bg-zinc-900/80 p-3">
          <div className="text-xs font-bold text-orange-300">
            A út: 2-brómbután → Bután-2-ol
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">1. Reagens és körülmény:</div>
            <div className="flex flex-wrap gap-1.5">
              {reagents.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={stationDone.A}
                  onClick={() => setReagentA(r.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    reagentA === r.id
                      ? 'border-orange-400 bg-orange-500/25 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">2. Reakciótípus:</div>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={stationDone.A}
                  onClick={() => setTypeA(t.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    typeA === t.id
                      ? 'border-sky-400 bg-sky-500/25 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">3. Szerves termék képlete:</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={stationDone.A}
                  onClick={() => setProductA(p.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left font-mono-num text-xs font-bold ${
                    productA === p.id
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {!stationDone.A && (
            <button
              type="button"
              onClick={checkA}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white hover:bg-orange-500"
            >
              A állomás ellenőrzése
            </button>
          )}
        </div>
      )}

      {/* B ÁLLOMÁS */}
      {activeStation === 'B' && (
        <div className="space-y-2.5 rounded-xl border border-white/15 bg-zinc-900/80 p-3">
          <div className="text-xs font-bold text-orange-300">
            B út: 2-brómbután → But-2-én (főtermék)
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">1. Reagens és körülmény:</div>
            <div className="flex flex-wrap gap-1.5">
              {reagents.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={stationDone.B}
                  onClick={() => setReagentB(r.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    reagentB === r.id
                      ? 'border-orange-400 bg-orange-500/25 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">2. Reakciótípus:</div>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={stationDone.B}
                  onClick={() => setTypeB(t.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    typeB === t.id
                      ? 'border-sky-400 bg-sky-500/25 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">3. Fő szerves termék képlete:</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={stationDone.B}
                  onClick={() => setProductB(p.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left font-mono-num text-xs font-bold ${
                    productB === p.id
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {!stationDone.B && (
            <button
              type="button"
              onClick={checkB}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white hover:bg-orange-500"
            >
              B állomás ellenőrzése
            </button>
          )}
        </div>
      )}

      {/* C ÁLLOMÁS */}
      {activeStation === 'C' && (
        <div className="space-y-2.5 rounded-xl border border-white/15 bg-zinc-900/80 p-3">
          <div className="text-xs font-bold text-orange-300">
            C út: 2-brómbután → Köztitermék → Bután (két lépésben)
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-zinc-400">1. lépés reagense + közege:</div>
              <div className="flex flex-wrap gap-1.5">
                {reagents.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={stationDone.C}
                    onClick={() => setStep1C(r.id)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      step1C === r.id
                        ? 'border-orange-400 bg-orange-500/25 text-white'
                        : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-zinc-400">2. lépés reagense:</div>
              <div className="flex flex-wrap gap-1.5">
                {reagents.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={stationDone.C}
                    onClick={() => setStep2C(r.id)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      step2C === r.id
                        ? 'border-orange-400 bg-orange-500/25 text-white'
                        : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-zinc-400">Reakciótípus:</div>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={stationDone.C}
                  onClick={() => setTypeC(t.id)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    typeC === t.id
                      ? 'border-sky-400 bg-sky-500/25 text-white'
                      : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-zinc-400">Köztitermék:</div>
              <div className="space-y-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={stationDone.C}
                    onClick={() => setIntermediateC(p.id)}
                    className={`block w-full rounded-lg border px-2.5 py-1 text-left font-mono-num text-[11px] font-bold ${
                      intermediateC === p.id
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-zinc-400">Végső szerves termék:</div>
              <div className="space-y-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={stationDone.C}
                    onClick={() => setProductC(p.id)}
                    className={`block w-full rounded-lg border px-2.5 py-1 text-left font-mono-num text-[11px] font-bold ${
                      productC === p.id
                        ? 'border-emerald-400 bg-emerald-500/20 text-white'
                        : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!stationDone.C && (
            <button
              type="button"
              onClick={checkC}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white hover:bg-orange-500"
            >
              C állomás ellenőrzése
            </button>
          )}
        </div>
      )}
    </div>
  );
}
