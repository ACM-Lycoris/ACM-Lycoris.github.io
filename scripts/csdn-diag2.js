/**
 * CSDN 编辑器深度诊断 v2 — 找到所有关键元素
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
    console.log("⚠️ 需要登录！等待中...");
    try {
      await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 });
    } catch { console.log("超时"); process.exit(1); }
  }
  console.log("✅ 已登录");

  // 打开编辑器
  console.log("🌐 打开编辑器...");
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(4000);

  // 深度查找
  const deepInfo = await page.evaluate(() => {
    const r = {};

    // 1. 查找所有 contenteditable 元素
    r.contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 120),
        textSample: (el.innerText || "").slice(0, 80),
        rect: el.getBoundingClientRect(),
      }));

    // 2. 在 editor 区域内查找所有 input（不仅限于直接可见的）
    const editorDiv = document.querySelector(".editor, .layout__panel--editor, [class*='editor']");
    const searchRoot = editorDiv || document;
    r.allInputsInEditor = Array.from(searchRoot.querySelectorAll("input, textarea, [contenteditable]"))
      .map(el => ({
        tag: el.tagName,
        type: el.type || "",
        placeholder: (el.placeholder || "").slice(0, 80),
        className: (el.className || "").slice(0, 120),
        contenteditable: el.getAttribute("contenteditable") || "",
        visible: el.offsetHeight > 0,
      }));

    // 3. 查找标题区域 — 可能在 editor 外部
    r.titleArea = Array.from(document.querySelectorAll(
      'input, textarea, [contenteditable], [class*="title"], [class*="Title"], [class*="subject"]'
    ))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 120),
        placeholder: (el.placeholder || "").slice(0, 80),
        textSample: (el.innerText || el.value || "").slice(0, 80),
        rect: {
          top: el.getBoundingClientRect().top,
          left: el.getBoundingClientRect().left,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        },
      }));

    // 4. 整个页面 body 的所有第一层 div
    r.topLevelDivs = Array.from(document.body.querySelectorAll(":scope > div, :scope > header, :scope > main, :scope > nav"))
      .map(el => ({
        tag: el.tagName,
        id: el.id || "",
        className: (el.className || "").slice(0, 120),
        childCount: el.children.length,
      }));

    // 5. 查找分类/标签相关元素
    r.categoryElements = Array.from(document.querySelectorAll(
      '[class*="category"], [class*="Category"], [class*="cat"], [class*="Cat"], [class*="tag"], [class*="Tag"], [class*="label"], [class*="Label"], [class*="classify"]'
    ))
      .filter(el => el.offsetHeight > 0)
      .slice(0, 15)
      .map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 120),
        text: (el.innerText || "").slice(0, 80),
      }));

    // 6. 编辑器 pre 的详细属性
    const pre = document.querySelector("pre.editor__inner");
    if (pre) {
      r.preDetails = {
        contenteditable: pre.getAttribute("contenteditable"),
        textLength: (pre.innerText || "").length,
        textSample: (pre.innerText || "").slice(0, 200),
        childrenTags: Array.from(pre.children).map(c => c.tagName).join(","),
        dataset: JSON.stringify(pre.dataset),
      };
    }

    // 7. 查找设置弹窗（封面图等可能在设置里）
    r.settingButtons = Array.from(document.querySelectorAll(
      '[class*="setting"], [class*="Setting"], [class*="cover"], [class*="Cover"], [class*="config"]'
    ))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 120),
        text: (el.innerText || "").slice(0, 80),
      }));

    return r;
  });

  const outPath = path.resolve(__dirname, "..", "csdn-deep-dom.json");
  fs.writeFileSync(outPath, JSON.stringify(deepInfo, null, 2));
  console.log("📄 深度 DOM →", outPath);

  // 打印关键发现
  console.log("\n🔍 ContentEditable 元素:");
  deepInfo.contenteditables.forEach(e =>
    console.log(`  [${e.tag}] class="${e.className.slice(0, 80)}" text="${e.textSample.slice(0, 60)}"`)
  );

  console.log("\n🔍 标题/输入区域:");
  deepInfo.titleArea.forEach(e =>
    console.log(`  [${e.tag}] class="${e.className.slice(0, 80)}" placeholder="${e.placeholder}" text="${e.textSample.slice(0, 60)}"`)
  );

  console.log("\n🔍 编辑器内所有输入:");
  deepInfo.allInputsInEditor.forEach(e =>
    console.log(`  [${e.tag}] type="${e.type}" placeholder="${e.placeholder}" visible=${e.visible}`)
  );

  console.log("\n🔍 分类/标签元素:");
  deepInfo.categoryElements.forEach(e =>
    console.log(`  [${e.tag}] class="${e.className.slice(0, 100)}" text="${e.text.slice(0, 60)}"`)
  );

  console.log("\n🔍 设置相关按钮:");
  deepInfo.settingButtons.forEach(e =>
    console.log(`  [${e.tag}] class="${e.className.slice(0, 80)}" text="${e.text}"`)
  );

  if (deepInfo.preDetails) {
    console.log("\n🔍 编辑器 PRE 详情:");
    console.log(`  contenteditable: ${deepInfo.preDetails.contenteditable}`);
    console.log(`  textLength: ${deepInfo.preDetails.textLength}`);
    console.log(`  children: ${deepInfo.preDetails.childrenTags}`);
    console.log(`  dataset: ${deepInfo.preDetails.dataset}`);
  }

  console.log("\n🔍 顶层 divs:");
  deepInfo.topLevelDivs.forEach(d =>
    console.log(`  [${d.tag}] id="${d.id}" class="${d.className.slice(0, 100)}"`)
  );

  console.log("\n⏸️  浏览器保持 60 秒，按 Ctrl+C 可提前退出");
  await page.waitForTimeout(60000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
