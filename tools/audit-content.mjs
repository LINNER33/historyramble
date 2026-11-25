/**
 * 内容体检：对五个板块（文章/专题/史料/人物/书单）做结构与文字层面的检查。
 * 只读，不修改文件。用法：node tools/audit-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const data = vm.runInNewContext(
  src + ';({articles, research, snippets, biographies, books})'
);

const plain = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' ').trim();
const nospace = (s) => plain(s).replace(/\s+/g, '');
const CJK = '[\\u4e00-\\u9fff]';

const report = [];
const add = (title, lines) => report.push({ title, lines });

/* ---------- 1. 结构与长度 ---------- */
const structure = [];
for (const [key, items] of Object.entries(data)) {
  const lens = items.map((it) => ({
    id: it.id,
    len: nospace(it.content || it.commentary || it.desc || '').length,
    paras: (String(it.content || it.commentary || '').match(/<p>/g) || []).length,
  }));
  if (key === 'books') {
    structure.push(`书单 ${items.length} 本，简介 ${Math.min(...lens.map((l) => l.len))}–${Math.max(...lens.map((l) => l.len))} 字`);
    continue;
  }
  structure.push(
    `${key} ${items.length} 条，正文字数 ${Math.min(...lens.map((l) => l.len))}–${Math.max(...lens.map((l) => l.len))}，段落 ${Math.min(...lens.map((l) => l.paras))}–${Math.max(...lens.map((l) => l.paras))}`
  );
}
add('规模与长度', structure);

