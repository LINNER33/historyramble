/**
 * 清理标签：去掉被整对中文/英文引号包裹的标签（“古希腊” → 古希腊）。
 * 用法：node tools/fix-tags.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js', 'data.js');
const write = process.argv.includes('--write');
let src = fs.readFileSync(FILE, 'utf8');

const load = (t) => vm.runInNewContext(t + ';({articles, research, snippets, biographies, books})');
const before = load(src);

const strip = (t) => {
  if (typeof t !== 'string') return t;
  const pairs = [
    ['“', '”'],
    ['「', '」'],
    ['"', '"'],
    ["'", "'"],
  ];
  for (const [o, c] of pairs) {
    if (t.startsWith(o) && t.endsWith(c) && t.length > o.length + c.length) {
      const inner = t.slice(o.length, t.length - c.length);
      // 内部不再出现同类引号时才算外层包裹
      if (!inner.includes(o) && !inner.includes(c)) return inner.trim();
    }
  }
  return t;
};

const plan = [];
for (const k of ['articles', 'research', 'snippets', 'biographies']) {
  before[k].forEach((it, i) => {
    (it.tags || []).forEach((t, j) => {
      const s = strip(t);
      if (s !== t) plan.push({ k, i, j, from: t, to: s, id: it.id });
    });
  });
}

console.log('待清理标签 ' + plan.length + ' 处：');
for (const p of plan) console.log(`  ${p.k}/${p.id} [${p.j}]: ${p.from} → ${p.to}`);

if (!write) {
  console.log('\n（未写入，加 --write 才会改文件）');
  process.exit(0);
}

// 逐处替换：定位该条目的 tags 数组内该字符串字面量
let next = src;
let applied = 0;
for (const p of plan) {
  const needle = JSON.stringify(p.from);
  const variants = [needle, `'${p.from}'`];
  const anchors = [`id: ${JSON.stringify(p.id)}`, `id: '${p.id}'`];
  let anchorIdx = -1;
  for (const a of anchors) {
    const k = next.indexOf(a);
    if (k >= 0) {
      anchorIdx = k;
      break;
    }
  }
  if (anchorIdx < 0) {
    console.log('  跳过（找不到条目）: ' + p.id);
    continue;
  }
  const tagsIdx = next.indexOf('tags:', anchorIdx);
  if (tagsIdx < 0) {
    console.log('  跳过（找不到 tags）: ' + p.id);
    continue;
  }
  let done = false;
  for (const v of variants) {
    const at = next.indexOf(v, tagsIdx);
    if (at >= 0 && at - tagsIdx < 400) {
      const rep = JSON.stringify(p.to);
      next = next.slice(0, at) + rep + next.slice(at + v.length);
      applied++;
      done = true;
      break;
    }
  }
  if (!done) console.log('  跳过（找不到字面量）: ' + p.id + ' / ' + p.from);
}

const after = load(next);
let bad = 0;
for (const p of plan) {
  const item = after[p.k].find((x) => x.id === p.id);
  if (!item || (item.tags || [])[p.j] !== p.to) {
    bad++;
    console.log('  校验差异: ' + p.id + ' → ' + JSON.stringify((item && item.tags) || []));
  }
}
if (bad) {
  console.error('有 ' + bad + ' 处未按预期修改，未写入。');
  process.exit(1);
}
if (JSON.stringify(before.books) !== JSON.stringify(after.books)) {
  console.error('books 被意外改动，未写入。');
  process.exit(1);
}

fs.writeFileSync(FILE, next);
console.log('已写入，替换 ' + applied + ' 处，' + next.length + ' 字节');
