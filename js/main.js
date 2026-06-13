/* ===== Site navigation & routing ===== */
function renderArticles(container, count) {
    let html = '';
    const list = count ? articles.slice(0, count) : articles;
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
    const articleList = count ? articles.slice(0, count) : articles;
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

// Highlight current page in nav
document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('active');
    });
});
