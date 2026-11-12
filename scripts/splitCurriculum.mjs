import fs from 'node:fs';
import path from 'node:path';

const srcFile = path.resolve('src/data/curriculum.ts');
const text = fs.readFileSync(srcFile, 'utf8');
const lines = text.split(/\r?\n/);

const meta = [
  {
    id: 1,
    key: 'toybox',
    name: 'The Toybox',
    subtitle: 'First Sparks',
    icon: '🧸',
    color: '#00F5D4',
    accent: '#FF2A85',
    tagline: 'Make the machine speak.',
    lore: 'A warm workshop of crates, scrolls, and one very loud megaphone.',
    unlockXp: 0,
    lessonsStart: 260,
    lessonsEnd: 644,
    bossStart: 645,
    bossEnd: 726,
    trialStart: 3589,
    trialEnd: 3661,
  },
  {
    id: 2,
    key: 'logic',
    name: 'Logic Gates',
    subtitle: 'Decision District',
    icon: '⚡',
    color: '#FEE440',
    accent: '#00F5D4',
    tagline: 'Teach the machine to choose.',
    lore: 'A city of switches, keys, and doors that only open for the right truth.',
    unlockXp: 250,
    lessonsStart: 732,
    lessonsEnd: 1058,
    bossStart: 1059,
    bossEnd: 1128,
    trialStart: 3663,
    trialEnd: 3731,
  },
  {
    id: 3,
    key: 'loops',
    name: 'Loop Factory',
    subtitle: 'Infinite Works',
    icon: '🏭',
    color: '#5EFF8F',
    accent: '#FF2A85',
    tagline: 'Build belts that never tire.',
    lore: 'Conveyors, gears, and a hydra that grows a head for every mistake.',
    unlockXp: 600,
    lessonsStart: 1133,
    lessonsEnd: 1463,
    bossStart: 1464,
    bossEnd: 1533,
    trialStart: 3733,
    trialEnd: 3800,
  },
  {
    id: 4,
    key: 'vaults',
    name: 'Data Vaults',
    subtitle: 'Cargo Depths',
    icon: '🗄️',
    color: '#FF9F1C',
    accent: '#FEE440',
    tagline: 'Store anything. Find everything.',
    lore: 'Trains of cargo, glass-frozen relics, and vending machines with teeth.',
    unlockXp: 1100,
    lessonsStart: 1538,
    lessonsEnd: 1866,
    bossStart: 1867,
    bossEnd: 1936,
    trialStart: 3802,
    trialEnd: 3866,
  },
  {
    id: 5,
    key: 'functions',
    name: 'Function Foundry',
    subtitle: 'Machine Quarter',
    icon: '⚙️',
    color: '#4CC9F0',
    accent: '#FEE440',
    tagline: 'Build machines that build.',
    lore: 'Funnels, chutes, gears, and a furnace with fists.',
    unlockXp: 1700,
    lessonsStart: 1941,
    lessonsEnd: 2275,
    bossStart: 2276,
    bossEnd: 2346,
    trialStart: 3868,
    trialEnd: 3934,
  },
  {
    id: 6,
    key: 'sorcery',
    name: 'Pythonic Sorcery',
    subtitle: 'Sigil Spire',
    icon: '🔮',
    color: '#9D4EDD',
    accent: '#00F5D4',
    tagline: 'Say more. Write less.',
    lore: 'Floating comprehensions, filter gates, and one very smug sorcerer.',
    unlockXp: 2400,
    lessonsStart: 2351,
    lessonsEnd: 2684,
    bossStart: 2685,
    bossEnd: 2755,
    trialStart: 3936,
    trialEnd: 4001,
  },
  {
    id: 7,
    key: 'oop',
    name: 'OOP Citadel',
    subtitle: 'Blueprint Bastion',
    icon: '🏛️',
    color: '#00B4D8',
    accent: '#FF2A85',
    tagline: 'Blueprint the impossible.',
    lore: 'Holograms, laser printers, and a titan with an empty core.',
    unlockXp: 3200,
    lessonsStart: 2760,
    lessonsEnd: 3097,
    bossStart: 3098,
    bossEnd: 3167,
    trialStart: 4003,
    trialEnd: 4070,
  },
  {
    id: 8,
    key: 'sanctum',
    name: 'Grandmaster Sanctum',
    subtitle: 'The Final Gate',
    icon: '🔱',
    color: '#FF2A85',
    accent: '#FEE440',
    tagline: 'Bend the language itself.',
    lore: 'Closures, generators, recursion, and the eye that never blinks.',
    unlockXp: 4200,
    lessonsStart: 3172,
    lessonsEnd: 3513,
    bossStart: 3514,
    bossEnd: 3583,
    trialStart: 4072,
    trialEnd: 4140,
  },
];

const targetDir = path.resolve('src/data/curriculum');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const m of meta) {
  const lessonSlice = lines.slice(m.lessonsStart - 1, m.lessonsEnd).join('\n');
  const bossSlice = lines.slice(m.bossStart - 1, m.bossEnd).join('\n');
  const trialSlice = lines.slice(m.trialStart - 1, m.trialEnd).join('\n');

  const content = `import type { Lesson, Realm } from './types';
import { bossLesson, trialRound, ultimateTrial } from './helpers';

${lessonSlice}

${bossSlice}

${trialSlice}

export const realm${m.id}: Realm = {
  id: ${m.id},
  key: '${m.key}',
  name: '${m.name}',
  subtitle: '${m.subtitle}',
  icon: '${m.icon}',
  color: '${m.color}',
  accent: '${m.accent}',
  tagline: '${m.tagline}',
  lore: '${m.lore}',
  unlockXp: ${m.unlockXp},
  lessons: [...realm${m.id}Lessons, realm${m.id}Boss, realm${m.id}Trial],
};
`;
  fs.writeFileSync(path.join(targetDir, `realm${m.id}.ts`), content, 'utf8');
}

console.log('Successfully generated realm files');
