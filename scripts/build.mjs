import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const cfg = JSON.parse(await fs.readFile(path.join(root, 'site.config.json'), 'utf8'));
function inferGitHubPagesUrl() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !repository.includes('/')) return '';

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return '';

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io/`;
  }
  return `https://${owner}.github.io/${repo}/`;
}

const siteUrl = process.env.SITE_URL || inferGitHubPagesUrl() || cfg.siteUrl;

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
await fs.cp(path.join(root, 'public'), dist, { recursive: true });
await fs.cp(path.join(root, 'src'), path.join(dist, 'assets'), { recursive: true });

let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
html = html
  .replaceAll('./src/styles.css', './assets/styles.css')
  .replaceAll('./src/app.js', './assets/app.js')
  .replaceAll('__SITE_URL__', siteUrl.replace(/\/$/, ''));
await fs.writeFile(path.join(dist, 'index.html'), html);

let manifest = await fs.readFile(path.join(root, 'public', 'manifest.webmanifest'), 'utf8');
manifest = manifest.replaceAll('__BASE_PATH__', './');
await fs.writeFile(path.join(dist, 'manifest.webmanifest'), manifest);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/$/, '')}/sitemap.xml\n`;
await fs.writeFile(path.join(dist, 'robots.txt'), robots);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl.replace(/\/$/, '')}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`;
await fs.writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await fs.writeFile(path.join(dist, '.nojekyll'), '');

console.log(`Built ScamScent to ${dist}`);
console.log(`SITE_URL=${siteUrl}`);
