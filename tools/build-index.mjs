// 单独生成列表页精简数据集：node tools/build-index.mjs
// （build.mjs 构建时也会自动重新生成一次，通常无需单独运行）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexText } from './lib/index-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
const text = indexText(dataSrc);
fs.writeFileSync(path.join(ROOT, 'js/data-index.js'), text, 'utf8');
console.log('✓ 生成 js/data-index.js（' + (Buffer.byteLength(text) / 1024).toFixed(0) + ' KB）');
