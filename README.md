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
| `tools/build.mjs` | 由 `js/data.js` 生成详情页、`sitemap.xml`、`feed.xml`、`tags.html` 与 `js/data-index.js`，并给静态资源加版本号 |
| `tools/build-index.mjs` | 单独生成 `js/data-index.js`（正常流程已被 build.mjs 覆盖，一般不用跑） |
| `tools/check-data.mjs` | 数据体检：id 唯一、日期格式、标题引号、摘要/正文长度、禁用标签等；有问题时以非零退出码结束 |
| `tools/fix-titles.mjs` | 去掉被整对中文引号包裹的标题外层引号（`--write` 才落盘） |
| `tools/og-template.html` | 分享图设计稿（1200×630），配合 headless Chrome 截图生成 `images/og-default.png` |

## 数据分层

- `js/data.js`：完整数据（含正文），构建时读它，搜索页在用户真正检索时才懒加载它。
- `js/data-index.js`：构建自动生成的精简索引（不含正文，约 250 KB），列表页只加载它，
  因此列表页首屏不再需要下载近 1 MB 的数据。**不要手改这个文件**，每次构建都会覆盖。

## 近期改进（2026-11）

1. 列表页瘦身：新增 `js/data-index.js`，12 个列表/跳转页改加载它，about 页不再加载数据脚本。
2. 分享与收录：新增 `images/og-default.png`、`feed.xml`（RSS）；详情页 JSON-LD 改为
   `@graph`（含 image / author / dateModified / BreadcrumbList）；sitemap 的 `lastmod`
   改为内容最新日期（不再每次构建刷成当天）。
3. 专题分组：`research.html` 按「隋唐与高句丽战争研究 / 东北亚与欧亚交流 / 史学史与史料 /
   其他专题」分区显示，首页仍只取最新几条。
4. 移动端导航：700px 以下改为复选框折叠菜单，新增「跳到正文」链接，导航加 `aria-label`。
5. 标签索引：新增 `tags.html`（标签云 + 按标签分组），搜索页改为懒加载全文。
6. 书单封面：无封面图时用书名与作者排版成文字书封，不再显示「暂无封面」灰块。
7. 数据体检：新增 `tools/check-data.mjs`，顺手清理了 18 个被整对引号包裹的旧标题。

## 内容方针

- **新增文章以中国史为主**（2026-11 定的方向）。现状是：文章按题材单选分类，`中国史` 只有 15 篇，
  而中国主题其实分散在 `制度史`（10）、`社会史`（10）、`经济史`（8）与部分 `史学理论` 里，
  合计约 48 篇，但读者在列表页看不到「中国史」的全貌。
- 后续每批新增（比如一次 10 篇）建议至少 6 篇放在 `中国史` 分类，优先补断代与专题：
  先秦、秦汉、魏晋南北朝、隋唐、宋元、明清各一到两篇，选题避开已有条目
  （先用 `_site` 之外的脚本或 `tools/check-data.mjs` 同类的清单核对 id 与标题）。
- 若之后想让分类更好用，可考虑在 `articles.html` 顶部加分类筛选（带篇数），
  与 `research.html` 的专题系列导航同一套交互。

## 回档

改进前的站点打了标签 `pre-improve-20261122`，需要整站回退到改进前的状态时：

```bash
git reset --hard pre-improve-20261122
git push --force-with-lease origin main
```
