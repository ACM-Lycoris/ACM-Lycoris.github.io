/**
 * CSDN 批量发布脚本 vFinal
 *
 * 完整流程：
 *   1. Markdown 编辑器：导入 markdown → 填标题
 *   2. 点击"发布文章" → 右侧设置面板
 *   3. 填标签、分类、摘要 → "保存为草稿"
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ====================== 配置 ======================
const BLOG_URL = "https://acm-lycoris.cn/";
const BLOG_NAME = "ACM-Lycoris's Blog";
const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const INTERVAL = 10000;

// ====================== 工具函数 ======================

function parseFrontMatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { data: {}, body: raw };
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") { endIdx = i; break; }
  }
  if (endIdx === -1) return { data: {}, body: raw };
  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");
  const data = {};
  let currentKey = "", currentArray = [];
  for (const line of fmLines) {
    if (line.trim() === "" && currentArray.length === 0) continue;
    const arrMatch = line.match(/^\s{2}-\s+(.*)$/);
    if (arrMatch && currentKey) {
      currentArray.push(arrMatch[1].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
      continue;
    }
    if (currentKey && currentArray.length > 0) {
      data[currentKey] = [...currentArray];
      currentArray = []; currentKey = "";
    }
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();
      value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (value === "" || value === undefined) {
        currentKey = key; currentArray = [];
      } else if (value === "true") {
        data[key] = true;
      } else if (value === "false") {
        data[key] = false;
      } else {
        const inlineArr = value.match(/^\[(.+)\]$/);
        if (inlineArr) {
          data[key] = inlineArr[1].split(",").map(s => s.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
        } else {
          data[key] = value;
        }
      }
    }
  }
  if (currentKey && currentArray.length > 0) data[currentKey] = currentArray;
  return { data, body };
}

function cleanContent(rawBody) {
  let body = rawBody;
  body = body.replace(/<style[\s\S]*?<\/style>/gi, "");
  body = body.replace(/<style[^>]*\/?>/gi, "");
  body = body.replace(/\n{4,}/g, "\n\n\n");
  return body;
}

function appendBlogFooter(body, articleTitle, articleSlug) {
  const articleUrl = BLOG_URL + "posts/" + articleSlug + "/";
  const footer = [
    "", "",
    "---", "",
    "> 本文原载于 **[" + BLOG_NAME + "](" + BLOG_URL + ")** —— [" + articleTitle + "](" + articleUrl + ")",
    "> 欢迎访问 [" + BLOG_URL + "](" + BLOG_URL + ") 阅读更多算法题解与技术文章。",
  ];
  return body.trimEnd() + "\n" + footer.join("\n");
}

function filenameToSlug(filename) {
  return encodeURIComponent(filename.replace(/\.md$/, ""));
}

function formatTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return String(tags).split(",").map(t => t.trim()).filter(Boolean);
}

function getFirstCategory(categories) {
  if (!categories) return "";
  if (Array.isArray(categories)) return categories[0] || "";
  return String(categories) || "";
}

// ====================== 核心 ======================

async function main() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md")).sort();
  console.log("📄 " + files.length + " 篇文章\n");

  const articles = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, body } = parseFrontMatter(raw);
    const title = data.title || file.replace(/\.md$/, "");
    let cleaned = cleanContent(body);
    cleaned = appendBlogFooter(cleaned, title, filenameToSlug(file));
    articles.push({
      file, title,
      category: getFirstCategory(data.categories),
      tags: formatTags(data.tags),
      description: data.description || "",
      body: cleaned,
    });
    console.log("✅ " + file + " → \"" + title + "\" [" + articles[articles.length - 1].category + "]");
  }

  console.log("\n🚀 启动浏览器...");
  const userDataDir = path.resolve(__dirname, "..", ".playwright-csdn-profile");
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--start-maximized", "--disable-blink-features=AutomationControlled"],
    viewport: null,
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  try {
    console.log("🔍 检查登录...");
    await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(4000);
    if (page.url().includes("passport") || page.url().includes("login")) {
      console.log("🔐 请登录，等待中...");
      try {
        await page.waitForURL(
          u => !u.href.includes("passport") && !u.href.includes("login"),
          { timeout: 180000 }
        );
        await page.waitForTimeout(3000);
      } catch { console.log("❌ 超时"); process.exit(1); }
    }
    console.log("✅ 已登录\n");

    let ok = 0, bad = 0;

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      console.log("=".repeat(55));
      console.log("[" + (i + 1) + "/" + articles.length + "] " + a.title);
      console.log("=".repeat(55));

      try {
        await postOne(page, a);
        console.log("✅ 完成");
        ok++;
      } catch (err) {
        console.log("❌ " + err.message);
        bad++;
        await page.screenshot({
          path: path.resolve(__dirname, "..", "csdn-err-" + (i + 1) + ".png"),
          fullPage: true,
        }).catch(() => {});
      }

      if (i < articles.length - 1) {
        console.log("   ⏳ 等待 " + (INTERVAL / 1000) + "s...");
        await page.waitForTimeout(INTERVAL);
      }
    }

    console.log("\n╔══════════════════════════╗");
    console.log("║  成功 " + ok + " 篇  失败 " + bad + " 篇     ║");
    console.log("╚══════════════════════════╝");
    console.log("\n📋 草稿箱: https://mp.csdn.net/mp_blog/manage/article");
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
  }
}

async function postOne(page, a) {
  // 1. 打开编辑器
  await page.goto("https://editor.csdn.net/md", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3500);

  // 2. 先导入正文（导入会重置标题，所以先导正文）
  console.log("   📝 导入正文...");
  const tmpFile = path.join(os.tmpdir(), "csdn-" + Date.now() + ".md");
  fs.writeFileSync(tmpFile, a.body, "utf-8");
  await page.locator("#import-markdown-file-input").setInputFiles(tmpFile);
  await page.waitForTimeout(3000);
  fs.unlinkSync(tmpFile);

  const preLen = (await page.locator("pre.editor__inner").innerText()).length;
  if (preLen < 10) throw new Error("正文导入失败");
  console.log("   ✅ 正文 " + preLen + " 字符");

  // 3. 再填标题（导入后标题被重置为文件名）
  console.log("   📝 标题...");
  await page.locator(".article-bar__title-display").first().click();
  await page.waitForTimeout(500);
  try {
    const ti = page.locator("input.article-bar__title--input");
    await ti.waitFor({ state: "visible", timeout: 3000 });
    await ti.fill("");
    await ti.fill(a.title);
  } catch {
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(100);
    await page.keyboard.type(a.title, { delay: 10 });
  }
  console.log("   ✅ 标题: " + a.title);

  // 4. 点击"发布文章"打开设置面板
  console.log("   🔧 设置面板...");
  await page.locator("button.btn-publish").first().click();
  await page.waitForTimeout(3500);

  // 5. 填标签
  if (a.tags.length > 0) {
    console.log("   🏷️ 标签...");
    try {
      const tagBtn = page.locator('button:has-text("添加文章标签")');
      if (await tagBtn.isVisible({ timeout: 2000 })) {
        await tagBtn.click();
        await page.waitForTimeout(1000);
      }
      // 标签输入框可能出现在点击后的弹窗中
      for (const tag of a.tags.slice(0, 8)) {
        const tagInput = page.locator('input[placeholder*="输入"], input[placeholder*="搜索"], input[placeholder*="添加"], input.el_mcm-input__inner').first();
        try {
          await tagInput.waitFor({ state: "visible", timeout: 2000 });
          await tagInput.fill(tag);
          await page.waitForTimeout(400);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(500);
        } catch { break; }
      }
      console.log("   ✅ 标签: " + a.tags.slice(0, 5).join(", "));
    } catch (e) {
      console.log("   ⚠️ 标签: " + e.message);
    }
  }

  // 6. 填摘要
  if (a.description) {
    console.log("   📄 摘要...");
    try {
      const sm = page.locator('textarea[placeholder*="展现列表"], textarea[placeholder*="256"]').first();
      if (await sm.isVisible({ timeout: 1500 })) {
        await sm.fill(a.description);
        console.log("   ✅ 摘要");
      }
    } catch {}
  }

  // 7. 点击面板中的"保存为草稿"
  console.log("   💾 保存为草稿...");
  let saved = false;

  // 方法1: 点击面板中的"保存为草稿"按钮（force: true 绕过遮挡检测）
  try {
    const panelSaveBtn = page.locator('button:has-text("保存为草稿")');
    await panelSaveBtn.click({ force: true, timeout: 3000 });
    console.log("   ✅ 已点击「保存为草稿」(panel)");
    saved = true;
  } catch (e1) {
    console.log("   ⚠️ 面板按钮: " + e1.message.slice(0, 80));
  }

  // 方法2: 如果面板按钮失败，用快捷键
  if (!saved) {
    try {
      await page.keyboard.press("Control+s");
      console.log("   ✅ Ctrl+S 发送");
      saved = true;
    } catch {}
  }

  if (!saved) {
    throw new Error("无法保存");
  }
  await page.waitForTimeout(4000);
}

main().catch(err => { console.error("💥 " + err); process.exit(1); });
