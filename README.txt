==========================================
  循史漫记 — 个人历史学读书网站
==========================================

=== 如何上线（免费，Netlify）===

1. 打开 https://app.netlify.com/
2. 用 GitHub / Google 账号注册登录
3. 把整个 "循史漫记网站" 文件夹拖到浏览器窗口
4. 等几秒钟，Netlify 会自动部署
5. 你会得到一个类似 random-name.netlify.app 的网址
6. 以后每次更新内容，重新拖一遍文件夹就行

=== 如何添加新文章 ===

1. 用记事本打开 js/data.js
2. 在 articles 数组里，按照已有的格式加一条新数据：

{
    id: "my-new-article",
    title: "文章标题",
    date: "2026-06-14",
    category: "中国史",
    tags: ["标签1", "标签2"],
    summary: "文章简介，会显示在列表页",
    content: "<p>文章正文 HTML</p>"
}

3. 保存文件
4. 把整个文件夹重新拖到 Netlify 上部署

=== 如何添加新书 ===

在 books 数组里加一条，格式类似。

=== 如何修改个人信息 ===

在 data.js 最下面的 author 对象里改。

=== 文件结构 ===

循史漫记网站/
├── index.html      首页
├── articles.html   文章列表
├── article.html    单篇文章（自动根据 id 加载）
├── books.html      书单页
├── about.html      关于我
├── css/
│   └── style.css   样式
├── js/
│   ├── data.js     所有内容数据（你只需要编辑这个文件）
│   └── main.js     功能逻辑（不需要动）
└── images/         放图片的地方
