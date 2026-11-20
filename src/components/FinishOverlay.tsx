import { ArrowRight, ClipboardCheck, Flag, FlaskConical, RotateCcw, Timer, Trophy } from 'lucide-react';
import type { StageConfig, TelemetrySnapshot } from '../game/types';
import { formatStageTime } from './RallyHud';

export interface ChampionshipSummary {
  teamName: string;
  solvedCheckpoints: number;
  totalChampionshipCheckpoints: number;
  completedStagesCount: number;
  cleanDrivingSeconds: number;
  correctSolutions: number;
  wrongAttempts: number;
  chemistryPenaltySeconds: number;
  drivingPenaltySeconds: number;
  penaltySeconds: number;
  finalRaceSeconds: number;
  chemistryPercent: number;
}

interface FinishOverlayProps {
  stage: StageConfig;
  nextStage: StageConfig | null;
  telemetry: TelemetrySnapshot;
  championship: ChampionshipSummary;
  isTestMode?: boolean;
  onTeamNameChange: (name: string) => void;
  onRestart: () => void;
  onResetChampionship: () => void;
  onNextStage?: () => void;
  onBackToMenu: () => void;
  onBackToTestMenu?: () => void;
}

function buildPersonalizedFeedback(
  teamName: string,
  chemistryPercent: number,
  wrongAttempts: number,
  solvedCheckpoints: number,
  totalChampionshipCheckpoints: number,
): string {
  const displayName = teamName.trim() || 'Chem Rally Csapat';
  const fullRun = solvedCheckpoints >= totalChampionshipCheckpoints;

  if (chemistryPercent === 100 && wrongAttempts === 0) {
    return fullRun
      ? `${displayName}: Hibátlan bajnoki teljesítmény! Mind a 16 ellenőrzőponton elsőre pontosan oldottátok meg a halogénszármazékok feladatait, kémiai időbüntetés nélkül.`
      : `${displayName}: Hibátlan kémiai pontosság a döntő szakaszon! Minden feladat elsőre sikerült.`;
  }

  if (chemistryPercent >= 80) {
    return `${displayName}: Erős bajnoki szereplés! A reakcióutak, a hidrolízisek és a szubsztitúció–elimináció elválasztása biztosan megy; mindössze ${wrongAttempts} hibás próbálkozás lassította az órát.`;
  }

  if (chemistryPercent >= 60) {
    return `${displayName}: Szép célba érés! A halogénszármazékok alapjait jól kezelitek, de érdemes még átismételni a Markovnyikov- és Zajcev-szabályt, valamint a sztöchiometriai számításokat.`;
  }

  return `${displayName}: Kitartó munkával végigmentetek a pályán! Egy gyors ismétlés a vizes és alkoholos KOH közötti különbségről, illetve a Grignard-reakciókról sokat fog faragni a büntetőmásodpercekből.`;
}

