/* ------------------------------------------------------------
 * 站内搜索
 * 首屏只依赖 js/data-index.js（精简数据集，约 280KB），
 * 用户真正输入关键词时才异步抓取 js/data.js，做正文全文检索。
 * 页面：search.html（读取 ?q= 参数）
 * ------------------------------------------------------------ */
(function () {
    'use strict';

    var listEl = document.getElementById('searchResults');
    var summaryEl = document.getElementById('searchSummary');
    var inputEl = document.getElementById('searchInput');
    if (!listEl) return;

    var FULL = null;        // 全文数据集（懒加载后填充）
    var loading = false;
    var pending = false;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function plain(s) {
        return String(s == null ? '' : s)
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function safeList(fn) {
        try {
            var list = fn();
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    var q = '';
    try {
        q = (new URLSearchParams(location.search).get('q') || '').trim();
    } catch (e) {
        q = '';
    }
    if (inputEl) inputEl.value = q;

    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    function escapeRe(t) {
        return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlight(text) {
        var out = esc(text);
        if (!terms.length) return out;
        var re;
        try {
            re = new RegExp('(' + terms.map(escapeRe).join('|') + ')', 'gi');
        } catch (e) {
            return out;
        }
        return out.replace(re, '<mark>$1</mark>');
    }

    function excerpt(text, width) {
        var lower = text.toLowerCase();
        var idx = -1;
        for (var i = 0; i < terms.length; i++) {
            var p = lower.indexOf(terms[i]);
            if (p !== -1 && (idx === -1 || p < idx)) idx = p;
        }
        if (idx === -1) return text.length > width ? text.slice(0, width) + '…' : text;
        var start = Math.max(0, idx - 40);
        var end = Math.min(text.length, start + width);
        return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    }

    /* 用精简数据（或懒加载后的全文数据）构建检索记录 */
    function buildRecords() {
        var src = FULL || {
            articles: safeList(function () { return articles; }),
            research: safeList(function () { return research; }),
            snippets: safeList(function () { return snippets; }),
            biographies: safeList(function () { return biographies; })
        };
        var full = !!FULL;
        var sources = [
            {
                label: '文章', dir: 'articles', items: src.articles,
                meta: function (a) { return [a.date, a.category].filter(Boolean).join(' · '); },
                body: function (a) { return a.summary || plain(a.content); },
                hay: function (a) {
                    return full
                        ? [a.title, a.category, (a.tags || []).join(' '), a.summary, plain(a.content)].join(' ')
                        : [a.title, a.category, (a.tags || []).join(' '), a.summary].join(' ');
                }
            },
            {
                label: '专题', dir: 'research', items: src.research,
                meta: function (a) { return [a.date, '专题研究'].filter(Boolean).join(' · '); },
                body: function (a) { return a.summary || plain(a.content); },
                hay: function (a) {
                    return full
                        ? [a.title, (a.tags || []).join(' '), a.summary, plain(a.content)].join(' ')
                        : [a.title, (a.tags || []).join(' '), a.summary].join(' ');
                }
            },
            {
                label: '史料', dir: 'snippets', items: src.snippets,
                meta: function (s) { return [s.date, s.source].filter(Boolean).join(' · '); },
                body: function (s) { return s.excerpt || plain(s.commentary); },
                hay: function (s) {
                    return full
                        ? [s.title, s.source, (s.tags || []).join(' '), s.excerpt, plain(s.commentary)].join(' ')
                        : [s.title, s.source, (s.tags || []).join(' '), s.excerpt, plain(s.commentary)].join(' ');
                }
            },
            {
                label: '人物', dir: 'biographies', items: src.biographies,
                meta: function (b) { return b.period || ''; },
                body: function (b) { return b.summary || plain(b.content); },
                hay: function (b) {
                    return full
                        ? [b.title, b.period, (b.tags || []).join(' '), b.summary, plain(b.content)].join(' ')
                        : [b.title, b.period, (b.tags || []).join(' '), b.summary].join(' ');
                }
            }
        ];

        var records = [];
        sources.forEach(function (s) {
            (s.items || []).forEach(function (it) {
                if (!it || !it.id) return;
                records.push({
                    kind: s.label,
                    href: s.dir + '/' + it.id + '.html',
                    title: it.title || '',
                    tags: it.tags || [],
                    meta: s.meta(it),
                    body: plain(s.body(it)),
                    hay: s.hay(it).toLowerCase()
                });
            });
        });
        return records;
    }

    function tagChips(records) {
        var freq = {};
        records.forEach(function (r) {
            (r.tags || []).forEach(function (t) {
                if (t) freq[t] = (freq[t] || 0) + 1;
            });
        });
        var top = Object.keys(freq).sort(function (a, b) {
            return freq[b] - freq[a] || a.localeCompare(b, 'zh');
        }).slice(0, 18);
        if (!top.length) return '';
        return '<p class="search-hint">也可以从这些标签开始：</p><div class="tag-chips">' +
            top.map(function (t) {
                return '<a href="search.html?q=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
            }).join('') + '</div>';
    }

    function counts(records) {
        var c = {};
        records.forEach(function (r) { c[r.kind] = (c[r.kind] || 0) + 1; });
        return ['文章', '专题', '史料', '人物'].map(function (k) {
            return k + ' ' + (c[k] || 0);
        }).join(' · ');
    }

    function render() {
        var records = buildRecords();

        if (!terms.length) {
            summaryEl.textContent = '本站现有 ' + counts(records) + '，共 ' + records.length + ' 篇内容。输入关键词开始搜索。';
            listEl.innerHTML = tagChips(records);
            return;
        }

        var hits = [];
        records.forEach(function (r) {
            var score = 0;
            for (var i = 0; i < terms.length; i++) {
                var t = terms[i];
                if (r.hay.indexOf(t) === -1) return;
                if (r.title.toLowerCase().indexOf(t) !== -1) score += 6;
                if (r.tags.join(' ').toLowerCase().indexOf(t) !== -1) score += 3;
                if (r.body.toLowerCase().indexOf(t) !== -1) score += 2;
            }
            hits.push({ r: r, score: score });
        });
        hits.sort(function (a, b) { return b.score - a.score; });

        var LIMIT = 60;
        var shown = hits.slice(0, LIMIT);

        summaryEl.textContent = hits.length
            ? '找到 ' + hits.length + ' 条与「' + q + '」相关的内容' +
              (hits.length > LIMIT ? '，显示前 ' + LIMIT + ' 条' : '') +
              (FULL ? '。' : '（当前为摘要检索，正在载入全文…）')
            : '没有找到与「' + q + '」相关的内容。';

        if (!hits.length) {
            listEl.innerHTML = '<p class="search-empty">可以试试更短的关键词（如「唐代」「敦煌」），' +
                '或者换个说法；本站内容以中文撰写，暂不支持拼音检索。</p>' + tagChips(records);
            return;
        }

        listEl.innerHTML = '<ul class="search-list">' + shown.map(function (h) {
            var r = h.r;
            return '<li class="search-item">' +
                '<h3><span class="search-kind">' + r.kind + '</span>' +
                '<a href="' + r.href + '">' + highlight(r.title) + '</a></h3>' +
                '<p class="search-excerpt">' + highlight(excerpt(r.body, 150)) + '</p>' +
                (r.meta ? '<p class="search-meta">' + esc(r.meta) + '</p>' : '') +
                '</li>';
        }).join('') + '</ul>';
    }

    /* 懒加载全文数据：只在用户开始检索时抓取 js/data.js */
    function ensureFull() {
        if (FULL) {
            if (pending) { pending = false; render(); }
            return;
        }
        if (loading) { pending = true; return; }
        loading = true;
        fetch('js/data.js', { cache: 'force-cache' })
            .then(function (r) { return r.text(); })
            .then(function (src) {
                // 在独立函数作用域里执行，避免 const 重复声明，返回四个数组
                var fn = new Function(src + '\n;return {articles: articles, research: research, snippets: snippets, biographies: biographies};');
                var out = fn();
                if (out && Array.isArray(out.articles)) {
                    FULL = out;
                    render();
                }
            })
            .catch(function () {
                /* 全文没抓到就用摘要数据，不影响基本检索 */
            })
            .then(function () {
                loading = false;
                if (pending) { pending = false; render(); }
            });
    }

    render();
    if (terms.length) ensureFull();

    if (inputEl) {
        var timer = null;
        inputEl.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(ensureFull, 260);
        });
        inputEl.addEventListener('focus', ensureFull, { once: true });
    }
})();
