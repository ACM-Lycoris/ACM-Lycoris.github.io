"""爬取二次元插画封面 —— 从 Safebooru 动漫图库批量下载"""
import requests
import random
import xml.etree.ElementTree as ET
from pathlib import Path

N = 12                    # 下载张数
W_MIN, H_MIN = 600, 300   # 最小尺寸，只要横版图

BASE = Path(__file__).parent
IMG_DIR = BASE / "static" / "images" / "covers"
DATA_FILE = BASE / "data" / "covers.yml"

IMG_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

# Safebooru 免费 API，无需 Key。搜横版风景/插画类标签
# 用多组标签 + 多页来凑够数量
SEARCHES = [
    "scenery landscape",
    "original scenery",
    "sky clouds",
    "cityscape night",
    "fantasy landscape",
    "anime scenery",
]

all_posts = []
for tag in SEARCHES:
    for page in range(5):
        url = (
            f"https://safebooru.org/index.php?page=dapi&s=post&q=index"
            f"&tags={tag.replace(' ', '+')}&limit=40&pid={page}"
        )
        try:
            r = requests.get(url, timeout=30,
                headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                continue
            root = ET.fromstring(r.text)
            for post in root.findall("post"):
                w = int(post.get("width", 0))
                h = int(post.get("height", 0))
                file_url = post.get("file_url", "")
                if w >= W_MIN and h >= H_MIN and w > h and file_url:
                    all_posts.append(file_url)
        except Exception:
            continue

# 去重
all_posts = list(set(all_posts))
random.shuffle(all_posts)
print(f"找到 {len(all_posts)} 张可用横版插画")

urls = []
for i, img_url in enumerate(all_posts[:N]):
    ext = img_url.rsplit(".", 1)[-1] or "jpg"
    path = IMG_DIR / f"cover{i+1:02d}.{ext}"
    print(f"[{i+1}/{N}] 下载 {img_url}")
    try:
        r = requests.get(img_url, timeout=30,
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://safebooru.org/"})
        if r.status_code == 200 and len(r.content) > 1000:
            path.write_bytes(r.content)
            urls.append(f"images/covers/{path.name}")
            print(f"       保存到 {path}")
        else:
            print(f"       失败 size={len(r.content)}")
    except Exception as e:
        print(f"       失败 {e}")

# 生成 covers.yml
DATA_FILE.write_text("\n".join(f"- {u}" for u in urls) + "\n", encoding="utf-8")
print(f"\n完成！{len(urls)} 张封面已就绪，covers.yml 已生成。")
