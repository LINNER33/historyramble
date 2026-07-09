/* ===== Site navigation & routing ===== */
function renderArticles(container, count) {
    let html = '';
    const sortedByDate = [...articles].sort((a,b) => b.date.localeCompare(a.date));
    const list = count ? sortedByDate.slice(0, count) : sortedByDate;
    list.forEach(a => {
        html += `
            <div class="article-card">
                <h3><a href="article.html?id=${a.id}">${a.title}</a></h3>
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
    container.innerHTML = html;
}

function renderBooks(container, count) {
    const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);
    let html = '';
    const list = count ? books.slice(0, count) : books;
    list.forEach(b => {
        const coverHtml = b.cover
            ? `<img src="${b.cover}" alt="${b.title}">`
            : `<span style="text-align:center;padding:10px;color:#8a7a6a;">暂无<br>封面</span>`;
        html += `
            <div class="book-card">
                <div class="book-cover">${coverHtml}</div>
                <div class="book-info">
                    <h4>${b.title}</h4>
                    <div class="book-author">${b.author}</div>
                    <div class="book-rating">${stars(b.rating)}</div>
                    <div class="book-desc">${b.desc}</div>
                </div>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有推荐书目</div>';
    container.innerHTML = html;
}

// Homepage combined grid: articles and books side by side, aligned by row
function renderHomeGrid(container, count) {
    const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);
    let html = '';
    const sortedByDate = [...articles].sort((a,b) => b.date.localeCompare(a.date));
    const articleList = count ? sortedByDate.slice(0, count) : sortedByDate;
    const bookList = count ? books.slice(0, count) : books;
    const maxLen = Math.max(articleList.length, bookList.length);
    for (let i = 0; i < maxLen; i++) {
        html += '<div class="home-row">';
        if (i < articleList.length) {
            const a = articleList[i];
            html += `
                <div class="article-card">
                    <h3><a href="article.html?id=${a.id}">${a.title}</a></h3>
                    <div class="article-meta">
                        <span>${a.date}</span>
                        <span>${a.category}</span>
                        <span>${a.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                    </div>
                    <p>${a.summary}</p>
                </div>
            `;
        } else {
            html += '<div class="article-card home-empty-col"></div>';
        }
        if (i < bookList.length) {
            const b = bookList[i];
            html += `
                <div class="article-card">
                    <h3>${b.title}</h3>
                    <div class="article-meta">
                        <span>${b.author}</span>
                        <span style="color:#c49a3c;">${stars(b.rating)}</span>
                    </div>
                    <p>${b.desc}</p>
                </div>
            `;
        } else {
            html += '<div class="article-card home-empty-col"></div>';
        }
        html += '</div>';
    }
    container.innerHTML = html;
}

/* ===== 史料拾遗渲染 ===== */
function renderSnippets(container, count) {
    let html = '';
    const list = count ? snippets.slice(0, count) : snippets;
    list.forEach(s => {
        html += `
            <div class="snippet-card">
                <h3>${s.title}</h3>
                <div class="snippet-meta">
                    <span class="snippet-source">📜 ${s.source}</span>
                    <span>${s.date}</span>
                    <span>${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <blockquote class="snippet-quote">${s.excerpt}</blockquote>
                <p class="snippet-commentary">${s.commentary}</p>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有史料</div>';
    container.innerHTML = html;
}

/* ===== 人物小传渲染 ===== */
function renderBiographies(container, count) {
    let html = '';
    const list = count ? biographies.slice(0, count) : biographies;
    list.forEach(b => {
        html += `
            <div class="bio-card">
                <h3>${b.title}</h3>
                <div class="bio-meta">
                    <span>${b.period}</span>
                    <span>${b.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>
                </div>
                <p class="bio-summary">${b.summary}</p>
                <a href="biographies.html#${b.id}" class="read-more">阅读全文 →</a>
            </div>
        `;
    });
    if (!list.length) html = '<div class="empty-state">还没有人物小传</div>';
    container.innerHTML = html;
}

/* ===== 学术资源渲染 ===== */
function renderResources(container) {
    let html = '';
    resources.forEach(r => {
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
    container.innerHTML = html;
}

/* ===== 专题研究渲染 ===== */
function renderResearch(container, count) {
    let html = '';
    const list = count ? research.slice(0, count) : research;
    list.forEach(function(r) {
        html += [
            '<div class="article-card">',
            '<h3><a href="research-note.html?id=' + r.id + '">' + r.title + '</a></h3>',
            '<div class="article-meta">',
            '<span>' + r.date + '</span>',
            '<span>' + r.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</span>',
            '</div>',
            '<p>' + r.summary + '</p>',
            '</div>'
        ].join('\n');
    });
    if (!list.length) html = '<div class="empty-state">还没有专题研究</div>';
    container.innerHTML = html;
}


/* ===== 下载资源渲染 ===== */
function renderDownloads(container, count) {
    var html = '';
    var list = count ? downloads.slice(0, count) : downloads;
    list.forEach(function(d) {
        var icon = d.category === "书籍" ? "\u{1F4D6}" : "\u{1F4C4}";
        html += [
            '<div class="download-card">',
            '<div class="download-icon">' + icon + '</div>',
            '<div class="download-info">',
            '<h4>' + d.title + '</h4>',
            '<div class="download-meta">',
            '<span class="download-author">' + d.author + '</span>',
            '<span class="download-category">' + d.category + '</span>',
            '</div>',
            '<p class="download-desc">' + d.desc + '</p>',
            '<a class="download-btn" href="' + d.link + '" target="_blank" rel="noopener">前往下载 →</a>',
            '</div>',
            '</div>'
        ].join('');
    });
    if (!list.length) html = '<div class="empty-state">还没有可下载的资源</div>';
    container.innerHTML = html;
}

// Highlight current page in nav
document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('active');
    });
});





