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
import { indexText } from './lib/index-data.mjs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://historyramble.org';
const SITE_NAME = '循史漫记';
const SITE_DESC = '历史学的读书笔记与专题研究：文章、专题、史料、人物与书单。';
const OG_IMAGE = `${SITE}/images/og-default.png`;

/* ---------- 读取数据 ---------- */
const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const data = vm.runInNewContext(
  dataSrc + ';({articles, snippets, biographies, research})'
);

/* ---------- 生成列表页精简数据集 ---------- */
fs.writeFileSync(path.join(ROOT, 'js', 'data-index.js'), indexText(dataSrc), 'utf8');

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
  ['tools.html', '工具'],
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
  const GAMES = [
    ['chess.html', '中国象棋'],
    ['chess-korean.html', '朝鲜象棋'],
    ['gomoku.html', '五子棋'],
  ];
  const isGame = GAMES.some(([href]) => href === active);
  const gameItems = GAMES.map(
    ([href, label]) =>
      `                    <a href="${prefix}${href}"${href === active ? ' class="active" aria-current="page"' : ''}>${label}</a>`
  ).join('\n');
  items.splice(
    idx,
    0,
    `            <div class="nav-dropdown">
                <a href="${prefix}chess.html" class="dropbtn${isGame ? ' active' : ''}" aria-haspopup="true" aria-expanded="false">闲暇</a>
                <div class="dropdown-content">
${gameItems}
                </div>
            </div>`
  );
  return items.join('\n');
};

const headerHtml = (prefix, active) => `<header>
    <div class="header-inner">
        <input type="checkbox" id="navToggle" class="nav-toggle" aria-label="展开导航菜单">
        <label for="navToggle" class="nav-toggle-label" aria-hidden="true"><span></span></label>
        <div class="site-title"><a href="${prefix}index.html">${SITE_NAME}</a> <small>历史学读书与思考</small></div>
        <nav aria-label="主导航">
${navHtml(prefix, active)}
        </nav>
        <a class="header-search${active === 'search.html' ? ' active' : ''}" href="${prefix}search.html" aria-label="站内搜索" title="站内搜索">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"></circle><line x1="15.5" y1="15.5" x2="21" y2="21"></line></svg>
        </a>
    </div>
</header>`;

const footerHtml = () => `<footer>
    <div class="wrapper">
        <p>© 2026 ${SITE_NAME} · 读书笔记与史学随笔 · <a href="tags.html">标签索引</a> · <a href="subscribe.html">订阅</a></p>
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
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${SITE_NAME}：以史的眼光，看人间事">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${OG_IMAGE}">
<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} · 文章" href="${SITE}/feed.xml">
<meta name="theme-color" content="#2c2416">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n` : ''}<link rel="stylesheet" href="${prefix}css/style.css">
<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">
</head>
<body>

<a class="skip-link" href="#main-content">跳到正文</a>

${headerHtml(prefix, active)}

<main id="main-content">
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

const timeHtml = (date) => (date ? `<time datetime="${date}">${date}</time>` : '');

const breadcrumbHtml = (listLabel, listPage, title) => `
            <nav class="breadcrumb" aria-label="面包屑">
                <a href="../index.html">首页</a>
                <span aria-hidden="true">/</span>
                <a href="../${listPage}">${listLabel}</a>
                <span aria-hidden="true">/</span>
                <span>${esc(stripTags(title))}</span>
            </nav>`;

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
                ${timeHtml(a.date)}
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
                ${timeHtml(s.date)}
                ${tagsHtml(s.tags)}
            </div>
            <blockquote class="snippet-quote">${s.excerpt}</blockquote>
            <div class="snippet-commentary">${s.commentary}</div>`,
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
                ${timeHtml(r.date)}
                ${tagsHtml(r.tags)}
            </div>
            <div class="article-body">${r.content}</div>`,
  },
];

let generated = 0;
const sitemapUrls = [];

// 跨栏目索引：给详情页生成「相关阅读」
const ALL_ITEMS = [];
for (const c of collections) {
  for (const item of c.list) {
    ALL_ITEMS.push({
      coll: c.key,
      dir: c.dir,
      label: c.listLabel,
      id: item.id,
      title: stripTags(item.title),
      tags: item.tags || [],
      date: item.date || '',
    });
  }
}