export function FinishOverlay({
  stage,
  nextStage,
  telemetry,
  championship,
  isTestMode = false,
  onTeamNameChange,
  onRestart,
  onResetChampionship,
  onNextStage,
  onBackToMenu,
  onBackToTestMenu,
}: FinishOverlayProps) {
  const avgSpeedKmh =
    telemetry.elapsedSeconds > 0
      ? Math.round((telemetry.distanceMeters / telemetry.elapsedSeconds) * 3.6)
      : 0;

  const isChampionshipFinale = stage.stageNumber === 4;
  const stageTotalWithPenalty = telemetry.elapsedSeconds + telemetry.drivingPenaltySeconds;

  if (!isChampionshipFinale) {
    return (
      <div
        className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/65 p-3 sm:p-6"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="scrollable-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/90 p-5 sm:p-7 text-zinc-100 shadow-2xl">
          {isTestMode && (
            <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span>TESZTEREDMÉNY · TANÁRI TESZTMÓD (nem módosítja a normál játékot)</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <Flag className="h-4 w-4" />
            <span>Szakasz teljesítve</span>
            <span aria-hidden="true">·</span>
            <span className="text-zinc-400">{stage.name}</span>
          </div>

          <h2 className="mt-1.5 font-display text-2xl sm:text-4xl font-bold text-white">
            Célba értél!
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3 rounded-xl border border-white/10 bg-zinc-900/75 p-3 sm:p-4 text-center">
            <div>
              <div className="text-[11px] text-zinc-400">Szakaszidő</div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-white">
                {formatStageTime(stageTotalWithPenalty)}
              </div>
              {telemetry.drivingPenaltySeconds > 0 && (
                <div className="text-[10px] text-red-400">
                  (+{telemetry.drivingPenaltySeconds} mp büntetés)
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Megtett út</div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-white">
                {telemetry.distanceMeters} m
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Átlagseb.</div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-orange-400">
                {avgSpeedKmh} km/h
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {isTestMode && onBackToTestMenu && (
              <button
                type="button"
                onClick={onBackToTestMenu}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 px-6 font-display text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/30"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Vissza a tesztmenübe</span>
              </button>
            )}

            {nextStage && onNextStage && (
              <button
                type="button"
                onClick={onNextStage}
                className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-display text-sm sm:text-base font-bold tracking-wide text-white transition-colors hover:bg-emerald-500 active:scale-[0.99]"
              >
                <span>Következő: {nextStage.name}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold tracking-wide text-white transition-colors hover:bg-orange-500 active:scale-[0.99]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Újra vezetés</span>
              </button>

              <button
                type="button"
                onClick={onBackToMenu}
                className="flex h-11 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs sm:text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Szakaszválasztó
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const feedbackText = buildPersonalizedFeedback(
    championship.teamName,
    championship.chemistryPercent,
    championship.wrongAttempts,
    championship.solvedCheckpoints,
    championship.totalChampionshipCheckpoints,
  );

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/75 p-3 sm:p-6"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="scrollable-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/92 p-4 sm:p-6 text-zinc-100 shadow-2xl">
        {isTestMode && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-amber-400" />
              <span>TESZTEREDMÉNY · TANÁRI TESZTMÓD (a normál eredményeket nem írja felül)</span>
            </div>
            {onBackToTestMenu && (
              <button
                type="button"
                onClick={onBackToTestMenu}
                className="rounded-lg border border-amber-300/50 bg-zinc-950 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-zinc-900"
              >
                Vissza a tesztmenübe
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Trophy className="h-4 w-4" />
            <span>
              {isTestMode
                ? 'A BAJNOKSÁG BEFEJEZÉSE · TESZTEREDMÉNYJELZŐ'
                : 'A BAJNOKSÁG BEFEJEZÉSE · CHEM RALLY EREDMÉNYJELZŐ'}
            </span>
          </div>
          <span className="text-xs text-zinc-400">
            {stage.name} ({championship.completedStagesCount}/4 szakasz)
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {isTestMode ? 'Teszt célba érés!' : 'Bajnoki célba érés!'}
            </h2>
            <p className="text-xs text-zinc-400">
              4. szakasz: {formatStageTime(telemetry.elapsedSeconds)} · {telemetry.distanceMeters} m ·{' '}
              {avgSpeedKmh} km/h
            </p>
          </div>

          <label className="block sm:w-56">
            <span className="block text-[10px] font-medium text-zinc-400">
              Versenyző vagy csapat neve
            </span>
            <input
              type="text"
              maxLength={28}
              value={championship.teamName}
              onChange={(e) => onTeamNameChange(e.target.value)}
              placeholder="Chem Rally Csapat"
              className="mt-0.5 h-8 w-full rounded-lg border border-white/15 bg-zinc-900 px-2.5 text-xs font-bold text-white outline-none focus:border-orange-400"
            />
          </label>
        </div>

        {/* Vezetési idő és kémiai eredmények külön panelen */}
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Vezetési idő */}
          <div className="rounded-xl border border-orange-500/25 bg-zinc-900/85 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
              <Timer className="h-4 w-4" />
              <span>VEZETÉSI IDŐ</span>
            </div>

            <div className="mt-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tiszta vezetési idő</span>
                <span className="font-mono-num font-bold text-white">
                  {formatStageTime(championship.cleanDrivingSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Kémiai időbüntetés ({championship.wrongAttempts} × 10 mp)</span>
                <span
                  className={`font-mono-num font-bold ${
                    championship.chemistryPenaltySeconds > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  +{championship.chemistryPenaltySeconds} mp
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Terep / ütközés büntetés</span>
                <span
                  className={`font-mono-num font-bold ${
                    championship.drivingPenaltySeconds > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  +{championship.drivingPenaltySeconds} mp
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Végső versenyidő</span>
                <span className="font-mono-num text-lg font-bold text-orange-400">
                  {formatStageTime(championship.finalRaceSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Kémiai eredmények */}
          <div className="rounded-xl border border-emerald-500/25 bg-zinc-900/85 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <FlaskConical className="h-4 w-4" />
              <span>KÉMIAI EREDMÉNYEK</span>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Teljesített ellenőrzőpontok</span>
                <span className="font-mono-num font-bold text-white">
                  {championship.solvedCheckpoints} / {championship.totalChampionshipCheckpoints}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Helyes kémiai megoldások</span>
                <span className="font-mono-num font-bold text-emerald-400">
                  {championship.correctSolutions} db
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Hibás próbálkozások száma</span>
                <span
                  className={`font-mono-num font-bold ${
                    championship.wrongAttempts > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {championship.wrongAttempts} db
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Kémiai teljesítmény</span>
                <span className="font-mono-num text-lg font-bold text-emerald-400">
                  {championship.chemistryPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Személyre szabott visszajelzés */}
        <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/75 p-3 text-xs leading-relaxed text-zinc-200">
          {feedbackText}
        </div>

        {/* Gombok */}
        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {isTestMode && onBackToTestMenu ? (
            <button
              type="button"
              onClick={onBackToTestMenu}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-display text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Vissza a tesztmenübe</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetChampionship}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-emerald-500"
            >
              <Trophy className="h-4 w-4" />
              <span>Új bajnokság</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-orange-500"
          >
            <RotateCcw className="h-4 w-4" />
            <span>4. szakasz újra</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="flex h-11 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs sm:text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Szakaszválasztó
          </button>
        </div>
      </div>
    </div>
  );
}
