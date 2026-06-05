/**
 * CSDN 编辑器完整 DOM 扫描 - 找标题/标签/分类/封面
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

  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);

  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("需要登录，等待...");
    try { await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 }); }
    catch { process.exit(1); }
  }
  console.log("✅ 已登录:", page.url());

  // DOM 扫描
  const scan = await page.evaluate(() => {
    const r = {};

    function safeClass(el) {
      try { return String(el.className || ""); } catch(e) { return ""; }
    }
    function safeId(el) {
      try { return String(el.id || ""); } catch(e) { return ""; }
    }
    function safeText(el) {
      try { return (el.innerText || "").slice(0, 80); } catch(e) { return ""; }
    }
    function safePlaceholder(el) {
      try { return (el.placeholder || "").slice(0, 80); } catch(e) { return ""; }
    }
    function isVisible(el) {
      try { return el.offsetHeight > 0; } catch(e) { return false; }
    }

    // 所有可见的 input/textarea/select
    r.allInputs = Array.from(document.querySelectorAll("input, textarea, select"))
      .filter(el => isVisible(el) || el.type === "file")
      .map(el => ({
        tag: el.tagName, type: el.type || "", placeholder: safePlaceholder(el),
        id: safeId(el), name: (el.name || ""), className: safeClass(el).slice(0, 100),
      }));

    // 所有 contenteditable
    r.contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .filter(el => isVisible(el))
      .map(el => ({ tag: el.tagName, className: safeClass(el).slice(0, 100), textLen: safeText(el).length }));

    // 所有按钮
    r.buttons = Array.from(document.querySelectorAll("button, [role='button']"))
      .filter(el => isVisible(el) && (el.innerText || "").trim())
      .map(el => ({ text: (el.innerText || "").trim().slice(0, 40), className: safeClass(el).slice(0, 80) }));

    // 所有 class 中包含关键字的可见元素
    const keywords = ["title", "tag", "cate", "label", "cover", "classify", "article-bar", "setting", "publish", "save", "draft", "type"];
    r.keywordEls = [];
    const seen = new Set();
    document.querySelectorAll("*").forEach(el => {
      if (!isVisible(el)) return;
      const cls = safeClass(el).toLowerCase();
      const id = safeId(el).toLowerCase();
      for (const kw of keywords) {
        if (cls.includes(kw) || id.includes(kw)) {
          const key = `${el.tagName}|${cls.slice(0, 50)}|${safeText(el).slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            r.keywordEls.push({ tag: el.tagName, className: safeClass(el).slice(0, 120), id: safeId(el), text: safeText(el).slice(0, 80) });
          }
          break;
        }
      }
    });

    // 页面全局结构：body 的直接子元素和它们的 class
    r.bodyChildren = Array.from(document.body.children).map(el => ({
      tag: el.tagName, id: safeId(el), className: safeClass(el).slice(0, 120),
    }));

    // 所有链接（导航类）
    r.links = Array.from(document.querySelectorAll("a"))
      .filter(el => isVisible(el))
      .map(el => ({ text: safeText(el).slice(0, 30), href: (el.href || "").slice(0, 150) }))
      .slice(0, 30);

    return r;
  });

  // 输出
  console.log("\n📋 所有 input/textarea/select:");
  scan.allInputs.forEach(el => console.log(`  [${el.tag}] type="${el.type}" placeholder="${el.placeholder}" id="${el.id}" name="${el.name}" class="${el.className.slice(0, 60)}"`));

  console.log("\n✏️ ContentEditable:");
  scan.contenteditables.forEach(el => console.log(`  [${el.tag}] class="${el.className.slice(0, 80)}" textLen=${el.textLen}`));

  console.log("\n🔘 按钮:");
  scan.buttons.forEach(el => console.log(`  "${el.text}" class="${el.className.slice(0, 60)}"`));

  console.log("\n🔑 含关键字的元素:");
  scan.keywordEls.forEach(el => console.log(`  [${el.tag}] class="${el.className.slice(0, 80)}" id="${el.id}" text="${el.text.slice(0, 60)}"`));

  console.log("\n🏠 Body 子元素:");
  scan.bodyChildren.forEach(el => console.log(`  [${el.tag}] id="${el.id}" class="${el.className.slice(0, 80)}"`));

  console.log("\n🔗 链接:");
  scan.links.forEach(el => console.log(`  "${el.text}" → ${el.href.slice(0, 100)}`));

  fs.writeFileSync(path.resolve(__dirname, "..", "csdn-full-scan.json"), JSON.stringify(scan, null, 2));
  console.log("\n📄 已保存到 csdn-full-scan.json");
  console.log("浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
