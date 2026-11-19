/* 繁简转换工具逻辑（依赖 js/hanzi-data.js 提供的 RAW） */
(function () {
'use strict';

// ---------- 词典 ----------
function buildDict(charsText, phrasesText){
  const chars = new Map(), phrases = new Map(), lens = new Map();
  for (const line of charsText.split('\n')){
    const t = line.indexOf('\t'); if (t < 0) continue;
    chars.set(line.slice(0, t), line.slice(t + 1).split(' ')[0]);
  }
  for (const line of phrasesText.split('\n')){
    const t = line.indexOf('\t'); if (t < 0) continue;
    const k = line.slice(0, t);
    phrases.set(k, line.slice(t + 1).split(' ')[0]);
    const first = String.fromCodePoint(k.codePointAt(0));
    const n = Array.from(k).length;
    let s = lens.get(first); if (!s) lens.set(first, s = new Set());
    s.add(n);
  }
  // 每个首字可能的词长，从长到短
  const lenList = new Map();
  for (const [c, s] of lens) lenList.set(c, [...s].sort((a, b) => b - a));
  return { chars, phrases, lenList };
}
const DICTS = {
  s2t: buildDict(RAW.stc, RAW.stp),
  t2s: buildDict(RAW.tsc, RAW.tsp),
};

function convert(text, d){
  const cps = Array.from(text);
  const out = [];
  let i = 0;
  while (i < cps.length){
    const c = cps[i];
    const lens = d.lenList.get(c);
    let done = false;
    if (lens){
      for (const n of lens){
        if (i + n > cps.length) continue;
        const key = cps.slice(i, i + n).join('');
        const v = d.phrases.get(key);
        if (v !== undefined){ out.push(v); i += n; done = true; break; }
      }
    }
    if (!done){ out.push(d.chars.get(c) ?? c); i++; }
  }
  return out.join('');
}

// ---------- 字数统计 ----------
const reHan = /\p{Script=Han}/u;
const rePunct = /[\p{P}\p{S}]/u;
function countText(s){
  const cps = Array.from(s);
  let han = 0, punct = 0, nonSpace = 0;
  for (const c of cps){
    if (/\s/.test(c)) continue;
    nonSpace++;
    if (reHan.test(c)) han++;
    else if (rePunct.test(c)) punct++;
  }
  const words = (s.match(/[A-Za-zÀ-ɏ]+(?:['’\-][A-Za-zÀ-ɏ]+)*/g) || []).length;
  const nums = (s.match(/\d+(?:[.,]\d+)*/g) || []).length;
  const lines = s.length ? s.split('\n').length : 0;
  const paras = s.split(/\n\s*\n|\n/).filter(p => p.trim()).length;
  return { total: han + words + nums, han, words, nums, punct, nonSpace, all: cps.length, lines, paras };
}
function renderStats(el, s){
  const c = countText(s);
  const items = [
    ['字数', c.total, true], ['汉字', c.han], ['英文单词', c.words], ['数字', c.nums],
    ['标点符号', c.punct], ['字符(不含空白)', c.nonSpace], ['字符(含空白)', c.all], ['段落', c.paras],
  ];
  el.innerHTML = items.map(([k, v, main]) =>
    `<div class="stat${main ? ' main' : ''}"><b>${v.toLocaleString()}</b><span>${k}</span></div>`).join('');
}

// ---------- 界面 ----------
const $ = id => document.getElementById(id);
const input = $('input'), output = $('output');
let mode = 's2t';
try { mode = localStorage.getItem('fj-mode') || 's2t'; } catch(e){}

function setMode(m){
  mode = m;
  $('m-s2t').classList.toggle('on', m === 's2t');
  $('m-t2s').classList.toggle('on', m === 't2s');
  $('in-title').textContent = m === 's2t' ? '原文（简体）' : '原文（繁体）';
  $('out-title').textContent = m === 's2t' ? '结果（繁体）' : '结果（简体）';
  try { localStorage.setItem('fj-mode', m); } catch(e){}
  run();
}
function run(){
  output.value = convert(input.value, DICTS[mode]);
  renderStats($('stats-in'), input.value);
  renderStats($('stats-out'), output.value);
}
let timer;
input.addEventListener('input', () => {
  if ($('auto').checked){ clearTimeout(timer); timer = setTimeout(run, 120); }
  else renderStats($('stats-in'), input.value);
});
output.addEventListener('input', () => renderStats($('stats-out'), output.value));
$('m-s2t').onclick = () => setMode('s2t');
$('m-t2s').onclick = () => setMode('t2s');
$('convert').onclick = run;
$('swap').onclick = () => { input.value = output.value; setMode(mode === 's2t' ? 't2s' : 's2t'); };
$('clear').onclick = () => { input.value = ''; run(); input.focus(); };

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1500);
}
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(output.value); }
  catch(e){ output.select(); document.execCommand('copy'); }
  toast('已复制到剪贴板');
};
$('paste').onclick = async () => {
  try { input.value = await navigator.clipboard.readText(); run(); }
  catch(e){ toast('浏览器不允许读取剪贴板，请用 Ctrl+V 粘贴'); input.focus(); }
};
$('save').onclick = () => {
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (mode === 's2t' ? '繁体' : '简体') + '_转换结果.txt';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { input.value = r.result; run(); toast('已载入 ' + f.name); };
  r.readAsText(f, 'utf-8');
  e.target.value = '';
};
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
});

setMode(mode);
})();
