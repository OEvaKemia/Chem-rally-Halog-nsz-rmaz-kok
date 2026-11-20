import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import cfcImg from '../../assets/images/cfc_fridge_aerosol_1794996723935.jpg';
import iodoformImg from '../../assets/images/dental_antiseptic_tray_1794996724561.jpg';
import pvcImg from '../../assets/images/pvc_pipes_construction_1794996723753.jpg';
import chloroethaneImg from '../../assets/images/sports_cooling_spray_1794996724241.jpg';
import chloroformImg from '../../assets/images/vintage_anesthesia_bottle_1794996723629.jpg';
import {
  TASK_13_ITEMS,
  shuffleArray,
  type ApplicationMatchItem,
  type UsageEra,
} from '../../game/chemistry/checkpointData';

interface UsesPastPresentTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

const PHOTO_BY_ID: Record<ApplicationMatchItem['id'], string> = {
  cfc: cfcImg,
  'vinyl-chloride': pvcImg,
  chloroform: chloroformImg,
  chloroethane: chloroethaneImg,
  iodoform: iodoformImg,
};

const ERA_BUTTONS: Array<{ id: UsageEra; label: string }> = [
  { id: 'past', label: 'Régebben' },
  { id: 'present', label: 'Ma is' },
  { id: 'both', label: 'Régebben és ma is' },
];

