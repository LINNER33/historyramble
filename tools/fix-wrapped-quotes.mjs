/**
 * 去掉「整段被一对中文引号包裹」的字段外层引号（source / excerpt / desc 等）。
 * 只处理首尾确为 “ ” 且去外层后内部引号仍配平的字符串；其余字段不动。
 * 用法：node tools/fix-wrapped-quotes.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js', 'data.js');
const write = process.argv.includes('--write');
let src = fs.readFileSync(FILE, 'utf8');

const KEYS = ['articles', 'research', 'snippets', 'biographies', 'books'];
const FIELDS = ['title', 'summary', 'source', 'excerpt', 'commentary', 'desc'];
const COLL_KEY = {
  articles: 'articles',
  research: 'research',
  snippets: 'snippets',
  biographies: 'biographies',
  books: 'books',
};

const load = (text) =>
  vm.runInNewContext(text + ';({articles, research, snippets, biographies, books})');

const before = load(src);
const plan = [];
for (const coll of KEYS) {
  for (const it of before[coll]) {
    for (const f of FIELDS) {
      const v = it[f];
      if (typeof v !== 'string' || !v.startsWith('“') || !v.endsWith('”')) continue;
      const inner = v.slice(1, -1);
      const open = (inner.match(/“/g) || []).length;
      const close = (inner.match(/”/g) || []).length;
      if (open !== close) continue;
      plan.push({ coll, id: it.id, field: f, from: v, to: inner });
    }
  }
}

console.log('待处理字段 ' + plan.length + ' 个：');
plan.forEach((p) => console.log(`  ${p.coll}/${p.id}.${p.field}: ${p.from.slice(0, 28)}…`));

if (!write) {
  console.log('\n（未写入，加 --write 才会改文件）');
  process.exit(0);
}

let next = src;
let applied = 0;
for (const p of plan) {
  const candidates = [`"${JSON.stringify(p.from).slice(1, -1)}"`, `"${p.from}"`, '`' + p.from + '`'];
  let done = false;
  for (const needle of candidates) {
    const idx = next.indexOf(needle);
    if (idx < 0) continue;
    const repl = needle[0] === '`' ? '`' + p.to + '`' : `"${JSON.stringify(p.to).slice(1, -1)}"`;
    next = next.slice(0, idx) + repl + next.slice(idx + needle.length);
    applied += 1;
    done = true;
    break;
  }
  if (!done) console.log('  跳过（源码中未找到字面量）: ' + p.id + '.' + p.field);
}

const after = load(next);
let mismatch = 0;
for (const p of plan) {
  const item = after[p.coll].find((x) => x.id === p.id);
  if (!item || item[p.field] !== p.to) {
    mismatch += 1;
    console.log('  校验失败: ' + p.id + '.' + p.field);
  }
}
// 其他字段必须保持原样
for (const coll of KEYS) {
  if (after[coll].length !== before[coll].length) {
    mismatch += 1;
    console.log('  条数变化: ' + coll);
  }
}
if (mismatch) {
  console.error('有 ' + mismatch + ' 处未按预期修改，未写入。');
  process.exit(1);
}

fs.writeFileSync(FILE, next);
console.log('已写入 ' + FILE + '（替换 ' + applied + ' 处，' + next.length + ' 字节）');
