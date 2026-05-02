const Jimp      = require('jimp');
const pngToIco  = require('png-to-ico');
const fs        = require('fs');
const path      = require('path');

const INPUT  = path.join(__dirname, '../assets/icon.png');
const OUTPUT = path.join(__dirname, '../assets/icon.ico');

const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  console.log('Reading icon.png...');
  const src = await Jimp.read(INPUT);

  // Generate a PNG buffer for each required size
  const buffers = await Promise.all(
    SIZES.map(async (size) => {
      const resized = src.clone().resize(size, size, Jimp.RESIZE_NEAREST_NEIGHBOR);
      return resized.getBufferAsync(Jimp.MIME_PNG);
    })
  );

  console.log(`Converting to .ico (sizes: ${SIZES.join(', ')})...`);
  const ico = await pngToIco(buffers);
  fs.writeFileSync(OUTPUT, ico);
  console.log(`Done → assets/icon.ico (${(ico.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
