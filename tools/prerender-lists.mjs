/**
 * 把列表页/首页的卡片预渲染成静态 HTML，让不执行 JavaScript 的抓取器也能读到内容。
 * 页面加载后 js/main.js 会按同样的规则重新渲染（内容一致，视觉无缝）。
 * 用法：node tools/prerender-lists.mjs（一般由 tools/build.mjs 末尾自动调用）
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') +
    ';({articles, research, snippets, biographies, books, resources, downloads, historyBooks, paperDownloads})'
);

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const countLine = (total, unit, shown) =>
  '<p class="section-count">共 ' + total + ' ' + unit + (shown < total ? '，下面列出最新 ' + shown + ' ' + unit : '') + '</p>';
// 首页只做摘要，统计行不再重复“下面列出最新 N 篇”
const homeCount = (total, unit) => '<p class="section-count">共 ' + total + ' ' + unit + '</p>';
const tagHtml = (tags) => (tags || []).map((t) => '<span class="tag">' + t + '</span>').join('');
const byDateDesc = (arr) => [...arr].sort((a, b) => String(b.date).localeCompare(String(a.date)));

function articleCard(a, dir) {
  return `<div class="article-card">
                <h3><a href="${dir}/${a.id}.html">${a.title}</a></h3>
                <div class="article-meta">
                    <span><time datetime="${a.date}">${a.date}</time></span>${
                      a.category ? `<span>${a.category}</span>` : ''
                    }
                    <span>${tagHtml(a.tags)}</span>
                </div>
                <p>${a.summary}</p>
            </div>`;
}

function snippetCard(s) {
  const firstP = (String(s.commentary).match(/<p>[\s\S]*?<\/p>/) || [s.commentary])[0];
  return `<div class="snippet-card" id="${s.id}">
                <h3><a href="snippets/${s.id}.html">${s.title}</a></h3>
                <div class="snippet-meta">
                    <span class="snippet-source">📜 ${s.source}</span>
                    <span>${s.date}</span>
                    <span>${tagHtml(s.tags)}</span>
                </div>
                <blockquote class="snippet-quote">${s.excerpt}</blockquote>
                <div class="snippet-commentary">${firstP}</div>
                <a href="snippets/${s.id}.html" class="read-more">阅读全文 →</a>
            </div>`;
}

function bioCard(b) {
  return `<div class="bio-card" id="${b.id}">
                <h3><a href="biographies/${b.id}.html">${b.title}</a></h3>
                <div class="bio-meta">
                    <span>${b.period}</span>
                    <span>${tagHtml(b.tags)}</span>
                </div>
                <p class="bio-summary">${b.summary}</p>
                <a href="biographies/${b.id}.html" class="read-more">阅读全文 →</a>
            </div>`;
}

function bookCard(b) {
  const cover = b.cover
    ? `<img src="${b.cover}" alt="${b.title}">`
    : `<span class="cover-text"><span class="cover-title">${b.title}</span><span class="cover-author">${b.author}</span></span>`;
  return `<div class="book-card">
                <div class="book-cover">${cover}</div>
                <div class="book-info">
                    <h3><a href="books/${b.id}.html">${b.title}</a></h3>
                    <div class="book-author">${b.author}</div>
                    <div class="book-rating" aria-label="评分 ${b.rating} 分，满分 5 分"><span aria-hidden="true">${stars(b.rating)}</span></div>
                    <div class="book-desc">${b.desc}</div>
                </div>
            </div>`;
}

function bookItem(b) {
  return `<div class="book-item">
                <h3><a href="books/${b.id}.html">${b.title}</a></h3>
                <div class="article-meta">
                    <span>${b.author}</span>
                    <span class="book-rating" aria-label="评分 ${b.rating} 分，满分 5 分"><span aria-hidden="true">${stars(b.rating)}</span></span>
                </div>
                <p>${b.desc}</p>
            </div>`;
}

function resourceGroup(r) {
  const items = r.items
    .map((it) => {
      const link = it.url
        ? `<a href="${it.url}" target="_blank" rel="noopener">${it.name} ↗</a>`
        : `<span>${it.name}</span>`;
      return `<div class="resource-item"><div class="resource-name">${link}</div><div class="resource-desc">${it.desc || ''}</div></div>`;
    })
    .join('');
  return `<div class="resource-group"><h3 class="resource-category">${r.category}</h3><div class="resource-list">${items}</div></div>`;
}

function downloadCard(d) {
  const icon = d.category === '书籍' ? '📖' : '📄';
  return `<div class="download-card">
                <div class="download-icon">${icon}</div>
                <div class="download-info">
                    <h3>${d.title}</h3>
                    <div class="download-meta">
                        <span class="download-author">${d.author}</span>
                        <span class="download-category">${d.category}</span>
                        ${d.size ? `<span class="download-size">${d.size}</span>` : ''}
                    </div>
                    <p class="download-desc">${d.desc}</p>
                    <a class="download-btn" href="${d.link}" target="_blank" rel="noopener">前往下载 →</a>
                </div>
            </div>`;
}

const RESEARCH_SERIES = [
  { key: 'tang', name: '隋唐与高句丽战争研究', tags: ['唐与高句丽', '唐丽战争'] },
  { key: 'hist', name: '史学史与史料', tags: ['史学史', '学术史', '学术制度', '知识史', '疑古', '甲骨', '出土文献', '史料'] },
  {
    key: 'eastasia',
    name: '东北亚与欧亚交流',
    tags: ['边疆', '渤海', '契丹', '北方民族', '靺鞨', '东亚史', '日本史', '粟特', '丝绸之路', '全球贸易', '白银'],
  },
];
const seriesOf = (r) => {
  const tags = r.tags || [];
  return RESEARCH_SERIES.find((s) => tags.some((t) => s.tags.includes(t))) || { key: 'other', name: '其他专题' };
};
const MODERN_PERIOD = /近代|现代|19世纪|20世纪|21世纪|民国|当代/;

function researchHtml() {
  const list = byDateDesc(data.research);
  const order = ['tang', 'eastasia', 'hist', 'other'];
  const groups = {};
  for (const r of list) {
    const s = seriesOf(r);
    (groups[s.key] = groups[s.key] || { name: s.name, items: [] }).items.push(r);
  }
  let html = countLine(data.research.length, '篇', list.length);
  for (const key of order) {
    const g = groups[key];
    if (!g || !g.items.length) continue;
    html += `<section class="series-block"><h3 class="series-title">${g.name}<span class="series-count">${g.items.length} 篇</span></h3>`;
    html += g.items.map((r) => articleCard(r, 'research')).join('\n');
    html += '</section>';
  }
  return html;
}

function bioHtml() {
  const list = [...data.biographies].reverse();
  const groups = [
    { name: '历史人物', desc: '古代与前近代的帝王、将领、使臣与文人', items: [] },
    { name: '研究学者', desc: '近现代以历史研究为业的中外学者', items: [] },
  ];
  for (const b of list) groups[MODERN_PERIOD.test(b.period || '') ? 1 : 0].items.push(b);
  let html = countLine(data.biographies.length, '篇', list.length);
  for (const g of groups) {
    if (!g.items.length) continue;
    html += `<section class="series-block"><h3 class="series-title">${g.name}<span class="series-count">${g.items.length} 篇</span></h3>`;
    html += `<p class="series-desc">${g.desc}</p>`;
    html += g.items.map(bioCard).join('\n');
    html += '</section>';
  }
  return html;
}

const targets = [
  ['index.html', 'homeArticles', () => homeCount(data.articles.length, '篇') + byDateDesc(data.articles).slice(0, 5).map((a) => articleCard(a, 'articles')).join('\n')],
  ['index.html', 'homeBooks', () => homeCount(data.books.length, '本') + [...data.books].reverse().slice(0, 4).map(bookItem).join('\n')],
  ['index.html', 'homeSnippets', () => homeCount(data.snippets.length, '条') + byDateDesc(data.snippets).slice(0, 2).map(snippetCard).join('\n')],
  ['index.html', 'homeBiographies', () => homeCount(data.biographies.length, '篇') + [...data.biographies].reverse().slice(0, 2).map(bioCard).join('\n')],
  ['index.html', 'homeResearch', () => homeCount(data.research.length, '篇') + byDateDesc(data.research).slice(0, 3).map((r) => articleCard(r, 'research')).join('\n')],
  ['index.html', 'homeResources', () => homeCount(data.resources.length, '组') + data.resources.slice(0, 2).map(resourceGroup).join('')],
  ['index.html', 'homeDownloads', () => homeCount(data.downloads.length, '项') + data.downloads.slice().reverse().slice(0, 3).map(downloadCard).join('')],
  ['articles.html', 'allArticles', () => countLine(data.articles.length, '篇', data.articles.length) + byDateDesc(data.articles).map((a) => articleCard(a, 'articles')).join('\n')],
  ['research.html', 'allResearch', researchHtml],
  ['snippets.html', 'allSnippets', () => countLine(data.snippets.length, '条', data.snippets.length) + byDateDesc(data.snippets).map(snippetCard).join('\n')],
  ['biographies.html', 'allBiographies', bioHtml],
  ['books.html', 'allBooks', () => countLine(data.books.length, '本', data.books.length) + [...data.books].reverse().map(bookCard).join('\n')],
  ['resources.html', 'allResources', () => countLine(data.resources.length, '组', data.resources.length) + data.resources.map(resourceGroup).join('')],
  ['downloads.html', 'allDownloads', () => countLine(data.downloads.length, '项', data.downloads.length) + data.downloads.slice().reverse().map(downloadCard).join('')],
];

/** 找到 id=id 的容器 div 的起止位置（按 div 深度配对，卡片里也有嵌套 div） */
function locateContainer(html, id) {
  const openRe = new RegExp(`<div[^>]*\\bid="${id}"[^>]*>`);
  const m = openRe.exec(html);
  if (!m) return null;
  const start = m.index;
  let i = start;
  let depth = 0;
  while (i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return { start, openEnd: start + m[0].length, end: nextClose + 6 };
      i = nextClose + 6;
    }
  }
  return null;
}

