/**
 * 从 CSDN 创作中心首页探索发布流程
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

  console.log("🌐 打开创作中心...");
  await page.goto("https://mp.csdn.net/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log("📍 URL:", page.url());

  if (page.url().includes("passport") || page.url().includes("login")) {
    console.log("⚠️ 需要登录！等待中...");
    try {
      await page.waitForURL(u => !u.href.includes("passport") && !u.href.includes("login"), { timeout: 120000 });
    } catch { console.log("超时"); process.exit(1); }
  }

  // Dump 创作中心首页
  const homeInfo = await page.evaluate(() => {
    const r = {};

    // 所有链接
    r.links = Array.from(document.querySelectorAll("a"))
      .filter(el => el.offsetHeight > 0 && (el.href || "").length > 0)
      .map(el => ({
        text: (el.innerText || "").trim().slice(0, 60),
        href: (el.href || "").slice(0, 200),
        className: (el.className || "").slice(0, 100),
      }));

    // 所有按钮
    r.buttons = Array.from(document.querySelectorAll("button"))
      .filter(el => el.offsetHeight > 0 && (el.innerText || "").trim())
      .map(el => ({
        text: (el.innerText || "").trim().slice(0, 50),
        className: (el.className || "").slice(0, 100),
      }));

    // 侧边栏
    r.navItems = Array.from(document.querySelectorAll("nav a, .sidebar a, [class*='aside'] a, [class*='menu'] a, [class*='nav'] a"))
      .filter(el => el.offsetHeight > 0)
      .map(el => ({
        text: (el.innerText || "").trim().slice(0, 50),
        href: (el.href || "").slice(0, 200),
      }));

    return r;
  });

  console.log("\n📋 链接:");
  homeInfo.links.forEach(l => console.log(`  "${l.text}" → ${l.href.slice(0, 120)}`));

  console.log("\n🔘 按钮:");
  homeInfo.buttons.forEach(b => console.log(`  "${b.text}"`));

  console.log("\n🧭 导航:");
  homeInfo.navItems.forEach(n => console.log(`  "${n.text}" → ${n.href.slice(0, 120)}`));

  fs.writeFileSync(path.resolve(__dirname, "..", "csdn-mp-home.json"), JSON.stringify(homeInfo, null, 2));
  console.log("\n📄 已保存");

  // 尝试找"写文章"或"发布"入口
  const writeLinks = homeInfo.links.filter(l =>
    l.text.includes("写文章") || l.text.includes("发布") || l.text.includes("创作") ||
    l.href.includes("editor") || l.href.includes("creation") || l.href.includes("write")
  );
  console.log("\n🎯 找到的文章入口:");
  writeLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

  // 尝试点击"发布文章"入口
  if (writeLinks.length > 0) {
    const firstEntry = writeLinks[0];
    console.log(`\n🔗 点击: "${firstEntry.text}" → ${firstEntry.href}`);
    // 用 href 跳转
    if (firstEntry.href && firstEntry.href.startsWith("http")) {
      await page.goto(firstEntry.href, { waitUntil: "domcontentloaded", timeout: 15000 });
    }
    await page.waitForTimeout(4000);
    console.log("📍 新页面 URL:", page.url());

    // Dump 新页面
    const editorInfo = await page.evaluate(() => {
      const r = {};
      r.allInputs = Array.from(document.querySelectorAll("input, textarea, select"))
        .filter(el => el.offsetHeight > 0 || el.type === "file")
        .map(el => ({
          tag: el.tagName,
          type: el.type || "",
          placeholder: (el.placeholder || "").slice(0, 80),
          className: (el.className || "").slice(0, 120),
          id: el.id || "",
          visible: el.offsetHeight > 0,
        }));
      r.buttons = Array.from(document.querySelectorAll("button"))
        .filter(el => el.offsetHeight > 0 && el.innerText?.trim())
        .map(el => ({
          text: (el.innerText || "").trim().slice(0, 50),
          className: (el.className || "").slice(0, 100),
        }));
      r.contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          className: (el.className || "").slice(0, 100),
        }));
      return r;
    });

    console.log("\n📋 输入:");
    editorInfo.allInputs.forEach(i => console.log(`  [${i.tag}] type="${i.type}" placeholder="${i.placeholder}" id="${i.id}"`));
    console.log("\n🔘 按钮:");
    editorInfo.buttons.forEach(b => console.log(`  "${b.text}"`));
    console.log("\n✏️ ContentEditable:");
    editorInfo.contenteditables.forEach(c => console.log(`  [${c.tag}] ${c.className}`));

    fs.writeFileSync(path.resolve(__dirname, "..", "csdn-editor2.json"), JSON.stringify(editorInfo, null, 2));
  }

  console.log("\n⏸️  浏览器保持 60 秒...");
  await page.waitForTimeout(60000);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
