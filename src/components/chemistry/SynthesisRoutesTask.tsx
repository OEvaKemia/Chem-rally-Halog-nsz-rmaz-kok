import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  TASK_5_PROFILES,
  TASK_5_ROUTES,
  shuffleArray,
  type SynthesisRouteCard,
  type SynthesisSelectivityKey,
  type SynthesisSelectivityProfile,
} from '../../game/chemistry/checkpointData';

interface SynthesisRoutesTaskProps {
  onSolved: () => void;
  onAttempt: (correct: boolean, feedback: string) => void;
  solved: boolean;
}

export function SynthesisRoutesTask({
  onSolved,
  onAttempt,
  solved,
}: SynthesisRoutesTaskProps) {
  const routes = useMemo<SynthesisRouteCard[]>(() => shuffleArray(TASK_5_ROUTES), []);
  const profiles = useMemo<SynthesisSelectivityProfile[]>(
    () => shuffleArray(TASK_5_PROFILES),
    [],
  );

  // profileKey -> routeId | null
  const [slotAssignments, setSlotAssignments] = useState<
    Record<SynthesisSelectivityKey, string | null>
  >({
    'most-selective': null,
    'markovnikov-minor': null,
    'radical-mixture': null,
  });

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [wrongProfiles, setWrongProfiles] = useState<Set<SynthesisSelectivityKey>>(new Set());

  const assignedRouteIds = new Set(
    Object.values(slotAssignments).filter((v): v is string => v !== null),
  );
  const unplacedRoutes = routes.filter((r) => !assignedRouteIds.has(r.id));

  const placeRouteInProfile = (routeId: string, targetProfile: SynthesisSelectivityKey | null) => {
    if (solved) return;
    setSlotAssignments((prev) => {
      const next: Record<SynthesisSelectivityKey, string | null> = { ...prev };
      for (const key of Object.keys(next) as SynthesisSelectivityKey[]) {
        if (next[key] === routeId) next[key] = null;
      }
      if (targetProfile) {
        next[targetProfile] = routeId;
      }
      return next;
    });
    setSelectedRouteId(null);
    setWrongProfiles(new Set());
  };

  const handleCheck = () => {
    if (solved) return;

    const unassigned = profiles.filter((p) => !slotAssignments[p.key]);
    if (unassigned.length > 0) {
      onAttempt(
        false,
        `Még ${unassigned.length} reakció nincs hozzárendelve a szelektivitási profiljához. Mindhárom reakcióban keletkezhet 2-klórbután, de eltérő arányban!`,
      );
      return;
    }

    const wrongKeys = new Set<SynthesisSelectivityKey>();
    for (const p of profiles) {
      const routeId = slotAssignments[p.key];
      const route = routes.find((r) => r.id === routeId);
      if (!route || route.correctProfile !== p.key) {
        wrongKeys.add(p.key);
      }
    }

    if (wrongKeys.size > 0) {
      setWrongProfiles(wrongKeys);
      onAttempt(
        false,
        'Nem minden reakció került a megfelelő termékeloszláshoz. Figyeld meg: a szimmetrikus but-2-én addíciója elkerüli az 1-klórbután mellékterméket, míg a but-1-énnél kevés 1-klórbután, a gyökös klórozásnál pedig többféle klórozott izomer is képződik.',
      );
      return;
    }

    setWrongProfiles(new Set());
    onAttempt(
      true,
      'Pontos elemzés! Mindhárom reakcióban képződhet 2-klórbután, de a but-2-én + HCl adja a leginkább szelektíven a kívánt konstitúciós izomert, mert a C2 és C3 helyzet ekvivalens.',
    );
    onSolved();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 px-3 py-2">
        <div className="text-[11px] font-medium text-orange-300">
          Céltermék: <strong className="text-white">2-klórbután</strong>{' '}
          <span className="font-mono-num text-zinc-300">(CH₃–CH(Cl)–CH₂–CH₃)</span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-200 leading-snug">
          Mindhárom reakcióban keletkezhet 2-klórbután. Párosítsd a három reakciót a hozzá tartozó
          termékeloszlással, és azonosítsd a legszelektívebb utat!
        </p>
      </div>

      {/* Várakozó reakciók */}
      {unplacedRoutes.length > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const routeId = e.dataTransfer.getData('text/plain');
            if (routeId) placeRouteInProfile(routeId, null);
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-xl border border-white/10 bg-zinc-900/60 p-2"
        >
          {unplacedRoutes.map((route) => {
            const isSelected = selectedRouteId === route.id;
            return (
              <button
                key={route.id}
                type="button"
                draggable={!solved}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', route.id)}
                onClick={() =>
                  setSelectedRouteId((prev) => (prev === route.id ? null : route.id))
                }
                className={`min-h-[48px] rounded-xl border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-orange-400 bg-orange-500/25 text-white'
                    : 'border-white/15 bg-zinc-950/85 text-zinc-100 hover:border-white/30'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold">{route.reactionTitle}</div>
                <div className="font-mono-num text-[10px] text-zinc-400">
                  {route.equationHint}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Szelektivitási profilok / célzónák */}
      <div className="space-y-2">
        {profiles.map((profile) => {
          const placedRouteId = slotAssignments[profile.key];
          const placedRoute = placedRouteId
            ? routes.find((r) => r.id === placedRouteId) ?? null
            : null;
          const isWrong = wrongProfiles.has(profile.key);
          const isHighlight = solved && profile.key === 'most-selective';

          return (
            <div
              key={profile.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const routeId = e.dataTransfer.getData('text/plain');
                if (routeId) placeRouteInProfile(routeId, profile.key);
              }}
              onClick={() => {
                if (selectedRouteId) placeRouteInProfile(selectedRouteId, profile.key);
              }}
              className={`flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                isHighlight
                  ? 'border-emerald-400/70 bg-emerald-950/30'
                  : isWrong
                    ? 'border-red-400 bg-red-950/35'
                    : selectedRouteId
                      ? 'cursor-pointer border-orange-400/50 bg-zinc-900/90 hover:border-orange-400'
                      : 'border-white/15 bg-zinc-900/75'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                  {isHighlight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                  <span>{profile.title}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400">{profile.detail}</div>
              </div>

              <div className="shrink-0 sm:w-56">
                {placedRoute ? (
                  <div
                    draggable={!solved}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', placedRoute.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!solved) setSelectedRouteId(placedRoute.id);
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-zinc-950 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-orange-300">
                        {placedRoute.reactionTitle}
                      </div>
                      <div className="truncate font-mono-num text-[10px] text-zinc-400">
                        {placedRoute.equationHint}
                      </div>
                    </div>
                    {!solved && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          placeRouteInProfile(placedRoute.id, null);
                        }}
                        aria-label={`${placedRoute.reactionTitle} eltávolítása`}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-11 items-center justify-center rounded-lg border border-dashed border-white/20 bg-zinc-950/50 px-2 text-[11px] text-zinc-400">
                    {selectedRouteId ? 'Koppints ide a behelyezéshez' : 'Húzd vagy koppints ide'}
                  </div>
                )}
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
          Szelektivitás ellenőrzése
        </button>
      )}
    </div>
  );
}
