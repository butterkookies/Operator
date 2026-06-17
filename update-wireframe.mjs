import fs from 'fs';

const filePath = 'wireframe.html';
let content = fs.readFileSync(filePath, 'utf8');

const replaceRules = [
  // CSS Variables
  { regex: /--bg-color: #e6e4df;/g, replace: '--bg-color: #0a0a0a;' },
  { regex: /--panel-bg: #fcfbf9;/g, replace: '--panel-bg: #171717;' }, // neutral-900
  { regex: /--text-main: #1f2937;/g, replace: '--text-main: #ffffff;' }, // white
  { regex: /--text-muted: #6b7280;/g, replace: '--text-muted: #a3a3a3;' }, // neutral-400
  { regex: /--border: #d1d5db;/g, replace: '--border: #404040;' }, // neutral-700
  { regex: /--accent: #4f46e5;/g, replace: '--accent: #818cf8;' }, // indigo-400

  // Hardcoded hex and colors in CSS
  { regex: /background: white;/g, replace: 'background: #171717;' },
  { regex: /background-color: white;/g, replace: 'background-color: #171717;' },
  { regex: /#e5e7eb/g, replace: '#404040' }, // gray-200 to neutral-700
  { regex: /#f3f4f6/g, replace: '#262626' }, // gray-100 to neutral-800
  { regex: /#f9fafb/g, replace: '#262626' }, // gray-50 to neutral-800
  { regex: /#f3f2ee/g, replace: '#262626' },
  { regex: /#fcfbf9/g, replace: '#171717' },
];

for (const rule of replaceRules) {
  content = content.replace(rule.regex, rule.replace);
}

fs.writeFileSync(filePath, content);
console.log('Wireframe dark mode applied.');
