# 璀璨宝石 · 原版离线

经典基础版 Splendor 的非官方离线实现，包含 PC 浏览器版与 Android 平板版。支持 2–4 人本地热座、电脑对手、自动存档、JSON 导入/导出和完整离线运行。

## PC 离线版

进入 `splendor-original`，双击 `index.html` 或 `打开游戏.bat` 即可开始。所有 90 张发展卡、中文规则和官方英文规则 PDF 均保存在本地，不需要安装依赖或联网。

如需浏览器离线缓存，可双击 `启动本地服务.bat`，或在安装 Node.js 后运行：

```powershell
node splendor-original/tools/serve.cjs
```

## Android APK

从 [Releases](https://github.com/charliebepositive/splendor-original-offline/releases/tag/v1.0.0) 下载 `Splendor-Offline-1.0.0.apk`。安装包面向 Android 平板，重点适配联想 Y900 13 英寸 3:2 横屏，同时支持竖屏与分屏；最低 Android 8，目标 Android 16。

APK 内置全部资源，不申请 INTERNET 权限。存档写入应用私有目录，可通过系统文件选择器与 PC 版互相导入、导出 JSON。详细架构和构建说明见 `android/README.md`。

## 验证

- 90 张发展卡文件及数据完整。
- 120 局 2–4 人完整 AI 对局规则回归通过。
- Android release 构建、lint、签名、ZIP 对齐和包内资源检查通过。
- 平板横屏、竖屏、分屏、异步存档和重复点击保护已通过浏览器设备模拟。
- 尚未在 Y900 真机安装验收。

运行规则测试：

```powershell
node splendor-original/test/engine.test.cjs
```

## 许可与素材

程序源代码采用 GPL-3.0。发展卡图片来自 `anicolao/splendor` 的实体卡拍摄与裁切；卡牌原画、Splendor 名称及相关权利属于各自权利人。本仓库是非官方本地学习实现，不包含在线服务。完整来源和权利说明见 `splendor-original/docs/SOURCES.md`。
