import fs from 'node:fs';
import path from 'node:path';

const iconMap = {
  '📣': 'code',
  '🧸': 'box',
  '📜': 'code',
  '🏷️': 'code',
  '⚖️': 'code',
  '👂': 'terminal',
  '🔬': 'cpu',
  '👾': 'skull',
  '👑': 'crown',
  '💡': 'bolt',
  '🚦': 'code',
  '🚪': 'lock',
  '🏰': 'layers',
  '⚡': 'zap',
  '⛽': 'zap',
  '🛑': 'close',
  '🏭': 'cpu',
  '🔢': 'grid',
  '⏭️': 'step',
  '🤖': 'cpu',
  '🚂': 'code',
  '🔪': 'code',
  '🧊': 'box',
  '🧿': 'orbit',
  '🥤': 'layers',
  '🗝️': 'lock',
  '🐉': 'skull',
  '🫙': 'box',
  '🛝': 'code',
  '🌫️': 'code',
  '🧺': 'grid',
  '📦': 'box',
  '🦹': 'skull',
  '🔮': 'sparkles',
  '🪞': 'layers',
  '🧹': 'code',
  '🔗': 'code',
  '📖': 'code',
  '🕸️': 'lock',
  '🛡️': 'lock',
  '🫥': 'cpu',
  '🖨️': 'code',
  '🔋': 'bolt',
  '🧬': 'layers',
  '🎭': 'orbit',
  '📐': 'grid',
  '🪄': 'wand',
  '💠': 'cpu',
  '🎒': 'code',
  '🌀': 'wand',
  '⛲': 'zap',
  '🗄️': 'file',
  '🗼': 'cpu',
  '⏱️': 'target',
  '👁️': 'crown',
  '🔱': 'crown',
  '⚔️': 'sword',
  '✦': 'sparkles',
  '⚙️': 'cpu',
  '⚗️': 'wand',
  '🏛️': 'layers',
  '✨': 'sparkles',
  '🎯': 'target',
  '🏆': 'trophy',
  '⭐': 'star',
  '📇': 'code',
  '🎛️': 'settings',
  '🐍': 'code',
  '🪆': 'layers',
  '🦷': 'code',
  '🦾': 'cpu',
};

const dir = 'C:/Users/kavya/OneDrive/Documents/deepseek-harness/default-workspace/pyodyssey/src/data/curriculum';
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.ts')) continue;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [emoji, replacement] of Object.entries(iconMap)) {
    content = content.replaceAll(`'${emoji}'`, `'${replacement}'`);
    content = content.replaceAll(`"${emoji}"`, `"${replacement}"`);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Emojis purged from curriculum.');
