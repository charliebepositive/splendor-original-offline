package com.local.splendor

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.AtomicFile
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private val io = Executors.newSingleThreadExecutor()
    private val saveFile by lazy { AtomicFile(File(filesDir, "game-v1.json")) }
    private var resumed = false
    private var pendingImport: Pair<String, JavaScriptReplyProxy>? = null
    private data class Export(val id: String, val reply: JavaScriptReplyProxy, val text: String)
    private var pendingExport: Export? = null
    private val origin = "https://appassets.androidplatform.net"
    private val entry = "$origin/assets/www/index.html"

    private val openDocument = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val pending = pendingImport
        pendingImport = null
        if (pending != null) {
            if (uri == null) respond(pending.second, pending.first, JSONObject.NULL)
            else io.execute {
                try {
                    val text = contentResolver.openInputStream(uri)?.use { readBounded(it) }
                        ?: error("无法打开所选文件")
                    JSONObject(text) // Validate syntax before handing the document to the game engine.
                    respond(pending.second, pending.first, text)
                } catch (e: Exception) { respond(pending.second, pending.first, error = e.message ?: "读取失败") }
            }
        }
    }

    private val createDocument = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val pending = pendingExport
        pendingExport = null
        if (pending != null) {
            if (uri == null) respond(pending.reply, pending.id, false)
            else io.execute {
                try {
                    contentResolver.openOutputStream(uri, "wt")?.use { it.write(pending.text.toByteArray(Charsets.UTF_8)) }
                        ?: error("无法写入所选位置")
                    respond(pending.reply, pending.id, true)
                } catch (e: Exception) { respond(pending.reply, pending.id, error = e.message ?: "导出失败") }
            }
        }
    }

    private val exportPdf = registerForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
        if (uri != null) io.execute {
            try {
                contentResolver.openOutputStream(uri, "wt")?.use { out ->
                    assets.open("www/docs/Splendor-EN.pdf").use { it.copyTo(out) }
                } ?: error("无法创建规则文件")
                runOnUiThread { Toast.makeText(this, "官方规则已导出", Toast.LENGTH_SHORT).show() }
            } catch (e: Exception) { runOnUiThread { Toast.makeText(this, "规则导出失败", Toast.LENGTH_LONG).show() } }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(18, 41, 34)) }
        setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        web.setBackgroundColor(Color.rgb(12, 27, 23))
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            useWideViewPort = true
            loadWithOverviewMode = false
            textZoom = 100
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                return loader.shouldInterceptRequest(request.url) ?: WebResourceResponse(
                    "text/plain", "UTF-8", 404, "Not Found", emptyMap(), ByteArrayInputStream("Local asset not found".toByteArray())
                )
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host == "appassets.androidplatform.net" && uri.path?.startsWith("/assets/www/") == true) {
                    if (uri.path?.endsWith(".pdf") == true) {
                        exportPdf.launch("Splendor-EN.pdf")
                        return true
                    }
                    return false
                }
                if (uri.scheme == "http" || uri.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    catch (_: Exception) { Toast.makeText(this@MainActivity, "未找到可打开链接的浏览器", Toast.LENGTH_SHORT).show() }
                }
                return true
            }
            override fun onPageFinished(view: WebView, url: String) { notifyForeground() }
            override fun onRenderProcessGone(view: WebView, detail: android.webkit.RenderProcessGoneDetail): Boolean {
                recreate() // All acknowledged game actions are already saved outside the renderer process.
                return true
            }
        }
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            AlertDialog.Builder(this).setTitle("需要更新 Android System WebView")
                .setMessage("当前系统网页组件过旧，无法使用本地存档接口。更新组件后即可离线游玩。")
                .setPositiveButton("关闭") { _, _ -> finish() }.setCancelable(false).show()
            return
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "AndroidHost", setOf(origin)) { _, message, sourceOrigin, isMainFrame, reply ->
                if (isMainFrame && sourceOrigin.toString() == origin) handleMessage(message.data ?: "", reply)
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.url != entry && web.canGoBack()) { web.goBack(); return }
                web.evaluateJavascript("window.SplendorApp ? window.SplendorApp.back() : false") { handled ->
                    if (handled != "true") AlertDialog.Builder(this@MainActivity).setTitle("退出游戏？")
                        .setMessage("已确认的对局进度会保留。")
                        .setNegativeButton("继续游玩", null).setPositiveButton("退出") { _, _ -> finish() }.show()
                }
            }
        })
        web.loadUrl(entry)
    }

    private fun handleMessage(raw: String, reply: JavaScriptReplyProxy) {
        if (raw.length > 1_100_000) return
        var id = ""
        try {
            val request = JSONObject(raw)
            id = request.getString("id")
            val method = request.getString("method")
            val payload = request.optString("payload", "")
            when (method) {
                "load" -> io.execute {
                    try {
                        val text = if (saveFile.baseFile.exists() || File(saveFile.baseFile.path + ".bak").exists())
                            saveFile.openRead().use { readBounded(it) } else JSONObject.NULL
                        respond(reply, id, text)
                    } catch (e: Exception) { respond(reply, id, error = e.message ?: "读取存档失败") }
                }
                "save" -> io.execute {
                    try {
                        require(payload.length <= 1_000_000) { "存档过大" }
                        val data = JSONObject(payload)
                        require(data.getInt("version") == 1 && data.getJSONArray("players").length() in 2..4) { "存档格式错误" }
                        val stream = saveFile.startWrite()
                        try { stream.write(payload.toByteArray(Charsets.UTF_8)); saveFile.finishWrite(stream) }
                        catch (e: Exception) { saveFile.failWrite(stream); throw e }
                        respond(reply, id, true)
                    } catch (e: Exception) { respond(reply, id, error = e.message ?: "保存失败") }
                }
                "import" -> {
                    check(pendingImport == null && pendingExport == null) { "请先完成当前文件操作" }
                    pendingImport = id to reply
                    openDocument.launch(arrayOf("application/json", "text/plain", "application/octet-stream"))
                }
                "export" -> {
                    check(pendingImport == null && pendingExport == null) { "请先完成当前文件操作" }
                    JSONObject(payload)
                    pendingExport = Export(id, reply, payload)
                    createDocument.launch("splendor-save.json")
                }
                else -> respond(reply, id, error = "不支持的操作")
            }
        } catch (e: Exception) { respond(reply, id, error = e.message ?: "文件操作失败") }
    }

    private fun readBounded(input: InputStream): String {
        val out = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            require(out.size() + count <= 1_000_000) { "存档文件超过 1 MB" }
            out.write(buffer, 0, count)
        }
        return out.toString("UTF-8").removePrefix("\uFEFF")
    }

    private fun respond(reply: JavaScriptReplyProxy, id: String, result: Any = JSONObject.NULL, error: String? = null) {
        val response = JSONObject().put("id", id).put("result", result)
        if (error != null) response.put("error", error)
        runOnUiThread {
            if (!isDestroyed && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                try { reply.postMessage(response.toString()) } catch (_: Exception) { /* The renderer may have closed. */ }
            }
        }
    }
    private fun notifyForeground() {
        if (::web.isInitialized) web.evaluateJavascript("window.SplendorApp && window.SplendorApp.setForeground($resumed)", null)
    }
    override fun onResume() { super.onResume(); resumed = true; notifyForeground() }
    override fun onPause() { resumed = false; notifyForeground(); super.onPause() }
    override fun onDestroy() { if (::web.isInitialized) { (web.parent as? FrameLayout)?.removeView(web); web.destroy() }; io.shutdown(); super.onDestroy() }
}
