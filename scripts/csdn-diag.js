/**
 * CSDN 编辑器诊断 — dump DOM 到文件，方便分析
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const userDataDir = path.resolve(__dirname, "..", ".playwright-csdn-profile");
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false, args: ["--start-maximized"], viewport: null,
  });
  const page = await browser.newPage();

  // 检查登录
  console.log("🔍 检查登录...");
  await page.goto("https://mp.csdn.net/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("⚠️ 需要登录！请在浏览器中完成登录，脚本等待中...");
    try {
      await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 });
      console.log("✅ 登录成功");
    } catch { console.log("超时，退出"); process.exit(1); }
  } else {
    console.log("✅ 已登录");
  }

  // 打开编辑器
  console.log("🌐 打开编辑器...");
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log("📍 URL:", page.url());

  // DOM dump
  const domInfo = await page.evaluate(() => {
    const result = {};

    // 1. 所有可见的 input/textarea
    result.inputs = Array.from(document.querySelectorAll("input, textarea"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        tag: el.tagName,
        type: el.type || "",
        placeholder: (el.placeholder || "").slice(0, 60),
        id: el.id || "",
        className: (el.className || "").slice(0, 100),
        name: el.name || "",
        value: (el.value || "").slice(0, 50),
      }));

    // 2. 所有按钮（可见的）
    result.buttons = Array.from(document.querySelectorAll("button, [role='button']"))
      .filter(el => el.offsetHeight > 0 && el.innerText?.trim())
      .map(el => ({
        text: (el.innerText || "").trim().slice(0, 40),
        className: (el.className || "").slice(0, 80),
        tag: el.tagName,
      }));

    // 3. CodeMirror 检测
    const cmEls = document.querySelectorAll(".CodeMirror");
    result.codeMirror = Array.from(cmEls).map(el => ({
      hasCM: !!el.CodeMirror,
      className: el.className,
      textarea: el.querySelector("textarea") ? "yes" : "no",
    }));

    // 4. 查找编辑器容器
    const editorDivs = document.querySelectorAll('[class*="editor"], [class*="Editor"], [class*="markdown"]');
    result.editorDivs = Array.from(editorDivs)
      .filter(el => el.offsetHeight > 0)
      .slice(0, 10)
      .map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 120),
        id: el.id || "",
      }));

    // 5. 页面标题/header 区域
    const header = document.querySelector("header, .header, .navbar, [class*='header'], [class*='Header']");
    if (header) result.hasHeader = header.className.slice(0, 120);

    // 6. 所有有 placeholder 的元素
    result.placeholders = Array.from(document.querySelectorAll("[placeholder]"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        tag: el.tagName,
        placeholder: el.placeholder.slice(0, 80),
        className: (el.className || "").slice(0, 100),
      }));

    // 7. 页面 body 的关键 class
    result.bodyClass = document.body.className || "";

    return result;
  });

  // 输出到文件
  const outPath = path.resolve(__dirname, "..", "csdn-dom-dump.json");
  fs.writeFileSync(outPath, JSON.stringify(domInfo, null, 2));
  console.log("\n📄 DOM dump →", outPath);

  // 简要输出
  console.log("\n📋 输入框/文本域:");
  domInfo.inputs.forEach(i => console.log(`  [${i.tag}] placeholder="${i.placeholder}" id="${i.id}"`));

  console.log("\n📋 Placeholder 元素:");
  domInfo.placeholders.forEach(p => console.log(`  [${p.tag}] "${p.placeholder}"`));

  console.log("\n🔘 按钮:");
  domInfo.buttons.forEach(b => console.log(`  [${b.tag}] "${b.text}"`));

  console.log("\n📝 CodeMirror:", domInfo.codeMirror.length, "个");
  domInfo.codeMirror.forEach(c => console.log(`  hasCM:${c.hasCM} textarea:${c.textarea}`));

  console.log("\n📝 Editor divs:");
  domInfo.editorDivs.forEach(d => console.log(`  [${d.tag}] class="${d.className}"`));

  // 截图
  const ss = path.resolve(__dirname, "..", "csdn-editor-diag.png");
  await page.screenshot({ path: ss, fullPage: true });
  console.log(`\n📸 截图: ${ss}`);

  console.log("\n✅ 诊断完成，浏览器保持 60 秒");
  await page.waitForTimeout(60000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
