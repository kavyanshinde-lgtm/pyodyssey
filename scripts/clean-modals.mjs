import fs from 'node:fs';
import path from 'node:path';

const modalPath = path.resolve('src/styles/modals.css');
let css = fs.readFileSync(modalPath, 'utf8');

// Replace variables
css = css.replace(/var\(--cyan\)/g, 'var(--accent)');
css = css.replace(/var\(--pink\)/g, 'var(--accent)');
css = css.replace(/var\(--pyro-[a-z0-9_-]+\)/g, 'var(--accent)');
css = css.replace(/var\(--line-hot\)/g, 'var(--line)');

// Replace glow box-shadows
css = css.replace(/box-shadow:\s*0 34px 100px rgba\(0, 0, 0, 0\.65\)[\s\S]*?inset 0 1px 0 color-mix\(in srgb, #ffffff 5%, transparent\);/g, 'box-shadow: 0 34px 100px rgba(0, 0, 0, 0.65);');
css = css.replace(/box-shadow:\s*0 0 45px rgba\(255, 42, 133, 0\.1\),[\s\S]*?inset -12px -8px 24px rgba\(0, 0, 0, 0\.6\);/g, 'box-shadow: none;');
css = css.replace(/box-shadow:\s*inset 0 0 25px color-mix\([^;]+;/g, 'box-shadow: none;');
css = css.replace(/box-shadow:\s*inset 0 0 28px color-mix\([^;]+;/g, 'box-shadow: none;');
css = css.replace(/box-shadow:\s*0 0 (?:5px|6px|7px|8px|12px|16px|22px)[^;]+;/g, 'box-shadow: none;');
css = css.replace(/box-shadow:\s*[134]px [134]px 0[^;]+;/g, 'box-shadow: none;');
css = css.replace(/box-shadow:\s*0 0 0 0 color-mix\([^;]+;/g, 'box-shadow: none;');
css = css.replace(/filter:\s*drop-shadow\(0 0 20px[^;]+;/g, 'filter: none;');
css = css.replace(/filter:\s*drop-shadow\(0 0 5px[^;]+;/g, 'filter: none;');

fs.writeFileSync(modalPath, css);
console.log('Cleaned modals.css');
