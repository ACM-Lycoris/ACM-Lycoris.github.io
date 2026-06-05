/**
 * 带反检测的探索
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const userDataDir = path.resolve(__dirname, "..", ".playwright-csdn-profile");
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
    ],
    viewport: null,
  });

  const page = await browser.newPage();

  // 隐藏自动化特征
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["zh-CN", "zh", "en"] });
  });

  // 先访问 CSDN 首页
  console.log("🌐 访问 CSDN 首页...");
  await page.goto("https://www.csdn.net/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("📍 URL:", page.url());

  // 检查页面是否有内容
  const hasContent = await page.evaluate(() => document.body.innerText.length);
  console.log("📝 body 文本长度:", hasContent);

  // 访问创作中心
  console.log("\n🌐 访问创作中心...");
  await page.goto("https://mp.csdn.net/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log("📍 URL:", page.url());
  console.log("📝 body 文本长度:", await page.evaluate(() => document.body.innerText.length));

  // 获取页面 HTML 片段
  const htmlSample = await page.evaluate(() => document.body.innerHTML.slice(0, 3000));
  console.log("\n📄 HTML 片段 (前3000字):");
  console.log(htmlSample);

  // 如果创作中心没内容，试试直接去编辑器
  console.log("\n\n🌐 直接访问编辑器...");
  await page.goto("https://editor.csdn.net/md", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log("📍 URL:", page.url());
  console.log("📝 body 文本长度:", await page.evaluate(() => document.body.innerText.length));

  // Dump
  const info = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.slice(0, 1000),
    allInputs: Array.from(document.querySelectorAll("input, textarea"))
      .map(el => ({ tag: el.tagName, placeholder: el.placeholder, type: el.type, visible: el.offsetHeight > 0 })),
    allButtons: Array.from(document.querySelectorAll("button"))
      .filter(el => el.offsetHeight > 0)
      .map(el => el.innerText?.trim()?.slice(0, 40)),
    contenteditables: Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .map(el => ({ tag: el.tagName, className: el.className?.slice(0, 80) })),
  }));

  console.log("\n📋 页面标题:", info.title);
  console.log("📝 文本:", info.bodyText.slice(0, 500));
  console.log("\n📋 输入:", JSON.stringify(info.allInputs));
  console.log("\n🔘 按钮:", JSON.stringify(info.allButtons));
  console.log("\n✏️ Editable:", JSON.stringify(info.contenteditables));

  fs.writeFileSync(path.resolve(__dirname, "..", "csdn-diag5.json"), JSON.stringify(info, null, 2));

  console.log("\n⏸️  浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
