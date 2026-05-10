# 运动日志网站

这是一个可以直接上传到 Git/GitHub Pages 的静态网页。打开 `index.html` 后，可以记录每天的运动日期、时长、强度、运动项目、备注和图片，并自动生成统计卡片、近 14 天柱状图、本月热力图和运动项目分布图。

## 本地打开

在 Finder 中打开这个文件夹，然后双击 `index.html`。

也可以在终端运行：

```bash
open ~/Desktop/fitness-tracker-site/index.html
```

## 上传到 GitHub

```bash
cd ~/Desktop/fitness-tracker-site
git init
git add .
git commit -m "Add fitness tracker site"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

如果用 GitHub Pages，进入仓库的 `Settings > Pages`，选择 `Deploy from a branch`，分支选 `main`，目录选 `/root`。

## 数据说明

记录和图片保存在浏览器本地存储中，不会自动上传到 GitHub。换电脑、换浏览器或清理缓存前，请先点击页面右上角的“导出记录”，以后可以用“导入记录”恢复。
