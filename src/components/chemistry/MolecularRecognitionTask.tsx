import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_1_MOLECULES,
  shuffleArray,
  type Molecule3DModel,
} from '../../game/chemistry/checkpointData';
import { Molecule3DViewer } from './Molecule3DViewer';

interface MolecularRecognitionTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const LABELS = ['A modell', 'B modell', 'C modell'] as const;

export function MolecularRecognitionTask({
  onSolved,
  onAttempt,
  solved,
}: MolecularRecognitionTaskProps) {
  const models = useMemo<Molecule3DModel[]>(() => shuffleArray(TASK_1_MOLECULES), []);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeModel = models[activeIndex];

  const handleConfirmModel = () => {
    if (solved) return;
    if (activeModel.isCorrect) {
      onAttempt(
        true,
        'Helyes! A 2,3-dibrómpentánban két szomszédos belső szénatomhoz (C2 és C3) kapcsolódik egy-egy brómatom: CH₃–CH(Br)–CH(Br)–CH₂–CH₃.',
      );
      onSolved();
    } else {
      onAttempt(false, activeModel.wrongFeedback);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Forgasd körbe a három 3D-s molekulamodellt, és válaszd ki közülük a{' '}
        <strong className="text-orange-400">2,3-dibrómpentánt</strong>!
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[170px_1fr]">
        {/* Modellválasztó kártyák (név nélkül!) */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          {models.map((m, idx) => {
            const selected = idx === activeIndex;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`flex min-h-[44px] items-center justify-center sm:justify-between rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-orange-500 bg-orange-500/20 text-white'
                    : 'border-white/15 bg-zinc-900/75 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span>{LABELS[idx]}</span>
                {solved && m.isCorrect && (
                  <CheckCircle2 className="hidden sm:inline h-4 w-4 text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* 3D forgatható nézet */}
        <div className="space-y-2.5">
          <Molecule3DViewer model={activeModel} />

          {!solved && (
            <button
              type="button"
              onClick={handleConfirmModel}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
            >
              Kiválasztom: {LABELS[activeIndex]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
