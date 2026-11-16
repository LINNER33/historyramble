/* ------------------------------------------------------------
 * 站内搜索：读取 js/data.js 暴露的四个内容数组，在浏览器本地过滤并渲染结果。
 * 页面：search.html（读取 ?q= 参数）
 * ------------------------------------------------------------ */
(function () {
    'use strict';

    var listEl = document.getElementById('searchResults');
    var summaryEl = document.getElementById('searchSummary');
    var inputEl = document.getElementById('searchInput');
    if (!listEl) return;

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

    // data.js 里的四个数组是顶层 const，后续脚本可直接按名引用
    function safeList(fn) {
        try {
            var list = fn();
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    var SOURCES = [
        {
            label: '文章', dir: 'articles', items: safeList(function () { return articles; }),
            meta: function (a) { return [a.date, a.category].filter(Boolean).join(' · '); },
            body: function (a) { return a.summary || plain(a.content); },
            full: function (a) {
                return [a.title, a.category, (a.tags || []).join(' '), a.summary, plain(a.content)].join(' ');
            }
        },
        {
            label: '专题', dir: 'research', items: safeList(function () { return research; }),
            meta: function (a) { return [a.date, '专题研究'].filter(Boolean).join(' · '); },
            body: function (a) { return a.summary || plain(a.content); },
            full: function (a) {
                return [a.title, (a.tags || []).join(' '), a.summary, plain(a.content)].join(' ');
            }
        },
        {
            label: '史料', dir: 'snippets', items: safeList(function () { return snippets; }),
            meta: function (s) { return [s.date, s.source].filter(Boolean).join(' · '); },
            body: function (s) { return s.excerpt || plain(s.commentary); },
            full: function (s) {
                return [s.title, s.source, (s.tags || []).join(' '), s.excerpt, plain(s.commentary)].join(' ');
            }
        },
        {
            label: '人物', dir: 'biographies', items: safeList(function () { return biographies; }),
            meta: function (b) { return b.period || ''; },
            body: function (b) { return b.summary || plain(b.content); },
            full: function (b) {
                return [b.title, b.period, (b.tags || []).join(' '), b.summary, plain(b.content)].join(' ');
            }
        }
    ];

    var records = [];
    SOURCES.forEach(function (src) {
        (src.items || []).forEach(function (it) {
            if (!it || !it.id) return;
            records.push({
                kind: src.label,
                href: src.dir + '/' + it.id + '.html',
                title: it.title || '',
                tags: it.tags || [],
                meta: src.meta(it),
                body: plain(src.body(it)),
                hay: src.full(it).toLowerCase()
            });
        });
    });

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

    function tagChips() {
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

    function counts() {
        var c = {};
        records.forEach(function (r) { c[r.kind] = (c[r.kind] || 0) + 1; });
        return ['文章', '专题', '史料', '人物'].map(function (k) {
            return k + ' ' + (c[k] || 0);
        }).join(' · ');
    }

    if (!terms.length) {
        summaryEl.textContent = '本站现有 ' + counts() + '，共 ' + records.length + ' 篇内容。输入关键词开始搜索。';
        listEl.innerHTML = tagChips();
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
          (hits.length > LIMIT ? '，显示前 ' + LIMIT + ' 条' : '') + '。'
        : '没有找到与「' + q + '」相关的内容。';

    if (!hits.length) {
        listEl.innerHTML = '<p class="search-empty">可以试试更短的关键词（如「唐代」「敦煌」），' +
            '或者换个说法；本站内容以中文撰写，暂不支持拼音检索。</p>' + tagChips();
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
})();
