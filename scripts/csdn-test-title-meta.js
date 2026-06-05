/**
 * 精准测试：标题编辑机制 + 内容管理页面结构
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
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("等待登录...");
    try { await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 }); }
    catch { process.exit(1); }
  }
  console.log("✅ 已登录\n");

  // ==== 测试 1: 标题编辑机制 ====
  console.log("=== 测试 1: 标题编辑 ===");

  // 先看看标题区域的完整 DOM
  const titleDOM = await page.evaluate(() => {
    const bar = document.querySelector(".article-bar");
    if (!bar) return { error: "no article-bar" };
    return {
      outerHTML: bar.outerHTML.slice(0, 3000),
      titleDisplayTag: document.querySelector(".article-bar__title-display")?.tagName,
      titleDisplayHTML: document.querySelector(".article-bar__title-display")?.outerHTML?.slice(0, 500),
      inputBoxHTML: document.querySelector(".article-bar__input-box")?.outerHTML?.slice(0, 500),
      allChildren: Array.from(bar.querySelectorAll("*")).map(el => ({
        tag: el.tagName,
        className: String(el.className || "").slice(0, 80),
        contenteditable: el.getAttribute("contenteditable"),
        textSample: String(el.innerText || "").slice(0, 40),
      })),
    };
  });
  console.log("Title bar HTML:", titleDOM.outerHTML?.slice(0, 500));
  console.log("Title display:", titleDOM.titleDisplayTag, titleDOM.titleDisplayHTML);
  console.log("Input box:", titleDOM.inputBoxHTML);
  console.log("Children:", JSON.stringify(titleDOM.allChildren, null, 2));

  // 点击标题区域
  console.log("\n🖱️ 点击标题区域...");
  await page.locator(".article-bar__title-display").first().click();
  await page.waitForTimeout(1000);

  // 再看变化
  const afterClick = await page.evaluate(() => {
    const r = {};
    r.titleDisplayOuter = document.querySelector(".article-bar__title-display")?.outerHTML?.slice(0, 500);
    r.titleDisplayContenteditable = document.querySelector(".article-bar__title-display")?.getAttribute("contenteditable");
    r.titleDisplayTag = document.querySelector(".article-bar__title-display")?.tagName;
    // 有没有新出现的 input?
    r.newInputs = Array.from(document.querySelectorAll("input, textarea"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({ tag: el.tagName, type: el.type, placeholder: el.placeholder, className: String(el.className || "").slice(0, 80) }));
    // article-bar 里的所有东西
    r.barChildren = Array.from(document.querySelectorAll(".article-bar *"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({ tag: el.tagName, contenteditable: el.getAttribute("contenteditable"), textSample: String(el.innerText || "").slice(0, 40) }));
    return r;
  });

  console.log("点击后 title display:", afterClick.titleDisplayOuter);
  console.log("contenteditable:", afterClick.titleDisplayContenteditable);
  console.log("新 inputs:", JSON.stringify(afterClick.newInputs));
  console.log("bar children:", JSON.stringify(afterClick.barChildren));

  // 尝试直接设置标题
  console.log("\n📝 尝试设置标题...");
  try {
    // 先用键盘全选
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(200);
    // 删除
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(200);
    // 输入标题
    await page.keyboard.type("【测试标题】这是一个测试", { delay: 20 });
    await page.waitForTimeout(500);
    // 验证
    const titleText = await page.locator(".article-bar__title-display").innerText();
    console.log(`   标题显示: "${titleText}"`);
  } catch (e) {
    console.log("   ❌", e.message);
  }

  // ==== 测试 2: 内容管理页面 ====
  console.log("\n\n=== 测试 2: 内容管理页面 ===");
  await page.goto("https://mp.csdn.net/mp_blog/manage/article", {
    waitUntil: "domcontentloaded", timeout: 20000,
  });
  await page.waitForTimeout(5000);
  console.log("URL:", page.url());

  // 扫描
  const mgmtScan = await page.evaluate(() => {
    const r = {};

    r.bodyText = document.body.innerText.slice(0, 1500);

    // 表格/列表
    r.tableInfo = {
      tableCount: document.querySelectorAll("table").length,
      rowCount: document.querySelectorAll("tr").length,
    };

    // 所有操作按钮/链接
    r.actionEls = Array.from(document.querySelectorAll("a, button, span[class*='btn'], span[class*='action'], span[class*='operate']"))
      .filter(el => el.offsetHeight > 0 && (el.innerText || "").trim().length > 0 && (el.innerText || "").trim().length < 30)
      .map(el => ({
        text: (el.innerText || "").trim(),
        tag: el.tagName,
        href: (el.href || "").slice(0, 150),
        className: String(el.className || "").slice(0, 80),
      }));

    // 所有链接
    r.links = Array.from(document.querySelectorAll("a"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        text: (el.innerText || "").trim().slice(0, 40),
        href: (el.href || "").slice(0, 200),
      }))
      .filter(l => l.text);

    // 分页/表格区域
    r.pageContent = document.querySelector("main, .content, .main, [class*='content'], [class*='main'], [class*='table'], [class*='list']")?.outerHTML?.slice(0, 2000) || "N/A";

    return r;
  });

  console.log("页面文本:", mgmtScan.bodyText.slice(0, 500));
  console.log("表格: table", mgmtScan.tableInfo.tableCount, "tr", mgmtScan.tableInfo.rowCount);
  console.log("\n操作元素:");
  mgmtScan.actionEls.forEach(el => console.log(`  [${el.tag}] "${el.text}" → ${el.href.slice(0, 100)}`));
  console.log("\n链接:");
  mgmtScan.links.forEach(el => console.log(`  "${el.text}" → ${el.href.slice(0, 120)}`));

  fs.writeFileSync(path.resolve(__dirname, "..", "csdn-mgmt-scan.json"), JSON.stringify(mgmtScan, null, 2));

  console.log("\n浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
