import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const localeFiles = {
  en: path.join(root, 'src', 'locales', 'en.ts'),
  vi: path.join(root, 'src', 'locales', 'vi.ts'),
};

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isSatisfiesExpression(current)
    || ts.isAsExpression(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(node) {
  if (!node.name) return null;
  if (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return null;
}

function parseDictionary(locale, filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let objectLiteral = null;

  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== locale || !declaration.initializer) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (ts.isObjectLiteralExpression(initializer)) objectLiteral = initializer;
    }
  });

  if (!objectLiteral) throw new Error(`Không tìm thấy từ điển "${locale}" trong ${filePath}`);

  const entries = new Map();
  const duplicates = [];
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) continue;
    const key = propertyName(property);
    if (!key) continue;
    if (entries.has(key)) duplicates.push(key);

    let value = null;
    let kind = 'function';
    if (ts.isPropertyAssignment(property)) {
      const initializer = unwrapExpression(property.initializer);
      if (ts.isStringLiteralLike(initializer)) {
        value = initializer.text;
        kind = 'string';
      } else if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
        kind = ts.SyntaxKind[initializer.kind];
      }
    }
    entries.set(key, { value, kind });
  }

  return { entries, duplicates };
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === '.next' ? [] : walk(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function placeholders(value) {
  return [...String(value || '').matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

const dictionaries = {
  en: parseDictionary('en', localeFiles.en),
  vi: parseDictionary('vi', localeFiles.vi),
};
const errors = [];

for (const locale of ['en', 'vi']) {
  if (dictionaries[locale].duplicates.length) {
    errors.push(`${locale}: khóa trùng: ${[...new Set(dictionaries[locale].duplicates)].join(', ')}`);
  }
}

const enKeys = new Set(dictionaries.en.entries.keys());
const viKeys = new Set(dictionaries.vi.entries.keys());
const missingInVi = [...enKeys].filter((key) => !viKeys.has(key));
const missingInEn = [...viKeys].filter((key) => !enKeys.has(key));
if (missingInVi.length) errors.push(`Thiếu trong vi: ${missingInVi.join(', ')}`);
if (missingInEn.length) errors.push(`Thiếu trong en: ${missingInEn.join(', ')}`);

for (const key of enKeys) {
  const enEntry = dictionaries.en.entries.get(key);
  const viEntry = dictionaries.vi.entries.get(key);
  if (!viEntry) continue;
  if (enEntry.kind !== viEntry.kind) errors.push(`${key}: kiểu giá trị lệch (${enEntry.kind}/${viEntry.kind})`);
  if (enEntry.value !== null && viEntry.value !== null) {
    const enPlaceholders = placeholders(enEntry.value);
    const viPlaceholders = placeholders(viEntry.value);
    if (enPlaceholders.join('|') !== viPlaceholders.join('|')) {
      errors.push(`${key}: placeholder lệch (${enPlaceholders.join(', ') || 'không có'} / ${viPlaceholders.join(', ') || 'không có'})`);
    }
  }
}

const sourceFiles = walk(path.join(root, 'src'));
const usedKeys = new Map();
const hardcodedVietnamese = [];
const filesWithoutLocaleBridge = [];
const translationCallPattern = /\bt\s*\(\s*(['"])([^'"\r\n]+)\1/g;
const vietnamesePattern = /[ÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴàáảãạâầấẩẫậăằắẳẵặđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/;

for (const filePath of sourceFiles) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  for (const match of sourceText.matchAll(translationCallPattern)) {
    const tail = sourceText.slice((match.index || 0) + match[0].length);
    if (/^\s*\+/.test(tail)) continue;
    const key = match[2];
    const locations = usedKeys.get(key) || [];
    locations.push(path.relative(root, filePath));
    usedKeys.set(key, locations);
  }
  if (filePath.endsWith('.tsx')) {
    const count = sourceText.split(/\r?\n/).filter((line) => vietnamesePattern.test(line)).length;
    if (count) {
      const relativePath = path.relative(root, filePath);
      hardcodedVietnamese.push([relativePath, count]);
      const hasLocaleBridge = /useTranslation|isVietnamese|locale\s*===?\s*['"]vi['"]|localize\s*\(/.test(sourceText);
      if (!hasLocaleBridge) filesWithoutLocaleBridge.push([relativePath, count]);
    }
  }
}

const missingUsedKeys = [...usedKeys.keys()].filter((key) => !enKeys.has(key) || !viKeys.has(key));
if (missingUsedKeys.length) {
  errors.push(`Khóa t(...) chưa có đủ bản dịch: ${missingUsedKeys.sort().join(', ')}`);
}

hardcodedVietnamese.sort((a, b) => b[1] - a[1]);
filesWithoutLocaleBridge.sort((a, b) => b[1] - a[1]);
console.log(`i18n: ${enKeys.size} khóa đồng bộ Việt–Anh; ${usedKeys.size} khóa đang được gọi trực tiếp.`);
console.log(`Phạm vi nội dung: ${hardcodedVietnamese.length} tệp TSX chứa tiếng Việt; ${filesWithoutLocaleBridge.length} tệp chưa kết nối cơ chế chọn ngôn ngữ.`);
if (filesWithoutLocaleBridge.length) {
  console.log('Các tệp chưa kết nối cơ chế chọn ngôn ngữ cần ưu tiên:');
  for (const [filePath, count] of filesWithoutLocaleBridge.slice(0, 10)) console.log(`- ${filePath}: ${count} dòng tiếng Việt`);
}

if (errors.length) {
  console.error('\nKiểm tra i18n không đạt:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Kiểm tra i18n đạt: không thiếu khóa, không trùng khóa và placeholder khớp.');
}
