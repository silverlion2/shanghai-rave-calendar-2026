const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const files = [
  'oscar-l-mim-club.jpg',
  'oscar-l-mim-club-optimized.jpg',
  'malaa-max-shanghai.jpg',
  'malaa-max-shanghai-optimized.jpg',
  'suaner-lanv-guizhou-kitchen.jpg',
  'suaner-lanv-guizhou-kitchen-optimized.jpg',
];
(async () => {
  for (const f of files) {
    const full = path.join('assets/posters', f);
    const buf = fs.readFileSync(full);
    const magic = buf.slice(0, 4).toString('hex');
    const meta = await sharp(full).metadata();
    const stats = await sharp(full).stats();
    const mean = stats.channels.map(c => Math.round(c.mean));
    const stat = (magic === 'ffd8ffe0' || magic === 'ffd8ffe1' || magic === 'ffd8ffdb') ? 'JPEG' : (magic === '89504e47' ? 'PNG-as-JPG!' : 'OTHER');
    console.log(`${f}  magic=${magic}  ${stat}  ${meta.width}x${meta.height}  mean(rgb)=${mean.join(',')}  size=${buf.length}`);
  }
})();
