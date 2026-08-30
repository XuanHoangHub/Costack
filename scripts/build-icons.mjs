import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_IMAGE_PATH = 'C:/Users/Xuan Hoang/.gemini/antigravity/brain/6879b875-0085-493e-80df-35cf33a9c61e/.user_uploaded/media_1787997535344.png';

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(images.length, 4); // count

  let offset = 6 + (images.length * 16);
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(i => i.buffer)]);
}

async function main() {
  console.log('Reading source image from:', SOURCE_IMAGE_PATH);
  if (!fs.existsSync(SOURCE_IMAGE_PATH)) {
    throw new Error('Source logo image not found at ' + SOURCE_IMAGE_PATH);
  }

  // Trim transparent borders
  const trimmedBuffer = await sharp(SOURCE_IMAGE_PATH).trim().toBuffer();

  // Create square renders with transparent padding if needed
  const [b512, b192, b180, b64, b48, b32, b16] = await Promise.all([
    sharp(trimmedBuffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(trimmedBuffer).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  ]);

  // Create multi-resolution ICO file
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
    { width: 64, height: 64, buffer: b64 },
  ]);

  // Output files to public/
  fs.writeFileSync('public/icon.png', b512);
  fs.writeFileSync('public/icon-192.png', b192);
  fs.writeFileSync('public/apple-touch-icon.png', b180);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('public/favicon-32x32.png', b32);
  fs.writeFileSync('public/favicon-16x16.png', b16);
  fs.writeFileSync('public/logo.png', b512);
  fs.writeFileSync('public/apexa-logo.png', b512);

  // Output files to src/app/
  fs.writeFileSync('src/app/icon.png', b512);
  fs.writeFileSync('src/app/apple-icon.png', b180);
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);

  // SVG representation for modern vector icons
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="apexaBlueBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <!-- Squircle Base Canvas -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#apexaBlueBg)" />
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#specularGlow)" />

  <!-- Inner Delicate Rim -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.45" />

  <!-- Official Apexa Symbol: Outer A Chevron -->
  <path
    d="M 256 82 L 384 422 L 332 400 L 256 232 L 180 400 L 128 422 Z"
    fill="#ffffff"
  />

  <!-- Official Apexa Symbol: Inner Apex Arrow -->
  <polygon
    points="256,252 305,400 256,364 207,400"
    fill="#ffffff"
  />
</svg>`;

  fs.writeFileSync('public/icon.svg', svgContent);
  fs.writeFileSync('src/app/icon.svg', svgContent);
  fs.writeFileSync('public/apexa-ai-icon.svg', svgContent);

  console.log('✓ All favicon and icon assets generated successfully!');
}

main().catch(err => {
  console.error('Build icons error:', err);
  process.exit(1);
});
