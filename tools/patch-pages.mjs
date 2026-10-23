/**
 * 静态页面头部信息补全（可重复运行）
 * ------------------------------------------------------------
 * 为各栏目页补上 description / canonical / OG 标签，
 * 去掉详情页外壳的索引（内容由 build.mjs 生成的静态页承担），
 * 并修正导航里的 javascript:void(0)。
 *
 * 用法：node tools/patch-pages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://historyramble.org';
const NAME = '循史漫记';

const PAGES = {
  'articles.html': {
    desc: '循史漫记的文章列表：历史学读书笔记、史学随笔与书评，涵盖中国古代史、史学史与区域研究。',
  },
  'books.html': {
    desc: '历史学推荐书目，附作者、评分与简短评述，记录一个人的阅读轨迹。',
  },
  'research.html': {
    desc: '专题研究笔记：唐与高句丽战争研究等课题的史料分析与写作思路梳理。',
  },
  'snippets.html': {
    desc: '史料拾遗：史书原文摘录与批注，附出处、年代与简要解说。',
  },
  'biographies.html': {
    desc: '历史人物小传：以简明笔墨勾勒人物的时代处境、行事与影响。',
  },
  'resources.html': {
    desc: '历史学学术资源导航：古籍数据库、数字档案、研究工具与推荐期刊。',
  },
  'downloads.html': {
    desc: '历史学电子书与论文下载，含高句丽史、隋唐东亚关系等主题。',
  },
  'about.html': {
    desc: '关于循史漫记：站主简介与本站的写作缘起、内容范围。',
  },
  'chess.html': {
    desc: '中国象棋小游戏，本站的闲暇角落。',
  },
  // 详情页外壳：内容由生成的静态页承担，这里只做跳转，不参与索引
  'article.html': { noindex: true },
  'snippet.html': { noindex: true },
  'biography.html': { noindex: true },
  'research-note.html': { noindex: true },
};

const esc = (s) => s.replace(/"/g, '&quot;');

let patched = 0;

for (const [file, cfg] of Object.entries(PAGES)) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.warn(`跳过（不存在）：${file}`);
    continue;
  }

  let html = fs.readFileSync(full, 'utf8');

  // 1. 导航下拉：用一个真实链接替换 javascript:void(0)
  html = html.replace(
    /<a href="javascript:void\(0\)" class="dropbtn">/g,
    '<a href="chess.html" class="dropbtn" aria-haspopup="true" aria-expanded="false">'
  );

  // 2. 内联的低对比度颜色
  html = html.replace(/#8a7a6a/g, '#6f6253');

  // 3. 头部标签
  if (!/name="description"/.test(html)) {
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [, NAME])[1].trim();
    const url = `${SITE}/${file}`;

    const block = cfg.noindex
      ? `<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#2c2416">`
      : `<meta name="description" content="${esc(cfg.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(cfg.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="zh_CN">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#2c2416">`;

    html = html.replace('</head>', `${block}\n</head>`);
    patched++;
  }

  fs.writeFileSync(full, html, 'utf8');
}

console.log(`✓ 已更新 ${patched} 个页面的头部信息`);
