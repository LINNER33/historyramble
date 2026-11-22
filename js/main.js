/* ===== Site navigation & routing ===== */

// 板块条数提示：列表页显示总量，首页说明只列最新若干条
function countLine(total, unit, shown) {
    if (!total) return '';
    var txt = '共 ' + total + ' ' + unit;
    if (shown && shown < total) txt += '，下面列出最新 ' + shown + ' ' + unit;
    return '<p class="section-count">' + txt + '</p>';
}

function renderArticles(container, count) {
    let html = '';
    const sortedByDate = [...articles].sort((a,b) => b.date.localeCompare(a.date));
    const list = count ? sortedByDate.slice(0, count) : sortedByDate;
    list.forEach(a => {
        html += `
            <div class="article-card">
                <h3><a href="articles/${a.id}.html">${a.title}</a></h3>
                <div class="article-meta">
                    <span>${a.date}</span>
                    <span>${a.category}</span>
                    <span>${a.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <p>${a.summary}</p>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有文章</div>';
    container.innerHTML = countLine(articles.length, '篇', list.length) + html;
}

function renderBooks(container, count) {
    const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);
    let html = '';
    const sortedByNew = [...books].reverse();
    const list = count ? sortedByNew.slice(0, count) : sortedByNew;
    list.forEach(b => {
        const coverHtml = b.cover
            ? `<img src="${b.cover}" alt="${b.title}">`
            : `<span class="cover-text"><span class="cover-title">${b.title}</span><span class="cover-author">${b.author}</span></span>`;
        html += `
            <div class="book-card">
                <div class="book-cover">${coverHtml}</div>
                <div class="book-info">
                    <h3>${b.title}</h3>
                    <div class="book-author">${b.author}</div>
                    <div class="book-rating">${stars(b.rating)}</div>
                    <div class="book-desc">${b.desc}</div>
                </div>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有推荐书目</div>';
    container.innerHTML = countLine(books.length, '本', list.length) + html;
}

// Homepage: recent books (text only, no cover art)
function renderHomeBooks(container, count) {
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    let html = '';
    const list = count ? [...books].reverse().slice(0, count) : [...books].reverse();
    list.forEach(b => {
        html += `
            <div class="book-item">
                <h3>${b.title}</h3>
                <div class="article-meta">
                    <span>${b.author}</span>
                    <span class="book-rating">${stars(b.rating)}</span>
                </div>
                <p>${b.desc}</p>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有推荐书目</div>';
    container.innerHTML = countLine(books.length, '本', list.length) + html;
}

// Homepage: latest articles
function renderHomeArticles(container, count) {
    let html = '';
    const sortedByDate = [...articles].sort((a,b) => b.date.localeCompare(a.date));
    const list = count ? sortedByDate.slice(0, count) : sortedByDate;
    list.forEach(a => {
        html += `
            <div class="article-card">
                <h3><a href="articles/${a.id}.html">${a.title}</a></h3>
                <div class="article-meta">
                    <span>${a.date}</span>
                    <span>${a.category}</span>
                    <span>${a.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <p>${a.summary}</p>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有文章</div>';
    container.innerHTML = countLine(articles.length, '篇', list.length) + html;
}

/* ===== 史料拾遗渲染 ===== */function renderSnippets(container, count) {
    let html = '';
    const sortedByDate = [...snippets].sort((a,b) => b.date.localeCompare(a.date));
    const list = count ? sortedByDate.slice(0, count) : sortedByDate;
    list.forEach(s => {
        html += `
            <div class="snippet-card" id="${s.id}">
                <h3><a href="snippets/${s.id}.html">${s.title}</a></h3>
                <div class="snippet-meta">
                    <span class="snippet-source">📜 ${s.source}</span>
                    <span>${s.date}</span>
                    <span>${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <blockquote class="snippet-quote">${s.excerpt}</blockquote>
                <div class="snippet-commentary">${(String(s.commentary).match(/<p>[\s\S]*?<\/p>/) || [s.commentary])[0]}</div>
                <a href="snippets/${s.id}.html" class="read-more">阅读全文 →</a>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有史料</div>';
    container.innerHTML = countLine(snippets.length, '条', list.length) + html;
}

/* ===== 人物小传渲染 ===== */
function renderBiographies(container, count) {
    let html = '';
    const sortedByNew = [...biographies].reverse();
    const list = count ? sortedByNew.slice(0, count) : sortedByNew;
    list.forEach(b => {
        html += `
            <div class="bio-card" id="${b.id}">
                <h3><a href="biographies/${b.id}.html">${b.title}</a></h3>
                <div class="bio-meta">
                    <span>${b.period}</span>
                    <span>${b.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <p class="bio-summary">${b.summary}</p>
                <a href="biographies/${b.id}.html" class="read-more">阅读全文 →</a>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有人物小传</div>';
    container.innerHTML = countLine(biographies.length, '篇', list.length) + html;
}

/* ===== 学术资源渲染 ===== */
function renderResources(container, count) {
    let html = '';
    const list = count ? resources.slice(0, count) : resources;
    list.forEach(r => {
        html += `
            <div class="resource-group">
                <h3 class="resource-category">${r.category}</h3>
                <div class="resource-list">
        `;
        r.items.forEach(item => {
            const linkHtml = item.url
                ? `<a href="${item.url}" target="_blank" rel="noopener">${item.name} ↗</a>`
                : `<span>${item.name}</span>`;
            html += `
                <div class="resource-item">
                    <div class="resource-name">${linkHtml}</div>
                    <div class="resource-desc">${item.desc}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    });
    container.innerHTML = countLine(resources.length, '组', list.length) + html;
}

/* ===== 专题研究渲染 ===== */
// 专题按系列分组：唐与高句丽战争专题已成规模，单独成组，其余按主题归并
const RESEARCH_SERIES = [
    { key: 'tang', name: '隋唐与高句丽战争研究', tags: ['唐与高句丽', '唐丽战争'] },
    { key: 'hist', name: '史学史与史料', tags: ['史学史', '学术史', '学术制度', '知识史', '疑古', '甲骨', '出土文献', '史料'] },
    { key: 'eastasia', name: '东北亚与欧亚交流', tags: ['边疆', '渤海', '契丹', '北方民族', '靺鞨', '东亚史', '日本史', '粟特', '丝绸之路', '全球贸易', '白银'] },
];

function researchSeriesOf(r) {
    const tags = r.tags || [];
    for (const s of RESEARCH_SERIES) {
        if (tags.some(function (t) { return s.tags.indexOf(t) >= 0; })) return s;
    }
    return { key: 'other', name: '其他专题' };
}

function renderResearch(container, count) {
    const sortedByDate = [...research].sort((a,b) => b.date.localeCompare(a.date));
    const list = count ? sortedByDate.slice(0, count) : sortedByDate;
    const cardHtml = function (r) {
        return [
            '<div class="article-card">',
            '<h3><a href="research/' + r.id + '.html">' + r.title + '</a></h3>',
            '<div class="article-meta">',
            '<span>' + r.date + '</span>',
            '<span>' + r.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</span>',
            '</div>',
            '<p>' + r.summary + '</p>',
            '</div>'
        ].join('\n');
    };

    let html = '';
    if (count) {
        // 首页只取最新几条，不分组
        html = list.map(cardHtml).join('\n');
    } else {
        // 列表页按系列分组：先唐丽战争大类，再接其他系列，组内仍按日期倒序
        const order = ['tang', 'eastasia', 'hist', 'other'];
        const groups = {};
        list.forEach(function (r) {
            const s = researchSeriesOf(r);
            if (!groups[s.key]) groups[s.key] = { name: s.name, items: [] };
            groups[s.key].items.push(r);
        });
        order.forEach(function (key) {
            const g = groups[key];
            if (!g || !g.items.length) return;
            html += '<section class="series-block">';
            html += '<h3 class="series-title">' + g.name + '<span class="series-count">' + g.items.length + ' 篇</span></h3>';
            html += g.items.map(cardHtml).join('\n');
            html += '</section>';
        });
    }
    if (!list.length) html = '<div class="empty-state">还没有专题研究</div>';
    container.innerHTML = countLine(research.length, '篇', list.length) + html;
}


/* ===== 下载资源渲染 ===== */
// 文件大小标签（数据里填写 size 字段时才显示）
function sizeSpan(d) {
    return d.size ? '<span class="download-size">' + d.size + '</span>' : '';
}

function renderDownloads(container, count) {
    var html = '';
    var sortedByNew = downloads.slice().reverse();
    var list = count ? sortedByNew.slice(0, count) : sortedByNew;
    list.forEach(function(d) {
        var icon = d.category === "书籍" ? "\u{1F4D6}" : "\u{1F4C4}";
        html += [
            '<div class="download-card">',
            '<div class="download-icon">' + icon + '</div>',
            '<div class="download-info">',
            '<h3>' + d.title + '</h3>',
            '<div class="download-meta">',
            '<span class="download-author">' + d.author + '</span>',
            '<span class="download-category">' + d.category + '</span>',
            sizeSpan(d),
            '</div>',
            '<p class="download-desc">' + d.desc + '</p>',
            '<a class="download-btn" href="' + d.link + '" target="_blank" rel="noopener">前往下载 →</a>',
            '</div>',
            '</div>'
        ].join('');
    });
    if (!list.length) html = '<div class="empty-state">还没有可下载的资源</div>';
    container.innerHTML = countLine(downloads.length, '项', list.length) + html;
}

/* ===== 史书下载渲染 ===== */
function renderHistoryBooks(container, count) {
    let html = '';
    const list = count ? historyBooks.slice(0, count) : historyBooks;
    list.forEach(d => {
        html += `
            <div class="download-card">
                <div class="download-icon">📜</div>
                <div class="download-info">
                    <h3>${d.title}</h3>
                    <div class="download-meta">
                        <span class="download-author">${d.author}</span>
                        <span class="download-category">史书</span>
                        ${d.size ? `<span class="download-size">${d.size}</span>` : ''}
                    </div>
                    <p class="download-desc">${d.desc}</p>
                    <a class="download-btn" href="${d.link}" target="_blank" rel="noopener">前往下载 →</a>
                </div>
            </div>
        `;
    });
    if (!list.length) {
        html = '<div class="empty-state">史书资源整理中，敬请期待</div>';
    }
    container.innerHTML = countLine(historyBooks.length, '本', list.length) + html;
}

/* ===== 论文下载渲染 ===== */
function renderPaperDownloads(container, count) {
    let html = '';
    const list = count ? paperDownloads.slice(0, count) : paperDownloads;
    list.forEach(d => {
        html += `
            <div class="download-card">
                <div class="download-icon">📄</div>
                <div class="download-info">
                    <h3>${d.title}</h3>
                    <div class="download-meta">
                        <span class="download-author">${d.author}</span>
                        <span class="download-category">论文</span>
                        ${d.size ? `<span class="download-size">${d.size}</span>` : ''}
                    </div>
                    <p class="download-desc">${d.desc}</p>
                    <a class="download-btn" href="${d.link}" target="_blank" rel="noopener">前往下载 →</a>
                </div>
            </div>
        `;
    });
    if (!list.length) {
        html = '<div class="empty-state">论文资源整理中，敬请期待</div>';
    }
    container.innerHTML = countLine(paperDownloads.length, '篇', list.length) + html;
}

// Highlight current page in nav
document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('active');
    });
});





