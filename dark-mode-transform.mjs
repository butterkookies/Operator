import fs from 'fs';
import path from 'path';

const replaceRules = [
  { regex: /\bbg-\[#e6e4df\]\b/g, replace: 'bg-neutral-900' },
  { regex: /\bbg-\[#f3f2ee\]\b/g, replace: 'bg-neutral-950' },
  { regex: /\bbg-\[#f5f4f0\]\b/g, replace: 'bg-neutral-900' },
  { regex: /\bbg-\[#efede8\]\b/g, replace: 'bg-neutral-950' },
  // Since we ran the first pass, we might have missed `bg-[#fcfbf9]` if my regex backslashes didn't work in the string.
  // Wait, in my previous script I wrote `regex: /\bbg-\[#fcfbf9\]\b/g`. Let's test `bg-[#fcfbf9]` with escaping.
  // Actually, the `[` and `]` might need better escaping or no escaping if it's string.
  { regex: /bg-\[#fcfbf9\]/g, replace: 'bg-neutral-950' },
  { regex: /bg-\[#e6e4df\]/g, replace: 'bg-neutral-900' },
  { regex: /bg-\[#f3f2ee\]/g, replace: 'bg-neutral-950' },
  { regex: /bg-\[#f5f4f0\]/g, replace: 'bg-neutral-900' },
  { regex: /bg-\[#efede8\]/g, replace: 'bg-neutral-950' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      for (const rule of replaceRules) {
        content = content.replace(rule.regex, rule.replace);
      }
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Hex dark mode transformation complete.');