let changed = 0;
for (const [file, id, make] of targets) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const loc = locateContainer(html, id);
  if (!loc) {
    console.log('跳过（容器未找到）: ' + file + ' #' + id);
    continue;
  }
  const openTag = html.slice(loc.start, loc.openEnd);
  const inner = '<!--prerender:start-->\n' + make() + '\n<!--prerender:end-->';
  html = html.slice(0, loc.start) + openTag + inner + '</div>' + html.slice(loc.end);
  fs.writeFileSync(full, html);
  changed++;
}

console.log('预渲染列表容器 ' + changed + ' 个');

// 首页 hero 的「最近更新」日期随内容自动刷新
const latestDate = [...data.articles, ...data.research, ...data.snippets]
  .map((i) => String(i.date || ''))
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .sort()
  .pop();
if (latestDate) {
  const indexPath = path.join(ROOT, 'index.html');
  let home = fs.readFileSync(indexPath, 'utf8');
  const updated = home.replace(
    /(<p class="hero-note">[\s\S]*?<time datetime=")[^"]*(">)[^<]*(<\/time>)/,
    `$1${latestDate}$2${latestDate}$3`
  );
  if (updated !== home) {
    fs.writeFileSync(indexPath, updated);
    console.log('首页最近更新日期：' + latestDate);
  }
}
