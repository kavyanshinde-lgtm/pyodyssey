import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Collect all CSS files
function collectFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const cssFiles = collectFiles(srcDir, '.css');
const tsxFiles = collectFiles(srcDir, '.tsx');

// Parse defined CSS classes from CSS files
const definedClasses = new Set();

for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Strip comments
  const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Match selectors before {
  const ruleBlocks = cleanContent.split('{');
  for (let i = 0; i < ruleBlocks.length - 1; i++) {
    // Get text before {
    const block = ruleBlocks[i];
    // Find class selectors in this block
    const matches = block.match(/\.([a-zA-Z0-9_-]+)/g);
    if (matches) {
      for (const m of matches) {
        // Strip the leading dot
        definedClasses.add(m.slice(1));
      }
    }
  }
}

// Extract classNames used in TSX files
const jsKeywords = new Set([
  'true', 'false', 'null', 'undefined', 'return', 'if', 'else', 'const', 'let', 'var',
  'function', 'string', 'number', 'boolean', 'any', 'void', 'type', 'interface',
  'import', 'export', 'default', 'from', 'as', 'new', 'this', 'class', 'extends',
  'item', 'index', 'key', 'id', 'val', 'prev', 'e', 'event', 'state', 'props'
]);

const unstyledByComponent = new Map();
let totalUnstyledCount = 0;

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
  const usedClasses = new Set();

  // Pattern 1: className="literal classes"
  const literalMatches = content.matchAll(/className\s*=\s*"([^"]+)"/g);
  for (const match of literalMatches) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    for (const c of classes) {
      usedClasses.add(c);
    }
  }

  // Pattern 2: className={`template literals ${...}`}
  const templateMatches = content.matchAll(/className\s*=\s*\{`([^`]+)`\}/g);
  for (const match of templateMatches) {
    const raw = match[1];
    // Strip ${...} expressions and extract literal parts
    // But also check literals inside expressions like ? 'foo' : 'bar'
    const exprMatches = raw.matchAll(/\$\{([^}]+)\}/g);
    for (const expr of exprMatches) {
      const exprBody = expr[1];
      // If it's a ternary condition ? a : b, only take string literals after ?
      // Avoid splitting on optional chaining `?.`
      let targetForStrings = exprBody;
      const ternaryMatch = exprBody.match(/\s+\?\s+([^:]+)\s*:\s*(.+)$/);
      if (ternaryMatch) {
        targetForStrings = ternaryMatch[1] + ' ' + ternaryMatch[2];
      } else if (exprBody.includes('&&')) {
        targetForStrings = exprBody.split('&&').slice(1).join('&&');
      }
      const stringLiterals = targetForStrings.matchAll(/['"]([^'"]+)['"]/g);
      for (const s of stringLiterals) {
        for (const c of s[1].split(/\s+/).filter(Boolean)) {
          if (!jsKeywords.has(c) && !/^\$\{/.test(c)) usedClasses.add(c);
        }
      }
    }
    const cleanRaw = raw.replace(/\$\{[^}]+\}/g, ' ');
    for (const c of cleanRaw.split(/\s+/).filter(Boolean)) {
      if (!jsKeywords.has(c)) usedClasses.add(c);
    }
  }

  // Pattern 3: className={expr}
  const exprMatches = content.matchAll(/className\s*=\s*\{([^`][^}]+)\}/g);
  for (const match of exprMatches) {
    const expr = match[1];
    let targetForStrings = expr;
    const ternaryMatch = expr.match(/\s+\?\s+([^:]+)\s*:\s*(.+)$/);
    if (ternaryMatch) {
      targetForStrings = ternaryMatch[1] + ' ' + ternaryMatch[2];
    } else if (expr.includes('&&')) {
      targetForStrings = expr.split('&&').slice(1).join('&&');
    }
    const stringLiterals = targetForStrings.matchAll(/['"]([^'"]+)['"]/g);
    for (const s of stringLiterals) {
      for (const c of s[1].split(/\s+/).filter(Boolean)) {
        if (!jsKeywords.has(c)) usedClasses.add(c);
      }
    }
  }

  const unstyled = [];
  for (const cls of usedClasses) {
    // Skip dynamic placeholder, prefixes ending in dash, or invalid class tokens
    if (
      /^[0-9]/.test(cls) ||
      cls.includes('${') ||
      cls.length < 2 ||
      cls.endsWith('-') ||
      cls.startsWith('-') ||
      cls.includes('?') ||
      cls.includes(':') ||
      cls.includes('(') ||
      cls.includes(')')
    ) {
      continue;
    }
    if (!definedClasses.has(cls)) {
      unstyled.push(cls);
    }
  }

  if (unstyled.length > 0) {
    unstyledByComponent.set(relativePath, unstyled.sort());
    totalUnstyledCount += unstyled.length;
  }
}

console.log('='.repeat(70));
console.log('CSS Coverage Report: Class Names Defined vs Used');
console.log('='.repeat(70));
console.log(`Stylesheets scanned: ${cssFiles.length}`);
console.log(`Defined classes in CSS: ${definedClasses.size}`);
console.log(`TSX components scanned: ${tsxFiles.length}`);
console.log('-'.repeat(70));

if (unstyledByComponent.size === 0) {
  console.log('✅ ALL classNames have matching selectors in stylesheets!');
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.log(`❌ Found ${totalUnstyledCount} unstyled classes across ${unstyledByComponent.size} components:\n`);
  for (const [component, classes] of unstyledByComponent.entries()) {
    console.log(`📁 ${component} (${classes.length} unstyled):`);
    for (const c of classes) {
      console.log(`   - .${c}`);
    }
    console.log('');
  }
  console.log('='.repeat(70));
  process.exit(1);
}
