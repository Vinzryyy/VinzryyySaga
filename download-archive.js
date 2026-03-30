import fs from 'fs';
import path from 'path';
import https from 'https';

const JSON_FILE = './x_image_urls (2).json';
const DOWNLOAD_DIR = './public/archive';

// Ensure directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const rawData = fs.readFileSync(JSON_FILE, 'utf8');
const urls = JSON.parse(rawData);

console.log(`🚀 Starting download of ${urls.length} images...`);

async function downloadImage(url, index) {
  return new Promise((resolve, reject) => {
    const filename = `img-${String(index).padStart(3, '0')}.jpg`;
    const filePath = path.join(DOWNLOAD_DIR, filename);
    
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        process.stdout.write('.'); // Progress dot
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`\n❌ Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
}

async function run() {
  for (let i = 0; i < urls.length; i++) {
    try {
      await downloadImage(urls[i], i);
      // Small delay to prevent rate limiting
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
    } catch {
      // Continue to next even if one fails
    }
  }
  console.log(`\n\n✅ Done! Check the folder: ${DOWNLOAD_DIR}`);
}

run();
