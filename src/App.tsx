import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckpointTaskModal } from './components/chemistry/CheckpointTaskModal';
import { FinishOverlay, type ChampionshipSummary } from './components/FinishOverlay';
import { RallyHud } from './components/RallyHud';
import { StageMenuOverlay } from './components/StageMenuOverlay';
import { TeacherTestModal } from './components/TeacherTestModal';
import { TouchControls, type TouchInputState } from './components/TouchControls';
import { RallyAudio } from './game/audio/rallyAudio';
import { RallyEngine } from './game/three/RallyEngine';
import {
  ALPINE_GRAVEL_STAGE,
  CHAMPIONSHIP_FINAL_STAGE,
  STAGE_REGISTRY,
  getStageById,
} from './game/tracks/stageRegistry';
import type {
  GamePhase,
  StageCheckpoint,
  StageConfig,
  TelemetrySnapshot,
  VehicleInput,
} from './game/types';

const PENALTY_SECONDS_PER_WRONG = 10;

const INITIAL_TELEMETRY: TelemetrySnapshot = {
  speedKmh: 0,
  gear: 'N',
  elapsedSeconds: 0,
  drivingPenaltySeconds: 0,
  distanceMeters: 0,
  totalDistanceMeters: 1150,
  progress: 0,
  surfaceZone: 'road',
  isOffRoad: false,
  isDrifting: false,
  isStuck: false,
  headingDeg: 0,
  finished: false,
  checkpointsCompleted: 0,
  totalCheckpoints: 4,
};

type PendingTestAction =
  | { type: 'checkpoint'; checkpointId: string }
  | { type: 'finish-gate' };

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

