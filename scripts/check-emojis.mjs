import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/Users/kavya/OneDrive/Documents/deepseek-harness/default-workspace/pyodyssey/src/data/curriculum';
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.ts')) continue;
  const content = fs.readFileSync(path.join(dir, file), 'utf-8');
  const matches = content.match(/icon:\s*['"]([^\x22\x27a-zA-Z0-9_\-\s]+)['"]/g);
  if (matches) {
    console.log(`${file}: ${matches.length} matches ->`, matches.slice(0, 5));
  }
}
