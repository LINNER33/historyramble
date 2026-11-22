// 列表页精简数据集的生成逻辑（build.mjs 与 build-index.mjs 共用）
import vm from 'node:vm';

const pick = (o, keys) => {
  const out = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
};

export function indexText(dataSrc) {
  const data = vm.runInNewContext(
    dataSrc +
      ';\n({ articles, snippets, biographies, research, books, resources, downloads, historyBooks, paperDownloads })',
    {}
  );
  const out = {
    articles: data.articles.map((a) => pick(a, ['id', 'title', 'date', 'category', 'tags', 'summary'])),
    // 列表卡片只显示按语第一段，这里同步裁剪
    snippets: data.snippets.map((s) => {
      const o = pick(s, ['id', 'title', 'source', 'date', 'tags', 'excerpt']);
      const first = String(s.commentary || '').match(/<p>[\s\S]*?<\/p>/);
      o.commentary = first ? first[0] : String(s.commentary || '');
      return o;
    }),
    biographies: data.biographies.map((b) => pick(b, ['id', 'title', 'period', 'tags', 'summary'])),
    research: data.research.map((r) => pick(r, ['id', 'title', 'date', 'tags', 'summary'])),
    books: data.books.map((b) => pick(b, ['id', 'title', 'author', 'rating', 'desc', 'cover'])),
    resources: data.resources,
    downloads: data.downloads,
    historyBooks: data.historyBooks,
    paperDownloads: data.paperDownloads,
    indexOnly: true,
  };
  const header = '/* 自动生成，请勿手改：列表页精简数据集（由 js/data.js 生成，工具见 tools/lib/index-data.mjs） */\n';
  const body = Object.keys(out)
    .map((k) => 'const ' + k + ' = ' + JSON.stringify(out[k]) + ';')
    .join('\n\n');
  return header + body + '\n';
}
