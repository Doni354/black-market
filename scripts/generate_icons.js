const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per row
  const rowSize = width * 4 + 1;
  const rawBuffer = Buffer.alloc(height * rowSize, 0);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawBuffer[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawBuffer[pixelOffset] = r;
      rawBuffer[pixelOffset + 1] = g;
      rawBuffer[pixelOffset + 2] = b;
      rawBuffer[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawBuffer);

  // Helper to create chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // Calculate CRC32
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32 implementation
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
    }
    return c ^ 0xffffffff;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0 (Deflate)
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Precompute CRC table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// BM Brand Logo Drawer (Red & Dark Zinc)
function drawBMLogo(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.42;

  // Background: dark zinc (#09090b)
  let r = 9, g = 9, b = 11, a = 255;

  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outer red glow / accent ring
  if (dist <= radius) {
    // Red badge background: #dc2626
    r = 220; g = 38; b = 38; a = 255;

    // Inner dark circle for contrast
    if (dist <= radius * 0.90) {
      r = 18; g = 18; b = 22; a = 255;
    }
  }

  // Draw stylized letter shapes: "B" (left) and "M" (right) in White (#ffffff)
  const scale = w / 100;
  const nx = (x - cx) / scale; // normalized -50 to 50
  const ny = (y - cy) / scale; // normalized -50 to 50

  // "B" on left (x from -28 to -6, y from -20 to 20)
  const inBSpine = nx >= -26 && nx <= -20 && ny >= -18 && ny <= 18;
  const inBTopBar = nx >= -20 && nx <= -8 && ny >= -18 && ny <= -13;
  const inBMidBar = nx >= -20 && nx <= -9 && ny >= -3 && ny <= 2;
  const inBBotBar = nx >= -20 && nx <= -8 && ny >= 13 && ny <= 18;
  const inBTopLoop = nx >= -10 && nx <= -6 && ny >= -18 && ny <= -2;
  const inBBotLoop = nx >= -10 && nx <= -5 && ny >= -2 && ny <= 18;

  // "M" on right (x from 4 to 28, y from -18 to 18)
  const inMLeft = nx >= 4 && nx <= 9 && ny >= -18 && ny <= 18;
  const inMRight = nx >= 23 && nx <= 28 && ny >= -18 && ny <= 18;
  // Diagonals of M
  const inMDiag1 = nx >= 9 && nx <= 16 && Math.abs((ny - (-18)) - (nx - 9) * 2) <= 3 && ny <= 0;
  const inMDiag2 = nx >= 16 && nx <= 23 && Math.abs((ny - 0) - (23 - nx) * -2) <= 3 && ny <= 0;

  if (inBSpine || inBTopBar || inBMidBar || inBBotBar || inBTopLoop || inBBotLoop || inMLeft || inMRight || inMDiag1 || inMDiag2) {
    r = 255; g = 255; b = 255; a = 255;
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, drawBMLogo));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, drawBMLogo));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPng(512, 512, drawBMLogo));

console.log('Successfully generated icon-192.png, icon-512.png, icon-maskable.png');
