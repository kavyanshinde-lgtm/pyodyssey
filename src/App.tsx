import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import confetti from 'canvas-confetti';
import {
  ALL_LESSONS,
  REALMS,
  REALM_BY_ID,
  getLesson,
  nextLessonId,
  rankForXp,
  type Lesson,
  type SceneKind,
} from './data/curriculum';
import { SANDBOX_STARTER, type SandboxExample } from './data/sandbox';
import { THEMES, THEME_BY_ID, type Theme, type ThemeId } from './data/shop';
import { audio } from './audio/synth';
import {
  analyzeSource,
  checkGoals,
  lintPython,
  translateRuntimeError,
  validateCode,
  type FriendlyError,
  type LintIssue,
  type ValidationReport,
} from './engine/linter';
import { gradeLesson } from './engine/grader';
import { pythonEngine, type EngineStatus } from './engine/pythonClient';
import type { RunResult, TraceFrame } from './engine/types';
import {
  clearSave,
  completedCount,
  defaultSave,
  loadSave,
  persistSave,
  totalStars,
  touchStreak,
  type SaveData,
  type TrialProgress,
} from './storage/save';
import { calculateNextReview, getDueLessons } from './engine/spacedRepetition';
import { TopBar } from './components/TopBar';
import { ReviewPanel } from './components/ReviewPanel';
import { ProblemPane } from './components/ProblemPane';
import { EditorPane } from './components/EditorPane';
import { CurriculumPanel, type BrainMode } from './components/CurriculumPanel';
import { SandboxPanel } from './components/SandboxPanel';
import { VisualStage, type PlaybackState } from './components/VisualStage';
import { SaveModal } from './components/SaveModal';
import { RewardModal, type RewardData } from './components/RewardModal';
import { Icon } from './components/Icons';

export type WorkspacePhase = 'study' | 'build';
export type DemoState = 'idle' | 'running' | 'done';
export interface TrialInfo {
  rounds: { title: string; focus?: string }[];
  current: number;
  cleared: number[];
  completed: boolean;
  concepts?: string[];
  onSelect: (index: number) => void;
}
export type PyroState =
  | 'idle'
  | 'happy'
  | 'thinking'
  | 'sleeping'
  | 'dizzy'
  | 'dance'
  | 'error'
  | 'victory'
  | 'warning'
  | 'typing'
  | string;

type AppMode = 'lesson' | 'sandbox' | 'review';
type ModalKind = 'save' | null;
type ToastKind = 'info' | 'success' | 'warn' | 'error' | 'coin';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface PendingRun {
  token: number;
  mode: AppMode;
  lesson: Lesson;
  challenge: Lesson;
  roundIndex: number;
  code: string;
  run: RunResult;
  report: ValidationReport | null;
  demo?: boolean;
}

function firstUnclearedRound(lesson: Lesson, progress: TrialProgress | undefined): number {
  if (!lesson.isTrial || !lesson.trial) return 0;
  const cleared = progress?.clearedRounds ?? [];
  const index = lesson.trial.rounds.findIndex((_, roundIndex) => !cleared.includes(roundIndex));
  return index === -1 ? 0 : index;
}

function roundDraftKey(lesson: Lesson, roundIndex: number): string {
  return lesson.isTrial ? `${lesson.id}:${roundIndex}` : lesson.id;
}

function challengeForRound(lesson: Lesson, roundIndex: number): Lesson {
  if (!lesson.isTrial || !lesson.trial) return lesson;
  const round = lesson.trial.rounds[Math.max(0, Math.min(roundIndex, lesson.trial.rounds.length - 1))];
  return {
    ...lesson,
    ...round,
    id: lesson.id,
    title: round.title,
    chip: 'TRIAL WAVE',
    isTrial: true,
    trial: lesson.trial,
  };
}

function resolveLessonEntry(lesson: Lesson, save: SaveData): {
  roundIndex: number;
  draftKey: string;
  code: string;
  phase: WorkspacePhase;
} {
  const roundIndex = lesson.isTrial ? firstUnclearedRound(lesson, save.trials[lesson.id]) : 0;
  const draftKey = roundDraftKey(lesson, roundIndex);
  const challenge = challengeForRound(lesson, roundIndex);
  const completed = (save.lessons[lesson.id]?.bestStars ?? 0) > 0;
  const phase: WorkspacePhase =
    !completed && !save.studyDone[draftKey] ? 'study' : 'build';
  return {
    roundIndex,
    draftKey,
    code:
      save.drafts[draftKey] ??
      (lesson.isTrial ? challenge.starter : save.lessons[lesson.id]?.code ?? lesson.starter),
    phase,
  };
}

const SANDBOX_BASE: Omit<Lesson, 'scene'> = {
  id: 'sandbox',
  realmId: 1,
  order: 0,
  title: 'Sandbox / Playground',
  chip: 'sandbox',
  icon: '🧪',
  difficulty: 3,
  minutes: 0,
  prompt: 'No levels. No rules. Real Python.',
  toybox: ['The sandbox has no rules.', 'Write anything. The stage follows.'],
  underHood: ['Everything runs in the same web worker.'],
  starter: SANDBOX_STARTER,
  solution: '',
  expectedOutput: '',
  goals: [],
  requirements: [],
  hint: 'Try a class, a generator, or a recursive function.',
  xray: '',
  xp: 0,
  coins: 0,
  starLines: 999,
};

function buildSandboxLesson(signals: ReturnType<typeof analyzeSource>): Lesson {
  let scene: SceneKind = 'primitives';
  if (signals.hasClass) scene = 'oop';
  else if (signals.hasRecursion) scene = 'recursion';
  else if (signals.hasFunction) scene = 'functions';
  else if (signals.hasLoop) scene = 'loops';
  else if (signals.hasComprehension) scene = 'comprehension';
  else if (signals.hasDict) scene = 'dicts';
  else if (signals.hasList) scene = 'lists';
  else if (signals.hasInput) scene = 'input';
  return { ...SANDBOX_BASE, scene };
}

function errorLineFor(source: string, pattern: RegExp): number | null {
  const lines = source.split('\n');
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : null;
}

