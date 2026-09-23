import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_IMAGE_PATH = 'C:/Users/Xuan Hoang/.gemini/antigravity/brain/486aa943-ab27-4419-afc7-ae30e3a527f2/.user_uploaded/media_1790147953403.png';

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
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(i => i.buffer)]);
}

async function run() {
  console.log('Verifying source image at:', SOURCE_IMAGE_PATH);
  if (!fs.existsSync(SOURCE_IMAGE_PATH)) {
    throw new Error('Source file not found: ' + SOURCE_IMAGE_PATH);
  }

  // Read original 1024x1024
  const originalBuffer = fs.readFileSync(SOURCE_IMAGE_PATH);

  // Trim transparent borders around the logo
  const trimmed = await sharp(originalBuffer).trim().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  console.log('Trimmed dimensions:', trimmedMeta.width, 'x', trimmedMeta.height);

  // For small favicons (16, 32, 48, 64), use trimmed with 6% margin for maximum legibility in tabs
  // For medium/large icons (180, 192, 512, 1024), use 8% margin for balanced padding
  async function makeIcon(size, marginRatio = 0.08) {
    const innerSize = Math.round(size * (1 - marginRatio * 2));
    const resizedInner = await sharp(trimmed)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedInner, gravity: 'center' }])
      .png()
      .toBuffer();
  }

  const [b16, b32, b48, b64] = await Promise.all([
    makeIcon(16, 0.04),
    makeIcon(32, 0.05),
    makeIcon(48, 0.06),
    makeIcon(64, 0.06),
  ]);

  const [b180, b192, b512, b1024] = await Promise.all([
    makeIcon(180, 0.08),
    makeIcon(192, 0.08),
    makeIcon(512, 0.08),
    makeIcon(1024, 0.08),
  ]);

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
    { width: 64, height: 64, buffer: b64 },
  ]);

  // Create SVG that embeds the 512x512 crisp PNG as base64
  const b512Base64 = b512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${b512Base64}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>
`;

  // Write to public/
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('public/favicon-16x16.png', b16);
  fs.writeFileSync('public/favicon-32x32.png', b32);
  fs.writeFileSync('public/apple-touch-icon.png', b180);
  fs.writeFileSync('public/icon-192.png', b192);
  fs.writeFileSync('public/icon.png', b512);
  fs.writeFileSync('public/logo.png', b512);
  fs.writeFileSync('public/costack-logo.png', b1024);
  fs.writeFileSync('public/icon.svg', svgContent);

  // Write to src/app/
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);
  fs.writeFileSync('src/app/icon.png', b512);
  fs.writeFileSync('src/app/apple-icon.png', b180);
  fs.writeFileSync('src/app/icon.svg', svgContent);

  console.log('✓ All Costack icon and logo assets successfully generated!');
}

run().catch(err => {
  console.error('Asset generation error:', err);
  process.exit(1);
});
