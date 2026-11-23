/* ------------------------------------------------------------
 * 站内搜索
 * 首屏只依赖 js/data-index.js（精简数据集），用户真正输入关键词时
 * 才异步抓取 js/data.js，做正文全文检索。
 * 支持：多关键词（空格分隔，AND）、按栏目筛选、按相关度或时间排序
 * 页面：search.html（读取 ?q= / &type= / &sort= 参数）
 * ------------------------------------------------------------ */
(function () {
    'use strict';

    var listEl = document.getElementById('searchResults');
    var summaryEl = document.getElementById('searchSummary');
    var inputEl = document.getElementById('searchInput');
    if (!listEl) return;

    var FULL = null;
    var loading = false;
    var pending = false;

    var params = new URLSearchParams(location.search);
    var q = (params.get('q') || '').trim();
    var typeFilter = (params.get('type') || '').trim();
    var sortMode = params.get('sort') === 'date' ? 'date' : 'score';

    if (inputEl) inputEl.value = q;
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    var KINDS = ['文章', '专题', '史料', '人物', '书籍'];

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

    function buildRecords() {
        var src = FULL || {
            articles: safeList(function () { return articles; }),
            research: safeList(function () { return research; }),
            snippets: safeList(function () { return snippets; }),
            biographies: safeList(function () { return biographies; }),
            books: safeList(function () { return books; })
        };
        var full = !!FULL;
        var sources = [
            {
                label: '文章', dir: 'articles', items: src.articles,
                meta: function (a) { return [a.date, a.category].filter(Boolean).join(' · '); },
                body: function (a) { return a.summary || plain(a.content); },
                hay: function (a) {
                    return [a.title, a.category, (a.tags || []).join(' '), a.summary, full ? plain(a.content) : ''].join(' ');
                }
            },
            {
                label: '专题', dir: 'research', items: src.research,
                meta: function (a) { return [a.date, '专题研究'].filter(Boolean).join(' · '); },
                body: function (a) { return a.summary || plain(a.content); },
                hay: function (a) {
                    return [a.title, (a.tags || []).join(' '), a.summary, full ? plain(a.content) : ''].join(' ');
                }
            },
            {
                label: '史料', dir: 'snippets', items: src.snippets,
                meta: function (s) { return [s.date, s.source].filter(Boolean).join(' · '); },
                body: function (s) { return s.excerpt || plain(s.commentary); },
                hay: function (s) {
                    return [s.title, s.source, (s.tags || []).join(' '), s.excerpt, plain(s.commentary)].join(' ');
                }
            },
            {
                label: '人物', dir: 'biographies', items: src.biographies,
                meta: function (b) { return b.period || ''; },
                body: function (b) { return b.summary || plain(b.content); },
                hay: function (b) {
                    return [b.title, b.period, (b.tags || []).join(' '), b.summary, full ? plain(b.content) : ''].join(' ');
                }
            },
            {
                label: '书籍', dir: 'books', items: src.books,
                meta: function (b) { return [b.author, b.author ? '书单' : ''].filter(Boolean).join(' · '); },
                body: function (b) { return b.desc || ''; },
                hay: function (b) { return [b.title, b.author, (b.tags || []).join(' '), b.desc].join(' '); }
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
                    date: it.date || '',
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
        return KINDS.map(function (k) { return k + ' ' + (c[k] || 0); }).join(' · ');
    }

    function linkWith(overrides) {
        var p = new URLSearchParams(location.search);
        p.set('q', q);
        if (overrides.type !== undefined) {
            if (overrides.type) p.set('type', overrides.type);
            else p.delete('type');
        }
        if (overrides.sort !== undefined) {
            if (overrides.sort && overrides.sort !== 'score') p.set('sort', overrides.sort);
            else p.delete('sort');
        }
        var s = p.toString();
        return 'search.html' + (s ? '?' + s : '');
    }

    function filterBar(hits) {
        var byKind = {};
        hits.forEach(function (h) { byKind[h.r.kind] = (byKind[h.r.kind] || 0) + 1; });
        var chips = [{ label: '全部', type: '', n: hits.length }].concat(
            KINDS.map(function (k) { return { label: k, type: k, n: byKind[k] || 0 }; })
        );
        var html = '<div class="search-filters" role="group" aria-label="按栏目筛选">';
        html += chips.map(function (c) {
            var active = c.type === typeFilter;
            return '<a class="search-filter' + (active ? ' active' : '') + '"' +
                ' href="' + linkWith({ type: c.type }) + '"' +
                (active ? ' aria-current="true"' : '') + '>' +
                esc(c.label) + '<span class="search-filter-count">' + c.n + '</span></a>';
        }).join('');
        html += '</div>';
        html += '<p class="search-sort">排序：' +
            (sortMode === 'date'
                ? '<span aria-current="true">按时间</span> · <a href="' + linkWith({ sort: 'score' }) + '">按相关度</a>'
                : '<span aria-current="true">按相关度</span> · <a href="' + linkWith({ sort: 'date' }) + '">按时间</a>') +
            '</p>';
        return html;
    }

    function render() {
        var records = buildRecords();

        if (!terms.length) {
            summaryEl.textContent = '本站现有 ' + counts(records) + '，共 ' + records.length + ' 条内容。输入关键词开始搜索。';
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

        hits.sort(function (a, b) {
            if (sortMode === 'date') {
                var d = (b.r.date || '').localeCompare(a.r.date || '');
                if (d) return d;
            }
            return b.score - a.score;
        });

        var filtered = typeFilter ? hits.filter(function (h) { return h.r.kind === typeFilter; }) : hits;
        var LIMIT = 60;
        var shown = filtered.slice(0, LIMIT);

        summaryEl.textContent = filtered.length
            ? '找到 ' + filtered.length + ' 条与「' + q + '」相关的内容' +
              (typeFilter ? '（限' + typeFilter + '）' : '') +
              (filtered.length > LIMIT ? '，显示前 ' + LIMIT + ' 条' : '') +
              (FULL ? '。' : '（当前为摘要检索，正在载入全文…）')
            : (typeFilter
                ? '在「' + typeFilter + '」里没有找到与「' + q + '」相关的内容，可以切到「全部」看看。'
                : '没有找到与「' + q + '」相关的内容。');

        var bar = filterBar(hits);

        if (!filtered.length) {
            listEl.innerHTML = bar +
                '<p class="search-empty">可以试试更短的关键词（如「唐代」「敦煌」），' +
                '或者换个说法；本站内容以中文撰写，暂不支持拼音检索。</p>' + tagChips(records);
            return;
        }

        listEl.innerHTML = bar + '<ul class="search-list">' + shown.map(function (h) {
            var r = h.r;
            return '<li class="search-item">' +
                '<h3><span class="search-kind">' + r.kind + '</span>' +
                '<a href="' + r.href + '">' + highlight(r.title) + '</a></h3>' +
                '<p class="search-excerpt">' + highlight(excerpt(r.body, 150)) + '</p>' +
                (r.meta ? '<p class="search-meta">' + esc(r.meta) + '</p>' : '') +
                '</li>';
        }).join('') + '</ul>';
    }

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
                var fn = new Function(src + '\n;return {articles: articles, research: research, snippets: snippets, biographies: biographies, books: books};');
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
        // “/” 或 Ctrl/Cmd+K 聚焦搜索框
        document.addEventListener('keydown', function (e) {
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                inputEl.focus();
                inputEl.select();
            }
        });
    }
})();
