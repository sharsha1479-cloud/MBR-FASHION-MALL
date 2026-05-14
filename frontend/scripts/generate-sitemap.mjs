import { writeFile } from 'node:fs/promises';

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://your-production-domain.com').replace(/\/$/, '');
const routes = ['/', '/products', '/login', '/signup'];
const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === '/' || route === '/products' ? 'daily' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : route === '/products' ? '0.9' : '0.3'}</priority>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`Generated sitemap for ${siteUrl}`);
