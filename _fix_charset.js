const fs = require("fs");
const pages = ["index.html","articles.html","books.html","snippets.html","biographies.html","resources.html","downloads.html","research.html","article.html"];
let n = 0;
pages.forEach(p => {
  try {
    let c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
    let o = c;
    c = c.replace(/(<script src="js\/data\.js")>/g, '$1 charset="UTF-8">');
    if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); n++; }
  } catch(e) {}
});
console.log("Fixed " + n + " pages");
// Also fix main.js
pages.forEach(p => {
  try {
    let c = fs.readFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, "utf8");
    let o = c;
    c = c.replace(/(<script src="js\/main\.js")>/g, '$1 charset="UTF-8">');
    if (c !== o) { fs.writeFileSync("C:\\Users\\华为\\Documents\\historyramble\\" + p, c, "utf8"); }
  } catch(e) {}
});
console.log("Done fixing main.js too");
