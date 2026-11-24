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
import { CHRONO_GROUPS } from './lib/chronology.mjs';
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
  dataSrc + ';({articles, snippets, biographies, research, books, resources, downloads})'
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
  // 「工具」做成下拉：繁简转换 + 中日韩年表
  const TOOLS = [
    ['tools.html', '繁简转换'],
    ['chronology.html', '中日韩年表'],
  ];
  const isTool = TOOLS.some(([href]) => href === active);
  const toolItems = TOOLS.map(
    ([href, label]) =>
      `                    <a href="${prefix}${href}"${href === active ? ' class="active" aria-current="page"' : ''}>${label}</a>`
  ).join('\n');

  const items = NAV.map(([href, label]) => {
    if (href === 'tools.html') {
      return `            <div class="nav-dropdown">
                <a href="${prefix}tools.html" class="dropbtn${isTool ? ' active' : ''}" aria-haspopup="true" aria-expanded="false">${label}</a>
                <div class="dropdown-content">
${toolItems}
                </div>
            </div>`;
    }
    return `            <a href="${prefix}${href}"${
      href === active ? ' class="active" aria-current="page"' : ''
    }>${label}</a>`;
  });
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

const footerHtml = (prefix = '') => `<footer>
    <div class="wrapper">
        <p>© 2026 ${SITE_NAME} · 读书笔记与史学随笔 · <a href="${prefix}tags.html">标签索引</a> · <a href="${prefix}subscribe.html">订阅</a></p>
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

${footerHtml(prefix)}

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
/* ---------- 正文内链 ---------- */
// 在正文段落里为「首次提到的其他条目标题」加上站内链接（不改动引文块，最多 3 条）
// 注意：ALL_ITEMS 在下方循环里才被填充，所以候选表要懒计算，不能在定义时 snapshot
let LINKABLE_TITLES = null;
function linkableTitles() {
  if (!LINKABLE_TITLES) {
    LINKABLE_TITLES = ALL_ITEMS.map((it) => ({
      dir: it.dir,
      id: it.id,
      title: String(it.title || '').replace(/[《》]/g, ''),
    }))
      .filter((it) => it.title.length >= 4)
      .sort((a, b) => b.title.length - a.title.length);
  }
  return LINKABLE_TITLES;
}

let TAG_FREQ = null;
function tagFrequency(tag) {
  if (!TAG_FREQ) {
    TAG_FREQ = new Map();
    for (const it of ALL_ITEMS) for (const t of it.tags || []) TAG_FREQ.set(t, (TAG_FREQ.get(t) || 0) + 1);
  }
  return TAG_FREQ.get(tag) || 0;
}

// 出现次数足够多的标签（这些标签在 tags.html 里一定有独立分组）
function highFreqTags() {
  tagFrequency('__init__');
  return [...TAG_FREQ.entries()]
    .filter(([, n]) => n >= 10)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
}

function linkifyBody(html, selfId, itemTags) {
  if (!html || !/<p>/.test(html)) return html;
  const used = new Set();
  const candidates = linkableTitles();
  const parts = html.split(/(<blockquote[\s\S]*?<\/blockquote>)/g);
  let joined = parts
    .map((part) => {
      if (part.startsWith('<blockquote')) return part;
      let out = part;
      for (const cand of candidates) {
        if (used.size >= 2) break;
        if (cand.id === selfId || used.has(cand.id)) continue;
        if (out.includes(`href="../${cand.dir}/${cand.id}.html"`)) continue;
        const idx = out.indexOf(cand.title);
        if (idx < 0) continue;
        // 只处理 <p> 内的首次出现，避免命中标题或已有链接文本
        const before = out.slice(0, idx);
        if (!/<p>[^<]*$/.test(before)) continue;
        out =
          out.slice(0, idx) +
          `<a href="../${cand.dir}/${cand.id}.html">${cand.title}</a>` +
          out.slice(idx + cand.title.length);
        used.add(cand.id);
      }
      return out;
    })
    .join('');

  // 再为正文补 1–2 个到标签聚合页的内链：只挑高频标签，且必须真的出现在正文里
  const tagLinks = highFreqTags().filter((t) => joined.includes(t)).slice(0, 4);
  if (tagLinks.length) {
    const segs = joined.split(/(<blockquote[\s\S]*?<\/blockquote>)/g);
    let added = 0;
    joined = segs
      .map((seg) => {
        if (seg.startsWith('<blockquote')) return seg;
        let out = seg;
        for (const tag of tagLinks) {
          if (added >= 2) break;
          const href = `../tags.html#tag-${encodeURIComponent(tag)}`;
          if (out.includes(href)) continue;
          const idx = out.indexOf(tag);
          if (idx < 0) continue;
          if (!/<p>[^<]*$/.test(out.slice(0, idx))) continue;
          // 避免把句子里已经在链接中的文字再包一层
          if (/<a [^>]*>$/.test(out.slice(0, idx))) continue;
          out =
            out.slice(0, idx) +
            `<a href="${href}">${tag}</a>` +
            out.slice(idx + tag.length);
          added += 1;
        }
        return out;
      })
      .join('');
  }
  return joined;
}

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
      linkifyBody(c.render(item), item.id, item.tags) +
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

