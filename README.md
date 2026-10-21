# huangguan-pages-node

Cloudflare **Pages** 版 VLESS-over-WebSocket 节点（2026-10-21 实测可用；同一代码在 Workers 上会报 1101，请用 Pages）。

## 部署
1. 把 `_worker.js` 第 9 行的 `YOUR-UUID-HERE` 换成你自己的 UUID。
2. Cloudflare → Workers 和 Pages → 创建 → Pages → 上传资产，把只含 `_worker.js` 的文件夹/zip 上传。
3. 打开 `xxx.pages.dev` 能看到落地页即成功，再在「自定义域」绑定自己的域名。

## 客户端
VLESS + WS + TLS，端口 443，path `/`，host / SNI = 你的域名，地址可填优选 IP。

## 说明
- 直连失败时（X、ChatGPT 等 Cloudflare 站点）走公共反代 `pyip.ygkkk.dpdns.org`，出口 IP 会变。
- 不要把真实 UUID 提交到公开仓库。
