/**
 * 单篇完整流程测试：在 mp.csdn.net 编辑器中发布一篇带完整元数据的文章
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const userDataDir = path.resolve(__dirname, "..", ".playwright-csdn-profile");
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false, args: ["--start-maximized", "--disable-blink-features=AutomationControlled"], viewport: null,
  });
  const page = await browser.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); });

  // 登录
  await page.goto("https://mp.csdn.net/mp_blog/creation/editor?not_checkout=1", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("等待登录...");
    try { await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 }); }
    catch { process.exit(1); }
  }
  console.log("✅ 已登录:", page.url());

  // === 测试：找到内容编辑器并设置内容 ===
  // 富文本编辑器的内容区域可能是一个 contenteditable iframe 或 div
  const editorInfo = await page.evaluate(() => {
    const r = {};
    function safe(o) { try { return String(o || ""); } catch(e) { return ""; } }

    // 找所有 iframe
    r.iframes = Array.from(document.querySelectorAll("iframe")).map(el => ({
      src: el.src?.slice(0, 120), id: el.id, className: safe(el.className).slice(0, 80),
    }));

    // 找所有 contenteditable
    r.contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map(el => ({
      tag: el.tagName, className: safe(el.className).slice(0, 100), id: el.id,
      innerText: (el.innerText || "").slice(0, 60),
    }));

    // 查找可能的编辑器区域
    r.editorAreas = Array.from(document.querySelectorAll(
      '[class*="editor"], [class*="Editor"], [class*="content"], [class*="Content"], [class*="body"], [class*="Body"], [class*="write"], [class*="Write"]'
    ))
      .filter(el => el.offsetHeight > 100)
      .map(el => ({
        tag: el.tagName, className: safe(el.className).slice(0, 120), id: el.id,
        height: el.offsetHeight, width: el.offsetWidth,
      }));

    return r;
  });

  console.log("\n📦 Iframes:", JSON.stringify(editorInfo.iframes, null, 2));
  console.log("\n✏️ ContentEditables:", JSON.stringify(editorInfo.contenteditables, null, 2));
  console.log("\n📝 Editor areas:", JSON.stringify(editorInfo.editorAreas, null, 2));

  // 尝试在页面主区域点击
  console.log("\n🖱️ 尝试找编辑器...");

  // 查看 body 的主要子元素和它们的尺寸
  const layoutInfo = await page.evaluate(() => {
    function safe(o) { try { return String(o || ""); } catch(e) { return ""; } }
    return Array.from(document.body.querySelectorAll(":scope > div > div"))
      .filter(el => el.offsetHeight > 200)
      .map(el => ({
        tag: el.tagName, className: safe(el.className).slice(0, 120), id: el.id,
        w: el.offsetWidth, h: el.offsetHeight, childCount: el.children.length,
      }));
  });
  console.log("Layout divs (>200px):", JSON.stringify(layoutInfo, null, 2));

  // 截图
  await page.screenshot({ path: path.resolve(__dirname, "..", "csdn-richeditor-layout.png"), fullPage: true });

  console.log("\n浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
