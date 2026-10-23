# 循史漫记

个人历史学站点：读书笔记、史学随笔、书评、史料拾遗与专题研究。

- 线上地址：<https://historyramble.org>
- 托管：GitHub Pages（仓库 `LINNER33/historyramble`，`main` 分支根目录）
- 纯静态，无构建依赖，不需要 Node 也能正常浏览

## 目录结构

```
index.html            首页
articles.html         文章列表        articles/<id>.html     文章详情（生成）
books.html            书单
research.html         专题列表        research/<id>.html     专题详情（生成）
snippets.html         史料列表        snippets/<id>.html     史料详情（生成）
biographies.html      人物列表        biographies/<id>.html  人物详情（生成）
resources.html        学术资源
downloads.html        下载资源
about.html            关于
chess.html            中国象棋
404.html              404 页
sitemap.xml           站点地图（生成）
robots.txt            爬虫规则
css/style.css         全站样式
js/data.js            全部内容数据（主要编辑对象）
js/main.js            列表渲染逻辑
tools/                生成脚本
```

## 新增内容

绝大多数情况下只需要改 `js/data.js`，然后在仓库根目录运行：

```bash
node tools/build.mjs
```

它会重新生成四个目录下的详情页和 `sitemap.xml`。

然后提交并推送，GitHub Pages 约 1 分钟后更新：

```bash
git add -A
git commit -m "新增文章：xxx"
git push origin main
```

> 详情页是生成出来的静态 HTML，**不要手动编辑** `articles/`、`snippets/`、
> `biographies/`、`research/` 里的文件，下次构建会被覆盖。

## 脚本说明

| 脚本 | 作用 |
| --- | --- |
| `tools/build.mjs` | 由 `js/data.js` 生成详情页与 sitemap |
| `tools/patch-pages.mjs` | 给栏目页补 description / OG / canonical（只需在改版时跑一次，可重复执行） |

## 注意事项

- `article.html`、`snippet.html`、`biography.html`、`research-note.html`
  是旧链接的兼容外壳：带 `?id=` 访问时会跳转到对应的静态页。
- 列表页链接直接指向静态页，改 `js/main.js` 时注意保持 `articles/<id>.html` 这种路径。
- 新增栏目页时，记得同时在 `tools/patch-pages.mjs` 的 `PAGES` 里补上描述。
