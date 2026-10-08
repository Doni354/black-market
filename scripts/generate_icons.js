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

// Noury Brand Logo Drawer (Mint, Teal & Fresh Citrus)
function drawNouryLogo(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.42;

  // Background: clean light mint tint (#FAFCFB)
  let r = 250, g = 252, b = 251, a = 255;

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Mint/Teal circular base emblem (#47957F to #3D8383)
  if (dist <= radius) {
    // Subtle vertical gradient
    const t = (y - (cy - radius)) / (2 * radius);
    r = Math.round(71 + (61 - 71) * t);
    g = Math.round(149 + (131 - 149) * t);
    b = Math.round(127 + (131 - 127) * t);
    a = 255;
  }

  // Normalized coordinates: -50 to +50 from center
  const scale = w / 100;
  const nx = dx / scale;
  const ny = dy / scale;

  // Fresh Citrus Leaf on top-right: (nx: 12 to 32, ny: -35 to -15)
  // Leaf shape: distance to (22, -25) with tapered curve
  const leafDx = nx - 22;
  const leafDy = ny - (-25);
  if (leafDx * leafDx + leafDy * leafDy <= 36 && nx + ny <= 2) {
    r = 205; g = 210; b = 114; a = 255; // #CDD272
  }

  // Stylized Bold 'N' in white
  // Left vertical bar: nx in [-20, -12], ny in [-20, 20]
  const inLeftBar = nx >= -20 && nx <= -12 && ny >= -20 && ny <= 20;

  // Right vertical bar: nx in [12, 20], ny in [-20, 20]
  const inRightBar = nx >= 12 && nx <= 20 && ny >= -20 && ny <= 20;

  // Diagonal connecting bar: nx in [-18, 18], line from (-14, -18) to (14, 18)
  // Distance from point (nx, ny) to diagonal line y = (18/14)*x => 9x - 7y = 0
  const diagDist = Math.abs((18 * nx) - (14 * ny)) / Math.sqrt(18 * 18 + 14 * 14);
  const inDiag = diagDist <= 4.2 && nx >= -18 && nx <= 18 && ny >= -20 && ny <= 20;

  if (inLeftBar || inRightBar || inDiag) {
    r = 255; g = 255; b = 255; a = 255;
  }

  // Playful fresh droplet accent near bottom-right (nx: 24, ny: 18)
  const dropDx = nx - 22;
  const dropDy = ny - 18;
  if (dropDx * dropDx + dropDy * dropDy <= 12) {
    r = 205; g = 210; b = 114; a = 255; // #CDD272
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, drawNouryLogo));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, drawNouryLogo));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPng(512, 512, drawNouryLogo));

console.log('Successfully generated Noury PWA icons: icon-192.png, icon-512.png, icon-maskable.png');
