echo ===== 第一步：提交代码 =====
git add -A
git commit -m "新增5篇文章和5本新书推荐"

echo ===== 第二步：推送到 GitHub =====
git push origin main

echo ===== 完成！Netlify 会自动部署 =====
echo 约1-2分钟后访问 https://historyramble.netlify.app 即可看到更新