/* ---------- 书页 ---------- */
const BOOK_DIR = 'books';
const bookStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

// 书页的「相关阅读」：在全部条目里找提到书名或作者的段落，按出现次数排序
const bookHay = [];
for (const c of collections) {
  for (const item of c.list) {
    bookHay.push({
      dir: c.dir,
      id: item.id,
      label: c.listLabel,
      title: stripTags(item.title),
      text: stripTags(
        [item.title, item.summary, item.content, item.excerpt, item.commentary, item.period]
          .filter(Boolean)
          .join(' ')
      ),
    });
  }
}

const countOccur = (hay, needle) => {
  if (!needle || needle.length < 2) return 0;
  let n = 0;
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i < 0) break;
    n += 1;
    from = i + needle.length;
  }
  return n;
};

const bookRelatedHtml = (b) => {
  const title = String(b.title || '').replace(/[《》]/g, '');
  const author = String(b.author || '');
  const scored = bookHay
    .map((x) => ({ x, score: countOccur(x.text, title) * 3 + countOccur(x.text, author) * 2 }))
    .filter((o) => o.score > 0)
    .sort((a, b2) => b2.score - a.score || a.x.title.localeCompare(b2.x.title))
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

for (const b of data.books) {
  const url = `${SITE}/${BOOK_DIR}/${b.id}.html`;
  const desc = String(b.desc || '').slice(0, 120);
  const cover = b.cover
    ? `<img src="${b.cover}" alt="${esc(b.title)}">`
    : `<span class="cover-text"><span class="cover-title">${esc(b.title)}</span><span class="cover-author">${esc(b.author)}</span></span>`;
  const body =
    breadcrumbHtml('书单', 'books.html', b.title) +
    `
            <h1>${esc(b.title)}</h1>
            <div class="book-detail">
                <div class="book-cover book-cover-lg">${cover}</div>
                <div class="book-detail-meta">
                    <p class="book-detail-author">${esc(b.author)}</p>
                    <p class="book-detail-rating" aria-label="评分 ${b.rating} 分，满分 5 分"><span aria-hidden="true">${bookStars(b.rating)}</span><span class="rating-text">${b.rating} / 5</span></p>
                    <p class="book-detail-desc">${esc(b.desc)}</p>
                </div>
            </div>
            <div class="post-footer">
                <a href="../books.html">← 返回书单</a>
            </div>${bookRelatedHtml(b)}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Book',
        name: stripTags(b.title),
        author: { '@type': 'Person', name: stripTags(b.author) },
        description: desc,
        url,
        inLanguage: 'zh-CN',
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: '书单', item: `${SITE}/books.html` },
          { '@type': 'ListItem', position: 3, name: stripTags(b.title), item: url },
        ],
      },
    ],
  };

  write(
    `${BOOK_DIR}/${b.id}.html`,
    page({
      title: stripTags(b.title),
      desc,
      url,
      body,
      active: 'books.html',
      type: 'book',
      ld,
    })
  );
  sitemapUrls.push({ loc: url, lastmod: null });
  generated++;
}

/* ---------- 专题系列入口页 ---------- */
const TANG_TAGS = ['唐与高句丽', '唐丽战争'];
const TANG_TAGS_WIDE = ['唐与高句丽', '唐丽战争', '高句丽', '唐代', '新罗', '百济', '隋与高句丽'];

const inTangSeries = (item, wide = false) =>
  (item.tags || []).some((t) => (wide ? TANG_TAGS_WIDE : TANG_TAGS).includes(t));

function seriesCardHtml(dir, item, label) {
  const meta = item.date ? timeHtml(item.date) : esc(item.period || '');
  return `
            <div class="article-card">
                <h3><a href="${dir}/${item.id}.html">${esc(item.title)}</a></h3>
                <div class="article-meta"><span>${meta}</span><span class="tag">${label}</span></div>
                <p>${esc(item.summary || item.excerpt || '')}</p>
                <a href="${dir}/${item.id}.html" class="read-more">阅读全文 →</a>
            </div>`;
}

function buildTangSeriesPage() {
  const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  const researchList = data.research.filter((it) => inTangSeries(it)).sort(byDate);
  const snippetList = data.snippets.filter((it) => inTangSeries(it, true)).sort(byDate);
  const articleList = data.articles.filter((it) => inTangSeries(it, true)).sort(byDate);
  const bioList = data.biographies.filter((it) => inTangSeries(it, true)).reverse();

  const section = (title, desc, items, dir, label) =>
    items.length
      ? `<section class="series-section">
            <h2 class="series-title">${title}<span class="series-count">${items.length} 篇</span></h2>
            <p class="series-desc">${desc}</p>
            <div class="article-list">
${items.map((it) => seriesCardHtml(dir, it, label)).join('\n')}
            </div>
        </section>`
      : '';

  const body = `
            <h1 class="section-title">隋唐与高句丽战争研究</h1>
            <p class="page-lead">七世纪前后，隋唐两代先后与高句丽、百济、新罗在辽东与朝鲜半岛反复交锋。这个系列把站内相关的专题、史料、文章与人物聚在一处，方便按线索读下去。</p>
            <p class="page-lead">建议的读法：先看专题里的脉络梳理，再回到原始史料对照原文，最后读人物与背景文章，理解当时的人如何决策与记述。</p>
            <p class="series-jump">按栏目浏览：<a href="research.html">专题研究</a> · <a href="snippets.html">史料</a> · <a href="articles.html">文章</a> · <a href="biographies.html">人物</a></p>
${section('专题研究', '围绕战役、制度、后勤与外交的专题梳理，按写作时间倒序。', researchList, 'research', '专题')}
${section('史料', '原始记载与按语，可与专题对读。', snippetList, 'snippets', '史料')}
${section('文章', '相关背景与史学方法的讨论。', articleList, 'articles', '文章')}
${section('人物', '当事人、将领与研究者。', bioList, 'biographies', '人物')}`;

  const url = `${SITE}/series-tang-goguryeo.html`;
  write(
    'series-tang-goguryeo.html',
    page({
      title: '隋唐与高句丽战争研究',
      desc: '隋唐与高句丽战争研究的专题索引：战役、制度、后勤、外交的研究与原始史料，附相关文章与人物。',
      url,
      body,
      prefix: '',
      active: 'research.html',
      type: 'series',
      ld: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: '隋唐与高句丽战争研究',
            description: '隋唐与高句丽战争研究的专题、史料、文章与人物索引。',
            url,
            inLanguage: 'zh-CN',
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE}/` },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` },
              { '@type': 'ListItem', position: 2, name: '专题研究', item: `${SITE}/research.html` },
              { '@type': 'ListItem', position: 3, name: '隋唐与高句丽战争研究', item: url },
            ],
          },
        ],
      },
    })
  );
  sitemapUrls.push({ loc: url, lastmod: null });
  generated++;
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

const multiTagCloud = tagSorted
  .filter(([, items]) => items.length >= 2)
  .map(([t, items]) => {
    const href =
      items.length >= TAG_SECTION_MIN
        ? `#tag-${encodeURIComponent(t)}`
        : `search.html?q=${encodeURIComponent(t)}`;
    return `<a href="${href}" class="tag">${esc(t)}<span class="tag-count">${items.length}</span></a>`;
  })
  .join('\n');

