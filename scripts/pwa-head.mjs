// Depois do `expo export --platform web`: transforma o site numa web app
// instalável no iPhone (Safari → Partilhar → Adicionar ao ecrã principal).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = process.env.VERCEL ? '' : '/aramea';
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const head = [
  `<link rel="manifest" href="${base}/manifest.json">`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="Araméa">',
  '<meta name="theme-color" content="#FAF6F2">',
].join('\n    ');

// viewport-fit=cover → a app respeita o "notch" do iPhone em ecrã inteiro.
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
if (!html.includes('apple-touch-icon')) html = html.replace('</head>', `    ${head}\n  </head>`);
html = html.replace('<html lang="en">', '<html lang="pt-PT">');

writeFileSync(indexPath, html);
// GitHub Pages: qualquer link direto (ex: /aramea/orders) abre a app.
writeFileSync(join(dist, '404.html'), html);
writeFileSync(join(dist, '.nojekyll'), '');
for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  if (!existsSync(join(dist, f)) && existsSync(join('public', f))) copyFileSync(join('public', f), join(dist, f));
}
console.log('PWA pronta em', dist, '—', html.includes('apple-touch-icon') ? 'meta tags OK' : 'FALHOU');

