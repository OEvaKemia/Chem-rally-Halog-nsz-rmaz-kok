import { useMemo, useState } from 'react';
import {
  TASK_3_GEM_VIC_COMPOUNDS,
  shuffleArray,
  type GemVicCompound,
  type GemVicGroup,
} from '../../game/chemistry/checkpointData';
import { SvgStructureCard } from './SvgStructureCard';

interface GeminalVicinalTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const GROUPS: Array<{ id: GemVicGroup; title: string; hint: string }> = [
  {
    id: 'geminal',
    title: 'Geminális',
    hint: 'Két halogénatom ugyanazon a szénatomon',
  },
  {
    id: 'vicinal',
    title: 'Vicinális',
    hint: 'Két halogénatom szomszédos szénatomokon',
  },
];

export function GeminalVicinalTask({
  onSolved,
  onAttempt,
  solved,
}: GeminalVicinalTaskProps) {
  const structures = useMemo<GemVicCompound[]>(
    () => shuffleArray(TASK_3_GEM_VIC_COMPOUNDS),
    [],
  );

  const [assignments, setAssignments] = useState<Record<string, GemVicGroup | null>>(() =>
    Object.fromEntries(TASK_3_GEM_VIC_COMPOUNDS.map((c) => [c.id, null])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());

  const unplaced = structures.filter((s) => assignments[s.id] === null);

  const assignToGroup = (id: string, group: GemVicGroup | null) => {
    if (solved) return;
    setAssignments((prev) => ({ ...prev, [id]: group }));
    setSelectedId(null);
    setWrongIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleCheck = () => {
    if (solved) return;
    const missing = structures.filter((s) => assignments[s.id] === null);
    if (missing.length > 0) {
      onAttempt(
        false,
        `Még ${missing.length} szerkezeti képlet nincs besorolva.`,
      );
      return;
    }

    const wrong = structures.filter((s) => assignments[s.id] !== s.group);
    if (wrong.length > 0) {
      setWrongIds(new Set(wrong.map((s) => s.id)));
      onAttempt(
        false,
        `${wrong.length} szerkezet rossz csoportba került. Figyeld meg a piros/zöld halogénatomokat: ugyanarra a C-atomra csatlakoznak (geminális), vagy két szomszédos C-atomra (vicinális)?`,
      );
      return;
    }

    setWrongIds(new Set());
    onAttempt(
      true,
      'Helyes! A szerkezeti képletek alapján pontosan elkülönítetted a geminális és a vicinális dihalogénszármazékokat.',
    );
    onSolved();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
        Következtess a szerkezeti képletekből, és rendezd a négy molekulát{' '}
        <strong className="text-orange-400">geminális</strong> vagy{' '}
        <strong className="text-orange-400">vicinális</strong> csoportba!
      </p>

      {/* Várakozó szerkezetek (név nélkül!) */}
      {unplaced.length > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (id) assignToGroup(id, null);
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl border border-white/10 bg-zinc-900/60 p-2.5"
        >
          {unplaced.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                draggable={!solved}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                onClick={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
                className={`rounded-xl border p-1.5 transition-colors ${
                  isSelected
                    ? 'border-orange-400 bg-orange-500/20'
                    : 'border-white/15 bg-zinc-950/85 hover:border-white/30'
                }`}
              >
                <SvgStructureCard
                  nodes={item.nodes}
                  bonds={item.bonds}
                  heightClass="h-20 sm:h-24"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Két csoport */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {GROUPS.map((g) => {
          const placed = structures.filter((s) => assignments[s.id] === g.id);
          return (
            <div
              key={g.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) assignToGroup(id, g.id);
              }}
              onClick={() => {
                if (selectedId) assignToGroup(selectedId, g.id);
              }}
              className={`min-h-[120px] rounded-xl border p-2.5 transition-colors ${
                selectedId
                  ? 'cursor-pointer border-orange-400/50 bg-zinc-900/90 hover:border-orange-400'
                  : 'border-white/15 bg-zinc-900/75'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold text-orange-300">{g.title}</div>
              <div className="text-[10px] sm:text-[11px] text-zinc-400">{g.hint}</div>

              <div className="mt-2 space-y-2">
                {placed.map((item) => {
                  const isWrong = wrongIds.has(item.id);
                  const isSelected = selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      draggable={!solved}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className={`relative rounded-xl border p-1.5 ${
                        isWrong
                          ? 'border-red-400 bg-red-950/45'
                          : isSelected
                            ? 'border-orange-400 bg-orange-500/20'
                            : 'border-white/15 bg-zinc-950/85'
                      }`}
                    >
                      <SvgStructureCard
                        nodes={item.nodes}
                        bonds={item.bonds}
                        heightClass="h-18 sm:h-20"
                      />
                      {!solved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignToGroup(item.id, null);
                          }}
                          aria-label="Szerkezet visszahelyezése"
                          className="absolute right-1.5 top-1.5 rounded bg-zinc-900/90 px-1.5 py-0.5 text-[11px] text-zinc-300 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!solved && (
        <button
          type="button"
          onClick={handleCheck}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
        >
          Ellenőrzés
        </button>
      )}
    </div>
  );
}