export default function App() {
  const [selectedStageId, setSelectedStageId] = useState<string>(ALPINE_GRAVEL_STAGE.id);
  const stage = getStageById(selectedStageId);
  const stageIdx = STAGE_REGISTRY.findIndex((s) => s.id === stage.id);
  const nextStage =
    stageIdx >= 0 && stageIdx + 1 < STAGE_REGISTRY.length
      ? STAGE_REGISTRY[stageIdx + 1]
      : null;

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RallyEngine | null>(null);
  const audioRef = useRef<RallyAudio | null>(null);

  const phaseRef = useRef<GamePhase>('menu');
  const isTestModeRef = useRef<boolean>(false);
  const pendingTestActionRef = useRef<PendingTestAction | null>(null);
  const penaltyTimerRef = useRef<number | null>(null);

  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchInputRef = useRef<TouchInputState>({
    left: false,
    right: false,
    throttle: false,
    brake: false,
  });

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [activeCheckpoint, setActiveCheckpoint] = useState<StageCheckpoint | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);
  const [muted, setMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => detectTouchDevice());
  const [isPortraitTouch, setIsPortraitTouch] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [penaltyNotice, setPenaltyNotice] = useState<string | null>(null);

  // Normál bajnokság összesített eredmények
  const [teamName, setTeamName] = useState('Chem Rally Csapat');
  const [solvedCheckpointIds, setSolvedCheckpointIds] = useState<string[]>([]);
  const [wrongAttemptsByStage, setWrongAttemptsByStage] = useState<Record<string, number>>({});
  const [drivingSecondsByStage, setDrivingSecondsByStage] = useState<Record<string, number>>({});
  const [drivingPenaltiesByStage, setDrivingPenaltiesByStage] = useState<Record<string, number>>({});

  // Tanári tesztmód (elkülönített eredmények, soha nem írja felül a normál játékot)
  const [teacherTestMenuOpen, setTeacherTestMenuOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testTargetCheckpointId, setTestTargetCheckpointId] = useState<string | null>(null);
  const [testTeamName, setTestTeamName] = useState('Tanári Teszt');
  const [testSolvedCheckpointIds, setTestSolvedCheckpointIds] = useState<string[]>([]);
  const [testWrongAttemptsByStage, setTestWrongAttemptsByStage] = useState<Record<string, number>>({});
  const [testDrivingSecondsByStage, setTestDrivingSecondsByStage] = useState<Record<string, number>>({});
  const [testDrivingPenaltiesByStage, setTestDrivingPenaltiesByStage] = useState<Record<string, number>>({});

  useEffect(() => {
    isTestModeRef.current = isTestMode;
  }, [isTestMode]);

  const showTransientPenaltyNotice = useCallback((text: string) => {
    setPenaltyNotice(text);
    if (penaltyTimerRef.current !== null) {
      window.clearTimeout(penaltyTimerRef.current);
    }
    penaltyTimerRef.current = window.setTimeout(() => {
      setPenaltyNotice(null);
      penaltyTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (penaltyTimerRef.current !== null) {
        window.clearTimeout(penaltyTimerRef.current);
      }
    };
  }, []);

  const totalChampionshipCheckpoints = useMemo(
    () => STAGE_REGISTRY.reduce((sum, s) => sum + s.checkpoints.length, 0),
    [],
  );

  const activeSummary = useMemo<ChampionshipSummary>(() => {
    const activeSolved = isTestMode ? testSolvedCheckpointIds : solvedCheckpointIds;
    const activeWrongMap = isTestMode ? testWrongAttemptsByStage : wrongAttemptsByStage;
    const activeDrivingMap = isTestMode ? testDrivingSecondsByStage : drivingSecondsByStage;
    const activePenaltyMap = isTestMode ? testDrivingPenaltiesByStage : drivingPenaltiesByStage;
    const activeName = isTestMode ? testTeamName : teamName;

    const solvedCheckpoints = activeSolved.length;
    const wrongAttempts = Object.values(activeWrongMap).reduce((sum, n) => sum + n, 0);
    const cleanDrivingSeconds = Object.values(activeDrivingMap).reduce(
      (sum, sec) => sum + sec,
      0,
    );
    const drivingPenaltySeconds = Object.values(activePenaltyMap).reduce(
      (sum, sec) => sum + sec,
      0,
    );
    const chemistryPenaltySeconds = wrongAttempts * PENALTY_SECONDS_PER_WRONG;
    const penaltySeconds = chemistryPenaltySeconds + drivingPenaltySeconds;
    const completedStagesCount = Object.keys(activeDrivingMap).length;
    const finalRaceSeconds = cleanDrivingSeconds + penaltySeconds;
    const totalDecisions = solvedCheckpoints + wrongAttempts;
    const chemistryPercent =
      totalDecisions > 0 ? Math.round((solvedCheckpoints / totalDecisions) * 100) : 100;

    return {
      teamName: activeName,
      solvedCheckpoints,
      totalChampionshipCheckpoints,
      completedStagesCount,
      cleanDrivingSeconds,
      correctSolutions: solvedCheckpoints,
      wrongAttempts,
      chemistryPenaltySeconds,
      drivingPenaltySeconds,
      penaltySeconds,
      finalRaceSeconds,
      chemistryPercent,
    };
  }, [
    drivingPenaltiesByStage,
    drivingSecondsByStage,
    isTestMode,
    solvedCheckpointIds,
    teamName,
    testDrivingPenaltiesByStage,
    testDrivingSecondsByStage,
    testSolvedCheckpointIds,
    testTeamName,
    testWrongAttemptsByStage,
    totalChampionshipCheckpoints,
    wrongAttemptsByStage,
  ]);

  const clearStageProgressStats = useCallback((targetStageId: string, testMode: boolean) => {
    const targetStage = getStageById(targetStageId);
    const stageCpIds = new Set(targetStage.checkpoints.map((c) => c.id));

    const setSolved = testMode ? setTestSolvedCheckpointIds : setSolvedCheckpointIds;
    const setWrong = testMode ? setTestWrongAttemptsByStage : setWrongAttemptsByStage;
    const setDriving = testMode ? setTestDrivingSecondsByStage : setDrivingSecondsByStage;
    const setPenalties = testMode ? setTestDrivingPenaltiesByStage : setDrivingPenaltiesByStage;

    setSolved((prev) => prev.filter((id) => !stageCpIds.has(id)));
    setWrong((prev) => {
      if (!(targetStageId in prev)) return prev;
      const next = { ...prev };
      delete next[targetStageId];
      return next;
    });
    setDriving((prev) => {
      if (!(targetStageId in prev)) return prev;
      const next = { ...prev };
      delete next[targetStageId];
      return next;
    });
    setPenalties((prev) => {
      if (!(targetStageId in prev)) return prev;
      const next = { ...prev };
      delete next[targetStageId];
      return next;
    });
  }, []);

  const syncCombinedInput = useCallback(() => {
    const keys = pressedKeysRef.current;
    const touch = touchInputRef.current;

    const throttle =
      keys.has('KeyW') || keys.has('ArrowUp') || touch.throttle ? 1 : 0;
    const brake =
      keys.has('KeyS') || keys.has('ArrowDown') || touch.brake ? 1 : 0;

    const steerLeft = keys.has('KeyA') || keys.has('ArrowLeft') || touch.left;
    const steerRight = keys.has('KeyD') || keys.has('ArrowRight') || touch.right;
    const steer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);

    const input: VehicleInput = { throttle, brake, steer };
    engineRef.current?.setInput(input);
  }, []);

  // Initialize Three.js RallyEngine once inside isolated canvas container
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const audio = new RallyAudio();
    audioRef.current = audio;

    const engine = new RallyEngine(host, stage, {
      onTelemetry: (snap) => {
        setTelemetry(snap);
        const active = phaseRef.current === 'running';
        const keys = pressedKeysRef.current;
        const touch = touchInputRef.current;
        const thr = keys.has('KeyW') || keys.has('ArrowUp') || touch.throttle ? 1 : 0;
        audio.update(snap.speedKmh / 3.6, thr, snap.isOffRoad, snap.isDrifting, active);
      },
      onCheckpointReached: (cp) => {
        phaseRef.current = 'paused';
        setPhase('paused');
        setActiveCheckpoint(cp);
        setTestTargetCheckpointId((prev) => (prev === cp.id ? null : prev));
        pressedKeysRef.current.clear();
        touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
        syncCombinedInput();
        audio.update(0, 0, false, false, false);
      },
      onPenalty: (reason, seconds) => {
        const notice =
          reason === 'collision'
            ? `Ütközés akadállyal! +${seconds} mp időbüntetés`
            : `Visszahelyezés az útra · +${seconds} mp időbüntetés`;
        showTransientPenaltyNotice(notice);

        const setter = isTestModeRef.current
          ? setTestDrivingPenaltiesByStage
          : setDrivingPenaltiesByStage;
        setter((prev) => ({
          ...prev,
          [stage.id]: (prev[stage.id] ?? 0) + seconds,
        }));
      },
      onFinish: (snap) => {
        phaseRef.current = 'finished';
        setPhase('finished');
        setActiveCheckpoint(null);
        setTelemetry(snap);

        const setDriving = isTestModeRef.current
          ? setTestDrivingSecondsByStage
          : setDrivingSecondsByStage;
        const setPenalties = isTestModeRef.current
          ? setTestDrivingPenaltiesByStage
          : setDrivingPenaltiesByStage;

        setDriving((prev) => ({
          ...prev,
          [stage.id]: snap.elapsedSeconds,
        }));
        setPenalties((prev) => ({
          ...prev,
          [stage.id]: snap.drivingPenaltySeconds,
        }));
        audio.update(0, 0, false, false, false);
      },
      onContextLost: (lost) => {
        setContextLost(lost);
      },
    });

    const pendingAction = pendingTestActionRef.current;
    if (pendingAction) {
      pendingTestActionRef.current = null;
      if (pendingAction.type === 'checkpoint') {
        engine.jumpToCheckpoint(pendingAction.checkpointId, false);
      } else if (pendingAction.type === 'finish-gate') {
        engine.jumpNearFinishGate();
      }
    } else if (phaseRef.current === 'running') {
      engine.setPhase('running');
    }
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      audio.dispose();
      audioRef.current = null;
    };
  }, [showTransientPenaltyNotice, stage, syncCombinedInput]);

  // Persistent keyboard listeners (never trigger engine teardown or state reset)
  useEffect(() => {
    const controlCodes = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (controlCodes.has(e.code)) {
        e.preventDefault();
        if (!pressedKeysRef.current.has(e.code)) {
          pressedKeysRef.current.add(e.code);
          syncCombinedInput();
        }
      } else if (e.code === 'Enter' && phaseRef.current === 'menu' && !teacherTestMenuOpen) {
        e.preventDefault();
        phaseRef.current = 'running';
        setPhase('running');
        engineRef.current?.setPhase('running');
        audioRef.current?.start();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pressedKeysRef.current.delete(e.code)) {
        syncCombinedInput();
      }
    };

    const handleBlur = () => {
      if (pressedKeysRef.current.size > 0) {
        pressedKeysRef.current.clear();
        syncCombinedInput();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) handleBlur();
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    const preventBackgroundTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.scrollable-panel')) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('touchmove', preventBackgroundTouchMove);
    };
  }, [syncCombinedInput, teacherTestMenuOpen]);

  // Track portrait orientation on touch screens
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortraitTouch(portrait && detectTouchDevice());
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleAttemptRecorded = useCallback(
    (_checkpointId: string, correct: boolean) => {
      if (!correct) {
        const setter = isTestModeRef.current
          ? setTestWrongAttemptsByStage
          : setWrongAttemptsByStage;
        setter((prev) => ({
          ...prev,
          [stage.id]: (prev[stage.id] ?? 0) + 1,
        }));
      }
    },
    [stage.id],
  );

  const handleStart = useCallback(() => {
    isTestModeRef.current = false;
    setIsTestMode(false);
    setTestTargetCheckpointId(null);
    setTeacherTestMenuOpen(false);
    clearStageProgressStats(stage.id, false);
    phaseRef.current = 'running';
    setPhase('running');
    engineRef.current?.setPhase('running');
    audioRef.current?.start();
    syncCombinedInput();
  }, [clearStageProgressStats, stage.id, syncCombinedInput]);

  const handleRestart = useCallback(() => {
    clearStageProgressStats(stage.id, isTestModeRef.current);
    setPenaltyNotice(null);
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'running';
    setPhase('running');
    engineRef.current?.setPhase('running');
    engineRef.current?.resetStage();
    syncCombinedInput();
  }, [clearStageProgressStats, stage.id, syncCombinedInput]);

  const handleRecoverToRoad = useCallback(() => {
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    engineRef.current?.recoverToRoad();
    syncCombinedInput();
  }, [syncCombinedInput]);

  const handleResetChampionship = useCallback(() => {
    isTestModeRef.current = false;
    setIsTestMode(false);
    setTestTargetCheckpointId(null);
    setSolvedCheckpointIds([]);
    setWrongAttemptsByStage({});
    setDrivingSecondsByStage({});
    setDrivingPenaltiesByStage({});
    setPenaltyNotice(null);
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'running';
    setPhase('running');
    audioRef.current?.start();
    if (stage.id === ALPINE_GRAVEL_STAGE.id) {
      engineRef.current?.setPhase('running');
      engineRef.current?.resetStage();
      syncCombinedInput();
    } else {
      setSelectedStageId(ALPINE_GRAVEL_STAGE.id);
    }
  }, [stage.id, syncCombinedInput]);

  const handleContinueFromCheckpoint = useCallback(() => {
    if (activeCheckpoint) {
      const setter = isTestModeRef.current ? setTestSolvedCheckpointIds : setSolvedCheckpointIds;
      setter((prev) =>
        prev.includes(activeCheckpoint.id) ? prev : [...prev, activeCheckpoint.id],
      );
      setTestTargetCheckpointId((prev) => (prev === activeCheckpoint.id ? null : prev));
    }
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'running';
    setPhase('running');
    engineRef.current?.resumeFromCheckpoint();
    syncCombinedInput();
  }, [activeCheckpoint, syncCombinedInput]);

  const handleSelectStage = useCallback((stageId: string) => {
    isTestModeRef.current = false;
    setIsTestMode(false);
    setTestTargetCheckpointId(null);
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'menu';
    setPhase('menu');
    setSelectedStageId(stageId);
  }, []);

  const handleNextStage = useCallback(() => {
    if (!nextStage) return;
    clearStageProgressStats(nextStage.id, isTestModeRef.current);
    setPenaltyNotice(null);
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'running';
    setPhase('running');
    audioRef.current?.start();
    setSelectedStageId(nextStage.id);
  }, [clearStageProgressStats, nextStage]);

  const handleBackToMenu = useCallback(() => {
    isTestModeRef.current = false;
    setIsTestMode(false);
    setTestTargetCheckpointId(null);
    setTeacherTestMenuOpen(false);
    setPenaltyNotice(null);
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'menu';
    setPhase('menu');
    engineRef.current?.setPhase('menu');
    engineRef.current?.resetStage();
    syncCombinedInput();
  }, [syncCombinedInput]);

  // --- Tanári tesztmód vezérlők ---
  const handleSelectTestCheckpoint = useCallback(
    (targetStage: StageConfig, checkpoint: StageCheckpoint) => {
      isTestModeRef.current = true;
      setIsTestMode(true);
      setTeacherTestMenuOpen(false);
      setTestTargetCheckpointId(checkpoint.id);
      setPenaltyNotice(null);
      clearStageProgressStats(targetStage.id, true);

      pressedKeysRef.current.clear();
      touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
      setActiveCheckpoint(null);
      phaseRef.current = 'running';
      setPhase('running');
      audioRef.current?.start();

      if (targetStage.id === stage.id && engineRef.current) {
        engineRef.current.jumpToCheckpoint(checkpoint.id, false);
        syncCombinedInput();
      } else {
        pendingTestActionRef.current = { type: 'checkpoint', checkpointId: checkpoint.id };
        setSelectedStageId(targetStage.id);
      }
    },
    [clearStageProgressStats, stage.id, syncCombinedInput],
  );

  const handleOpenTestCheckpointNow = useCallback(() => {
    if (!testTargetCheckpointId || !engineRef.current) return;
    engineRef.current.jumpToCheckpoint(testTargetCheckpointId, true);
  }, [testTargetCheckpointId]);

  const handleTestFinishGate = useCallback(() => {
    isTestModeRef.current = true;
    setIsTestMode(true);
    setTeacherTestMenuOpen(false);
    setTestTargetCheckpointId(null);
    setPenaltyNotice(null);
    clearStageProgressStats(CHAMPIONSHIP_FINAL_STAGE.id, true);

    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    phaseRef.current = 'running';
    setPhase('running');
    audioRef.current?.start();

    if (stage.id === CHAMPIONSHIP_FINAL_STAGE.id && engineRef.current) {
      engineRef.current.jumpNearFinishGate();
      syncCombinedInput();
    } else {
      pendingTestActionRef.current = { type: 'finish-gate' };
      setSelectedStageId(CHAMPIONSHIP_FINAL_STAGE.id);
    }
  }, [clearStageProgressStats, stage.id, syncCombinedInput]);

  const handleTestScoreboardDirect = useCallback(() => {
    isTestModeRef.current = true;
    setIsTestMode(true);
    setTeacherTestMenuOpen(false);
    setTestTargetCheckpointId(null);
    setPenaltyNotice(null);

    // Minta tesztadatok az eredményjelző azonnali ellenőrzéséhez (nem érinti a normál eredményeket)
    setTestSolvedCheckpointIds(
      STAGE_REGISTRY.flatMap((s) => s.checkpoints.map((c) => c.id)),
    );
    setTestWrongAttemptsByStage({
      [ALPINE_GRAVEL_STAGE.id]: 1,
      [CHAMPIONSHIP_FINAL_STAGE.id]: 1,
    });
    setTestDrivingSecondsByStage({
      'alpine-gravel-01': 58.4,
      'gravel-special-02': 61.2,
      'forest-technical-03': 64.8,
      [CHAMPIONSHIP_FINAL_STAGE.id]: 42.6,
    });
    setTestDrivingPenaltiesByStage({
      [CHAMPIONSHIP_FINAL_STAGE.id]: 5,
    });

    setTelemetry({
      speedKmh: 0,
      gear: 'N',
      elapsedSeconds: 42.6,
      drivingPenaltySeconds: 5,
      distanceMeters: 783,
      totalDistanceMeters: 783,
      progress: 1,
      surfaceZone: 'road',
      isOffRoad: false,
      isDrifting: false,
      isStuck: false,
      headingDeg: 0,
      finished: true,
      checkpointsCompleted: 4,
      totalCheckpoints: 4,
    });

    setSelectedStageId(CHAMPIONSHIP_FINAL_STAGE.id);
    setActiveCheckpoint(null);
    phaseRef.current = 'finished';
    setPhase('finished');
    engineRef.current?.setPhase('finished');
  }, []);

  const handleBackToTestMenu = useCallback(() => {
    pressedKeysRef.current.clear();
    touchInputRef.current = { left: false, right: false, throttle: false, brake: false };
    setActiveCheckpoint(null);
    setPenaltyNotice(null);
    phaseRef.current = 'menu';
    setPhase('menu');
    engineRef.current?.setPhase('menu');
    setTeacherTestMenuOpen(true);
    syncCombinedInput();
  }, [syncCombinedInput]);

  const handleCloseTeacherTest = useCallback(() => {
    isTestModeRef.current = false;
    setIsTestMode(false);
    setTestTargetCheckpointId(null);
    setTeacherTestMenuOpen(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.isMuted();
    audio.setMuted(nextMuted);
    setMuted(nextMuted);
  }, []);

  const handleTouchChange = useCallback(
    (nextTouch: TouchInputState) => {
      touchInputRef.current = nextTouch;
      syncCombinedInput();
    },
    [syncCombinedInput],
  );

  const testTargetCheckpointLabel = useMemo(() => {
    if (!testTargetCheckpointId) return null;
    return stage.checkpoints.find((c) => c.id === testTargetCheckpointId)?.label ?? null;
  }, [stage.checkpoints, testTargetCheckpointId]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-zinc-950">
      {/* Isolated WebGL Viewport */}
      <div
        ref={canvasHostRef}
        className="fixed inset-0 h-full w-full"
        aria-label="CHEM RALLY 3D pálya"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-white/15 bg-zinc-900 p-6">
            <h2 className="font-display text-xl font-bold text-white">
              Grafikus kapcsolat megszakadt
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              A böngésző felfüggesztette a 3D megjelenítőt. Töltsd újra az oldalt a folytatáshoz.
            </p>
          </div>
        </div>
      )}

      {/* Driving HUD */}
      {phase !== 'menu' && (
        <RallyHud
          stage={stage}
          telemetry={telemetry}
          muted={muted}
          showTouchControls={showTouchControls}
          isPortraitTouch={isPortraitTouch}
          penaltyNotice={penaltyNotice}
          isTestMode={isTestMode}
          testTargetCheckpointLabel={testTargetCheckpointLabel}
          onToggleMute={handleToggleMute}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onRestart={handleRestart}
          onRecoverToRoad={handleRecoverToRoad}
          onOpenTestCheckpointNow={handleOpenTestCheckpointNow}
          onBackToTestMenu={handleBackToTestMenu}
        />
      )}

      {/* Mobile Landscape Touch Controls */}
      {phase === 'running' && (
        <TouchControls visible={showTouchControls} onChange={handleTouchChange} />
      )}

      {/* Start Overlay */}
      {phase === 'menu' && !teacherTestMenuOpen && (
        <StageMenuOverlay
          stage={stage}
          stages={STAGE_REGISTRY}
          totalMeters={telemetry.totalDistanceMeters}
          teamName={teamName}
          onTeamNameChange={setTeamName}
          onSelectStage={handleSelectStage}
          onStart={handleStart}
          onOpenTeacherTest={() => setTeacherTestMenuOpen(true)}
        />
      )}

      {/* Tanári tesztmód panel */}
      {teacherTestMenuOpen && (
        <TeacherTestModal
          stages={STAGE_REGISTRY}
          onSelectCheckpoint={handleSelectTestCheckpoint}
          onTestFinishGate={handleTestFinishGate}
          onTestScoreboardDirect={handleTestScoreboardDirect}
          onClose={handleCloseTeacherTest}
        />
      )}

      {/* Chemistry Checkpoint Modal */}
      {phase === 'paused' && activeCheckpoint && (
        <CheckpointTaskModal
          key={activeCheckpoint.id}
          checkpoint={activeCheckpoint}
          onContinueRace={handleContinueFromCheckpoint}
          onAttemptRecorded={handleAttemptRecorded}
          penaltySecondsPerWrong={PENALTY_SECONDS_PER_WRONG}
          isTestMode={isTestMode}
          onBackToTestMenu={handleBackToTestMenu}
        />
      )}

      {/* Finish Overlay */}
      {phase === 'finished' && (
        <FinishOverlay
          stage={stage}
          nextStage={nextStage}
          telemetry={telemetry}
          championship={activeSummary}
          isTestMode={isTestMode}
          onTeamNameChange={isTestMode ? setTestTeamName : setTeamName}
          onRestart={handleRestart}
          onResetChampionship={handleResetChampionship}
          onNextStage={nextStage ? handleNextStage : undefined}
          onBackToMenu={handleBackToMenu}
          onBackToTestMenu={handleBackToTestMenu}
        />
      )}
    </div>
  );
}
