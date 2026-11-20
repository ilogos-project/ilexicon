# iLexicon 古典语言辞书平台

静态站点，部署于 GitHub Pages，自定义域 ilexicon.org。

## 版块

- `ls.html` — 在线 LS 拉汉词典：基于 Lewis & Short 结构化底库，头词检索 / 字母浏览 / 条目详情。拉丁原文释义先行，汉译分批补校。
- `magnum.html` — Magnum Lexicon Latino-Sericum / 古典拉丁语汉语大辞典：自主编纂版块，当前占位，编纂中。

## 目录

- `index.json` — 轻量词条索引：`[seq, lemma, pos, block]`，前端一次性加载用于检索。
- `data/<block>.json` — 条目详情分片，点击词条时按需加载。
- `assets/` — 样式与脚本。

## 本地预览

纯静态，需经 HTTP 访问（直接双击 file:// 会被浏览器拦截 fetch）：

```
cd ilexicon-site
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765
```

## 部署到 GitHub Pages

1. 在 ilogos-project 账号下新建仓库 `ilexicon`；
2. 上传本目录全部文件（含 `index.json`、`data/`、`assets/`、`CNAME`）；
3. 仓库 Settings → Pages → Source 选 `main` 分支根目录；
4. 等待发布，先通过 `ilogos-project.github.io/ilexicon` 验证可访问；
5. 再在 DNS 面板把 ilexicon.org 指向该 Pages 站（见下）。

## 自定义域名（ilexicon.org）

- 仓库根已含 `CNAME` 文件，内容 `ilexicon.org`；
- Cloudflare DNS 为根域配置 CNAME（或按 GitHub Pages 文档配置 A/AAAA/CNAME），指向 Pages 站点；
- 取消现有到 ilogosopen.org 的 301 跳转；
- 开启 HTTPS 强制。

## 数据口径（初稿待校）

- 条目状态 `pending_translation`：汉译 `def_zh` 暂空，前台显示“汉译待补”；
- 书证保留拉丁原文与出处；残缺、未识别项待第二版校订，不臆补；
- 42 条超长条目已原样保留，未做删截。
