import fs from 'fs';
import path from 'path';

function findFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(findFiles(fullPath, exts));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = findFiles('./src', ['.tsx']);

// Regex to detect Vietnamese characters:
// àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ
const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;

const filesWithHardcodedVN = [];

for (const file of files) {
  if (file.includes('locales')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const matchingLines = [];
  lines.forEach((line, idx) => {
    // ignore comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (vnRegex.test(line)) {
      matchingLines.push({ line: idx + 1, content: trimmed });
    }
  });
  if (matchingLines.length > 0) {
    filesWithHardcodedVN.push({ file, count: matchingLines.length, samples: matchingLines.slice(0, 5) });
  }
}

console.log('Files with hardcoded Vietnamese text:', filesWithHardcodedVN.length);
for (const item of filesWithHardcodedVN) {
  console.log(`\n${item.file} (${item.count} lines)`);
  item.samples.forEach(s => console.log(`  [Line ${s.line}] ${s.content}`));
}
