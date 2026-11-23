/**
 * 把正文里成对的 ASCII 双引号 "…" 换成中文引号 「…」（只处理 <p> 等文本节点，不动标签属性）。
 * 无法成对的段落跳过并报告，不做猜测。
 * 用法：node tools/fix-quotes.mjs [--write]
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

// 把 HTML 拆成标签段与文本段，只改文本段
const transform = (html) => {
  const parts = String(html).split(/(<[^>]*>)/);
  let changed = 0;
  let unbalanced = 0;
  const out = parts.map((seg) => {
    if (seg.startsWith('<') && seg.endsWith('>')) return seg;
    if (!seg.includes('"')) return seg;
    const count = (seg.match(/"/g) || []).length;
    if (count % 2 !== 0) {
      unbalanced++;
      return seg;
    }
    let open = true;
    const replaced = seg.replace(/"/g, () => {
      const ch = open ? '「' : '」';
      open = !open;
      changed++;
      return ch;
    });
    return replaced;
  });
  return { html: out.join(''), changed, unbalanced };
};

const targets = [];
for (const k of ['articles', 'research', 'biographies']) {
  before[k].forEach((it, i) => {
    if (typeof it.content === 'string' && it.content.includes('"')) {
      targets.push({ k, i, id: it.id, field: 'content' });
    }
  });
}
before.snippets.forEach((it, i) => {
  for (const f of ['excerpt', 'commentary']) {
    if (typeof it[f] === 'string' && it[f].includes('"')) targets.push({ k: 'snippets', i, id: it.id, field: f });
  }
});

console.log('需要处理的条目 ' + targets.length + ' 个');
const results = [];
for (const t of targets) {
  const item = before[t.k][t.i];
  const r = transform(item[t.field]);
  results.push({ ...t, ...r });
  console.log(
    `  ${t.k}/${t.id}.${t.field}: 替换 ${r.changed} 处` + (r.unbalanced ? `（有 ${r.unbalanced} 段引号不成对，已跳过）` : '')
  );
}

const totalChanged = results.reduce((n, r) => n + r.changed, 0);
console.log('合计替换 ' + totalChanged + ' 处');

if (!write) {
  console.log('\n（未写入，加 --write 才会改文件）');
  process.exit(0);
}

// 在源码中定位并替换这些字段的字面量
let next = src;
let applied = 0;
for (const r of results) {
  if (!r.changed) continue;
  const anchorVariants = [`id: ${JSON.stringify(r.id)}`, `id: '${r.id}'`];
  let anchor = -1;
  for (const a of anchorVariants) {
    const k = next.indexOf(a);
    if (k >= 0) {
      anchor = k;
      break;
    }
  }
  if (anchor < 0) {
    console.log('  跳过（找不到条目）: ' + r.id);
    continue;
  }
  const fieldIdx = next.indexOf(r.field + ':', anchor);
  if (fieldIdx < 0) {
    console.log('  跳过（找不到字段）: ' + r.id + '.' + r.field);
    continue;
  }
  // 取原字段当前值（源码中的字面量形式），用 vm 解析后的旧值与新值对齐替换
  const oldVal = before[r.k][r.i][r.field];
  const newVal = r.html;
  const crlf = (s) => s.replace(/\r?\n/g, '\r\n');
  const variants = [
    '`' + crlf(oldVal) + '`',
    '`' + oldVal + '`',
    JSON.stringify(oldVal),
    '"' + oldVal.replace(/\r?\n/g, '\\n').replace(/"/g, '\\"') + '"',
  ];
  let done = false;
  for (const v of variants) {
    const at = next.indexOf(v, fieldIdx);
    if (at >= 0) {
      const rep = v.startsWith('`') ? '`' + crlf(newVal) + '`' : JSON.stringify(newVal);
      next = next.slice(0, at) + rep + next.slice(at + v.length);
      applied++;
      done = true;
      break;
    }
  }
  if (!done) console.log('  跳过（字面量形式不匹配）: ' + r.id + '.' + r.field);
}

const after = load(next);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const k of ['books', 'resources', 'downloads']) {
  if (!same(before[k], after[k])) throw new Error('其他集合被改动：' + k);
}
let ok = 0;
let mismatch = 0;
for (const r of results) {
  if (!r.changed) continue;
  if (after[r.k].find((x) => x.id === r.id)[r.field] === r.html) ok++;
  else mismatch++;
}
if (mismatch) {
  console.error('有 ' + mismatch + ' 处未按预期写入，未保存。');
  process.exit(1);
}
fs.writeFileSync(FILE, next);
console.log('已写入 ' + ok + ' 处字段，文件 ' + next.length + ' 字节');