const relatedHtml = (item, collKey) => {
  const tags = new Set(item.tags || []);
  if (!tags.size) return '';
  const scored = ALL_ITEMS.filter((x) => !(x.coll === collKey && x.id === item.id))
    .map((x) => ({ x, score: x.tags.filter((t) => tags.has(t)).length }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score || b.x.date.localeCompare(a.x.date) || a.x.title.localeCompare(b.x.title))
    .slice(0, 4);
  if (!scored.length) return '';
  return `
            <aside class="related">
                <h2 class="related-title">相关阅读</h2>
                <ul>
${scored
  .map(
    (o) =>
      `                    <li><a href="../${o.x.dir}/${o.x.id}.html">${esc(o.x.title)}</a><span class="related-label">${o.x.label}</span></li>`
  )
  .join('\n')}
                </ul>
            </aside>`;
};

for (const c of collections) {
  const list = [...c.list].sort(c.sort);
  list.forEach((item, i) => {
    const url = `${SITE}/${c.dir}/${item.id}.html`;
    const desc = clip(item.summary || item.commentary || item.content || item.excerpt);
    const body =
      breadcrumbHtml(c.listLabel, c.listPage, item.title) +
      c.render(item) +
      `
            <div class="post-footer">
                <a href="../${c.listPage}">← 返回${c.listLabel}列表</a>
            </div>${prevNext(list, i, '../', c.dir)}${relatedHtml(item, c.key)}`;

    const itemLd = {
      '@type': c.key === 'snippets' ? 'Quotation' : 'Article',
      headline: stripTags(item.title),
      description: desc,
      url,
      mainEntityOfPage: url,
      image: [OG_IMAGE],
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE}/` },
      ...(item.date ? { datePublished: item.date, dateModified: item.date } : {}),
      author: item.author
        ? { '@type': 'Person', name: stripTags(item.author) }
        : { '@type': 'Organization', name: SITE_NAME, url: `${SITE}/` },
    };
    const ld = {
      '@context': 'https://schema.org',
      '@graph': [
        itemLd,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: c.listLabel, item: `${SITE}/${c.listPage}` },
            { '@type': 'ListItem', position: 3, name: stripTags(item.title), item: url },
          ],
        },
      ],
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

/* ---------- 标签索引页 ---------- */
const KIND_BY_KEY = { articles: '文章', research: '专题', snippets: '史料', biographies: '人物' };
const tagIndex = new Map();
for (const c of collections) {
  for (const item of c.list) {
    for (const t of item.tags || []) {
      if (!t) continue;
      if (!tagIndex.has(t)) tagIndex.set(t, []);
      tagIndex.get(t).push({
        kind: KIND_BY_KEY[c.key],
        dir: c.dir,
        id: item.id,
        title: stripTags(item.title),
        date: item.date || item.period || '',
      });
    }
  }
}

const tagSorted = [...tagIndex.entries()].sort(
  (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh')
);
const TAG_SECTION_MIN = 3;
const totalTagged = tagSorted.reduce((n, entry) => n + entry[1].length, 0);

const tagCloud = tagSorted
  .map(([t, items]) => {
    const single = items.length === 1 ? items[0] : null;
    const href = single
      ? `${single.dir}/${single.id}.html`
      : items.length >= TAG_SECTION_MIN
        ? `#tag-${encodeURIComponent(t)}`
        : `search.html?q=${encodeURIComponent(t)}`;
    const titleAttr = single ? ` title="${esc(single.title)}"` : '';
    return `<a href="${href}" class="tag"${titleAttr}>${esc(t)}<span class="tag-count">${items.length}</span></a>`;
  })
  .join('\n');

const tagSections = tagSorted
  .filter(([, items]) => items.length >= TAG_SECTION_MIN)
  .map(([t, items]) => {
    const rows = items
      .map(
        (it) =>
          `<li><span class="tag-kind">${it.kind}</span><a href="${it.dir}/${it.id}.html">${esc(it.title)}</a><span class="tag-date">${esc(it.date)}</span></li>`
      )
      .join('\n');
    return `<section class="tag-section" id="tag-${encodeURIComponent(t)}">
            <h2>${esc(t)}<span class="series-count">${items.length} 篇</span></h2>
            <ul class="tag-entries">
${rows}
            </ul>
        </section>`;
  })
  .join('\n');

write(
  'tags.html',
  page({
    title: '标签索引',
    desc: `按标签浏览${SITE_NAME}的文章、专题、史料与人物小传，共 ${tagSorted.length} 个标签。`,
    url: `${SITE}/tags.html`,
    prefix: '',
    active: '',
    type: 'website',
    ld: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '标签索引',
      url: `${SITE}/tags.html`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE}/` },
      image: [OG_IMAGE],
    },
    body: `<h1>标签索引</h1>
            <p class="page-lead">共 ${tagSorted.length} 个标签。点标签跳到对应的条目列表；条目较少的标签会用站内搜索打开。</p>
            <div class="tag-cloud">
${tagCloud}
            </div>
${tagSections}`,
  })
);

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
  ['tags.html', '0.5'],
  ['tools.html', '0.5'],
  ['chess.html', '0.3'],
  ['chess-korean.html', '0.3'],
  ['gomoku.html', '0.3'],
  ['about.html', '0.5'],
  ['subscribe.html', '0.4'],
];

/* 静态页的 lastmod 取站点内容里最新的日期，而不是每次构建都写成当天 */
const datedEntries = [...data.articles, ...data.snippets, ...data.research]
  .map((i) => i.date)
  .filter(Boolean)
  .sort();
const contentLastmod = datedEntries.length ? datedEntries[datedEntries.length - 1] : '2026-01-01';

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    ([p, pr]) => `  <url>
    <loc>${SITE}/${p === 'index.html' ? '' : p}</loc>
    <lastmod>${contentLastmod}</lastmod>
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

/* ---------- RSS 订阅（文章 / 专题 / 史料 混合，最新 30 条） ---------- */
const feedSource = [
  ...data.articles.map((a) => ({ kind: '文章', dir: 'articles', id: a.id, title: a.title, date: a.date, desc: a.summary })),
  ...data.research.map((r) => ({ kind: '专题', dir: 'research', id: r.id, title: r.title, date: r.date, desc: r.summary })),
  ...data.snippets.map((s) => ({ kind: '史料', dir: 'snippets', id: s.id, title: s.title, date: s.date, desc: s.excerpt })),
].filter((x) => x.date);

// 每个栏目各取最新的若干条，再按日期混排，避免某一栏目把 30 条全占满
const takePerKind = (kind, n) =>
  feedSource
    .filter((x) => x.kind === kind)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, n);

const feedItems = [...takePerKind('文章', 12), ...takePerKind('专题', 10), ...takePerKind('史料', 10)]
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  .slice(0, 30)
  .map(
    (x) => `    <item>
      <title>${esc(stripTags(x.title))}</title>
      <link>${SITE}/${x.dir}/${x.id}.html</link>
      <guid isPermaLink="true">${SITE}/${x.dir}/${x.id}.html</guid>
      <category>${x.kind}</category>
      <pubDate>${new Date(`${x.date}T08:00:00+08:00`).toUTCString()}</pubDate>
      <description>${esc(clip(x.desc, 200))}</description>
    </item>`
  )
  .join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE}/</link>
    <description>${esc(SITE_DESC)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(`${contentLastmod}T08:00:00+08:00`).toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}
  </channel>
</rss>
`;
write('feed.xml', feed);

/* ---------- 给静态资源加版本号，避免缓存错配 ---------- */
import crypto from 'node:crypto';

const hashOf = (f) =>
  crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);

const V = {
  css: hashOf('css/style.css'),
  data: hashOf('js/data.js'),
  dataIndex: hashOf('js/data-index.js'),
  main: hashOf('js/main.js'),
  search: hashOf('js/search.js'),
  hanziData: hashOf('js/hanzi-data.js'),
  hanziTool: hashOf('js/hanzi-tool.js'),
};

const stamp = (html) =>
  html
    .replace(/((?:\.\.\/)*)css\/style\.css(\?v=[0-9a-z]+)?/g, (_, p) => `${p}css/style.css?v=${V.css}`)
    .replace(/((?:\.\.\/)*)js\/data-index\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/data-index.js?v=${V.dataIndex}`)
    .replace(/((?:\.\.\/)*)js\/data\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/data.js?v=${V.data}`)
    .replace(/((?:\.\.\/)*)js\/main\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/main.js?v=${V.main}`)
    .replace(/((?:\.\.\/)*)js\/search\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/search.js?v=${V.search}`)
    .replace(/((?:\.\.\/)*)js\/hanzi-data\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/hanzi-data.js?v=${V.hanziData}`)
    .replace(/((?:\.\.\/)*)js\/hanzi-tool\.js(\?v=[0-9a-z]+)?/g, (_, p) => `${p}js/hanzi-tool.js?v=${V.hanziTool}`);

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(ROOT, f));

for (const d of ['articles', 'snippets', 'biographies', 'research']) {
  const dir = path.join(ROOT, d);
  if (fs.existsSync(dir)) {
    htmlFiles.push(...fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f)));
  }
}

let stamped = 0;
for (const f of htmlFiles) {
  const before = fs.readFileSync(f, 'utf8');
  const after = stamp(before);
  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    stamped++;
  }
}

/* ---------- 把列表页与首页的卡片预渲染成静态 HTML（不执行 JS 的抓取器也能读到内容） ---------- */
const pre = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'prerender-lists.mjs')], { stdio: 'inherit' });
if (pre.status !== 0) process.exitCode = 1;

console.log(`✓ 生成 ${generated} 个详情页`);
console.log(`✓ 生成 sitemap.xml（${staticPages.length + sitemapUrls.length} 条 URL）`);
console.log(`✓ 资源版本号 css=${V.css} data=${V.data} index=${V.dataIndex} main=${V.main}（更新 ${stamped} 个页面）`);
