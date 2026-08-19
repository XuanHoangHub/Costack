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

const files = findFiles('./src', ['.tsx', '.ts']);
console.log('Total files in src:', files.length);

const hasUseTranslation = [];
const lacksUseTranslation = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('useTranslation')) {
    hasUseTranslation.push(file);
  } else {
    lacksUseTranslation.push(file);
  }
}

console.log('Files with useTranslation:', hasUseTranslation.length);
console.log('Files without useTranslation:', lacksUseTranslation.length);

// Let's filter out non-UI files (types, lib, utils, api routes, contexts, hooks, stores)
const uiFilesWithoutI18n = lacksUseTranslation.filter(f => 
  (f.includes('components') || f.includes('app')) && 
  !f.includes('api') && 
  !f.includes('icon') && 
  !f.includes('types') &&
  !f.includes('InlineHeadScript') &&
  !f.includes('FacebookSDK') &&
  !f.includes('globals.css')
);

console.log('UI Components without useTranslation:', uiFilesWithoutI18n.length);
console.log(JSON.stringify(uiFilesWithoutI18n, null, 2));
