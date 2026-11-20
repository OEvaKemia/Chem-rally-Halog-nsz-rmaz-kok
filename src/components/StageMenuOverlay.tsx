import { ClipboardCheck, Play } from 'lucide-react';
import type { StageConfig } from '../game/types';

interface StageMenuOverlayProps {
  stage: StageConfig;
  stages: StageConfig[];
  totalMeters: number;
  teamName: string;
  onTeamNameChange: (name: string) => void;
  onSelectStage: (stageId: string) => void;
  onStart: () => void;
  onOpenTeacherTest: () => void;
}

export function StageMenuOverlay({
  stage,
  stages,
  totalMeters,
  teamName,
  onTeamNameChange,
  onSelectStage,
  onStart,
  onOpenTeacherTest,
}: StageMenuOverlayProps) {
  const distanceKm = (totalMeters / 1000).toFixed(2).replace('.', ',');

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-start bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-transparent p-3 sm:p-10"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="scrollable-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/85 p-4 sm:p-7 text-zinc-100 shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
          <span>{stage.subtitle}</span>
          <span aria-hidden="true">·</span>
          <span>{stage.surfaceLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">{distanceKm} km</span>
        </div>

        <h1 className="mt-1.5 font-display text-2xl sm:text-5xl font-bold tracking-tight text-white">
          CHEM RALLY
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-zinc-300">
          {stage.description ??
            'Hegyvidéki 3D ralipálya valódi murvás járműfizikával. Érj célba az erdei kanyarokon és a hágón keresztül.'}
        </p>

        {/* Szakaszválasztó (4 szakasz 2×2-es rácsban) */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {stages.map((s) => {
            const active = s.id === stage.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStage(s.id)}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-orange-500 bg-orange-500/20 text-white'
                    : 'border-white/15 bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="text-[10px] font-medium text-orange-300">
                  {s.stageNumber}. szakasz · {s.checkpoints.length} pont
                </div>
                <div className="truncate text-xs font-bold">{s.name}</div>
              </button>
            );
          })}
        </div>

        {/* Opcionális csapat / versenyzőnév az eredményjelzőhöz */}
        <label className="mt-2.5 block rounded-xl border border-white/10 bg-zinc-900/70 px-2.5 py-2">
          <span className="block text-[10px] font-medium text-zinc-400">
            Versenyző vagy csapat neve (opcionális)
          </span>
          <input
            type="text"
            maxLength={28}
            value={teamName}
            onChange={(e) => onTeamNameChange(e.target.value)}
            placeholder="Chem Rally Csapat"
            className="mt-1 h-8 w-full rounded-lg border border-white/15 bg-zinc-950 px-2.5 text-xs font-semibold text-white outline-none focus:border-orange-400"
          />
        </label>

        {/* Concise Controls Reference */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-zinc-900/70 p-2.5 sm:p-3 text-[11px] sm:text-xs text-zinc-300">
          <div>
            <span className="font-mono-num font-bold text-white">W / ↑</span> · Gyorsítás
          </div>
          <div>
            <span className="font-mono-num font-bold text-white">S / ↓</span> · Fék / Hátra
          </div>
          <div className="col-span-2">
            <span className="font-mono-num font-bold text-white">A / D</span> vagy{' '}
            <span className="font-mono-num font-bold text-white">← / →</span> · Kormányzás · Mobilon érintőgombok
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-3.5 flex h-11 sm:h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-orange-600 px-6 font-display text-base sm:text-lg font-bold tracking-wide text-white transition-colors hover:bg-orange-500 active:scale-[0.99]"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>Start</span>
        </button>

        {/* Diszkrét Tanári tesztmód gomb */}
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={onOpenTeacherTest}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:border-amber-400/40 hover:text-amber-300"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Tanári tesztmód</span>
          </button>
        </div>
      </div>
    </div>
  );
}
