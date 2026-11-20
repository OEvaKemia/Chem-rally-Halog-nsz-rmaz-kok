import { AlertTriangle, ClipboardCheck, Gamepad2, LifeBuoy, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { StageConfig, TelemetrySnapshot } from '../game/types';

interface RallyHudProps {
  stage: StageConfig;
  telemetry: TelemetrySnapshot;
  muted: boolean;
  showTouchControls: boolean;
  isPortraitTouch: boolean;
  penaltyNotice: string | null;
  isTestMode?: boolean;
  testTargetCheckpointLabel?: string | null;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onRestart: () => void;
  onRecoverToRoad: () => void;
  onOpenTestCheckpointNow?: () => void;
  onBackToTestMenu?: () => void;
}

export function formatStageTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function RallyHud({
  stage,
  telemetry,
  muted,
  showTouchControls,
  isPortraitTouch,
  penaltyNotice,
  isTestMode = false,
  testTargetCheckpointLabel,
  onToggleMute,
  onToggleTouchControls,
  onRestart,
  onRecoverToRoad,
  onOpenTestCheckpointNow,
  onBackToTestMenu,
}: RallyHudProps) {
  const progressPct = Math.round(Math.max(0, Math.min(1, telemetry.progress)) * 100);
  const totalStageSeconds = telemetry.elapsedSeconds + telemetry.drivingPenaltySeconds;

  return (
    <>
      {/* Top Bar: Left Telemetry & Right Actions */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-4"
        style={{
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        }}
      >
        {/* Top-Left: Stage Time & Distance (compact on mobile landscape) */}
        <div className="pointer-events-auto rounded-xl border border-white/15 bg-zinc-950/75 px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-zinc-100">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-zinc-400">
            <span className="font-display font-bold text-orange-400">CHEM RALLY</span>
            {isTestMode && (
              <span className="rounded border border-amber-400/50 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                TESZTMÓD
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[100px] sm:max-w-none">{stage.name}</span>
          </div>

          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-2.5 sm:gap-4">
            <div>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 block leading-none">
                Szakaszidő
                {telemetry.drivingPenaltySeconds > 0 && (
                  <span className="ml-1 text-red-400 font-semibold">
                    (+{telemetry.drivingPenaltySeconds}s)
                  </span>
                )}
              </span>
              <span className="font-mono-num text-sm sm:text-xl font-bold text-white">
                {formatStageTime(totalStageSeconds)}
              </span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/10" aria-hidden="true" />

            <div>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 block leading-none">Távolság</span>
              <span className="font-mono-num text-xs sm:text-base font-semibold text-zinc-200">
                {telemetry.distanceMeters} m
              </span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/10" aria-hidden="true" />

            <div>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 block leading-none">Pontok</span>
              <span className="font-mono-num text-xs sm:text-base font-semibold text-amber-300">
                {telemetry.checkpointsCompleted}/{telemetry.totalCheckpoints}
              </span>
            </div>
          </div>

          {/* Stage Progress Bar */}
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-1 sm:h-1.5 w-24 sm:w-40 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-orange-500 transition-[width] duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono-num text-[10px] text-zinc-400">{progressPct}%</span>
          </div>
        </div>

        {/* Center Alerts: Portrait hint, Test Mode quick bar, Penalty flash, or Stuck Recovery */}
        <div className="flex flex-col items-center gap-1.5">
          {isPortraitTouch && (
            <div className="rounded-lg border border-amber-400/35 bg-zinc-950/85 px-2.5 py-1 text-center text-[11px] font-medium text-amber-200">
              Fekvő mód ajánlott
            </div>
          )}

          {isTestMode && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-zinc-950/85 px-2.5 py-1.5 text-xs">
              {testTargetCheckpointLabel && onOpenTestCheckpointNow && (
                <button
                  type="button"
                  onClick={onOpenTestCheckpointNow}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-zinc-950 transition-colors hover:bg-amber-400"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Feladat megnyitása</span>
                </button>
              )}
              {onBackToTestMenu && (
                <button
                  type="button"
                  onClick={onBackToTestMenu}
                  className="flex items-center gap-1 rounded-lg border border-white/20 bg-zinc-900 px-2.5 py-1 font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>Vissza a tesztmenübe</span>
                </button>
              )}
            </div>
          )}

          {penaltyNotice && (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-400/70 bg-red-950/90 px-3 py-1.5 text-xs sm:text-sm font-bold text-red-100 shadow-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{penaltyNotice}</span>
            </div>
          )}

          {telemetry.isStuck && (
            <button
              type="button"
              onClick={onRecoverToRoad}
              className="pointer-events-auto flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-500 px-4 py-2 font-display text-xs sm:text-sm font-bold text-zinc-950 shadow-lg transition-colors hover:bg-amber-400 active:scale-[0.98]"
            >
              <LifeBuoy className="h-4 w-4 shrink-0" />
              <span>Vissza az útra (+5 mp)</span>
            </button>
          )}
        </div>

        {/* Top-Right: Compact Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleTouchControls}
            title={showTouchControls ? 'Érintőgombok elrejtése' : 'Érintőgombok megjelenítése'}
            aria-label="Érintőgombok kapcsolása"
            className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border transition-colors ${
              showTouchControls
                ? 'border-orange-500/60 bg-orange-500/20 text-orange-300'
                : 'border-white/15 bg-zinc-950/75 text-zinc-300 hover:text-white'
            }`}
          >
            <Gamepad2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Hang bekapcsolása' : 'Némítás'}
            aria-label={muted ? 'Hang bekapcsolása' : 'Némítás'}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-white/15 bg-zinc-950/75 text-zinc-300 transition-colors hover:text-white"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onRestart}
            title="Újraindítás"
            aria-label="Szakasz újraindítása"
            className="flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-950/75 px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Újra</span>
          </button>
        </div>
      </div>

      {/* Bottom-Center: Compact Speedometer tucked low so car & road stay clear */}
      <div
        className="pointer-events-none fixed bottom-2 left-1/2 z-20 -translate-x-1/2 sm:bottom-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex flex-col items-center">
          {telemetry.surfaceZone === 'shoulder' && (
            <div className="mb-1 rounded-lg border border-amber-400/40 bg-zinc-950/85 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-300 whitespace-nowrap">
              Útpadka · Gyengébb gyorsulás
            </div>
          )}
          {telemetry.surfaceZone === 'offroad' && (
            <div className="mb-1 rounded-lg border border-red-400/50 bg-zinc-950/85 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-red-300 whitespace-nowrap">
              Úton kívüli terep · Kormányozz vissza az útra!
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-white/15 bg-zinc-950/70 px-3 py-1 sm:px-4 sm:py-2">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-mono-num text-xl sm:text-3xl font-bold leading-none text-white">
                {telemetry.speedKmh}
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-zinc-400">km/h</span>
            </div>

            <div className="h-5 w-px bg-white/15" aria-hidden="true" />

            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[9px] text-zinc-400 leading-none">Fokozat</span>
              <span
                className={`font-display font-mono-num text-sm sm:text-lg font-bold leading-tight ${
                  telemetry.gear === 'R' ? 'text-red-400' : 'text-orange-400'
                }`}
              >
                {telemetry.gear}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
