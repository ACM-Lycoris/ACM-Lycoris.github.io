/**
 * 探索 CSDN "发布文章" 弹窗，找到标签/分类/封面设置
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

  console.log("🔍 检查登录...");
  await page.goto("https://mp.csdn.net/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("⚠️ 需要登录！等待中...");
    try {
      await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 });
    } catch { console.log("超时"); process.exit(1); }
  }

  console.log("🌐 打开编辑器...");
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(4000);

  // 先填个标题和内容（怕空内容不能发布）
  console.log("📝 填充测试内容...");
  try {
    // 填标题
    const titleDisplay = page.locator(".article-bar__title-display").first();
    await titleDisplay.click();
    await page.waitForTimeout(500);
    // 标题栏点击后可能出现 input
    const titleInput = page.locator(".article-bar__title-display input, .article-bar input, input[placeholder*='标题']").first();
    try {
      await titleInput.waitFor({ state: "visible", timeout: 2000 });
      await titleInput.fill("测试标题");
    } catch {
      // 可能 titleDisplay 本身就是 contenteditable
      await titleDisplay.type("测试标题", { delay: 10 });
    }
    console.log("   标题已填");

    // 填正文
    const editorPre = page.locator("pre.editor__inner").first();
    await editorPre.click();
    await editorPre.fill("测试正文内容\n\n## 第二章\n\n这是一段测试文字。");
    console.log("   正文已填");
  } catch (e) {
    console.log("   ⚠️ 填充失败:", e.message);
  }

  // 截图：编辑完成
  await page.screenshot({ path: path.resolve(__dirname, "..", "diag3-before-publish.png"), fullPage: true });

  // 点击"发布文章"
  console.log("\n🔘 点击「发布文章」...");
  try {
    const publishBtn = page.locator("button.btn-publish").first();
    await publishBtn.click();
    await page.waitForTimeout(3000);

    // Dump 弹窗内容
    const modalInfo = await page.evaluate(() => {
      const r = {};

      // 查找弹窗/模态框
      const modals = document.querySelectorAll(
        '.el-dialog, .el-drawer, .modal, .dialog, [role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"], [class*="popup"], [class*="Popup"], [class*="publish"], [class*="Publish"]'
      );
      r.modals = Array.from(modals).filter(el => el.offsetHeight > 0).map(el => ({
        tag: el.tagName,
        className: (el.className || "").slice(0, 150),
        visible: el.offsetHeight > 0,
      }));

      // 查找弹窗内的所有 input/textarea/select
      r.inputsInModal = Array.from(document.querySelectorAll(
        '.el-dialog input, .el-drawer input, [role="dialog"] input, [class*="modal"] input, [class*="drawer"] input'
      )).filter(el => el.offsetHeight > 0).map(el => ({
        tag: el.tagName,
        type: el.type || "",
        placeholder: (el.placeholder || "").slice(0, 80),
        className: (el.className || "").slice(0, 120),
      }));

      // 更广泛的查找
      r.allVisibleInputs = Array.from(document.querySelectorAll("input, textarea, select"))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          type: el.type || "",
          placeholder: (el.placeholder || "").slice(0, 80),
          className: (el.className || "").slice(0, 120),
          value: (el.value || "").slice(0, 60),
        }));

      // 查找所有按钮（弹窗内的）
      r.allVisibleButtons = Array.from(document.querySelectorAll("button, [role='button']"))
        .filter(el => el.offsetHeight > 0 && el.innerText?.trim())
        .map(el => ({
          text: (el.innerText || "").trim().slice(0, 50),
          className: (el.className || "").slice(0, 120),
        }));

      // 查找封面相关
      r.coverElements = Array.from(document.querySelectorAll('[class*="cover"], [class*="Cover"], [class*="thumb"], [class*="Thumb"], [class*="image"], [class*="Image"], [class*="poster"], [class*="Poster"]'))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          className: (el.className || "").slice(0, 120),
          text: (el.innerText || "").slice(0, 60),
        }));

      // 查找分类
      r.categoryInModal = Array.from(document.querySelectorAll('[class*="category"], [class*="Category"], [class*="classify"], [class*="Classify"], select, [class*="type"]'))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          className: (el.className || "").slice(0, 120),
          text: (el.innerText || "").slice(0, 60),
        }));

      // 查找标签
      r.tagInModal = Array.from(document.querySelectorAll('[class*="tag"], [class*="Tag"], [class*="label"], [class*="Label"]'))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          className: (el.className || "").slice(0, 120),
          text: (el.innerText || "").slice(0, 60),
          placeholder: (el.placeholder || "").slice(0, 60),
        }));

      return r;
    });

    // 输出
    console.log("\n📦 弹窗/模态框:");
    modalInfo.modals.forEach(m => console.log(`  [${m.tag}] ${m.className}`));

    console.log("\n📋 弹窗内输入框:");
    modalInfo.inputsInModal.forEach(i => console.log(`  [${i.tag}] type="${i.type}" placeholder="${i.placeholder}"`));

    console.log("\n📋 所有可见输入:");
    modalInfo.allVisibleInputs.forEach(i => console.log(`  [${i.tag}] type="${i.type}" placeholder="${i.placeholder}"`));

    console.log("\n🔘 所有可见按钮:");
    modalInfo.allVisibleButtons.forEach(b => console.log(`  [${b.tag}] "${b.text}" class="${b.className.slice(0, 80)}"`));

    console.log("\n🖼️ 封面元素:");
    modalInfo.coverElements.forEach(c => console.log(`  [${c.tag}] "${c.text}" class="${c.className.slice(0, 80)}"`));

    console.log("\n📂 分类元素:");
    modalInfo.categoryInModal.forEach(c => console.log(`  [${c.tag}] "${c.text}" class="${c.className.slice(0, 80)}"`));

    console.log("\n🏷️ 标签元素:");
    modalInfo.tagInModal.forEach(t => console.log(`  [${t.tag}] "${t.text}" class="${t.className.slice(0, 80)}"`));

    // 保存
    fs.writeFileSync(
      path.resolve(__dirname, "..", "csdn-publish-modal.json"),
      JSON.stringify(modalInfo, null, 2)
    );

    // 截图
    await page.screenshot({ path: path.resolve(__dirname, "..", "diag3-publish-modal.png"), fullPage: true });
    console.log("\n📸 截图已保存");
  } catch (e) {
    console.log("❌ 点击发布失败:", e.message);
  }

  console.log("\n⏸️  浏览器保持 60 秒...");
  await page.waitForTimeout(60000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
