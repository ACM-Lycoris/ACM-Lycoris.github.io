/**
 * 探索 CSDN 创作中心编辑器 —— 看是否有标签/分类/封面设置
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

  // 扫描
  const scan = await page.evaluate(() => {
    const r = {};
    function safe(o) { try { return String(o || ""); } catch(e) { return ""; } }

    // 所有 input/textarea/select
    r.inputs = Array.from(document.querySelectorAll("input, textarea, select"))
      .map(el => ({
        tag: el.tagName, type: el.type || "", placeholder: safe(el.placeholder).slice(0, 80),
        id: safe(el.id), className: safe(el.className).slice(0, 100), visible: el.offsetHeight > 0,
      }));

    // 所有 contenteditable
    r.contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({ tag: el.tagName, className: safe(el.className).slice(0, 100), textLen: (el.innerText || "").length }));

    // 按钮
    r.buttons = Array.from(document.querySelectorAll("button"))
      .filter(el => el.offsetHeight > 0 && (el.innerText || "").trim())
      .map(el => ({ text: (el.innerText || "").trim().slice(0, 40), className: safe(el.className).slice(0, 80) }));

    // 侧边栏/设置面板
    r.keywordEls = [];
    const keywords = ["title", "tag", "cate", "label", "cover", "classify", "setting", "category", "type", "publish", "save", "draft", "article-bar"];
    const seen = new Set();
    document.querySelectorAll("*").forEach(el => {
      if (!el.offsetHeight) return;
      const cls = safe(el.className).toLowerCase();
      const id = safe(el.id).toLowerCase();
      for (const kw of keywords) {
        if (cls.includes(kw) || id.includes(kw)) {
          const key = `${el.tagName}|${cls.slice(0, 50)}|${safe(el.innerText || "").slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            r.keywordEls.push({ tag: el.tagName, className: safe(el.className).slice(0, 120), id: safe(el.id), text: safe(el.innerText || "").slice(0, 80) });
          }
          break;
        }
      }
    });

    // body 文本（看页面内容）
    r.bodyText = document.body.innerText.slice(0, 1500);

    // 所有链接
    r.links = Array.from(document.querySelectorAll("a"))
      .filter(el => el.offsetHeight > 0 && (el.innerText || "").trim())
      .map(el => ({ text: safe(el.innerText).slice(0, 40), href: safe(el.href).slice(0, 150) }))
      .filter(l => l.text)
      .slice(0, 40);

    return r;
  });

  console.log("\n📋 Inputs:");
  scan.inputs.forEach(el => console.log(`  [${el.tag}] type="${el.type}" placeholder="${el.placeholder}" id="${el.id}" visible=${el.visible} class="${el.className.slice(0, 60)}"`));

  console.log("\n✏️ ContentEditable:");
  scan.contenteditables.forEach(el => console.log(`  [${el.tag}] class="${el.className.slice(0, 80)}"`));

  console.log("\n🔘 Buttons:");
  scan.buttons.forEach(el => console.log(`  "${el.text}" class="${el.className.slice(0, 60)}"`));

  console.log("\n🔑 关键字元素:");
  scan.keywordEls.forEach(el => console.log(`  [${el.tag}] class="${el.className.slice(0, 90)}" text="${el.text.slice(0, 60)}"`));

  console.log("\n📄 页面文本:");
  console.log(scan.bodyText.slice(0, 800));

  console.log("\n🔗 链接:");
  scan.links.forEach(el => console.log(`  "${el.text}" → ${el.href.slice(0, 100)}`));

  fs.writeFileSync(path.resolve(__dirname, "..", "csdn-richeditor-scan.json"), JSON.stringify(scan, null, 2));
  console.log("\n📄 已保存");

  // 截图
  await page.screenshot({ path: path.resolve(__dirname, "..", "csdn-richeditor.png"), fullPage: true });

  console.log("浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
