import type { ConstructCheck, TestCase, AstConstructType } from '../../engine/types';
export type { ConstructCheck, TestCase, AstConstructType };

export type RealmId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type RealmKey =
  | 'toybox'
  | 'logic'
  | 'loops'
  | 'vaults'
  | 'functions'
  | 'sorcery'
  | 'oop'
  | 'sanctum';

export type SceneKind =
  | 'primitives'
  | 'strings'
  | 'math'
  | 'input'
  | 'logic'
  | 'loops'
  | 'lists'
  | 'tuples'
  | 'sets'
  | 'dicts'
  | 'functions'
  | 'comprehension'
  | 'oop'
  | 'recursion'
  | 'sandbox';

export interface MicroGoal {
  id: string;
  label: string;
  hint: string;
  pattern: string;
  flags?: string;
  not?: boolean;
}

export interface Requirement {
  label: string;
  kind: 'output' | 'pattern' | 'forbid' | 'min-lines';
  value: string;
  hint?: string;
}

export type ExerciseType = 'code' | 'predict' | 'debug' | 'explain' | 'project';

export interface TieredHints {
  concept: string;
  approach: string;
  skeleton: string;
  solution?: string;
}

export type PredictFocus = 'mutation' | 'scope' | 'loop' | 'aliasing' | 'off-by-one' | 'types' | 'logic';

export interface PredictQuestion {
  id: string;
  focus: PredictFocus;
  question: string;
  codeSnippet: string;
  answer: string;
  options?: string[];
  explanation: string;
}

export interface TrialRound {
  id: string;
  title: string;
  focus: string;
  prompt: string;
  starter: string;
  solution: string;
  expectedOutput: string;
  goals: MicroGoal[];
  requirements: Requirement[];
  hint: string;
  xray: string;
  stdin?: string[];
  scene: SceneKind;
  starLines: number;
  pythonic?: string;
  entrypoint?: string;
  tests?: TestCase[];
  constructs?: (ConstructCheck | AstConstructType)[];
  exerciseType?: ExerciseType;
  tieredHints?: TieredHints;
  predictQuestion?: PredictQuestion;
}

export interface TrialMeta {
  title: string;
  badgeName: string;
  badgeIcon: string;
  intro: string;
  concepts: string[];
  rounds: TrialRound[];
  tieredHints?: TieredHints;
}

export interface Lesson {
  id: string;
  realmId: RealmId;
  order: number;
  title: string;
  chip: string;
  icon: string;
  focus?: string;
  scene: SceneKind;
  difficulty: 1 | 2 | 3 | 4 | 5;
  minutes: number;
  prompt: string;
  statement?: string;
  task?: string;
  example?: { call: string; result: string };
  toybox: [string, string];
  underHood: string[];
  starter: string;
  solution: string;
  expectedOutput: string;
  goals: MicroGoal[];
  requirements: Requirement[];
  hint: string;
  xray: string;
  xp: number;
  coins?: number;
  starLines: number;
  pythonic?: string;
  stdin?: string[];
  isProject?: boolean;
  isTrial?: boolean;
  trial?: TrialMeta;
  // Grader behavioral testing:
  entrypoint?: string;
  tests?: TestCase[];
  constructs?: (ConstructCheck | AstConstructType)[];
  pure?: boolean;
  // Pedagogy:
  exerciseType?: ExerciseType;
  tieredHints?: TieredHints;
  predictQuestion?: PredictQuestion;
}

export interface Realm {
  id: RealmId;
  key: RealmKey;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  accent: string;
  tagline: string;
  lore: string;
  unlockXp: number;
  lessons: Lesson[];
}

export interface TrialPattern {
  label: string;
  hint: string;
  pattern: string;
}