// 只出现一次的标签：单独折叠，且不再逐个做成链接（正文里只内链高频标签，这些用不到）
const singleTags = tagSorted.filter(([, items]) => items.length === 1);
const singleTagCloud = singleTags
  .map(([t, items]) => {
    const it = items[0];
    return `<a href="${it.dir}/${it.id}.html" class="tag tag-single" title="${esc(it.title)}">${esc(t)}</a>`;
  })
  .join('\n');

const tagCloud =
  multiTagCloud +
  (singleTags.length
    ? `
<details class="tag-more">
    <summary>只出现过一次的标签（${singleTags.length} 个）</summary>
    <div class="tag-cloud tag-cloud-single">
${singleTagCloud}
    </div>
</details>`
    : '');

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

/* ---------- 中日韩年表 ---------- */
const chronoCell = (c) => {
  if (!c) return '<td class="chrono-empty">—</td>';
  const parts = [];
  if (c.polity) parts.push(`<div class="chrono-polity">${esc(c.polity)}</div>`);
  if (c.rulers && c.rulers.length)
    parts.push(`<ul class="chrono-rulers">${c.rulers.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`);
  if (c.eras && c.eras.length)
    parts.push(`<p class="chrono-eras">年号：${c.eras.map((e) => esc(e)).join(' · ')}</p>`);
  if (c.events && c.events.length)
    parts.push(`<ul class="chrono-events">${c.events.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`);
  return `<td>${parts.join('\n')}</td>`;
};

