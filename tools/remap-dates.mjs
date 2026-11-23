/**
 * 把文章 / 专题 / 史料里位于未来的日期整体重排到过去：
 * 按当前时间顺序把三类条目交错排成一条时间线，最新一条落在今天之前，
 * 保持原有的先后关系，不改变任何文字内容。
 * 用法：node tools/remap-dates.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js', 'data.js');
const write = process.argv.includes('--write');
const src = fs.readFileSync(FILE, 'utf8');
const load = (t) =>
  vm.runInNewContext(t + ';({articles, research, snippets, biographies, books, resources, downloads})');
const before = load(src);

const TODAY = '2026-11-23';
const END = '2026-11-22';
const START = '2025-06-01';

const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayDiff = (a, b) => (new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000;

const all = [];
for (const [k, dir] of [
  ['articles', 'articles'],
  ['research', 'research'],
  ['snippets', 'snippets'],
]) {
  for (const it of before[k]) if (it.date) all.push({ k, id: it.id, date: it.date });
}
all.sort((a, b) => b.date.localeCompare(a.date) || a.k.localeCompare(b.k) || a.id.localeCompare(b.id));

const total = all.length;
const span = dayDiff(START, END); // 可用的天数
const step = span / Math.max(total - 1, 1);

const mapping = new Map();
all.forEach((it, i) => {
  const offset = Math.round(span - i * step);
  mapping.set(it.k + '/' + it.id, addDays(START, offset));
});

// 打印新旧首尾与分布
const preview = all.slice(0, 5).concat(all.slice(-3));
preview.forEach((it) => console.log(`${it.k}/${it.id}: ${it.date} → ${mapping.get(it.k + '/' + it.id)}`));
const future = all.filter((it) => it.date > TODAY).length;
console.log(`共 ${total} 条，其中原本未来日期 ${future} 条；新日期区间 ${START} ~ ${END}`);

if (!write) {
  console.log('（未写入，加 --write 才会改文件）');
  process.exit(0);
}

let next = src;
let applied = 0;
for (const it of all) {
  const newDate = mapping.get(it.k + '/' + it.id);
  const anchor = next.indexOf(`id: ${JSON.stringify(it.id)}`);
  if (anchor < 0) {
    console.log('  跳过（找不到条目）: ' + it.id);
    continue;
  }
  const dz = next.indexOf('date:', anchor);
  if (dz < 0 || dz - anchor > 400) {
    console.log('  跳过（找不到日期字段）: ' + it.id);
    continue;
  }
  const lineEnd = next.indexOf('\n', dz);
  const segment = next.slice(dz, lineEnd);
  if (!segment.includes(it.date)) {
    console.log('  跳过（日期字面量不符）: ' + it.id + ' / ' + segment.trim());
    continue;
  }
  next = next.slice(0, dz) + segment.replace(it.date, newDate) + next.slice(lineEnd);
  applied++;
}

const after = load(next);
let bad = 0;
for (const it of all) {
  const item = after[it.k].find((x) => x.id === it.id);
  if (!item || item.date !== mapping.get(it.k + '/' + it.id)) bad++;
}
if (bad) {
  console.error('有 ' + bad + ' 条日期未按预期写入，未保存。');
  process.exit(1);
}
// 内容未被改动
const contentSame = ['articles', 'research', 'snippets'].every((k) =>
  before[k].every((it, i) => it.content === after[k][i].content || (!it.content && !after[k][i].content))
);
if (!contentSame) {
  console.error('正文被意外改动，未保存。');
  process.exit(1);
}
if (JSON.stringify(before.biographies) !== JSON.stringify(after.biographies)) {
  console.error('人物被意外改动，未保存。');
  process.exit(1);
}

fs.writeFileSync(FILE, next);
console.log('已写入 ' + applied + ' 条日期，文件 ' + next.length + ' 字符');
