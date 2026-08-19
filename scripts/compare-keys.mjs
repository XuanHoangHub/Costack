import fs from 'fs';

function extractKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const keys = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    const match = line.match(/^['"]?([a-zA-Z0-9_\-]+)['"]?\s*:\s*(.+)$/);
    if (match) {
      const key = match[1];
      const val = match[2];
      if (key !== 'type' && key !== 'export' && key !== 'import') {
        keys.set(key, { line: i + 1, val });
      }
    }
  }
  return keys;
}

const enKeys = extractKeys('./src/locales/en.ts');
const viKeys = extractKeys('./src/locales/vi.ts');

console.log('EN keys count:', enKeys.size);
console.log('VI keys count:', viKeys.size);

const inEnNotVi = [];
for (const [k, v] of enKeys) {
  if (!viKeys.has(k)) inEnNotVi.push({ key: k, enLine: v.line, enVal: v.val });
}

const inViNotEn = [];
for (const [k, v] of viKeys) {
  if (!enKeys.has(k)) inViNotEn.push({ key: k, viLine: v.line, viVal: v.val });
}

console.log('\n--- In EN but not in VI (' + inEnNotVi.length + ') ---');
console.log(JSON.stringify(inEnNotVi, null, 2));

console.log('\n--- In VI but not in EN (' + inViNotEn.length + ') ---');
console.log(JSON.stringify(inViNotEn, null, 2));