export function UsesPastPresentTask({
  onSolved,
  onAttempt,
  solved,
}: UsesPastPresentTaskProps) {
  const photosOrder = useMemo(() => shuffleArray(TASK_13_ITEMS), []);
  const compoundsOrder = useMemo(() => shuffleArray(TASK_13_ITEMS), []);
  const usagesOrder = useMemo(() => shuffleArray(TASK_13_ITEMS), []);

  const [step, setStep] = useState<'photos' | 'usages'>('photos');

  // Step 1: photoItemId -> selected compoundId
  const [photoCompoundMap, setPhotoCompoundMap] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(TASK_13_ITEMS.map((i) => [i.id, null])),
  );
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [wrongPhotoIds, setWrongPhotoIds] = useState<Set<string>>(new Set());

  // Step 2: compoundId -> selected usageId & selected era
  const [usageMap, setUsageMap] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(TASK_13_ITEMS.map((i) => [i.id, null])),
  );
  const [eraMap, setEraMap] = useState<Record<string, UsageEra | null>>(() =>
    Object.fromEntries(TASK_13_ITEMS.map((i) => [i.id, null])),
  );
  const [selectedUsageId, setSelectedUsageId] = useState<string | null>(null);
  const [wrongCompoundIds, setWrongCompoundIds] = useState<Set<string>>(new Set());

  const assignedCompounds = new Set(
    Object.values(photoCompoundMap).filter((v): v is string => v !== null),
  );
  const availableCompounds = compoundsOrder.filter((c) => !assignedCompounds.has(c.id));

  const assignedUsages = new Set(
    Object.values(usageMap).filter((v): v is string => v !== null),
  );
  const availableUsages = usagesOrder.filter((u) => !assignedUsages.has(u.id));

  const assignCompoundToPhoto = (photoId: string, compoundId: string | null) => {
    if (step !== 'photos' || solved) return;
    setPhotoCompoundMap((prev) => {
      const next = { ...prev };
      if (compoundId !== null) {
        for (const k of Object.keys(next)) {
          if (next[k] === compoundId) next[k] = null;
        }
      }
      next[photoId] = compoundId;
      return next;
    });
    setSelectedCompoundId(null);
    setWrongPhotoIds((prev) => {
      if (!prev.has(photoId)) return prev;
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  };

  const assignUsageToCompound = (compoundId: string, usageId: string | null) => {
    if (step !== 'usages' || solved) return;
    setUsageMap((prev) => {
      const next = { ...prev };
      if (usageId !== null) {
        for (const k of Object.keys(next)) {
          if (next[k] === usageId) next[k] = null;
        }
      }
      next[compoundId] = usageId;
      return next;
    });
    setSelectedUsageId(null);
    setWrongCompoundIds((prev) => {
      if (!prev.has(compoundId)) return prev;
      const next = new Set(prev);
      next.delete(compoundId);
      return next;
    });
  };

  const handleCheckStep1 = () => {
    const missing = photosOrder.filter((p) => !photoCompoundMap[p.id]);
    if (missing.length > 0) {
      onAttempt(
        false,
        `Még ${missing.length} fényképhez nem rendeltél vegyületet! Koppints egy vegyületre, majd a hozzá illő képre.`,
      );
      return;
    }

    const wrong = photosOrder.filter((p) => photoCompoundMap[p.id] !== p.id);
    if (wrong.length > 0) {
      setWrongPhotoIds(new Set(wrong.map((w) => w.id)));
      onAttempt(
        false,
        `${wrong.length} fénykép–vegyület párosítás nem stimmel (pirossal jelölve). Gondolj a képen látható tárgyakra: régi hűtő/aeroszol (CFC), PVC-csövek (vinil-klorid), régi altatómaszk (kloroform), hűtőspray (klóretán), sárga fertőtlenítő por fogászaton (jodoform).`,
      );
      return;
    }

    setWrongPhotoIds(new Set());
    setStep('usages');
    onAttempt(
      true,
      'Mind az 5 fényképet eltaláltad! Most rendeld minden vegyülethez a felhasználását és az időbeli besorolását!',
    );
  };

  const handleCheckStep2 = () => {
    if (solved) return;
    const missingUsage = compoundsOrder.filter((c) => !usageMap[c.id]);
    const missingEra = compoundsOrder.filter((c) => !eraMap[c.id]);

    if (missingUsage.length > 0 || missingEra.length > 0) {
      onAttempt(
        false,
        'Minden vegyülethez társíts felhasználást és válassz időbeli besorolást (Régebben / Ma is / Régebben és ma is)!',
      );
      return;
    }

    const wrong = new Set<string>();
    for (const item of compoundsOrder) {
      if (usageMap[item.id] !== item.id || eraMap[item.id] !== item.era) {
        wrong.add(item.id);
      }
    }

    if (wrong.size > 0) {
      setWrongCompoundIds(wrong);
      onAttempt(
        false,
        `${wrong.size} vegyületnél hibás a felhasználás vagy az időbeli besorolás (kiemelve). Ne feledd: a jodoformot régebben sebkezelésre használták, és egyes speciális fogászati készítményekben ma is előfordul!`,
      );
      return;
    }

    setWrongCompoundIds(new Set());
    onAttempt(
      true,
      'Kitűnő! Mind az öt halogénszármazék fényképe, felhasználása és történeti/mai besorolása hibátlan.',
    );
    onSolved();
  };

  return (
    <div className="space-y-3">
      {step === 'photos' && (
        <>
          <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
            <strong className="text-orange-400">1. lépés:</strong> Párosítsd az öt fényképet a
            megfelelő halogénszármazékkal! Koppints egy vegyületre, majd a hozzá tartozó képre.
          </p>

          {/* Várakozó vegyületek */}
          {availableCompounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              {availableCompounds.map((c) => {
                const active = selectedCompoundId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                    onClick={() =>
                      setSelectedCompoundId((prev) => (prev === c.id ? null : c.id))
                    }
                    className={`min-h-[40px] rounded-xl border px-2.5 py-1 text-left transition-colors ${
                      active
                        ? 'border-orange-400 bg-orange-500/25 text-white'
                        : 'border-white/15 bg-zinc-950/85 text-zinc-100 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-bold">{c.compoundName}</div>
                    <div className="font-mono-num text-[10px] text-zinc-400">{c.formula}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 5 fénykép */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photosOrder.map((p) => {
              const placedId = photoCompoundMap[p.id];
              const placed = placedId
                ? TASK_13_ITEMS.find((i) => i.id === placedId) ?? null
                : null;
              const isWrong = wrongPhotoIds.has(p.id);

              return (
                <div
                  key={p.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const cid = e.dataTransfer.getData('text/plain');
                    if (cid) assignCompoundToPhoto(p.id, cid);
                  }}
                  onClick={() => {
                    if (selectedCompoundId) assignCompoundToPhoto(p.id, selectedCompoundId);
                  }}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    isWrong
                      ? 'border-red-400 bg-red-950/35'
                      : selectedCompoundId
                        ? 'cursor-pointer border-orange-400/60 bg-zinc-900'
                        : 'border-white/15 bg-zinc-900/80'
                  }`}
                >
                  <img
                    src={PHOTO_BY_ID[p.id]}
                    alt={p.photoAlt}
                    className="h-24 sm:h-28 w-full object-cover"
                  />
                  <div className="p-1.5">
                    {placed ? (
                      <div className="flex items-center justify-between gap-1 rounded-lg border border-white/15 bg-zinc-950 px-2 py-1">
                        <span className="truncate text-[11px] font-bold text-orange-300">
                          {placed.compoundName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignCompoundToPhoto(p.id, null);
                          }}
                          aria-label={`${placed.compoundName} eltávolítása`}
                          className="shrink-0 text-xs text-zinc-400 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-7 items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-zinc-400">
                        {selectedCompoundId ? 'Koppints ide' : 'Válassz vegyületet'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCheckStep1}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
          >
            1. lépés ellenőrzése
          </button>
        </>
      )}

      {step === 'usages' && (
        <>
          <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
            <strong className="text-orange-400">2. lépés:</strong> Társítsd mindegyik
            vegyülethez a felhasználását, és válaszd ki, hogy történeti, mai vagy mindkét
            alkalmazásról van szó!
          </p>

          {/* Kevert felhasználás kártyák */}
          {!solved && availableUsages.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              {availableUsages.map((u) => {
                const active = selectedUsageId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', u.id)}
                    onClick={() =>
                      setSelectedUsageId((prev) => (prev === u.id ? null : u.id))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-left text-[11px] leading-snug transition-colors ${
                      active
                        ? 'border-orange-400 bg-orange-500/25 text-white'
                        : 'border-white/15 bg-zinc-950/85 text-zinc-200 hover:border-white/30'
                    }`}
                  >
                    {u.usageText}
                  </button>
                );
              })}
            </div>
          )}

          {/* 5 párosított vegyület + időbeli besorolás */}
          <div className="space-y-2">
            {compoundsOrder.map((c) => {
              const placedUsageId = usageMap[c.id];
              const placedUsage = placedUsageId
                ? TASK_13_ITEMS.find((i) => i.id === placedUsageId) ?? null
                : null;
              const chosenEra = eraMap[c.id];
              const isWrong = wrongCompoundIds.has(c.id);

              return (
                <div
                  key={c.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const uid = e.dataTransfer.getData('text/plain');
                    if (uid) assignUsageToCompound(c.id, uid);
                  }}
                  onClick={() => {
                    if (selectedUsageId) assignUsageToCompound(c.id, selectedUsageId);
                  }}
                  className={`flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row sm:items-center ${
                    solved
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : isWrong
                        ? 'border-red-400 bg-red-950/35'
                        : selectedUsageId
                          ? 'cursor-pointer border-orange-400/50 bg-zinc-900/90'
                          : 'border-white/15 bg-zinc-900/75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
                    <img
                      src={PHOTO_BY_ID[c.id]}
                      alt={c.photoAlt}
                      className="h-12 w-16 shrink-0 rounded-lg object-cover border border-white/15"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-white">
                        {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                        <span className="truncate">{c.compoundName}</span>
                      </div>
                      <div className="font-mono-num text-[10px] text-zinc-400">{c.formula}</div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {placedUsage ? (
                      <div className="flex items-start justify-between gap-2 rounded-lg border border-white/15 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-200">
                        <span>{placedUsage.usageText}</span>
                        {!solved && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignUsageToCompound(c.id, null);
                            }}
                            aria-label="Felhasználás eltávolítása"
                            className="shrink-0 text-xs text-zinc-400 hover:text-white"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-9 items-center justify-center rounded-lg border border-dashed border-white/20 text-[11px] text-zinc-400">
                        {selectedUsageId ? 'Koppints ide a felhasználáshoz' : 'Húzd vagy válaszd ki a felhasználást'}
                      </div>
                    )}

                    {/* Időbeli besorolás */}
                    <div className="flex flex-wrap gap-1.5">
                      {ERA_BUTTONS.map((eb) => {
                        const active = chosenEra === eb.id;
                        return (
                          <button
                            key={eb.id}
                            type="button"
                            disabled={solved}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEraMap((prev) => ({ ...prev, [c.id]: eb.id }));
                              setWrongCompoundIds((prev) => {
                                if (!prev.has(c.id)) return prev;
                                const next = new Set(prev);
                                next.delete(c.id);
                                return next;
                              });
                            }}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                              active
                                ? 'border-sky-400 bg-sky-500/25 text-white'
                                : 'border-white/15 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {eb.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!solved && (
            <button
              type="button"
              onClick={handleCheckStep2}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 font-display text-sm sm:text-base font-bold text-white transition-colors hover:bg-orange-500"
            >
              Felhasználások és korszakok ellenőrzése
            </button>
          )}
        </>
      )}
    </div>
  );
}
