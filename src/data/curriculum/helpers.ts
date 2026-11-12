import type { AstConstructType, ConstructCheck, Lesson, RealmId, SceneKind, TestCase, TrialMeta, TrialPattern, TrialRound } from './types';

export const trialRound = (config: {
  id: string;
  title: string;
  focus: string;
  prompt: string;
  starter: string;
  solution: string;
  expectedOutput: string;
  hint: string;
  scene: SceneKind;
  patterns: [TrialPattern, TrialPattern, TrialPattern];
  stdin?: string[];
  pythonic?: string;
  entrypoint?: string;
  tests?: TestCase[];
  constructs?: (ConstructCheck | AstConstructType)[];
}): TrialRound => {
  const lineCount = config.solution
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#')).length;
  return {
    id: config.id,
    title: config.title,
    focus: config.focus,
    prompt: config.prompt,
    starter: config.starter,
    solution: config.solution,
    expectedOutput: config.expectedOutput,
    goals: config.patterns.map((pattern, index) => ({
      id: `g${index + 1}`,
      label: pattern.label,
      hint: pattern.hint,
      pattern: pattern.pattern,
    })),
    requirements: [
      { label: 'Output matches the trial record', kind: 'output', value: config.expectedOutput },
      ...config.patterns.map((pattern) => ({ label: pattern.label, kind: 'pattern' as const, value: pattern.pattern })),
    ],
    hint: config.hint,
    xray: config.solution,
    stdin: config.stdin,
    scene: config.scene,
    starLines: lineCount + 1,
    pythonic: config.pythonic,
    entrypoint: config.entrypoint,
    tests: config.tests,
    constructs: config.constructs,
  };
};

export const ultimateTrial = (
  realmId: RealmId,
  order: number,
  meta: TrialMeta,
  xp: number,
  coins: number,
): Lesson => {
  const finalRound = meta.rounds[meta.rounds.length - 1];
  return {
    id: `r${realmId}-trial`,
    realmId,
    order,
    title: meta.title,
    chip: 'ULTIMATE TRIAL',
    icon: meta.badgeIcon,
    scene: finalRound.scene,
    difficulty: 5,
    minutes: 12,
    prompt: meta.intro,
    toybox: [
      'This is the final proving ground for everything in this realm.',
      'One trial. Three waves. No new toys — only the ones already in your hands.',
    ],
    underHood: [
      'The trial records each wave independently, then checks the full set before awarding the realm badge. Partial progress persists, so a failed wave never erases cleared ones.',
      'Every wave still runs through real CPython and validates both stdout and structural source patterns. Review the concept list before you begin.',
      'Completion is gated on all three waves. XP, coins, and the realm badge unlock only on the final clear.',
    ],
    starter: finalRound.starter,
    solution: finalRound.solution,
    expectedOutput: finalRound.expectedOutput,
    goals: finalRound.goals,
    requirements: finalRound.requirements,
    hint: finalRound.hint,
    xray: finalRound.xray,
    stdin: finalRound.stdin,
    xp,
    coins,
    starLines: finalRound.starLines,
    pythonic: finalRound.pythonic,
    entrypoint: finalRound.entrypoint,
    tests: finalRound.tests,
    constructs: finalRound.constructs,
    tieredHints: meta.tieredHints ?? {
      concept: `Prove mastery across all concepts tested in ${meta.title}. Review the concept list before beginning each wave.`,
      approach: `Solve each wave sequentially using the syntax patterns and algorithms introduced in this realm.`,
      skeleton: finalRound.starter,
      solution: finalRound.solution,
    },
    isTrial: true,
    trial: meta,
  };
};

export const projectLesson = (
  realmId: RealmId,
  base: Omit<Lesson, 'id' | 'realmId' | 'order' | 'scene'>,
  scene: SceneKind,
  order: number,
): Lesson => ({
  ...base,
  id: `r${realmId}-boss`,
  realmId,
  order,
  isProject: true,
  scene,
  chip: base.chip ?? 'MINI-PROJECT',
  difficulty: 5,
  minutes: 8,
  xp: 180,
});

export const bossLesson = (
  realmId: RealmId,
  base: Omit<Lesson, 'id' | 'realmId' | 'order' | 'scene'>,
  _boss: unknown,
  scene: SceneKind,
  order: number,
): Lesson => projectLesson(realmId, base, scene, order);
