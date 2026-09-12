# 地球八大奇迹 · Tellux

独立于 `Pentagon3D` 的地球演示：用开源三维地球引擎 [Tellux](https://github.com/cyanfish-x/tellux) 把 **2007 新世界七大奇迹** 和荣誉成员 **吉萨大金字塔** 放到真实经纬度上。

遗址几何是示意体块，不是测绘模型。底图默认走 **ArcGIS World Imagery**（无需 token）。不配置 Cesium Ion / 天地图密钥时使用椭球，没有真实地形起伏。

## 八处地点

| # | 名称 | 位置 |
| --- | --- | --- |
| 1 | 吉萨金字塔 | 埃及开罗 |
| 2 | 中国长城（八达岭） | 中国北京 |
| 3 | 佩特拉 | 约旦 |
| 4 | 罗马斗兽场 | 意大利罗马 |
| 5 | 奇琴伊察 | 墨西哥尤卡坦 |
| 6 | 马丘比丘 | 秘鲁 |
| 7 | 泰姬陵 | 印度阿格拉 |
| 8 | 基督像 | 巴西里约 |

## 启动

需要 Node.js 18+。依赖树里的 Takram 包会带上 React peer，本项目用 `.npmrc` 的 `legacy-peer-deps=true` 跳过这层冲突（应用本身不用 React）。

```bash
cd EarthWonders
npm install
npm run dev
```

浏览器打开 http://localhost:5173

Windows 也可双击 `start.bat`。

本地静态预览：

```bash
npm run build
npm run preview
```

## GitHub Pages

仓库构建产物是纯静态文件（`index.html` + JS/CSS + 贴图）。没有后端、没有登录、没有必须的 API key。

运行时会向 **ArcGIS World Imagery** 请求卫星瓦片，所以浏览器仍需要能访问外网。Tellux / Three.js 会走 WebGL，手机或低配设备可能较卡。

发布步骤：

1. 在 GitHub 新建空仓库（例如 `EarthWonders`），不要勾选自动添加 README。
2. 在本目录执行：

```bash
git init
git add .
git commit -m "Initial commit: Earth Wonders on Tellux"
git branch -M main
git remote add origin https://github.com/<你的用户名>/EarthWonders.git
git push -u origin main
```

3. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**。
4. 推送 `main` 后，工作流 `.github/workflows/pages.yml` 会 `npm ci`、`npm run build` 并发布 `dist`。
5. 站点地址一般为 `https://<你的用户名>.github.io/EarthWonders/`

`vite.config.ts` 已设 `base: './'`，贴图走相对路径，项目站点（非用户根站点）也能打开。

## 操作

| 操作 | 作用 |
| --- | --- |
| 拖动 / 滚轮 | 旋转、缩放地球 |
| 点击右侧列表或地球标记 | 飞向该遗址 |
| 环球巡礼 | 按 1→8 顺序飞一遍 |
| 返回太空 | 拉回到全球视角 |
| 键盘 `1`–`8` | 直达对应奇迹 |
| `T` | 开始巡礼 |
| `Esc` | 停止并返回太空 |

## 可选数据源

若有 Cesium Ion 或天地图 token，可在 Viewer 初始化里改 `terrain` / `overlays`（见 Tellux 文档）。当前仓库刻意保持零密钥可运行。
