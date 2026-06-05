/**
 * CSDN 编辑器探测脚本 —— 打开编辑器页面，dump 关键信息，截图保存
 * 用于帮助确定正确的 DOM selectors
 */
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--start-maximized"] });
  const page = await browser.newPage();

  // 直接去编辑器（未登录会跳到登录页）
  console.log("🌐 打开 CSDN 编辑器...");
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  const currentUrl = page.url();
  console.log("📍 当前 URL:", currentUrl);

  if (currentUrl.includes("passport") || currentUrl.includes("login")) {
    console.log("⚠️  需要登录！请在浏览器中完成登录，然后回到终端...");
    console.log("   脚本将在 60 秒后自动继续，或你可以在浏览器登录完成后等待...");
    // 等 60 秒或在 URL 不再是登录页时继续
    try {
      await page.waitForURL((url) => !url.includes("passport") && !url.includes("login"), { timeout: 120000 });
      console.log("✅ 检测到已登录！");
    } catch {
      console.log("⏰ 超时，继续尝试...");
    }
  }

  // 再等一会儿让编辑器完全加载
  await page.waitForTimeout(3000);

  // Dump 页面关键元素信息
  const info = await page.evaluate(() => {
    const result = {};

    // 所有 input 和 textarea
    const inputs = document.querySelectorAll("input, textarea");
    result.inputs = Array.from(inputs).map((el) => ({
      tag: el.tagName,
      type: el.type || "",
      placeholder: el.placeholder || "",
      name: el.name || "",
      id: el.id || "",
      className: el.className || "",
      visible: !!(el.offsetWidth || el.offsetHeight),
    }));

    // 所有 button
    const buttons = document.querySelectorAll("button, a.btn, span[role='button']");
    result.buttons = Array.from(buttons)
      .filter((el) => el.offsetWidth || el.offsetHeight)
      .map((el) => ({
        tag: el.tagName,
        text: (el.innerText || "").trim().slice(0, 50),
        className: el.className || "",
        id: el.id || "",
      }));

    // 查找编辑器容器
    const editorContainers = document.querySelectorAll(
      ".editor, .editor-pane, .CodeMirror, .ace_editor, .markdown-editor, .bytemd, [class*='editor']"
    );
    result.editorContainers = Array.from(editorContainers).map((el) => ({
      tag: el.tagName,
      className: el.className || "",
      id: el.id || "",
      visible: !!(el.offsetWidth || el.offsetHeight),
    }));

    return result;
  });

  console.log("\n📋 输入框/文本域:");
  info.inputs.filter((i) => i.visible).forEach((i) =>
    console.log(`   [${i.tag}] placeholder="${i.placeholder}" id="${i.id}" class="${i.className.slice(0, 80)}"`)
  );

  console.log("\n🔘 按钮:");
  info.buttons.forEach((b) =>
    console.log(`   [${b.tag}] "${b.text}" class="${b.className.slice(0, 60)}" id="${b.id}"`)
  );

  console.log("\n📝 编辑器容器:");
  info.editorContainers.filter((c) => c.visible).forEach((c) =>
    console.log(`   [${c.tag}] class="${c.className.slice(0, 80)}" id="${c.id}"`)
  );

  // 截图
  const screenshotPath = path.resolve(__dirname, "..", "csdn-editor-screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 截图保存: ${screenshotPath}`);

  // 不关浏览器，让用户查看
  console.log("\n⏸️  浏览器保持打开，你可以手动查看页面。在终端按 Ctrl+C 退出。");
  await page.waitForTimeout(600000); // 10 分钟
})().catch((err) => {
  console.error("出错:", err.message);
  process.exit(1);
});
