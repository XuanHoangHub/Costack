import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

await mkdir(path.join(standalone, '.next'), { recursive: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
  force: true,
});
await cp(path.join(root, 'public'), path.join(standalone, 'public'), {
  recursive: true,
  force: true,
});

console.log('Đã đóng gói public và .next/static vào standalone output.');
