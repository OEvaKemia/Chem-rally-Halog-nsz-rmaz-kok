import { ClipboardCheck, Flag, Play, Trophy, X } from 'lucide-react';
import type { StageCheckpoint, StageConfig } from '../game/types';

interface TeacherTestModalProps {
  stages: StageConfig[];
  onSelectCheckpoint: (stage: StageConfig, checkpoint: StageCheckpoint) => void;
  onTestFinishGate: () => void;
  onTestScoreboardDirect: () => void;
  onClose: () => void;
}

const STAGE_TEST_HEADINGS: Record<number, string> = {
  1: '1. szakasz – Hegyi szerpentin',
  2: '2. szakasz – Murvás gyorsasági',
  3: '3. szakasz – Erdei technikai szakasz',
  4: '4. szakasz – Bajnoki döntő',
};

export function TeacherTestModal({
  stages,
  onSelectCheckpoint,
  onTestFinishGate,
  onTestScoreboardDirect,
  onClose,
}: TeacherTestModalProps) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/80 p-2.5 sm:p-5"
      style={{
        paddingLeft: 'max(0.625rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.625rem, env(safe-area-inset-right))',
        paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="scrollable-panel flex max-h-[calc(100dvh-1.25rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-zinc-950/95 text-zinc-100 shadow-2xl">
        {/* Fejléc */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span>TANÁRI TESZTMÓD · GYORS ELLENŐRZÉS</span>
            </div>
            <h2 className="mt-0.5 font-display text-lg sm:text-2xl font-bold text-white">
              Ellenőrzőpontok és eredményjelző tesztelése
            </h2>
            <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-400">
              Válassz ki bármelyik ellenőrzőpontot: az autó közvetlenül a kapu előtt jelenik meg. A
              teszteredmények nem írják felül a normál játék adatait.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tanári tesztmód bezárása"
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Kilépés</span>
          </button>
        </div>

        {/* Görgethető szakasz- és feladatlista */}
        <div className="scrollable-panel flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stages.map((s) => (
              <section
                key={s.id}
                className="rounded-xl border border-white/15 bg-zinc-900/75 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm sm:text-base font-bold text-white">
                    {STAGE_TEST_HEADINGS[s.stageNumber] ?? `${s.stageNumber}. szakasz – ${s.name}`}
                  </h3>
                  <span className="text-[11px] font-medium text-zinc-400">{s.surfaceLabel}</span>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {s.checkpoints.map((cp) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() => onSelectCheckpoint(s, cp)}
                      className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-white/15 bg-zinc-950/85 px-3 py-2 text-left transition-colors hover:border-amber-400/70 hover:bg-amber-500/15 active:scale-[0.99]"
                    >
                      <span className="min-w-0 text-xs font-semibold leading-snug text-zinc-100">
                        {cp.label}
                      </span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Cél és eredményjelző tesztelése */}
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Trophy className="h-4 w-4" />
              <span>CÉL ÉS EREDMÉNYJELZŐ TESZTELÉSE</span>
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-zinc-300">
              Közvetlenül kipróbálható mind a 16 feladat előzetes megoldása nélkül is:
            </p>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onTestFinishGate}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-600/85 px-4 py-2 font-display text-xs sm:text-sm font-bold text-white transition-colors hover:bg-emerald-500 active:scale-[0.99]"
              >
                <Flag className="h-4 w-4 shrink-0" />
                <span>Célkapu próba (4. szakasz vége)</span>
              </button>

              <button
                type="button"
                onClick={onTestScoreboardDirect}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-zinc-900 px-4 py-2 font-display text-xs sm:text-sm font-bold text-amber-300 transition-colors hover:bg-zinc-800 hover:text-amber-200 active:scale-[0.99]"
              >
                <Trophy className="h-4 w-4 shrink-0" />
                <span>Eredményjelző megnyitása azonnal</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