/* ---------- 2. 标点与引号 ---------- */
const punctIssues = [];
for (const [key, items] of Object.entries(data)) {
  for (const it of items) {
    const text = plain(it.content || it.commentary || it.desc || it.summary || '');
    if (!text) continue;
    const half = text.match(new RegExp(`${CJK}[,;:!?]${CJK}`, 'g')) || [];
    const asciiQuote = (text.match(/"/g) || []).length;
    const halfParen = (text.match(/[()]/g) || []).length;
    if (half.length || asciiQuote || halfParen) {
      punctIssues.push({
        key,
        id: it.id,
        half: half.slice(0, 2),
        asciiQuote,
        halfParen,
      });
    }
  }
}
const byKind = {};
for (const p of punctIssues) byKind[p.key] = (byKind[p.key] || 0) + 1;
add('标点：中文里的半角符号／ASCII 引号', [
  `涉及 ${punctIssues.length} 条：` + Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join('，'),
  ...punctIssues.slice(0, 8).map(
    (p) => `  ${p.key}/${p.id}：半角标点 ${p.half.join('｜') || '无'}，ASCII 引号 ${p.asciiQuote}，半角括号 ${p.halfParen}`
  ),
]);

/* ---------- 3. 跨条目重复句 ---------- */
const sentMap = new Map();
for (const [key, items] of Object.entries(data)) {
  for (const it of items) {
    const text = plain(it.content || it.commentary || '');
    if (!text) continue;
    const sents = text.split(/[。！？；]/).map((s) => s.trim()).filter((s) => s.length >= 18);
    for (const s of sents) {
      const rec = sentMap.get(s) || [];
      rec.push(`${key}/${it.id}`);
      sentMap.set(s, rec);
    }
  }
}
const dupSents = [...sentMap.entries()].filter(([, where]) => new Set(where.map((w) => w.split('/')[0] + w.split('/')[1])).size >= 2);
add('跨条目重复句（≥18 字且出现在两个不同条目）', [
  `共 ${dupSents.length} 句`,
  ...dupSents.slice(0, 6).map(([s, where]) => `  「${s.slice(0, 40)}…」出现在 ${[...new Set(where)].slice(0, 3).join('、')}`),
]);

/* ---------- 4. 段落长度异常 ---------- */
const paraIssues = [];
for (const [key, items] of Object.entries(data)) {
  if (!['articles', 'research', 'biographies'].includes(key)) continue;
  for (const it of items) {
    const paras = [...String(it.content || '').matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => nospace(m[1]));
    paras.forEach((p, i) => {
      if (p.length > 420) paraIssues.push(`${key}/${it.id} 第 ${i + 1} 段 ${p.length} 字（偏长）`);
      if (p.length < 25) paraIssues.push(`${key}/${it.id} 第 ${i + 1} 段 ${p.length} 字（偏短）`);
    });
  }
}
add('段落长度异常（>420 或 <25 字）', [`共 ${paraIssues.length} 处`, ...paraIssues.slice(0, 8)]);

/* ---------- 5. 年份与世纪一致性 ---------- */
const yearIssues = [];
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const centuryNum = (s) => {
  if (s.length === 1) return CN_NUM[s] || 0;
  if (s.length === 2 && s[0] === '十') return 10 + (CN_NUM[s[1]] || 0);
  if (s.length === 2 && s[1] === '十') return (CN_NUM[s[0]] || 0) * 10;
  if (s.length === 3) return (CN_NUM[s[0]] || 0) * 10 + (CN_NUM[s[2]] || 0);
  return 0;
};
for (const [key, items] of Object.entries(data)) {
  for (const it of items) {
    const text = plain(it.content || it.commentary || '');
    if (!text) continue;
    for (const m of text.matchAll(/([一二三四五六七八九十]{1,3})世纪/g)) {
      const c = centuryNum(m[1]);
      if (!c) continue;
      // 取该句附近 12 字内的四位年份，做粗略比对
      const start = Math.max(0, m.index - 12);
      const windowText = text.slice(start, m.index + m[0].length + 12);
      const years = [...windowText.matchAll(/(1\d{3}|20\d{2})/g)].map((x) => Number(x[1]));
      const bad = years.filter((y) => Math.floor((y - 1) / 100) + 1 !== c);
      if (bad.length) yearIssues.push(`${key}/${it.id}：「${m[1]}世纪」附近出现 ${bad.join('/')} 年`);
    }
    for (const m of text.matchAll(/(?<![\d])(\d{4})\s*年/g)) {
      const y = Number(m[1]);
      if (y > 2027 || y < 1800) yearIssues.push(`${key}/${it.id}：年份 ${y} 可疑`);
    }
  }
}
add('年份／世纪可疑（粗略匹配，需人工复核）', [`共 ${yearIssues.length} 处`, ...yearIssues.slice(0, 8)]);

/* ---------- 6. 史料：出处格式与按语 ---------- */
const snippetIssues = [];
for (const s of data.snippets) {
  const source = plain(s.source);
  const paras = (String(s.commentary || '').match(/<p>/g) || []).length;
  const excerptLen = nospace(s.excerpt).length;
  if (paras !== 3) snippetIssues.push(`${s.id}：按语 ${paras} 段（应为 3 段）`);
  if (excerptLen < 20) snippetIssues.push(`${s.id}：引文仅 ${excerptLen} 字`);
  if (!/卷|志|传|纪|表|书|诏|集|碑/.test(source)) snippetIssues.push(`${s.id}：出处「${source}」缺少卷/篇名`);
  if (/[0-9]/.test(source) && /[〇一二三四五六七八九十百千]/.test(source)) {
    snippetIssues.push(`${s.id}：出处数字体例混用「${source}」`);
  }
}
add('史料：出处体例与按语', [`共 ${snippetIssues.length} 处`, ...snippetIssues.slice(0, 10)]);

/* ---------- 7. 人物：period 规范 ---------- */
const periods = {};
for (const b of data.biographies) periods[b.period] = (periods[b.period] || 0) + 1;
const periodIssues = data.biographies
  .filter((b) => !/[·]/.test(b.period || ''))
  .map((b) => `${b.id}：period「${b.period}」不含「·」分隔`);
add('人物：period 格式', [
  `共 ${Object.keys(periods).length} 种取值；最多：` +
    Object.entries(periods).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}(${v})`).join('、'),
  ...periodIssues.slice(0, 8),
]);

/* ---------- 8. 书单：重复与作者集中度 ---------- */
const normTitle = (t) => plain(t).replace(/[《》\s]/g, '');
const titleMap = new Map();
for (const b of data.books) {
  const k = normTitle(b.title);
  (titleMap.get(k) || titleMap.set(k, []).get(k)).push(b.id);
}
const dupTitles = [...titleMap.entries()].filter(([, ids]) => ids.length > 1);
const authorMap = {};
for (const b of data.books) authorMap[plain(b.author)] = (authorMap[plain(b.author)] || 0) + 1;
const topAuthors = Object.entries(authorMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
const ratings = {};
for (const b of data.books) ratings[b.rating] = (ratings[b.rating] || 0) + 1;
add('书单：重复与集中度', [
  `重复书名 ${dupTitles.length} 组` + (dupTitles.length ? '：' + dupTitles.map(([k, ids]) => `${k}(${ids.join(',')})`).join('；') : ''),
  `作者集中度：` + topAuthors.map(([k, v]) => `${k} ${v} 本`).join('、'),
  `星级分布：` + Object.entries(ratings).sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k}★ ${v}`).join('、'),
]);

console.log('');
for (const block of report) {
  console.log('## ' + block.title);
  block.lines.forEach((l) => console.log(l));
  console.log('');
}
