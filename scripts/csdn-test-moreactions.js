/**
 * 探索 Markdown 编辑器的 "更多操作" 菜单 & 找到标签/分类设置入口
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

  await page.goto("https://editor.csdn.net/md?articleId=161665602", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);
  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("等待登录...");
    try { await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 }); }
    catch { process.exit(1); }
  }
  console.log("✅ 已登录:", page.url());

  // 点击"更多操作"
  console.log("\n🖱️ 点击「更多操作」...");
  await page.locator("button.navigation_bar_more_actions_trigger").first().click();
  await page.waitForTimeout(1500);

  // 看看弹出什么
  const menuInfo = await page.evaluate(() => {
    function safe(o) { try { return String(o || ""); } catch(e) { return ""; } }

    // 查找下拉菜单/弹出层
    const r = {};
    r.popups = Array.from(document.querySelectorAll(
      '.el-dropdown-menu, .el-popover, .el-popper, [class*="dropdown"], [class*="Dropdown"], [class*="popup"], [class*="Popup"], [class*="menu-list"], [class*="menuList"], [role="menu"], [class*="popper"]'
    ))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        tag: el.tagName,
        className: safe(el.className).slice(0, 150),
        innerHTML: el.innerHTML.slice(0, 1500),
        text: safe(el.innerText).slice(0, 500),
      }));

    r.allVisibleDivs = Array.from(document.querySelectorAll("div, ul, li"))
      .filter(el => {
        const text = safe(el.innerText).trim();
        return el.offsetHeight > 0 && text.length > 0 && text.length < 100 &&
          (el.tagName === "LI" || text.includes("设置") || text.includes("分类") ||
           text.includes("标签") || text.includes("封面") || text.includes("删除") ||
           text.includes("导入") || text.includes("导出") || text.includes("下载"));
      })
      .map(el => ({
        tag: el.tagName,
        className: safe(el.className).slice(0, 100),
        text: safe(el.innerText).trim().slice(0, 80),
      }));

    return r;
  });

  console.log("\n弹出层/菜单:");
  menuInfo.popups.forEach(p => {
    console.log(`[${p.tag}] ${p.className.slice(0, 80)}`);
    console.log(`  文本: ${p.text.slice(0, 300)}`);
    console.log(`  HTML: ${p.innerHTML.slice(0, 500)}`);
  });

  console.log("\n相关元素:");
  menuInfo.allVisibleDivs.forEach(d => {
    console.log(`[${d.tag}] "${d.text}" class="${d.className.slice(0, 60)}"`);
  });

  // 截图
  await page.screenshot({ path: path.resolve(__dirname, "..", "csdn-more-actions.png"), fullPage: true });

  // 也看看"发布文章"按钮现在的行为
  console.log("\n\n🖱️ 点击「发布文章」...");
  await page.keyboard.press("Escape"); // 关闭可能的菜单
  await page.waitForTimeout(500);
  await page.locator("button.btn-publish").first().click();
  await page.waitForTimeout(3000);

  console.log("URL after publish click:", page.url());
  const pubPageText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  console.log("页面:", pubPageText.slice(0, 500));

  await page.screenshot({ path: path.resolve(__dirname, "..", "csdn-publish-click.png"), fullPage: true });

  console.log("\n浏览器保持 30 秒...");
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
