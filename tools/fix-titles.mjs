/**
 * 去掉被整对中文引号包裹的标题外层引号（例如 “古希腊的民主制度与历史书写” → 古希腊的民主制度与历史书写）。
 * 只处理「标题以“开头且以”结尾、且去掉后内部引号仍配平」的情况，正文与其他字段不动。
 * 用法：node tools/fix-titles.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js', 'data.js');
const write = process.argv.includes('--write');
let src = fs.readFileSync(FILE, 'utf8');

const load = (text) =>
  vm.runInNewContext(text + ';({articles, research, snippets, biographies})');

const data = load(src);
const collections = ['articles', 'research', 'snippets', 'biographies'];
const plan = [];

for (const name of collections) {
  data[name].forEach((it) => {
    const t = it.title;
    if (typeof t !== 'string') return;
    if (!t.startsWith('“') || !t.endsWith('”')) return;
    const inner = t.slice(1, -1);
    const open = (inner.match(/“/g) || []).length;
    const close = (inner.match(/”/g) || []).length;
    if (open !== close) return;
    plan.push({ name, id: it.id, from: t, to: inner });
  });
}

console.log('待处理标题 ' + plan.length + ' 个：');
plan.forEach((p) => console.log(`  ${p.name}/${p.id}: ${p.from} → ${p.to}`));

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
    if (idx >= 0) {
      const replacement =
        needle[0] === '`' ? '`' + p.to + '`' : `"${JSON.stringify(p.to).slice(1, -1)}"`;
      next = next.slice(0, idx) + replacement + next.slice(idx + needle.length);
      applied += 1;
      done = true;
      break;
    }
  }
  if (!done) console.log('  跳过（源码中未找到字面量）: ' + p.id);
}

const after = load(next);
let mismatch = 0;
for (const p of plan) {
  const item = after[p.name].find((x) => x.id === p.id);
  if (!item || item.title !== p.to) {
    mismatch += 1;
    console.log('  校验失败: ' + p.id + ' → ' + (item && item.title));
  }
}
if (mismatch) {
  console.error('有 ' + mismatch + ' 条未按预期修改，未写入。');
  process.exit(1);
}

fs.writeFileSync(FILE, next);
console.log('已写入 ' + FILE + '（替换 ' + applied + ' 处，' + next.length + ' 字节）');
