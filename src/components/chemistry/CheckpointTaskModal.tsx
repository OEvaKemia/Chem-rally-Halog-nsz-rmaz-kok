import { ArrowRight, CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import type { StageCheckpoint } from '../../game/types';
import { ChemistryModalShell } from '../ChemistryModalShell';
import { AmineAlkylationTask } from './AmineAlkylationTask';
import { BoilingPointsTask } from './BoilingPointsTask';
import { ChampionshipPlannerTask } from './ChampionshipPlannerTask';
import { ChiralityTask } from './ChiralityTask';
import { EliminationDeadEndTask } from './EliminationDeadEndTask';
import { GeminalHydrolysesTask } from './GeminalHydrolysesTask';
import { GeminalVicinalTask } from './GeminalVicinalTask';
import { GrignardReagentTask } from './GrignardReagentTask';
import { MolecularRecognitionTask } from './MolecularRecognitionTask';
import { ReactionChainButeneTask } from './ReactionChainButeneTask';
import { StoichiometryServiceTask } from './StoichiometryServiceTask';
import { SynthesisRoutesTask } from './SynthesisRoutesTask';
import { ThreeGaragesTask } from './ThreeGaragesTask';
import { UsesPastPresentTask } from './UsesPastPresentTask';
import { VicinalHydrolysisTask } from './VicinalHydrolysisTask';
import { ZaitsevEliminationTask } from './ZaitsevEliminationTask';

interface CheckpointTaskModalProps {
  checkpoint: StageCheckpoint;
  onContinueRace: () => void;
  onAttemptRecorded?: (checkpointId: string, correct: boolean) => void;
  penaltySecondsPerWrong?: number;
  isTestMode?: boolean;
  onBackToTestMenu?: () => void;
}

export function CheckpointTaskModal({
  checkpoint,
  onContinueRace,
  onAttemptRecorded,
  penaltySecondsPerWrong = 10,
  isTestMode = false,
  onBackToTestMenu,
}: CheckpointTaskModalProps) {
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(
    null,
  );

  const handleAttempt = (correct: boolean, message: string) => {
    setFeedback({
      correct,
      message:
        !correct && penaltySecondsPerWrong > 0
          ? `${message} (+${penaltySecondsPerWrong} mp időbüntetés)`
          : message,
    });
    onAttemptRecorded?.(checkpoint.id, correct);
  };

  const handleSolved = () => {
    setSolved(true);
  };

  return (
    <ChemistryModalShell
      title={checkpoint.label}
      subtitle={
        isTestMode
          ? 'Tanári tesztmód · Teszteredmény (nem írja felül a normál eredményt)'
          : 'Ellenőrzőpont teljesítése · A versenyóra szünetel'
      }
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? (
            <div
              className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-snug ${
                feedback.correct
                  ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100'
                  : 'border-red-500/40 bg-red-950/50 text-red-100'
              }`}
            >
              {feedback.correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          ) : (
            <div className="text-xs text-zinc-400">
              Oldd meg a feladatot a továbbhaladáshoz.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isTestMode && onBackToTestMenu && (
              <button
                type="button"
                onClick={onBackToTestMenu}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-zinc-900 px-3.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-zinc-800"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Vissza a tesztmenübe</span>
              </button>
            )}

            {solved && (
              <button
                type="button"
                onClick={onContinueRace}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-emerald-500"
              >
                <span>Tovább a versenybe</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      }
    >
      {checkpoint.taskType === 'molecular-recognition' && (
        <MolecularRecognitionTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'three-garages' && (
        <ThreeGaragesTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'geminal-vicinal' && (
        <GeminalVicinalTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'chirality' && (
        <ChiralityTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'synthesis-routes' && (
        <SynthesisRoutesTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'boiling-points' && (
        <BoilingPointsTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'vicinal-hydrolysis' && (
        <VicinalHydrolysisTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'geminal-hydrolyses' && (
        <GeminalHydrolysesTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'amine-alkylation' && (
        <AmineAlkylationTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'grignard-reagent' && (
        <GrignardReagentTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'zaitsev-elimination' && (
        <ZaitsevEliminationTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'elimination-dead-end' && (
        <EliminationDeadEndTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'uses-past-present' && (
        <UsesPastPresentTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'reaction-chain-butene' && (
        <ReactionChainButeneTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'stoichiometry-service' && (
        <StoichiometryServiceTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
      {checkpoint.taskType === 'championship-planner' && (
        <ChampionshipPlannerTask
          solved={solved}
          onAttempt={handleAttempt}
          onSolved={handleSolved}
        />
      )}
    </ChemistryModalShell>
  );
}
