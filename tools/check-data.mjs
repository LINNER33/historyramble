/**
 * 数据体检：读 js/data.js，检查内容字段的格式与常见错误。
 * 用法：node tools/check-data.mjs
 * 只读，不修改任何文件；发现问题时以非零退出码结束。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const data = vm.runInNewContext(
  src + ';({articles, snippets, biographies, research, books, resources, downloads})'
);

const problems = [];
const warn = (msg) => problems.push(msg);

const plain = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '');
const CURVE = /^[“”]/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const seenIds = new Set();

function checkCommon(kind, items, fields) {
  items.forEach((it, i) => {
    const where = `${kind}[${i}]${it && it.id ? '/' + it.id : ''}`;
    if (!it || typeof it !== 'object') return warn(`${where}: 不是对象`);
    for (const f of fields) {
      if (it[f] === undefined || it[f] === null || it[f] === '') warn(`${where}: 缺少字段 ${f}`);
    }
    if (it.id) {
      if (seenIds.has(it.id)) warn(`${where}: id 重复（${it.id}）`);
      seenIds.add(it.id);
      if (!/^[a-z0-9-]+$/.test(it.id)) warn(`${where}: id 只应包含小写字母、数字与连字符`);
    }
    if (it.date && !DATE.test(it.date)) warn(`${where}: 日期格式应为 YYYY-MM-DD（现为 ${it.date}）`);
    // 只把「整个标题被一对中文引号包裹」当作问题；标题内部的引号（如“冲击—回应”）是正常用法
    if (it.title && CURVE.test(it.title) && /[”]$/.test(it.title)) {
      warn(`${where}: 整个标题被中文引号包裹`); 
    }
    if (it.tags !== undefined) {
      if (!Array.isArray(it.tags)) warn(`${where}: tags 应为数组`);
      else if (it.tags.some((t) => typeof t !== 'string' || !t.trim())) warn(`${where}: tags 里有空值`);
    }
    for (const f of ['title', 'summary', 'content', 'desc', 'commentary', 'excerpt', 'source']) {
      const v = it[f];
      if (typeof v !== 'string') continue;
      if (v.includes('`') || v.includes('${')) warn(`${where}.${f}: 含有反引号或模板占位符`);
      if (/\uFFFD/.test(v)) warn(`${where}.${f}: 含有无法解码的乱码字符`);
      if (/\{@|<script/i.test(v)) warn(`${where}.${f}: 可能含有脚本或未清理的标记`);
      const badTags = [...v.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase());
      const illegal = badTags.filter((t) => !['p', 'blockquote', 'div', 'span', 'a', 'i', 'b'].includes(t));
      if (illegal.length) warn(`${where}.${f}: 含不常用标签 ${[...new Set(illegal)].join(',')}`);
    }
    if (typeof it.summary === 'string') {
      const len = plain(it.summary).length;
      if (len < 20) warn(`${where}: 摘要过短（${len} 字）`);
      if (len > 220) warn(`${where}: 摘要过长（${len} 字）`);
    }
    if (typeof it.content === 'string') {
      const len = plain(it.content).length;
      if (len < 200) warn(`${where}: 正文过短（${len} 字）`);
    }
  });
}

checkCommon('articles', data.articles, ['id', 'title', 'date', 'category', 'summary', 'content']);
checkCommon('research', data.research, ['id', 'title', 'date', 'summary', 'content']);
checkCommon('snippets', data.snippets, ['id', 'title', 'source', 'date', 'excerpt', 'commentary']);
checkCommon('biographies', data.biographies, ['id', 'title', 'period', 'summary', 'content']);
checkCommon('books', data.books, ['id', 'title', 'author', 'desc']);

data.books.forEach((b, i) => {
  const r = Number(b.rating);
  if (!(r >= 1 && r <= 5)) warn(`books[${i}]/${b.id}: rating 应为 1–5（现为 ${b.rating}）`);
  const len = plain(b.desc).length;
  if (len < 40) warn(`books[${i}]/${b.id}: 简介过短（${len} 字）`);
});

(data.resources || []).forEach((g, i) => {
  if (!g.category) warn(`resources[${i}]: 缺少 category`);
  if (!Array.isArray(g.items) || !g.items.length) warn(`resources[${i}]: items 为空`);
  (g.items || []).forEach((it, j) => {
    if (!it.name) warn(`resources[${i}].items[${j}]: 缺少 name`);
    if (it.url && !/^https?:\/\//.test(it.url)) warn(`resources[${i}].items[${j}]: url 应以 http(s):// 开头`);
  });
});

(data.downloads || []).forEach((d, i) => {
  for (const f of ['id', 'title', 'link']) {
    if (!d[f]) warn(`downloads[${i}]: 缺少字段 ${f}`);
  }
});

const counts = ['articles', 'research', 'snippets', 'biographies', 'books', 'resources', 'downloads']
  .map((k) => `${k} ${data[k].length}`)
  .join(' · ');
console.log('数据规模：' + counts);
console.log('id 唯一性检查覆盖 ' + seenIds.size + ' 个条目');

if (!problems.length) {
  console.log('✓ 未发现数据格式问题');
} else {
  console.log('发现 ' + problems.length + ' 处问题：');
  problems.slice(0, 80).forEach((p) => console.log('  - ' + p));
  if (problems.length > 80) console.log('  …其余 ' + (problems.length - 80) + ' 条省略');
  process.exitCode = 1;
}
