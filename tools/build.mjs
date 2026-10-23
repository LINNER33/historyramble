/**
 * 静态页生成器
 * ------------------------------------------------------------
 * 读取 js/data.js，生成：
 *   articles/<id>.html      文章详情页
 *   snippets/<id>.html      史料详情页
 *   biographies/<id>.html   人物详情页
 *   research/<id>.html      专题详情页
 *   sitemap.xml             站点地图
 *
 * 用法：node tools/build.mjs
 * 每次在 js/data.js 里增删内容后重跑一次即可。
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://historyramble.org';
const SITE_NAME = '循史漫记';

/* ---------- 读取数据 ---------- */
const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const data = vm.runInNewContext(
  dataSrc + ';({articles, snippets, biographies, research})'
);

/* ---------- 工具函数 ---------- */
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stripTags = (s = '') => String(s).replace(/<[^>]*>/g, '');

const clip = (s = '', n = 110) => {
  const t = stripTags(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

const write = (rel, content) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
};

/* ---------- 公共导航 ---------- */
const NAV = [
  ['index.html', '首页'],
  ['articles.html', '文章'],
  ['books.html', '书单'],
  ['research.html', '专题'],
  ['snippets.html', '史料'],
  ['biographies.html', '人物'],
  ['resources.html', '资源'],
  ['downloads.html', '下载'],
  ['about.html', '关于'],
];

const navHtml = (prefix, active) => {
  const items = NAV.map(
    ([href, label]) =>
      `            <a href="${prefix}${href}"${
        href === active ? ' class="active" aria-current="page"' : ''
      }>${label}</a>`
  );
  // 「闲暇」下拉插在下载和关于之间
  const idx = NAV.findIndex(([href]) => href === 'about.html');
  items.splice(
    idx,
    0,
    `            <div class="nav-dropdown">
                <a href="${prefix}chess.html" class="dropbtn" aria-haspopup="true" aria-expanded="false">闲暇</a>
                <div class="dropdown-content">
                    <a href="${prefix}chess.html">中国象棋</a>
                </div>
            </div>`
  );
  return items.join('\n');
};

const headerHtml = (prefix, active) => `<header>
    <div class="header-inner">
        <div class="site-title"><a href="${prefix}index.html">${SITE_NAME}</a> <small>历史学读书与思考</small></div>
        <nav>
${navHtml(prefix, active)}
        </nav>
    </div>
</header>`;

const footerHtml = () => `<footer>
    <div class="wrapper">
        <p>© 2026 ${SITE_NAME} · 读书笔记与史学随笔</p>
    </div>
</footer>`;

/* ---------- 单页模板 ---------- */
function page({ title, desc, url, body, prefix = '../', active = '', type = 'article', ld = null }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="zh_CN">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#2c2416">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n` : ''}<link rel="stylesheet" href="${prefix}css/style.css">
<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">
</head>
<body>

${headerHtml(prefix, active)}

<main>
    <div class="wrapper">
        <div class="article-page">
${body}
        </div>
    </div>
</main>

${footerHtml()}

</body>
</html>
`;
}

const tagsHtml = (tags = []) =>
  `<span>${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>`;

const prevNext = (list, i, prefix, dir) => {
  const newer = list[i - 1];
  const older = list[i + 1];
  const out = [];
  if (newer) out.push(`<a href="${prefix}${dir}/${newer.id}.html">← ${esc(newer.title)}</a>`);
  if (older) out.push(`<a href="${prefix}${dir}/${older.id}.html" style="text-align:right">${esc(older.title)} →</a>`);
  if (!out.length) return '';
  return `
            <div class="post-nav">
                ${out.join('\n                ')}
            </div>`;
};

/* ---------- 生成四类详情页 ---------- */
const collections = [
  {
    key: 'articles',
    dir: 'articles',
    list: data.articles,
    sort: (a, b) => b.date.localeCompare(a.date),
    listPage: 'articles.html',
    listLabel: '文章',
    render: (a) => `
            <h1>${a.title}</h1>
            <div class="article-meta">
                <span>${a.date}</span>
                <span>${a.category}</span>
                ${tagsHtml(a.tags)}
            </div>
            <div class="article-body">${a.content}</div>`,
  },
  {
    key: 'snippets',
    dir: 'snippets',
    list: data.snippets,
    sort: (a, b) => b.date.localeCompare(a.date),
    listPage: 'snippets.html',
    listLabel: '史料',
    render: (s) => `
            <h1>${s.title}</h1>
            <div class="article-meta">
                <span class="snippet-source">📜 ${s.source}</span>
                <span>${s.date}</span>
                ${tagsHtml(s.tags)}
            </div>
            <blockquote class="snippet-quote">${s.excerpt}</blockquote>
            <p class="snippet-commentary">${s.commentary}</p>`,
  },
  {
    key: 'biographies',
    dir: 'biographies',
    list: data.biographies,
    sort: (a, b) => b.id.localeCompare(a.id),
    listPage: 'biographies.html',
    listLabel: '人物',
    render: (b) => `
            <h1>${b.title}</h1>
            <div class="article-meta">
                <span>${b.period}</span>
                ${tagsHtml(b.tags)}
            </div>
            <div class="article-body">${b.content}</div>`,
  },
  {
    key: 'research',
    dir: 'research',
    list: data.research,
    sort: (a, b) => b.date.localeCompare(a.date),
    listPage: 'research.html',
    listLabel: '专题',
    render: (r) => `
            <h1>${r.title}</h1>
            <div class="article-meta">
                <span>${r.date}</span>
                ${tagsHtml(r.tags)}
            </div>
            <div class="article-body">${r.content}</div>`,
  },
];

let generated = 0;
const sitemapUrls = [];

for (const c of collections) {
  const list = [...c.list].sort(c.sort);
  list.forEach((item, i) => {
    const url = `${SITE}/${c.dir}/${item.id}.html`;
    const desc = clip(item.summary || item.commentary || item.content || item.excerpt);
    const body =
      c.render(item) +
      `
            <div class="post-footer">
                <a href="../${c.listPage}">← 返回${c.listLabel}列表</a>
            </div>${prevNext(list, i, '../', c.dir)}`;

    const ld = {
      '@context': 'https://schema.org',
      '@type': c.key === 'snippets' ? 'Quotation' : 'Article',
      headline: stripTags(item.title),
      description: desc,
      url,
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE },
      ...(item.date ? { datePublished: item.date } : {}),
      ...(item.author ? { author: { '@type': 'Person', name: stripTags(item.author) } } : {}),
    };

    write(
      `${c.dir}/${item.id}.html`,
      page({
        title: stripTags(item.title),
        desc,
        url,
        body,
        active: c.listPage,
        ld,
      })
    );
    sitemapUrls.push({ loc: url, lastmod: item.date || null });
    generated++;
  });
}

/* ---------- sitemap ---------- */
const staticPages = [
  ['index.html', '1.0'],
  ['articles.html', '0.9'],
  ['books.html', '0.8'],
  ['research.html', '0.8'],
  ['snippets.html', '0.7'],
  ['biographies.html', '0.7'],
  ['resources.html', '0.6'],
  ['downloads.html', '0.6'],
  ['chess.html', '0.3'],
  ['about.html', '0.5'],
];

const today = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    ([p, pr]) => `  <url>
    <loc>${SITE}/${p === 'index.html' ? '' : p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${pr}</priority>
  </url>`
  )
  .join('\n')}
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

write('sitemap.xml', sitemap);

console.log(`✓ 生成 ${generated} 个详情页`);
console.log(`✓ 生成 sitemap.xml（${staticPages.length + sitemapUrls.length} 条 URL）`);
