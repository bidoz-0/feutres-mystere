import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = process.env.PORT || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  let chemin = null;
  try { chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { /* URL invalide */ }
  const segments = chemin?.replaceAll('\\', '/').split('/').filter(Boolean) ?? [];
  // refuse "..", ".git" et tout segment caché, ainsi que l'octet nul
  if (!chemin || req.url.includes('..') || chemin.includes('\0') || segments.some((s) => s.startsWith('.'))) {
    res.writeHead(403).end('Interdit');
    return;
  }
  const fichier = resolve(join(RACINE, ...segments, chemin.endsWith('/') ? 'index.html' : ''));
  const type = TYPES[extname(fichier)];
  if (!fichier.startsWith(RACINE + sep) || !type) {
    res.writeHead(404).end('Introuvable');
    return;
  }
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': type }).end(contenu);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
