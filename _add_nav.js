var fs = require("fs");
var pages = ["index.html","articles.html","books.html","snippets.html","biographies.html","resources.html","downloads.html","research.html","article.html","about.html"];
var n = 0;
pages.forEach(function(p) {
  var c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
  var o = c;
  c = c.replace(
    '            <a href="about.html">关于</a>',
    '            <a href="chess.html">象棋</a>\n            <a href="about.html">关于</a>'
  );
  if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); n++; }
});
console.log("Updated " + n + " pages");
var fs = require("fs");
var pages = ["index.html","articles.html","books.html","snippets.html","biographies.html","resources.html","downloads.html","research.html","article.html","about.html"];
var n = 0;
pages.forEach(function(p) {
  var c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
  var o = c;
  // Replace the 象棋 link with 闲暇 dropdown
  c = c.replace(
    '<a href="chess.html">象棋</a>',
    '<div class="nav-dropdown">\n            <a href="javascript:void(0)" class="dropbtn">闲暇</a>\n            <div class="dropdown-content">\n                <a href="chess.html">中国象棋</a>\n            </div>\n        </div>'
  );
  if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); n++; }
});
console.log("Updated " + n + " pages");
var fs = require("fs");
var pages = ["index.html","articles.html","books.html","snippets.html","biographies.html","resources.html","downloads.html","research.html","article.html","about.html"];
var n = 0;
pages.forEach(function(p) {
  var c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
  var o = c;
  // Remove the old standalone 象棋 link
  c = c.replace('\n            <a href="chess.html">象棋</a>', '');
  if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); n++; }
});
console.log("Removed old links from " + n + " pages");
var fs = require("fs");
var pages = ["index.html","articles.html","books.html","snippets.html","biographies.html","resources.html","downloads.html","research.html","article.html","about.html"];
var n = 0;
pages.forEach(function(p) {
  var c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
  var o = c;
  // Replace the entire nav section cleanly
  c = c.replace(
    /<nav>[\s\S]*?<\/nav>/,
    '<nav>\n            <a href="index.html">首页</a>\n            <a href="articles.html">文章</a>\n            <a href="books.html">书单</a>\n            <a href="research.html">专题</a>\n            <a href="snippets.html">史料</a>\n            <a href="biographies.html">人物</a>\n            <a href="resources.html">资源</a>\n            <a href="downloads.html">下载</a>\n            <div class="nav-dropdown">\n                <a href="javascript:void(0)" class="dropbtn">闲暇</a>\n                <div class="dropdown-content">\n                    <a href="chess.html">中国象棋</a>\n                </div>\n            </div>\n            <a href="about.html">关于</a>\n        </nav>'
  );
  if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); n++; }
});
console.log("Fixed " + n + " pages");
var fs = require("fs");
var c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\chess.html", "utf8");
var o = c;

// Add stylesheet link
c = c.replace(
  '<link rel="icon" type="image/svg+xml" href="favicon.svg">',
  '<link rel="stylesheet" href="css/style.css">\n    <link rel="icon" type="image/svg+xml" href="favicon.svg">'
);

// Wrap body content: add header before chess, footer after
var header = '<header>\n    <div class="header-inner">\n        <div class="site-title">循史漫记 <small>历史学读书与思考</small></div>\n        <nav>\n            <a href="index.html">首页</a>\n            <a href="articles.html">文章</a>\n            <a href="books.html">书单</a>\n            <a href="research.html">专题</a>\n            <a href="snippets.html">史料</a>\n            <a href="biographies.html">人物</a>\n            <a href="resources.html">资源</a>\n            <a href="downloads.html">下载</a>\n            <div class="nav-dropdown">\n                <a href="javascript:void(0)" class="dropbtn">闲暇</a>\n                <div class="dropdown-content">\n                    <a href="chess.html">中国象棋</a>\n                </div>\n            </div>\n            <a href="about.html">关于</a>\n        </nav>\n    </div>\n</header>\n';
var footer = '\n<footer>\n    <div class="wrapper">\n        <p>© 2026 循史漫记 · Powered by pure static web</p>\n    </div>\n</footer>\n';

// Insert header after <body> and footer before </body>
c = c.replace('<body>', '<body>\n' + header);
c = c.replace('</body>', footer + '\n</body>');

// Change body styles to not be flex centered (header/footer will handle layout)
c = c.replace(
  'body {\n    min-height: 100vh;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #263238;',
  'body {\n    min-height: 100vh;\n    background: #263238;'
);

// Add a wrapper for the chess game content
c = c.replace('<div class="app">', '<div class="wrapper" style="padding-top:80px;">\n<div class="app">');

if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\chess.html", c, "utf8"); console.log("Updated chess.html"); }
else { console.log("No changes"); }
