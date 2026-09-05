# Splendor Android 离线容器

Kotlin Activity + AndroidX WebViewAssetLoader。规则、AI 和卡面使用同级 `splendor-original` 的文件，Gradle 在构建时按白名单复制到 APK；没有第二份手动维护的游戏副本。

## 平台

- 包名 `com.local.splendor`，版本 `1.0.0` / versionCode 1。
- minSdk 26（Android 8），compileSdk / targetSdk 36（Android 16）。
- 目标布局：Y900 13（2026，TB522FU）的 3:2 横屏，兼容竖屏与分屏。
- 使用支持 WebMessageListener 的系统 WebView。Y900 原生 Android 16 的现代 WebView 为主要运行目标。
- APK 无 INTERNET 或广泛文件存储权限；所有游戏资源内置。

## 构建

固定工具版本：JDK 17、Gradle 8.13、Android Gradle Plugin 8.13.0、Kotlin 2.1.20、Android SDK Platform 36、Build Tools 35.0.0。

本工作区工具链放在上层 `.android-tools`，不修改系统 Java 或 SDK 配置：

```powershell
powershell -ExecutionPolicy Bypass -File android/build-apk.ps1
```

脚本执行 release 构建、Android lint、APK 签名验证，并将产物复制为 `dist/Splendor-Offline-1.0.0.apk`，同时生成 SHA-256 文件。

在其他电脑也可用 Android Studio 打开 `android` 工程，安装上述 SDK，配置本机 `local.properties` 和自己的 `signing.properties` 后构建。首次获取构建依赖需要网络；APK 安装与游戏运行完全离线。

签名配置格式（实际密码不提交至源码）：

```properties
storeFile=签名文件路径
storePassword=签名密码
keyAlias=签名别名
keyPassword=签名密码
```

本工作区首次构建使用的签名材料保存在 `.android-tools/signing`，配置保存在 `android/signing.properties`，均已排除版本控制。保留这些文件用于后续覆盖升级；不把它们放进公开 APK 或源码分发包。

## 原生接口

`js/platform.js` 通过 AndroidX 限定来源的 WebMessageListener 通信，只有内置页面的主框架可使用接口：

- `load` / `save`：应用私有目录 `game-v1.json`，AtomicFile 原子写入，单线程串行处理；写入成功后才返回确认。
- `import` / `export`：系统文档选择器；校验 JSON 和大小，保留跨 PC/Android 的存档格式。
- `SplendorApp.setForeground`：后台暂停 AI，真人恢复时先遮挡交接。
- `SplendorApp.back`：关闭详情、返回主菜单；不能跳过归还筹码或贵族选择。

中文规则直接在 APK 内阅读；官方 PDF 的链接会打开系统保存位置选择器，导出内置 PDF。

屏幕旋转和窗口改变保持 WebView；Activity 或进程重建后读取已确认的原生存档。清除应用数据或卸载将删除私有存档，可预先导出 JSON。

## 验证范围

Web 层回归见 `splendor-original/test/engine.test.cjs`，覆盖 120 局完整 AI 对局。平板布局、异步存档、重复提交、恢复和导入导出在真实 Chrome 中使用 Android 消息接口模拟器验证，脚本位于上层 `output/playwright/android-ui-smoke.js`。

Android 构建与 lint 的结果以 `app/build/reports` 为准；签名检查由构建脚本执行。浏览器模拟接口不是 Y900 真机测试，系统文件选择器和真机 WebView 行为仍需安装后验收。

2026-09-05 已成功构建 1.0.0 签名 release APK，大小 59,308,281 字节。`verify-apk.ps1` 已验证签名、ZIP 对齐、包名、90 张卡面及内置规则，确认无 INTERNET 权限，报告位于 `dist/apk-verification.json`。Android lint 为零错误；剩余提示涉及依赖新版本和 Android 12+ 数据迁移配置。现有依赖版本保持固定。

## 安装

将 `dist/Splendor-Offline-1.0.0.apk` 复制到平板，在文件管理器中打开并按系统提示允许该来源安装。安装后打开「璀璨宝石 · 离线」，无需启动 PC 服务或联网下载资源。可在主菜单导入 PC 导出的 JSON 存档，游戏中导出用于备份或迁移。后续更新使用同一签名直接覆盖安装；不要先卸载，以免删除私有存档。
