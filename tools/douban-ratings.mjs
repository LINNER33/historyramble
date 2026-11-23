/**
 * 用豆瓣评分校准书单星级：拉取每本书的豆瓣评分，按
 * 9.0+ → 5 星、8.0–8.9 → 4 星、7.0–7.9 → 3 星、低于 7.0 → 2 星 写入 data.js 的 rating 字段。
 * 用法：node tools/douban-ratings.mjs [--write] [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js', 'data.js');
const CACHE = path.join(ROOT, 'tools', 'douban-cache.json');
const write = process.argv.includes('--write');
const refresh = process.argv.includes('--refresh');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const src = fs.readFileSync(FILE, 'utf8');
const load = (t) => vm.runInNewContext(t + ';({books})');
const before = load(src);
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function suggest(title) {
  const url = 'https://book.douban.com/j/subject_suggest?q=' + encodeURIComponent(title);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://book.douban.com/' } });
  if (!r.ok) return [];
  const list = await r.json();
  return list.filter((x) => x.type === 'b').map((x) => ({ id: x.id, title: x.title, author: x.author_name }));
}

async function ratingOf(id) {
  const r = await fetch('https://book.douban.com/subject/' + id + '/', {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
  });
  if (!r.ok) return null;
  const t = await r.text();
  const m = t.match(/property="v:average">\s*([\d.]+)\s*</);
  return m ? Number(m[1]) : null;
}

const stars = (v) => (v >= 9 ? 5 : v >= 8 ? 4 : v >= 7 ? 3 : v >= 6 ? 2 : 1);

const rows = [];
for (const b of before.books) {
  if (!refresh && cache[b.id] && cache[b.id].rating) {
    rows.push({ ...cache[b.id], id: b.id, was: b.rating });
    continue;
  }
  let found = null;
  try {
    const cands = await suggest(b.title.replace(/[：:].*$/, ''));
    for (const c of cands.slice(0, 3)) {
      const v = await ratingOf(c.id);
      await sleep(400);
      if (v) {
        found = { doubanId: c.id, doubanTitle: c.title, rating: v };
        break;
      }
    }
  } catch (e) {
    found = null;
  }
  if (!found) {
    console.log('未取到评分：' + b.id + ' / ' + b.title);
    rows.push({ id: b.id, rating: null, was: b.rating });
    continue;
  }
  cache[b.id] = found;
  rows.push({ ...found, id: b.id, was: b.rating });
  console.log(`${b.title} → 豆瓣 ${found.rating}（${found.doubanTitle}） ${stars(found.rating)} 星`);
  await sleep(500);
}

fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));

const map = new Map();
for (const r of rows) if (r.rating) map.set(r.id, stars(r.rating));

const dist = {};
for (const b of before.books) {
  const s = map.has(b.id) ? map.get(b.id) : b.rating;
  dist[s] = (dist[s] || 0) + 1;
}
console.log('新分布：' + JSON.stringify(dist));
const missing = rows.filter((r) => !r.rating).map((r) => r.id);
if (missing.length) console.log('未取到评分的书（保持原星级）：' + missing.join(', '));

if (!write) {
  console.log('（未写入，加 --write 才会改文件）');
  process.exit(0);
}

let next = src;
let applied = 0;
for (const b of before.books) {
  if (!map.has(b.id)) continue;
  const anchor = next.indexOf(`id: ${JSON.stringify(b.id)}`);
  if (anchor < 0) continue;
  const rz = next.indexOf('rating:', anchor);
  if (rz < 0 || rz - anchor > 300) continue;
  const end = next.indexOf('\n', rz);
  next = next.slice(0, rz) + 'rating: ' + map.get(b.id) + ',' + next.slice(end);
  applied++;
}

const after = load(next);
let mismatch = 0;
for (const b of before.books) {
  const item = after.books.find((x) => x.id === b.id);
  const want = map.has(b.id) ? map.get(b.id) : b.rating;
  if (!item || item.rating !== want) mismatch++;
}
if (mismatch) {
  console.error('有 ' + mismatch + ' 条未按预期写入，未保存。');
  process.exit(1);
}
fs.writeFileSync(FILE, next);
console.log('已写入 ' + applied + ' 本书的星级');
