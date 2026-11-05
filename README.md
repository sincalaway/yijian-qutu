# 一键取图

免费实用的图片处理工具集合。一套代码，两种用法：

- **网页 / PWA**：`www/` 是纯静态站点，任何静态托管都能部署（GitHub Pages、Vercel、Netlify、Nginx）。手机浏览器打开后可「添加到主屏幕」。
- **Android APK**：用 [Capacitor](https://capacitorjs.com/) 打包，GitHub Actions 每次推送自动构建。

所有图片都在本机 Canvas 处理，不上传服务器；处理结果 24 小时后自动清除。

## 下载 APK

- 最新构建：仓库的 **Releases → 最新构建（latest）**，下载 `yijian-qutu.apk` 直接安装。
- 打 tag（如 `v1.0.1`）会生成正式版本 Release。
- 每次构建的 APK 也在 **Actions → Build Android APK → Artifacts** 里。

> 这是 debug 签名的安装包，可直接安装。上架应用商店需换成自己的签名（见下文）。

## 在线使用

推送到 `main` 后自动部署到 GitHub Pages：`https://sincalaway.github.io/yijian-qutu/`
（首次需在仓库 Settings → Pages → Source 选择 **GitHub Actions**）

## 功能

| 模块 | 页面 | 说明 |
|---|---|---|
| 首页 | `#/` | Banner 轮播、快捷入口（粘贴链接🔥/视频取图/提取音频/提取文案/去字幕）、10 个工具卡片、更多小工具、短剧广告位、添加到桌面 / 分享给好友 |
| 图片压缩 | `#/compress` | 压缩比例、尺寸比例滑块（默认 80%）、自定义尺寸、原图 / 预计信息 |
| 格式转换 | `#/convert` | JPG / PNG / WEBP / BMP 批量互转 |
| 智能去水印 | `#/watermark` | 普通（免费）/ 高级（限免）：涂抹去除、画笔大小、撤销、多轮去除 |
| 图片拼接 | `#/stitch` | 添加、删除、排序，横向（绿）/ 竖向（粉）拼接 |
| 图片裁剪 | `#/crop` | 圆形头像、批量改尺寸、智能尺寸裁剪（模糊垫底）、自定义切图、快速裁剪 |
| 图片增强 | `#/enhance` | 清晰度增强、2 倍放大、镜像翻转、超高清增强，按住对比原图 |
| 添加水印 | `#/add-watermark` | 超级横幅、隐形水印（可读取）、全屏水印、头像水印 |
| 图片去重 | `#/dedup` | 微调 + 像素扰动 + 重编码，MD5 全部改变 |
| 添加圆角 | `#/rounded` | 透明背景 PNG |
| 视频取图 | `#/frame` | 截取当前帧、均匀抽 6/9/12/16 帧 |
| 粘贴链接 | `#/link` | 图片直链下载；网页链接解析 og:image 和页面图片（App 内不受跨域限制） |
| ROI 计算 | `#/roi` | ROI、投资回报率、保本 ROI、净利润、单笔成本 |
| 我的 | `#/mine` | 清除记录、分享、反馈、关于 |

需要服务端 AI 的功能（一键抠图、一键智能去水印、提取音频 / 文案、去字幕、视频裁剪）已留好入口，在 `www/js/config.js` 配置 `API_BASE` 后接入。

## 本地开发

```bash
npm install
npm run dev            # 打开 http://localhost:5173
```

没有构建步骤，改完 `www/` 刷新即可。

## 本地打包 APK

需要 Node 20+、JDK 21、Android SDK（或 Android Studio）。

```bash
npm install
npx cap add android                       # 第一次
npx @capacitor/assets generate --android  # 生成图标和启动图（assets/）
npm run apk                               # 输出 android/app/build/outputs/apk/debug/app-debug.apk
```

正式签名：用 Android Studio 打开 `npx cap open android`，Build → Generate Signed APK；或在 `android/app/build.gradle` 配置 `signingConfigs` 后运行 `./gradlew assembleRelease`。

## 目录

```
www/                 网页源码（部署这个目录）
  index.html
  css/app.css
  js/app.js          路由、顶部导航、底部 Tab
  js/ui.js           弹窗、提示、选文件
  js/img.js          Canvas 导出 JPG/PNG/WEBP/BMP
  js/platform.js     网页下载 / App 内分享保存、返回键、安装到桌面
  js/store.js        处理记录与 24 小时清除
  js/inpaint.js      涂抹去水印算法
  js/filters.js      锐化、色彩、隐形水印
  js/pages/*.js      各页面
assets/              App 图标、启动图源文件
capacitor.config.json
.github/workflows/   android.yml（出 APK）、pages.yml（部署网页）
```

## 保存图片

- 网页：直接下载；手机浏览器支持时调起系统分享面板。
- App：调起系统分享面板，选「保存到相册 / 文件」或发给好友。
