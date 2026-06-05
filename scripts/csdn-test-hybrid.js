/**
 * 混合方案测试：Markdown编辑器写内容 → 富文本编辑器设元数据
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

(async () => {
  const userDataDir = path.resolve(__dirname, "..", ".playwright-csdn-profile");
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false, args: ["--start-maximized"], viewport: null,
  });
  const page = await browser.newPage();

  // 登录
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("等待登录...");
    try { await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 }); }
    catch { process.exit(1); }
  }
  console.log("✅ 已登录");

  // === STEP 1: 在 Markdown 编辑器中创建草稿 ===
  console.log("\n=== Step 1: Markdown编辑器创建草稿 ===");

  // 填标题
  await page.locator(".article-bar__title-display").first().click();
  await page.waitForTimeout(500);
  await page.locator("input.article-bar__title--input").fill("【测试】混合方案标题");

  // 导入 markdown
  const content = "# 一级标题\n\n这是正文段落，包含**加粗**和*斜体*。\n\n## 二级标题\n\n- 列表项1\n- 列表项2\n\n```python\nprint('hello')\n```\n\n> 引用文字";
  const tmpFile = path.join(os.tmpdir(), "csdn-hybrid-test.md");
  fs.writeFileSync(tmpFile, content, "utf-8");
  await page.locator("#import-markdown-file-input").setInputFiles(tmpFile);
  await page.waitForTimeout(2500);
  fs.unlinkSync(tmpFile);

  // 保存草稿
  await page.locator("button.btn-save").first().click();
  await page.waitForTimeout(4000);

  // 获取 article ID
  const articleUrl = page.url();
  const articleIdMatch = articleUrl.match(/articleId=(\d+)/);
  const articleId = articleIdMatch ? articleIdMatch[1] : null;
  console.log(`Article ID: ${articleId}, URL: ${articleUrl}`);

  if (!articleId) { console.log("❌ 没获取到 Article ID"); await browser.close(); return; }

  // === STEP 2: 尝试在富文本编辑器中编辑这篇草稿 ===
  console.log("\n=== Step 2: 富文本编辑器编辑 ===");
  const richEditorUrl = `https://mp.csdn.net/mp_blog/creation/editor/${articleId}`;
  console.log(`打开: ${richEditorUrl}`);
  await page.goto(richEditorUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  console.log("URL:", page.url());

  // 检查是否成功加载（页面是否有内容）
  const pageText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  console.log("页面内容:", pageText.slice(0, 400));

  // 检查标题
  const titleVal = await page.evaluate(() => {
    const ta = document.querySelector("#txtTitle");
    return ta ? ta.value : "NOT FOUND";
  });
  console.log("标题栏:", titleVal);

  // 检查是否有标签/分类/封面区域
  const metaAreas = await page.evaluate(() => {
    function safe(o) { try { return String(o || ""); } catch(e) { return ""; } }
    return {
      tagBtn: !!document.querySelector('button:has-text("添加文章标签"), .tag__btn-tag'),
      coverArea: !!document.querySelector(".container-coverimage-box, [class*='cover']"),
      categoryArea: !!document.querySelector(".column-name-selection, [class*='column']"),
      summaryArea: !!document.querySelector("#txtSammary"),
    };
  });
  console.log("元数据区域:", JSON.stringify(metaAreas));

  // 截图
  await page.screenshot({ path: path.resolve(__dirname, "..", "csdn-hybrid-test.png"), fullPage: true });
  console.log("📸 截图已保存");

  console.log("\n浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