const buildChronologyPage = () => {
  // 整页只出一张表：所有分组按时间顺序铺平成行，分组名放进「时间」列的副行
  const allRows = CHRONO_GROUPS.flatMap((g) =>
    g.rows.map((r) => ({ ...r, group: g.title, note: g.note }))
  );
  const rows = allRows
    .map(
      (r) => `                        <tr><th scope="row" class="chrono-period"><span class="chrono-period-group"${r.note ? ` title="${esc(r.note)}"` : ''}>${esc(r.group)}</span><span class="chrono-period-date">${esc(r.period)}</span></th>${chronoCell(r.cn)}${chronoCell(r.kr)}${chronoCell(r.jp)}</tr>`
    )
    .join('\n');

  const body = `
    <div class="wrapper wrapper-wide">
        <h1 class="section-title">中日韩年表</h1>
        <h2 class="visually-hidden">中日韩历史年表</h2>
        <p class="page-lead">以中国朝代为主轴，同一时期并列朝鲜半岛与日本的政权、在位君主、年号与重要事件。年代以通行说法为准，标「约」者为约数，学界有争议处已在相应位置注明。</p>
        <div class="chrono-scroll">
            <table class="chrono-table">
                <thead>
                    <tr><th scope="col">时间</th><th scope="col">中国</th><th scope="col">朝鲜半岛</th><th scope="col">日本</th></tr>
                </thead>
                <tbody>
${rows}
                </tbody>
            </table>
        </div>
    </div>`;

  write(
    'chronology.html',
    page({
      title: '中日韩年表',
      desc: '中日韩三国从上古到当代的对照年表：中国朝代与帝王年号、朝鲜半岛政权与君主、日本时代与天皇年号，并列重要历史事件。',
      url: `${SITE}/chronology.html`,
      body,
      prefix: '',
      active: 'chronology.html',
    })
  );
};

buildChronologyPage();

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
  ['chronology.html', '0.5'],
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

buildTangSeriesPage();

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