function blockedImport(source: string): { name: string; line: number } | null {
  const modules = ['js', 'pyodide', 'pyodide_js', 'socket', 'ssl', 'urllib', 'http', 'requests', 'subprocess', 'ctypes', 'multiprocessing'];
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^\s*(?:import|from)\s+([A-Za-z_][\w.]*)/.exec(line);
    const dynamic = /__import__\s*\(\s*["']([^"']+)["']/.exec(line);
    const name = match?.[1] ?? dynamic?.[1];
    if (name && modules.some((module) => name === module || name.startsWith(`${module}.`))) {
      return { name, line: index + 1 };
    }
  }
  return null;
}

function celebrate(big = false) {
  const colors = ['#00F5D4', '#FF2A85', '#FEE440', '#5EFF8F', '#9D4EDD', '#ffffff'];
  confetti({
    particleCount: big ? 140 : 74,
    spread: big ? 115 : 70,
    origin: { x: 0.5, y: 0.56 },
    colors,
    zIndex: 4500,
    scalar: big ? 1.15 : 0.88,
    ticks: 220,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: big ? 70 : 36,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 4500,
    });
    confetti({
      particleCount: big ? 70 : 36,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 4500,
    });
  }, 180);
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const initialLessonId = useMemo(() => {
    const savedId = save.activeLessonId;
    return getLesson(savedId) ? savedId : 'r1-1';
  }, [save.activeLessonId]);
  const initialLesson = getLesson(initialLessonId) ?? ALL_LESSONS[0];
  const initialEntry = resolveLessonEntry(initialLesson, save);
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [trialRoundIndex, setTrialRoundIndex] = useState(initialEntry.roundIndex);
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>(initialEntry.phase);
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [mode, setMode] = useState<AppMode>('lesson');
  const [scratchMode, setScratchMode] = useState(false);
  const [visualizeOpen, setVisualizeOpen] = useState(false);
  const dueCount = useMemo(() => getDueLessons(ALL_LESSONS, save).length, [save]);
  const [brainMode, setBrainMode] = useState<BrainMode>('toybox');
  const [code, setCode] = useState(initialEntry.code);
  const [sandboxStdin, setSandboxStdin] = useState('Nova');
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [playback, setPlayback] = useState<PlaybackState>('idle');
  const [frames, setFrames] = useState<TraceFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [run, setRun] = useState<RunResult | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const [traceContext, setTraceContext] = useState<{
    code: string;
    mode: AppMode;
    lessonId: string;
    roundIndex: number;
  } | null>(null);
  const [typing, setTyping] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0.8 });
  const [petMood, setPetMood] = useState<PyroState | null>(null);
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [xrayOpen, setXrayOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [engine, setEngine] = useState<{ status: EngineStatus; message: string }>(() => pythonEngine.getStatus());

  const runTokenRef = useRef(0);
  const pendingRef = useRef<PendingRun | null>(null);
  const finalizeTimerRef = useRef<number | null>(null);
  const rewardTimersRef = useRef<number[]>([]);
  const toastTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const goalLessonRef = useRef<string | null>(null);
  const goalSignatureRef = useRef('');
  const lastWarningRef = useRef(0);
  const lintErrorRef = useRef(0);
  const lastInputRef = useRef(Date.now());
  const finishPendingRef = useRef<(pending: PendingRun) => void>(() => undefined);

  const lesson = getLesson(lessonId) ?? ALL_LESSONS[0];
  const realm = REALM_BY_ID.get(lesson.realmId) ?? REALMS[0];
  const signals = useMemo(() => analyzeSource(code), [code]);
  const sandboxLesson = useMemo(() => buildSandboxLesson(signals), [signals]);
  const activeLesson = useMemo(
    () => (mode === 'sandbox' ? sandboxLesson : challengeForRound(lesson, trialRoundIndex)),
    [lesson, mode, sandboxLesson, trialRoundIndex],
  );
  const activeRealm = mode === 'sandbox' ? REALMS[0] : realm;
  const draftKey = mode === 'sandbox' ? 'sandbox' : roundDraftKey(lesson, trialRoundIndex);
  const studyKey = draftKey;
  const phase: WorkspacePhase = mode === 'sandbox' ? 'build' : workspacePhase;
  const goals = useMemo(
    () => (mode === 'lesson' ? checkGoals(code, activeLesson.goals) : []),
    [activeLesson.goals, code, mode],
  );
  const stars = totalStars(save);
  const completed = completedCount(save);
  const theme = THEME_BY_ID.get(save.theme) ?? THEMES[0];
  const currentFrame = frames.length ? frames[Math.min(frameIndex, frames.length - 1)] : null;
  const traceMatches =
    traceContext !== null &&
    traceContext.code === code &&
    traceContext.mode === mode &&
    (mode === 'sandbox' ||
      (traceContext.lessonId === lesson.id &&
        traceContext.roundIndex === (lesson.isTrial ? trialRoundIndex : 0)));
  const activeLine =
    frames.length > 0 && traceMatches && playback !== 'idle' ? currentFrame?.line ?? null : null;
  const lintErrors = lintIssues.filter((issue) => issue.severity === 'error');
  const goalPassCount = goals.filter((goal) => goal.passed).length;
  const visibleReport = traceMatches ? report : null;
  const studyDone = mode === 'lesson' && save.studyDone[studyKey] === true;

  const visibleOutput = useMemo(() => {
    if (!run) return '';
    if (playback === 'running') return '';
    if (playback === 'success' || playback === 'error' || frames.length === 0) return run.output;
    const frame = frames[Math.min(frameIndex, frames.length - 1)];
    return run.output.slice(0, Math.max(0, frame?.stdoutLength ?? 0));
  }, [run, playback, frames, frameIndex]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const next = { id: Date.now(), message, kind };
    setToast(next);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const clearRewardTimers = useCallback(() => {
    for (const timer of rewardTimersRef.current) window.clearTimeout(timer);
    rewardTimersRef.current = [];
  }, []);

  const resetTransient = useCallback(() => {
    runTokenRef.current += 1;
    pendingRef.current = null;
    if (finalizeTimerRef.current) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
    clearRewardTimers();
    setFrames([]);
    setFrameIndex(0);
    setPlayback('idle');
    setRun(null);
    setReport(null);
    setFriendlyError(null);
    setLintIssues([]);
    setTraceContext(null);
    setXrayOpen(false);
    setDemoState('idle');
  }, [clearRewardTimers]);

  const flashPet = useCallback((state: PyroState, message: string, duration = 2200) => {
    setPetMood(state);
    setPetMessage(message);
    window.setTimeout(() => {
      setPetMood(null);
      setPetMessage(null);
    }, duration);
  }, []);

  const openLesson = useCallback(
    (id: string, options?: { scratchMode?: boolean }) => {
      const next = getLesson(id);
      if (!next) return;
      const isScratch = options?.scratchMode ?? false;
      setScratchMode(isScratch);
      const entry = resolveLessonEntry(next, save);
      resetTransient();
      setMode('lesson');
      setLessonId(id);
      setTrialRoundIndex(entry.roundIndex);
      setWorkspacePhase(isScratch ? 'build' : entry.phase);
      setDemoState('idle');
      setCode(isScratch ? '# Rewrite from scratch: implement from memory with zero hints\n' : entry.code);
      setSave((previous) => {
        const drafts = { ...previous.drafts };
        if (mode === 'sandbox') drafts.sandbox = code;
        else drafts[draftKey] = code;
        return { ...previous, drafts, activeLessonId: id };
      });
      setModal(null);
      setReward(null);
      setSidebarOpen(false);
      setActiveExample(null);
    },
    [code, draftKey, mode, resetTransient, save],
  );

  const switchMode = useCallback(
    (nextMode: AppMode) => {
      if (nextMode === mode) {
        setSidebarOpen(false);
        return;
      }
      resetTransient();
      setSave((previous) => {
        const drafts = { ...previous.drafts };
        if (mode === 'sandbox') drafts.sandbox = code;
        else drafts[draftKey] = code;
        return { ...previous, drafts };
      });
      setDemoState('idle');
      if (nextMode === 'sandbox') {
        setScratchMode(false);
        setMode('sandbox');
        setWorkspacePhase('build');
        setCode(save.drafts.sandbox ?? SANDBOX_STARTER);
        setActiveExample(null);
      } else if (nextMode === 'review') {
        setMode('review');
      } else {
        setScratchMode(false);
        setMode('lesson');
        const targetId = getLesson(save.activeLessonId) ? save.activeLessonId : lesson.id;
        const targetLesson = getLesson(targetId) ?? ALL_LESSONS[0];
        const entry = resolveLessonEntry(targetLesson, save);
        setLessonId(targetId);
        setTrialRoundIndex(entry.roundIndex);
        setWorkspacePhase(entry.phase);
        setCode(entry.code);
      }
      setSidebarOpen(false);
    },
    [code, draftKey, lesson.id, mode, resetTransient, save],
  );

  const selectTrialRound = useCallback(
    (index: number) => {
      if (mode !== 'lesson' || !lesson.isTrial || !lesson.trial) return;
      const safeIndex = Math.max(0, Math.min(index, lesson.trial.rounds.length - 1));
      const round = lesson.trial.rounds[safeIndex];
      const key = `${lesson.id}:${safeIndex}`;
      const completed = (save.lessons[lesson.id]?.bestStars ?? 0) > 0;
      const nextPhase: WorkspacePhase =
        completed || save.trials[lesson.id]?.clearedRounds.includes(safeIndex) || save.studyDone[key]
          ? 'build'
          : 'study';
      resetTransient();
      setTrialRoundIndex(safeIndex);
      setWorkspacePhase(nextPhase);
      setDemoState('idle');
      setCode(save.drafts[key] ?? round.starter);
      setSave((previous) => {
        const drafts = { ...previous.drafts };
        drafts[draftKey] = code;
        return { ...previous, drafts, activeLessonId: lesson.id };
      });
      setSidebarOpen(false);
    },
    [code, draftKey, lesson, mode, resetTransient, save],
  );

  const markStudyDone = useCallback(() => {
    if (mode !== 'lesson' || !studyKey) return;
    setSave((previous) =>
      previous.studyDone[studyKey]
        ? previous
        : { ...previous, studyDone: { ...previous.studyDone, [studyKey]: true } },
    );
  }, [mode, studyKey]);

  const handlePhaseChange = useCallback(
    (nextPhase: WorkspacePhase) => {
      if (mode === 'sandbox') return;
      if (nextPhase === 'build') markStudyDone();
      setWorkspacePhase(nextPhase);
      if (nextPhase === 'build') setDemoState('idle');
    },
    [markStudyDone, mode],
  );

  const trialInfo: TrialInfo | undefined =
    lesson.isTrial && lesson.trial
      ? {
          rounds: lesson.trial.rounds.map((round) => ({ title: round.title, focus: round.focus })),
          current: trialRoundIndex,
          cleared: save.trials[lesson.id]?.clearedRounds ?? [],
          completed: save.trials[lesson.id]?.completed === true,
          concepts: lesson.trial.concepts,
          onSelect: selectTrialRound,
        }
      : undefined;

  useEffect(() => {
    audio.setMuted(save.muted);
  }, [save.muted]);

  useEffect(() => {
    (window as any).__setModal = setModal;
    (window as any).__setReward = setReward;
    (window as any).__createDummyReward = (isTrial: boolean) => ({
      lesson: isTrial ? (ALL_LESSONS.find((l) => l.isTrial) ?? lesson) : lesson,
      stars: 3,
      xpGain: 100,
      report: {
        passed: true,
        compiled: true,
        goals: [],
        requirements: [{ label: 'All tests passed', passed: true, detail: '100%' }],
        stars: 3,
        lineCount: 4,
        passedChecks: 6,
        totalChecks: 6,
        failures: [],
      },
      previousBest: 0,
      rankName: 'Apprentice',
      nextLesson: ALL_LESSONS[1] ?? null,
      hintsUsed: 1,
      nextReviewDays: 1,
    });
  }, [lesson]);

  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = pythonEngine.subscribe((status, message) => setEngine({ status, message }));
    void pythonEngine.warmUp().catch(() => undefined);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        if (reg.active) {
          setOfflineReady(true);
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (installing) {
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setOfflineReady(true);
                showToast('Ready to use offline', 'info');
              }
            });
          }
        });
      })
      .catch(() => undefined);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_READY') {
        setOfflineReady(true);
        showToast('Ready to use offline', 'info');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => persistSave(save), 180);
    return () => window.clearTimeout(timer);
  }, [save]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSave((previous) => {
        if (previous.drafts[draftKey] === code) return previous;
        return { ...previous, drafts: { ...previous.drafts, [draftKey]: code } };
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [code, draftKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const issues = lintPython(code);
      setLintIssues((previous) => {
        const runtime = previous.filter((issue) => issue.code === 'RUNTIME');
        if (issues.length === 0) return runtime;
        return issues;
      });
      const errorCount = issues.filter((issue) => issue.severity === 'error').length;
      if (errorCount > lintErrorRef.current && Date.now() - lastWarningRef.current > 1400) {
        lastWarningRef.current = Date.now();
        audio.warning();
      }
      lintErrorRef.current = errorCount;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    const signature = goals.map((goal) => (goal.passed ? '1' : '0')).join('');
    const contextKey = `${activeLesson.id}:${lesson.isTrial ? trialRoundIndex : 0}`;
    if (goalLessonRef.current !== contextKey) {
      goalLessonRef.current = contextKey;
      goalSignatureRef.current = signature;
      return;
    }
    if (signature !== goalSignatureRef.current) {
      const previousCount = (goalSignatureRef.current.match(/1/g) ?? []).length;
      const currentCount = (signature.match(/1/g) ?? []).length;
      if (currentCount > previousCount) {
        if (currentCount === 3) audio.chime();
        else audio.pop();
      }
      goalSignatureRef.current = signature;
    }
  }, [activeLesson.id, goals, lesson.isTrial, trialRoundIndex]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (finalizeTimerRef.current) window.clearTimeout(finalizeTimerRef.current);
      for (const timer of rewardTimersRef.current) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (reward) setReward(null);
      else if (modal) setModal(null);
      else if (sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, reward, sidebarOpen]);

  const handleCodeChange = useCallback(
    (next: string, meta: { newline: boolean; deleted: boolean }) => {
      setCode(next);
      setRun(null);
      setReport(null);
      lastInputRef.current = Date.now();
      if (meta.deleted) audio.backspace();
      else audio.key();
      setTyping(true);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setTyping(false), 1100);

      if (meta.newline) {
        audio.pop();
      }
    },
    [],
  );

  const handleCaret = useCallback((_line: number, column: number) => {
    setGaze({
      x: Math.max(-2.3, Math.min(2.3, (column - 22) / 7)),
      y: 1.1,
    });
  }, []);

  const finishPending = (pending: PendingRun) => {
    if (pending.token !== runTokenRef.current) return;

    if (pending.demo) {
      setPlayback('success');
      setDemoState('done');
      audio.chime();
      showToast('Worked example complete. Now predict the output.', 'success');
      return;
    }

    if (pending.mode === 'sandbox') {
      setPlayback('success');
      audio.success();
      showToast('Sandbox run complete. The machine survived.', 'success');
      return;
    }

    const completedLesson = pending.lesson;
    const pendingReport = pending.report;
    if (!pendingReport) return;

    if (!pendingReport.passed) {
      setPlayback('error');
      setSave((prev) => {
        const prior = prev.lessons[completedLesson.id];
        const nextReview = calculateNextReview(prior, false, prior?.hintsUsed ?? 0);
        return {
          ...prev,
          lessons: {
            ...prev.lessons,
            [completedLesson.id]: {
              ...prior,
              stars: prior?.stars ?? 0,
              bestStars: prior?.bestStars ?? 0,
              code: pending.code,
              completedAt: prior?.completedAt ?? '',
              attempts: prior?.attempts ?? 1,
              bestLines: prior?.bestLines ?? 0,
              hintsUsed: prior?.hintsUsed ?? 0,
              interval: nextReview.interval,
              repetitions: nextReview.repetitions,
              nextReviewDate: nextReview.nextReviewDate,
              lastReviewedDate: nextReview.lastReviewedDate,
              scratchSolved: prior?.scratchSolved ?? false,
            },
          },
        };
      });
      audio.error();
      const failure = pendingReport.failures[0]?.label ?? 'The output did not match the mission.';
      showToast(`${failure} — check the X-Ray matrix.`, 'warn');
      return;
    }

    const priorTrial = save.trials[completedLesson.id];
    const clearedRounds = Array.from(
      new Set([...(priorTrial?.clearedRounds ?? []), pending.roundIndex]),
    ).sort((a, b) => a - b);
    const totalTrialRounds = completedLesson.trial?.rounds.length ?? 0;

    if (completedLesson.isTrial && completedLesson.trial) {
      setSave((previous) => ({
        ...previous,
        trials: {
          ...previous.trials,
          [completedLesson.id]: {
            clearedRounds,
            completed: clearedRounds.length >= totalTrialRounds,
          },
        },
        studyDone: {
          ...previous.studyDone,
          [`${completedLesson.id}:${pending.roundIndex}`]: true,
        },
      }));
      if (clearedRounds.length < totalTrialRounds) {
        setPlayback('success');
        audio.chime();
        showToast(
          `Wave ${pending.roundIndex + 1} cleared — ${clearedRounds.length}/${totalTrialRounds} trial waves sealed.`,
          'success',
        );
        const nextIndex = completedLesson.trial.rounds.findIndex((_, index) => !clearedRounds.includes(index));
        const token = pending.token;
        rewardTimersRef.current.push(
          window.setTimeout(() => {
            if (token === runTokenRef.current) selectTrialRound(nextIndex === -1 ? 0 : nextIndex);
          }, 1100),
        );
        return;
      }
    }

    const previous = save.lessons[completedLesson.id];
    const previousBest = previous?.bestStars ?? 0;
    const firstClear = previousBest === 0;
    const starsEarned = completedLesson.isTrial ? 3 : Math.max(1, pendingReport.stars);
    const starDelta = Math.max(0, starsEarned - previousBest);
    const baseXp = firstClear
      ? completedLesson.xp + (starsEarned - 1) * 20
      : starDelta * 25;
    const xpGain = baseXp;
    const now = new Date().toISOString();
    const streakSave = touchStreak(save);
    const completedDraftKey = roundDraftKey(completedLesson, pending.roundIndex);
    const nextReview = calculateNextReview(previous, true, previous?.hintsUsed ?? 0);
    const nextSave: SaveData = {
      ...streakSave,
      xp: save.xp + xpGain,
      lessons: {
        ...save.lessons,
        [completedLesson.id]: {
          stars: starsEarned,
          bestStars: Math.max(previousBest, starsEarned),
          code: pending.code,
          completedAt: now,
          attempts: Math.max(1, previous?.attempts ?? 1),
          bestLines: previous?.bestLines
            ? Math.min(previous.bestLines, pendingReport.lineCount)
            : pendingReport.lineCount,
          hintsUsed: previous?.hintsUsed ?? 0,
          interval: nextReview.interval,
          repetitions: nextReview.repetitions,
          nextReviewDate: nextReview.nextReviewDate,
          lastReviewedDate: nextReview.lastReviewedDate,
          scratchSolved: scratchMode ? true : previous?.scratchSolved ?? false,
        },
      },
      trials: completedLesson.isTrial
        ? {
            ...save.trials,
            [completedLesson.id]: {
              clearedRounds: Array.from(
                new Set([...(save.trials[completedLesson.id]?.clearedRounds ?? []), ...clearedRounds]),
              ).sort((a, b) => a - b),
              completed: true,
            },
          }
        : save.trials,
      studyDone: {
        ...save.studyDone,
        [completedDraftKey]: true,
      },
      drafts: { ...save.drafts, [completedDraftKey]: pending.code },
      activeLessonId: completedLesson.id,
    };

    setSave(nextSave);
    setPlayback('success');
    audio.victory();
    celebrate(completedLesson.isTrial === true);

    const rankBefore = rankForXp(save.xp).name;
    const rankAfter = rankForXp(nextSave.xp).name;
    if (streakSave.streak > save.streak) {
      showToast(`Daily streak extended to ${streakSave.streak} day${streakSave.streak === 1 ? '' : 's'}!`, 'success');
    } else if (rankAfter !== rankBefore) {
      showToast(`RANK UP — ${rankAfter}`, 'success');
    }

    const shouldReward = firstClear || starDelta > 0;

    if (shouldReward) {
      const nextId = nextLessonId(completedLesson.id);
      const next = nextId ? getLesson(nextId) ?? null : null;
      const rewardData: RewardData = {
        lesson: completedLesson,
        stars: starsEarned,
        xpGain,
        report: pendingReport,
        previousBest,
        rankName: rankAfter,
        nextLesson: next,
        hintsUsed: previous?.hintsUsed ?? 0,
        nextReviewDays: nextReview.interval,
      };
      const delay = 560;
      const timer = window.setTimeout(() => setReward(rewardData), delay);
      rewardTimersRef.current.push(timer);
    } else {
      showToast(`Practice clear · ${starsEarned}★ · no new stars this time.`, 'info');
    }
  };

  finishPendingRef.current = finishPending;

  const handleRun = useCallback(
    async (stepMode = false, runTests = true) => {
      if (playback === 'running') return;
      if (stepMode) setVisualizeOpen(true);
      audio.unlock();
      audio.whoosh();
      const currentMode = mode;
      const selectedLesson = mode === 'lesson' ? lesson : sandboxLesson;
      const currentChallenge = activeLesson;
      const currentRoundIndex = mode === 'lesson' && selectedLesson.isTrial ? trialRoundIndex : 0;
      const codeSnapshot = code;
      const token = ++runTokenRef.current;
      pendingRef.current = null;
      if (finalizeTimerRef.current) {
        window.clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
      clearRewardTimers();
      setDemoState('idle');
      setFrames([]);
      setFrameIndex(0);
      setRun(null);
      setReport(null);
      setFriendlyError(null);
      setTraceContext(null);
      setPlayback('running');
      setXrayOpen(false);

      const lineCount = codeSnapshot.split('\n').filter((line) => line.trim()).length;
      setSave((previous) => {
        const nextState: SaveData = {
          ...previous,
          totalRuns: previous.totalRuns + 1,
          totalLines: previous.totalLines + lineCount,
        };
        if (currentMode === 'lesson') {
          const prior = previous.lessons[selectedLesson.id];
          nextState.lessons = {
            ...previous.lessons,
            [selectedLesson.id]: {
              stars: prior?.stars ?? 0,
              bestStars: prior?.bestStars ?? 0,
              code: codeSnapshot,
              completedAt: prior?.completedAt ?? '',
              attempts: (prior?.attempts ?? 0) + 1,
              bestLines: prior?.bestLines && prior.bestLines > 0
                ? Math.min(prior.bestLines, lineCount)
                : lineCount,
              hintsUsed: prior?.hintsUsed ?? 0,
            },
          };
        }
        return nextState;
      });

      const blocked = blockedImport(codeSnapshot);
      if (blocked) {
        const line = blocked.line;
        const message = `The sandbox blocks network and system modules. "${blocked.name}" is sealed shut.`;
        const friendly: FriendlyError = {
          title: 'That module is sealed',
          message,
          hint: 'Stick to the Python standard library and pure computation. Local file I/O is allowed.',
          line,
          rawType: 'ModuleNotFoundError',
          rawMessage: message,
        };
        setPlayback('error');
        setFriendlyError(friendly);
        setLintIssues([
          {
            id: 'RUNTIME-blocked',
            code: 'RUNTIME',
            line: line ?? 1,
            column: 1,
            severity: 'error',
            title: 'Sealed module',
            message,
            hint: friendly.hint,
          },
        ]);
        audio.error();
        return;
      }

      const stdin =
        currentMode === 'sandbox'
          ? sandboxStdin.split('\n').filter((line) => line.length > 0)
          : currentChallenge.stdin ?? selectedLesson.stdin ?? [];

      try {
        const result = await pythonEngine.run(codeSnapshot, {
          stdin,
          timeLimitMs: 4000,
          maxFrames: 280,
        });
        if (token !== runTokenRef.current) return;

        setRun(result);
        setFrames(result.frames);
        setTraceContext({
          code: codeSnapshot,
          mode: currentMode,
          lessonId: selectedLesson.id,
          roundIndex: currentRoundIndex,
        });

        if (result.error) {
          const previousFrame = result.frames[result.frames.length - 1];
          const knownNames = Object.keys(previousFrame?.locals ?? {});
          const friendly = translateRuntimeError(result.error, {
            source: codeSnapshot,
            knownNames,
          });
          setFriendlyError(friendly);
          setPlayback('error');
          setFrameIndex(Math.max(0, result.frames.length - 1));
          if (result.error.line) {
            setLintIssues((previous) => [
              ...previous.filter((issue) => issue.code !== 'RUNTIME'),
              {
                id: 'RUNTIME',
                code: 'RUNTIME',
                line: result.error?.line ?? 1,
                column: 1,
                severity: 'error',
                title: friendly.title,
                message: friendly.message,
                hint: friendly.hint,
              },
            ]);
          }
          audio.error();
          return;
        }

        if (currentMode === 'sandbox') {
          setFrameIndex(0);
          setPlayback(stepMode ? 'paused' : 'playing');
          pendingRef.current = {
            token,
            mode: 'sandbox',
            lesson: currentChallenge,
            challenge: currentChallenge,
            roundIndex: 0,
            code: codeSnapshot,
            run: result,
            report: null,
          };
          return;
        }

        let validation: ValidationReport | null = null;
        if (runTests) {
          if (currentChallenge.tests && currentChallenge.tests.length > 0) {
            try {
              const attempts = save.lessons[currentChallenge.id]?.attempts ?? 0;
              validation = await gradeLesson(codeSnapshot, currentChallenge, result, attempts);
            } catch (err) {
              setPlayback('error');
              setFriendlyError({
                title: 'Tests could not run',
                message: err instanceof Error ? err.message : 'The test worker encountered an unexpected error. Try again.',
                hint: 'Check your code structure or re-run tests.',
                line: null,
                rawType: 'GraderError',
                rawMessage: err instanceof Error ? err.message : String(err),
              });
              audio.error();
              return;
            }
          } else {
            validation = validateCode(codeSnapshot, currentChallenge, result);
          }
        }
        setReport(validation);
        setFrameIndex(0);
        setPlayback(stepMode ? 'paused' : 'playing');
        pendingRef.current = {
          token,
          mode: 'lesson',
          lesson: selectedLesson,
          challenge: currentChallenge,
          roundIndex: currentRoundIndex,
          code: codeSnapshot,
          run: result,
          report: validation,
        };
        if (result.truncated) {
          showToast('Trace shortened — the animation is showing the first 280 frames.', 'info');
        }
      } catch (error) {
        if (token !== runTokenRef.current) return;
        const message = error instanceof Error ? error.message : 'The Python worker could not complete this run.';
        setPlayback('error');
        setFriendlyError({
          title: 'The machine hit a snag',
          message,
          hint: 'Wait for the core to rebuild, then press Run again.',
          line: null,
          rawType: 'EngineError',
          rawMessage: message,
        });
        audio.error();
      }
    },
    [activeLesson, code, lesson, mode, playback, sandboxLesson, sandboxStdin, showToast, clearRewardTimers, trialRoundIndex],
  );

  const handleDemo = useCallback(async () => {
    if (mode !== 'lesson' || demoState === 'running' || playback === 'running') return;
    if (!activeLesson.solution.trim()) return;
    audio.unlock();
    resetTransient();
    const token = runTokenRef.current;
    const selectedLesson = lesson;
    const roundIndex = selectedLesson.isTrial ? trialRoundIndex : 0;
    const demoCode = activeLesson.solution;
    setDemoState('running');
    setPlayback('running');
    setXrayOpen(false);
    try {
      const result = await pythonEngine.run(demoCode, {
        stdin: activeLesson.stdin ?? selectedLesson.stdin ?? [],
        timeLimitMs: 4000,
        maxFrames: 220,
      });
      if (token !== runTokenRef.current) return;
      setRun(result);
      setFrames(result.frames);
      setTraceContext({ code: demoCode, mode: 'lesson', lessonId: selectedLesson.id, roundIndex });
      if (result.error) {
        const previousFrame = result.frames[result.frames.length - 1];
        setFriendlyError(
          translateRuntimeError(result.error, {
            source: demoCode,
            knownNames: Object.keys(previousFrame?.locals ?? {}),
          }),
        );
        setPlayback('error');
        setDemoState('idle');
        setFrameIndex(Math.max(0, result.frames.length - 1));
        audio.error();
        return;
      }
      setFrameIndex(0);
      setPlayback('playing');
      pendingRef.current = {
        token,
        mode: 'lesson',
        lesson: selectedLesson,
        challenge: activeLesson,
        roundIndex,
        code: demoCode,
        run: result,
        report: null,
        demo: true,
      };
    } catch (error) {
      if (token !== runTokenRef.current) return;
      setPlayback('error');
      setDemoState('idle');
      setFriendlyError({
        title: 'The example could not run',
        message: error instanceof Error ? error.message : 'The Python core is still rebuilding.',
        hint: 'Wait a moment, then press Watch It Run again.',
        line: null,
        rawType: 'EngineError',
        rawMessage: '',
      });
      audio.error();
    }
  }, [activeLesson, demoState, lesson, mode, playback, resetTransient, trialRoundIndex]);

  useEffect(() => {
    if (playback !== 'playing' || frames.length === 0) return;
    if (frameIndex >= frames.length - 1) {
      // A replay has no pending completion to switch the state; park at the end.
      if (!pendingRef.current) setPlayback('paused');
      return;
    }
    const baseDelay = Math.max(80, Math.min(350, 8500 / Math.max(1, frames.length)));
    const timer = window.setTimeout(() => {
      setFrameIndex((current) => Math.min(current + 1, frames.length - 1));
    }, baseDelay / speed);
    return () => window.clearTimeout(timer);
  }, [playback, frameIndex, frames, speed]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (playback === 'running' || playback === 'idle' || playback === 'error') return;
    if (frames.length > 0 && frameIndex < frames.length - 1) return;
    if (finalizeTimerRef.current) return;
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeTimerRef.current = null;
      const currentPending = pendingRef.current;
      if (!currentPending) return;
      pendingRef.current = null;
      finishPendingRef.current(currentPending);
    }, 420);
  }, [playback, frameIndex, frames.length]);

  const togglePlay = useCallback(() => {
    if (frames.length === 0) {
      void handleRun(false);
      return;
    }
    if (playback === 'playing') {
      setPlayback('paused');
      return;
    }
    if (frameIndex >= frames.length - 1) {
      setFrameIndex(0);
    }
    setPlayback('playing');
  }, [frames.length, frameIndex, handleRun, playback]);

  const stepFrame = useCallback(() => {
    if (frames.length === 0) {
      void handleRun(true);
      return;
    }
    setPlayback('paused');
    setFrameIndex((current) => (current >= frames.length - 1 ? current : current + 1));
  }, [frames.length, handleRun]);

  const scrubFrame = useCallback(
    (index: number) => {
      if (frames.length === 0) return;
      setPlayback('paused');
      setFrameIndex(Math.max(0, Math.min(frames.length - 1, index)));
    },
    [frames.length],
  );

  const stepOrRun = useCallback(() => {
    if (frames.length === 0 || !traceMatches) {
      void handleRun(true);
      return;
    }
    stepFrame();
  }, [frames.length, handleRun, stepFrame, traceMatches]);

  const copyHint = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeLesson.xray);
      showToast('Hint copied to clipboard.', 'info');
    } catch {
      showToast('Clipboard blocked. Select the hint text manually.', 'warn');
    }
  }, [activeLesson.xray, showToast]);

  const recordHintUsed = useCallback((tier: number) => {
    setSave((previous) => {
      const current = previous.lessons[activeLesson.id] ?? {
        stars: 0,
        bestStars: 0,
        code: '',
        completedAt: '',
        attempts: 0,
        bestLines: 0,
        hintsUsed: 0,
      };
      return {
        ...previous,
        lessons: {
          ...previous.lessons,
          [activeLesson.id]: {
            ...current,
            hintsUsed: Math.max(current.hintsUsed ?? 0, tier),
          },
        },
      };
    });
  }, [activeLesson.id]);

  const resetCode = useCallback(() => {
    resetTransient();
    setDemoState('idle');
    if (mode === 'sandbox') {
      setCode(SANDBOX_STARTER);
    } else if (scratchMode) {
      setCode('# Rewrite from scratch: implement from memory with zero hints\n');
    } else {
      setCode(activeLesson.starter);
    }
    setActiveExample(null);
  }, [activeLesson.starter, mode, resetTransient, scratchMode]);

  const loadSandboxExample = useCallback(
    (example: SandboxExample) => {
      resetTransient();
      setCode(example.code);
      setActiveExample(example.id);
      setSandboxStdin(example.stdin?.join('\n') ?? sandboxStdin);
      audio.pop();
    },
    [resetTransient, sandboxStdin],
  );

  const clearSandbox = useCallback(() => {
    resetTransient();
    setCode('');
    setActiveExample(null);
  }, [resetTransient]);

  const toggleSound = useCallback(() => {
    setSave((previous) => {
      const muted = !previous.muted;
      audio.setMuted(muted);
      if (!muted) audio.pop();
      return { ...previous, muted };
    });
  }, []);

  const enterRealm = useCallback(
    (realmId: number) => {
      const realmEntry = REALMS.find((item) => item.id === realmId) ?? REALMS[0];
      const nextCore = realmEntry.lessons.find(
        (entry) => !entry.isTrial && (save.lessons[entry.id]?.bestStars ?? 0) === 0,
      );
      const target = nextCore ?? realmEntry.lessons[0];
      openLesson(target.id);
    },
    [openLesson, save.lessons],
  );

  const equipTheme = useCallback(
    (id: ThemeId) => {
      setSave((previous) => ({ ...previous, theme: id }));
      audio.pop();
    },
    [],
  );

  const handleImport = useCallback(
    (next: SaveData) => {
      resetTransient();
      setSave(next);
      const targetId = getLesson(next.activeLessonId) ? next.activeLessonId : 'r1-1';
      const targetLesson = getLesson(targetId) ?? ALL_LESSONS[0];
      const entry = resolveLessonEntry(targetLesson, next);
      setMode('lesson');
      setLessonId(targetId);
      setTrialRoundIndex(entry.roundIndex);
      setWorkspacePhase(entry.phase);
      setDemoState('idle');
      setCode(entry.code);
      showToast('Save imported. Welcome back, traveler.', 'success');
    },
    [resetTransient, showToast],
  );

  const handleReset = useCallback(() => {
    resetTransient();
    const fresh = defaultSave();
    clearSave();
    setSave(fresh);
    setMode('lesson');
    setLessonId('r1-1');
    setTrialRoundIndex(0);
    setWorkspacePhase('study');
    setDemoState('idle');
    setCode(getLesson('r1-1')?.starter ?? '');
    setModal(null);
    setReward(null);
    audio.error();
    showToast('Save wiped. A fresh odyssey begins.', 'warn');
  }, [resetTransient, showToast]);

  const pyroState: PyroState = petMood
    ? petMood
    : friendlyError
      ? 'error'
      : playback === 'success' || visibleReport?.passed
        ? 'victory'
        : playback === 'error'
          ? 'warning'
          : lintErrors.length > 0
            ? 'warning'
            : typing
              ? 'typing'
              : playback === 'running' || playback === 'playing'
                ? 'thinking'
                : 'idle';

  const pyroMessage = petMessage
    ? petMessage
    : friendlyError
      ? friendlyError.title
      : phase === 'study'
        ? demoState === 'running'
          ? 'Watch the stage. This is the reference pattern doing the work.'
          : playback === 'success' && demoState === 'done'
            ? 'That is the pattern. Now predict the output, then build your own version.'
            : studyDone
              ? 'Study sealed. Switch to Build and make the machine yours.'
              : 'Read the idea, watch the example, then predict the result. No test yet.'
        : playback === 'success' || visibleReport?.passed
          ? 'FIREBREATH! Every check is green. I could eat a whole syntax tree.'
          : playback === 'error'
            ? 'The test matrix is not happy. Check the flags. We can fix this.'
            : lintErrors.length > 0
              ? `X-Ray flagged ${lintErrors[0].title.toLowerCase()}. Line ${lintErrors[0].line}. I brought a stop sign.`
              : playback === 'running'
                ? 'The WebAssembly Python core is chewing on your spell...'
                : playback === 'playing'
                  ? 'Watch the stage. Every line is moving a real machine.'
                  : mode === 'sandbox'
                    ? 'No rules here. Surprise me. Summon a generator or break a loop.'
                    : goalPassCount === 3
                      ? 'All three goals are locked. Hit Run and let me see the sparks.'
                      : typing
                        ? goalPassCount > 0
                          ? `${goalPassCount}/3 sub-goals green. Keep typing, we are cooking.`
                          : 'Eyes on the syntax. I am watching the cursor. No pressure.'
                        : 'I am Pyro. I eat syntax errors and breathe confetti. Press Run when you are ready.';

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          void handleRun(false, false);
        } else {
          void handleRun(false, true);
        }
      }
      if (e.key === 'Escape') {
        setVisualizeOpen(false);
        setSidebarOpen(false);
        setModal(null);
        document.getElementById('curriculum-toggle-btn')?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleRun]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', save.theme === 'light' ? 'light' : 'dark');
  }, [save.theme]);

  const currentAttempts = save.lessons[activeLesson.id]?.attempts ?? 0;
  const bestStars = save.lessons[activeLesson.id]?.bestStars ?? 0;

  return (
    <div
      className={`app-shell mode-${mode} ${playback} ${sidebarOpen ? 'sidebar-open' : ''}`}
      data-theme={save.theme === 'light' ? 'light' : 'dark'}
    >
      <TopBar
        save={save}
        mode={mode}
        completed={completed}
        dueCount={dueCount}
        brainMode={brainMode}
        onBrainMode={setBrainMode}
        onMode={switchMode}
        onOpenSave={() => setModal('save')}
        onToggleSound={toggleSound}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        onSelectTheme={equipTheme}
        offlineReady={offlineReady}
      />

      <div className="app-layout">
        {mode === 'review' ? (
          <ReviewPanel
            allLessons={ALL_LESSONS}
            save={save}
            onSelectLesson={(id, scratch) => {
              openLesson(id, { scratchMode: scratch });
            }}
            onBackToCampaign={() => switchMode('lesson')}
          />
        ) : (
          <>
            {/* Left Pane: Problem Statement, Examples, Hints */}
            <ProblemPane
              lesson={activeLesson}
              stats={{ bestStars, attempts: currentAttempts }}
              scratchMode={scratchMode}
              hintsUsed={save.lessons[activeLesson.id]?.hintsUsed ?? 0}
              report={visibleReport}
              onRecordHint={recordHintUsed}
              onMarkStudy={markStudyDone}
            />

            {/* Right Pane: Code Editor (dominant >= 60%) + Terminal Output Directly Below */}
            <EditorPane
              lesson={activeLesson}
              code={code}
              onCodeChange={handleCodeChange}
              activeLine={activeLine}
              lintIssues={lintIssues}
              report={visibleReport}
              run={run}
              hasChecked={Boolean(visibleReport || (traceMatches && run))}
              frames={frames}
              frameIndex={frameIndex}
              friendlyError={friendlyError}
              visibleOutput={visibleOutput}
              playback={playback}
              engineStatus={engine.status}
              engineMessage={engine.message}
              mode={mode}
              attempts={currentAttempts}
              onRunTests={() => void handleRun(false, true)}
              onRunWithoutTests={() => void handleRun(false, false)}
              onReset={resetCode}
              onOpenVisualize={() => setVisualizeOpen(true)}
              onCaretChange={handleCaret}
            />

            {/* Collapsible Curriculum Drawer */}
            <div className={`curriculum-drawer ${sidebarOpen ? 'open' : ''}`}>
              {mode === 'lesson' ? (
                <CurriculumPanel
                  lesson={lesson}
                  realm={realm}
                  save={save}
                  onSelectLesson={openLesson}
                  onSelectRealm={enterRealm}
                  onClose={() => {
                    setSidebarOpen(false);
                    document.getElementById('curriculum-toggle-btn')?.focus();
                  }}
                />
              ) : (
                <SandboxPanel
                  save={save}
                  code={code}
                  stdin={sandboxStdin}
                  activeExample={activeExample}
                  onLoadExample={loadSandboxExample}
                  onStdinChange={setSandboxStdin}
                  onClear={clearSandbox}
                  onRun={() => void handleRun(false, false)}
                  onOpenSave={() => setModal('save')}
                  lines={code.split('\n').length}
                />
              )}
            </div>
            {sidebarOpen ? (
              <div
                className="curriculum-drawer-scrim"
                onClick={() => {
                  setSidebarOpen(false);
                  document.getElementById('curriculum-toggle-btn')?.focus();
                }}
                aria-label="Close curriculum drawer"
              />
            ) : null}

            {/* Execution Visualizer Stepper Modal */}
            {visualizeOpen ? (
              <div className="visual-modal-backdrop" onClick={() => setVisualizeOpen(false)}>
                <div className="visual-modal-dialog" onClick={(e) => e.stopPropagation()}>
                  <div className="visual-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="eye" size={16} />
                      <strong style={{ fontSize: '13px', fontFamily: 'var(--mono)', letterSpacing: '0.5px' }}>
                        LIVE EXECUTION VISUALIZER & STEPPER ({frames.length} frames)
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="editor-tool"
                      onClick={() => setVisualizeOpen(false)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <Icon name="close" size={13} /> CLOSE (Esc)
                    </button>
                  </div>
                  <div className="visual-modal-body">
                    <VisualStage
                      lesson={activeLesson}
                      code={code}
                      frames={frames}
                      frameIndex={frameIndex}
                      playback={playback}
                      speed={speed}
                      signals={signals}
                      mode={mode}
                      onTogglePlay={togglePlay}
                      onStepFrame={stepFrame}
                      onScrub={scrubFrame}
                      onSpeedChange={setSpeed}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {modal === 'save' ? (
        <SaveModal
          save={save}
          onClose={() => setModal(null)}
          onImport={handleImport}
          onReset={handleReset}
        />
      ) : null}

      {reward ? (
        <RewardModal
          reward={reward}
          onClose={() => setReward(null)}
          onNext={() => {
            const next = reward.nextLesson;
            setReward(null);
            if (next) openLesson(next.id);
          }}
        />
      ) : null}

      {toast ? (
        <div className={`toast toast-${toast.kind}`} role="status" key={toast.id}>
          <span className="toast-icon">
            <Icon
              name={
                toast.kind === 'success'
                  ? 'check'
                  : toast.kind === 'warn'
                    ? 'bug'
                    : toast.kind === 'coin'
                      ? 'coin'
                      : toast.kind === 'error'
                        ? 'skull'
                        : 'info'
              }
              size={16}
            />
          </span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss toast">
            <Icon name="close" size={13} />
          </button>
          <span className="toast-progress" />
        </div>
      ) : null}

      <div className="screen-reader-status" data-testid="engine-ready" data-engine-status={engine.status} aria-live="polite">
        {engine.status === 'ready' ? 'Python core ready.' : engine.message}
      </div>
    </div>
  );
}
