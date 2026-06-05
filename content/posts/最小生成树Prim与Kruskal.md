---
title: "最小生成树：Prim与Kruskal算法完全指南"
date: 2026-06-04T22:30:00+08:00
draft: false
categories: ["图论", "算法竞赛进阶指南"]
description: "图论最小生成树之Prim与Kruskal算法详解，含动态SVG图解，ACM竞赛向"
tags: ["图论", "最小生成树", "MST", "Prim", "Kruskal", "并查集", "贪心"]
math: true
---

> 最小生成树（MST）是图论中最经典的问题之一。给你一张带权连通图，你要从中选 $V-1$ 条边，使得所有点连通且边权和最小。Prim 和 Kruskal 是解决这个问题的两个标准算法，一个像「点蔓延」，一个像「边连接」。

---

## 背景

如果这是你第一次听说"最小生成树"这个概念，可以在脑中想象一个场景：

> 有 $V$ 个村庄，你需要修路把它们全部连接起来。每条可能的路线都有一个修路成本。你不关心路程远近，只关心**总成本最小**，而且要**所有村庄都连通**。你会怎么选路？

这就是最小生成树（Minimum Spanning Tree, MST）问题的直观版本。

**前置知识**：并查集（Disjoint Set Union, DSU）、优先队列（堆）、图的邻接表存法。

---

## 零、什么是最小生成树——一个直观的理解

先看这个 5 点 10 边的带权图：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" style="width:100%; max-width:400px; display:block; margin:16px auto;">
  <text x="200" y="16" text-anchor="middle" font-size="13" fill="#555" font-weight="bold">带权无向图，目标是选 V-1=4 条边连通所有点，总权值最小</text>

  <circle cx="200" cy="55" r="20" fill="#d5f5e3" stroke="#27ae60" stroke-width="2"/>
  <text x="200" y="61" text-anchor="middle" font-size="15" fill="#1a5e3a" font-weight="bold">①</text>

  <circle cx="340" cy="140" r="20" fill="#fff" stroke="#ccc" stroke-width="2"/>
  <text x="340" y="146" text-anchor="middle" font-size="15" fill="#333">②</text>

  <circle cx="285" cy="285" r="20" fill="#fff" stroke="#ccc" stroke-width="2"/>
  <text x="285" y="291" text-anchor="middle" font-size="15" fill="#333">③</text>

  <circle cx="115" cy="285" r="20" fill="#fff" stroke="#ccc" stroke-width="2"/>
  <text x="115" y="291" text-anchor="middle" font-size="15" fill="#333">④</text>

  <circle cx="60" cy="140" r="20" fill="#fff" stroke="#ccc" stroke-width="2"/>
  <text x="60" y="146" text-anchor="middle" font-size="15" fill="#333">⑤</text>

  <!-- 外圈五边形 -->
  <line x1="217" y1="65" x2="323" y2="130" stroke="#bbb" stroke-width="1.5"/>
  <text x="275" y="85" font-size="13" fill="#999">7</text>
  <line x1="333" y1="159" x2="292" y2="266" stroke="#bbb" stroke-width="1.5"/>
  <text x="328" y="216" font-size="13" fill="#999">3</text>
  <line x1="265" y1="285" x2="135" y2="285" stroke="#bbb" stroke-width="1.5"/>
  <text x="197" y="300" font-size="13" fill="#999">1</text>
  <line x1="108" y1="266" x2="67" y2="159" stroke="#bbb" stroke-width="1.5"/>
  <text x="72" y="216" font-size="13" fill="#999">2</text>
  <line x1="77" y1="130" x2="183" y2="65" stroke="#bbb" stroke-width="1.5"/>
  <text x="118" y="85" font-size="13" fill="#999">6</text>

  <!-- 对角线 -->
  <line x1="193" y1="74" x2="122" y2="266" stroke="#d5d5d5" stroke-width="1"/>
  <text x="142" y="172" font-size="11" fill="#ccc">4</text>
  <line x1="207" y1="74" x2="278" y2="266" stroke="#d5d5d5" stroke-width="1"/>
  <text x="258" y="172" font-size="11" fill="#ccc">10</text>
  <line x1="327" y1="155" x2="130" y2="275" stroke="#d5d5d5" stroke-width="1"/>
  <text x="238" y="220" font-size="11" fill="#ccc">8</text>
  <line x1="73" y1="155" x2="270" y2="275" stroke="#d5d5d5" stroke-width="1"/>
  <text x="162" y="225" font-size="11" fill="#ccc">9</text>

  <text x="200" y="345" text-anchor="middle" font-size="11" fill="#888">最优解: ③-④(1) + ④-⑤(2) + ②-③(3) + ①-④(4) = 总权值 10</text>
</svg>

答案：选 4 条边连通 5 个点，最优总权值 = 10。怎么找？下面两个算法来解决。

---

## 一、Prim 算法——从一个点「长」出整棵树

### 1.1 核心思想

1. 选起点（如 ①），加入 MST。
2. 在所有连接「MST 内」与「MST 外」的边中，选权值最小的那条。
3. 把该边和新点加入 MST，重复直到所有点连通。

一句话：每次贪心地选最短割边，把最近的点"吸"进来。

### 1.2 逐步推演——请拿出纸笔

下面用第一张图中的同一张图来演示 Prim。**强烈建议你跟着步骤自己在纸上画一遍**——图论算法，画一遍比看十遍管用。

> **画图提示**：先在纸上画好 5 个点和所有边（照抄第一张 SVG），然后用荧光笔或不同颜色的笔逐轮标记"已加入 MST 的点"和"选中的边"。每轮画一个快照，共 4 个快照。

---

**初始状态**：选 ① 作为起点。MST 当前只有一个点 `{①}`。

现在，找出所有「一端在 MST 内、一端在 MST 外」的边：

| 候选边 | 权值 |
|:---:|:---:|
| ①-② | 7 |
| ①-④ | 4 |
| ①-⑤ | 6 |

三条中权值最小的是 **①-④(权值4)**。选中它，把 ④ 加入 MST。

> 📝 **第一张快照**：圈出 ① 和 ④，用醒目的颜色描粗边 ①-④，标上权值 4。当前 MST = {①, ④}，已选 1 条边，总权值 = 4。

---

现在 MST = {①, ④}。重新扫描「割边」——一端在 MST 内、一端在外的所有边。注意：MST 内部的边（已选的 ①-④）不再考虑。

从 ① 出发的候选：
- ①-②(7)
- ①-⑤(6)

从 ④ 出发的候选（④ 是新加入的，所以它的邻边之前没被考虑过）：
- ④-③(1)
- ④-⑤(2)
- ~~①-④(4)~~（已选，忽略）

把所有候选放一起比较：{7, 6, 1, 2}，最小是 **④-③(权值1)**。选中，③ 加入 MST。

> 📝 **第二张快照**：在前面快照的基础上，圈出 ③，描粗边 ④-③，标上 1。当前 MST = {①, ④, ③}，已选 2 条边，总权值 = 4 + 1 = 5。

---

MST = {①, ④, ③}。继续扫描割边：

从 ① 出发：①-②(7), ①-⑤(6)
从 ④ 出发：④-⑤(2)（①-④ 已选，④-③ 已选）
从 ③ 出发：③-②(3)（④-③ 已选）

候选集合：{7, 6, 2, 3}，最小是 **④-⑤(权值2)**。选中，⑤ 加入 MST。

> 📝 **第三张快照**：圈出 ⑤，描粗边 ④-⑤，标上 2。当前 MST = {①, ④, ③, ⑤}，已选 3 条边，总权值 = 4 + 1 + 2 = 7。

---

MST = {①, ④, ③, ⑤}。只剩 ② 没进来了。扫描割边：

从 ① 出发：①-②(7)
从 ③ 出发：③-②(3)
从 ⑤ 出发：⑤-②？没有直接边，但有 ①-② → 这条边一端在 MST 内(①)、一端在 MST 外(②)，权值 7，已经在候选中了。

候选：{7, 3}，最小是 **③-②(权值3)**。选中，② 加入 MST。

> 📝 **第四张快照**：圈出 ②，描粗边 ③-②，标上 3。全部 5 个点连通，MST 完成！最终总权值 = 4 + 1 + 2 + 3 = **10**。

---

**回顾选边顺序**：①-④(4) → ④-③(1) → ④-⑤(2) → ③-②(3)

**关键观察**：
- 每轮都是从「MST 内到 MST 外」的所有边中挑最小的那条——**局部贪心**。
- 已选中的边内部可能形成多条路径（比如 ①-④-③ 是通的），但永远不会形成环，因为我们从不把 MST 内部的边加入候选。
- 如果有边权值相同怎么办？随便选一条——MST 不唯一，但最小总权值唯一（只要没有相同权值的边）。

> 💡 **动手验证**：试试从 ③ 出发做 Prim，选边顺序会变吗？总权值还是 10 吗？（答案：顺序可能变，总权值不变——这就是 MST 的 cut property 保证的。）

### 1.3 朴素版代码 $O(V^2)$——适合稠密图

```cpp
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 5005;
const int INF = 0x3f3f3f3f;

int G[MAXN][MAXN];  // 邻接矩阵
int dist[MAXN];     // dist[i] = 点i到当前MST的最小距离
bool vis[MAXN];     // 是否已在MST中
int n, m;

int prim() {
    fill(dist, dist + n + 1, INF);
    fill(vis, vis + n + 1, false);
    dist[1] = 0;  // 从1号点开始
    int mst_weight = 0;

    for (int i = 1; i <= n; i++) {
        int u = -1;
        for (int j = 1; j <= n; j++)
            if (!vis[j] && (u == -1 || dist[j] < dist[u])) u = j;

        if (dist[u] == INF) return -1; // 不连通

        vis[u] = true;
        mst_weight += dist[u];

        for (int v = 1; v <= n; v++)
            if (!vis[v] && G[u][v] < dist[v])
                dist[v] = G[u][v];
    }
    return mst_weight;
}
```

和 Dijkstra 的唯一区别在松弛：Dijkstra 是 `dist[u] + G[u][v]`，Prim 是 `G[u][v]`。一个「加」，一个「比」。

### 1.4 堆优化版 $O(E \log V)$——竞赛主力

```cpp
#include <bits/stdc++.h>
using namespace std;
using pii = pair<int, int>;

const int MAXN = 100005;
const int INF = 0x3f3f3f3f;

vector<pii> adj[MAXN];
int dist[MAXN];
bool vis[MAXN];
int n, m;

int prim() {
    fill(dist, dist + n + 1, INF);
    dist[1] = 0;
    priority_queue<pii, vector<pii>, greater<pii>> pq;
    pq.push({0, 1});

    int mst_weight = 0, cnt = 0;

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (vis[u]) continue;
        vis[u] = true;
        mst_weight += d;
        cnt++;

        for (auto &[v, w] : adj[u]) {
            if (!vis[v] && w < dist[v]) {
                dist[v] = w;
                pq.push({dist[v], v});
            }
        }
    }
    return (cnt == n) ? mst_weight : -1;
}
```

要点：`cnt` 统计已加入点数判连通；`vis[u]` 做懒删除；松弛是 `w < dist[v]`（不是累加）。

---

## 二、Kruskal 算法——从边出发，「连」出整棵树

### 2.1 核心思想

1. 把所有边按权值从小到大排序。
2. 从小到大依次考虑每条边：两端不连通 → 选中合并；已连通 → 跳过。
3. 选中 $V-1$ 条边即完成。

判断连通用的就是并查集。一句话：**Kruskal = 排序 + 并查集。**

### 2.2 逐步推演——换个图，再来一遍

Kruskal 用边排序 + 并查集，思路和 Prim 完全不同。为了方便对比，这里换一张新图（5 个点、7 条边），**请你先在纸上画出下面这张图**：

```
边的列表（按权值从小到大）：
  ①-④(1)  ④-⑤(2)  ②-⑤(3)  ⑤-①(4)  ①-②(5)  ②-③(6)  ③-④(7)
```

> **画图提示**：把 5 个点摆成五边形——① 在最上方，顺时针排 ②③④⑤。画上所有 7 条边并标权值。边比较多没关系，重要的是在推演过程中用不同颜色标记"已选中"和"已跳过"。

并查集初始状态：5 个点各自为营——`{①} {②} {③} {④} {⑤}`。

---

**第 1 条边：①-④(权值1)**

① 和 ④ 属于不同集合。选中！合并 ① 和 ④。MST 边数 = 1/4，总权值 = 1。

并查集状态：`{①,④} {②} {③} {⑤}`

> 📝 在图上看：① 和 ④ 现在"一家人"了，描粗这条边。

---

**第 2 条边：④-⑤(权值2)**

④ 在 `{①,④}` 集合，⑤ 在 `{⑤}` 集合——不同集合。选中！合并。MST 边数 = 2/4，总权值 = 1+2 = 3。

并查集状态：`{①,④,⑤} {②} {③}`

> 📝 描粗 ④-⑤。现在 ①、④、⑤ 连通了。

---

**第 3 条边：②-⑤(权值3)**

② 在 `{②}`，⑤ 在 `{①,④,⑤}`——不同集合。选中！合并。MST 边数 = 3/4，总权值 = 1+2+3 = 6。

并查集状态：`{①,②,④,⑤} {③}`

> 📝 描粗 ②-⑤。只剩 ③ 孤立在外了。

---

**第 4 条边：⑤-①(权值4)**

查一下：⑤ 在哪？`{①,②,④,⑤}`。① 在哪？也是 `{①,②,④,⑤}`。**同一个集合！** 如果选这条边，⑤ 和 ① 之间就会形成 ⑤-④-① 或 ⑤-②-① 的环路。**跳过！** 用红色叉号标记它。

> 📝 这是 Kruskal 最关键的一步——并查集的作用就在这里：两个点如果在同一集合，说明它们之间已经有一条路径连通了，再加边必然成环。这道防线把贪心从"可能出错"变成了"一定正确"。

---

**第 5 条边：①-②(权值5)**

同样，① 和 ② 都在 `{①,②,④,⑤}` 中——已连通。**跳过！** 再打一个红叉。

---

**第 6 条边：②-③(权值6)**

② 在 `{①,②,④,⑤}`，③ 在 `{③}`——不同集合！选中！合并。

并查集状态：`{①,②,③,④,⑤}`——全部连通！MST 边数 = 4/4，完成！

总权值 = 1+2+3+6 = **12**。

> 📝 描粗 ②-③。全部 5 个点连通，不再需要看后面的边了（只剩一条 ③-④(7)，没必要看了——已选够 V-1 条边）。

---

**回顾全过程**：

| 顺序 | 边 | 权值 | 判定 | 原因 |
|:---:|:---:|:---:|:---:|:---|
| 1 | ①-④ | 1 | ✅ 选中 | 两端不同集合 |
| 2 | ④-⑤ | 2 | ✅ 选中 | 两端不同集合 |
| 3 | ②-⑤ | 3 | ✅ 选中 | 两端不同集合 |
| 4 | ⑤-① | 4 | ❌ 跳过 | 已在同一集合（会成环） |
| 5 | ①-② | 5 | ❌ 跳过 | 已在同一集合（会成环） |
| 6 | ②-③ | 6 | ✅ 选中 | 两端不同集合 |
| 7 | ③-④ | 7 | — | 已选够 4 条边，提前终止 |

**关键观察**：
- Kruskal **不看"MST 内部/外部"**，只看「每条边两端是否已连通」——这是和 Prim 最本质的区别。
- 排序一次，逐条"审判"，代码极其简单。
- 边 ⑤-① 权值只有 4，却因"会成环"被无情跳过——这就是贪心 + 并查集的威力。
- 如果有多条边权值相同，排序后先后顺序可能影响 MST 的形态，但不会影响总权值。

> 💡 **动手验证**：如果第 5 条边 ①-②(5) 被选中（假设 ⑤-① 不存在），会怎样？画出这个环，你就真正理解了 Kruskal。

### 2.3 并查集模板

```cpp
const int MAXN = 100005;
int fa[MAXN];

int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

// 初始化：每个点自成一个集合
iota(fa + 1, fa + n + 1, 1); // fa[1]=1, fa[2]=2, ... , fa[n]=n
```

赛场上不写 `struct`：能省一行是一行。纯路径压缩在随机数据下接近 $O(1)$。

### 2.4 Kruskal 完整代码 $O(E \log E)$

```cpp
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 100005;
int fa[MAXN];

int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

struct Edge { int u, v, w; };
bool operator<(const Edge &a, const Edge &b) { return a.w < b.w; }

int kruskal(int n, vector<Edge> &edges) {
    sort(edges.begin(), edges.end());
    iota(fa + 1, fa + n + 1, 1);

    int mst = 0, cnt = 0;
    for (auto &[u, v, w] : edges) {
        u = find(u), v = find(v);
        if (u != v) {
            fa[u] = v;
            mst += w;
            if (++cnt == n - 1) return mst;
        }
    }
    return -1; // 不连通
}
```

---

## 三、Prim vs Kruskal：一张表说清

| 维度 | Prim（朴素） | Prim（堆优化） | Kruskal |
|:---:|:---:|:---:|:---:|
| 时间 | $O(V^2)$ | $O((V+E)\log V)$ | $O(E\log E)$ |
| 空间 | $O(V^2)$ | $O(V+E)$ | $O(V+E)$ |
| 适合图 | 稠密图 $E\approx V^2$ | 稀疏图 | 稀疏图 |
| 核心 | 邻接矩阵 | 邻接表+堆 | 并查集+排序 |
| 代码量 | 短 | 中 | 短 |

- **稠密图**：朴素 Prim，$O(V^2)$ 直接赢 Kruskal 的 $O(E\log E)$。
- **稀疏图**：Kruskal，好写、好调、好扩展（次小生成树等）。
- ACM 比赛中 **Kruskal 使用频率远高于 Prim**。

---

## 四、ACM 赛场综合板子

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

// ========= 并查集 =========
const int MAXN = 100005;
int fa[MAXN];
int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

// ========= Kruskal =========
struct Edge { int u, v; ll w; };
bool operator<(const Edge &a, const Edge &b) { return a.w < b.w; }

ll kruskal(int n, vector<Edge> &edges) {
    sort(edges.begin(), edges.end());
    iota(fa + 1, fa + n + 1, 1);
    ll ans = 0; int cnt = 0;
    for (auto &[u, v, w] : edges) {
        u = find(u), v = find(v);
        if (u != v) { fa[u] = v; ans += w; if (++cnt == n - 1) return ans; }
    }
    return -1;
}

// ========= Prim 堆优化 =========
using pii = pair<ll, int>;
const ll INF = 1e18;
vector<pii> adj[100005];
ll dist[100005];
bool vis[100005];

ll prim(int n) {
    fill(dist, dist + n + 1, INF);
    fill(vis, vis + n + 1, false);
    dist[1] = 0;
    priority_queue<pii, vector<pii>, greater<pii>> pq;
    pq.push({0, 1});
    ll ans = 0; int cnt = 0;
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (vis[u]) continue;
        vis[u] = true; ans += d; cnt++;
        for (auto &[v, w] : adj[u])
            if (!vis[v] && w < dist[v]) { dist[v] = w; pq.push({dist[v], v}); }
    }
    return (cnt == n) ? ans : -1;
}
```

---

## 五、几个你必须知道的坑

### 5.1 重边
- Prim（邻接矩阵）：`G[u][v] = min(G[u][v], w)` 取最小值。
- Kruskal：重边自然处理，小权先选，大权自动跳过。

### 5.2 不连通
- Prim：某轮 `dist[u] == INF` → 返回 -1。
- Kruskal：选中边数 $< V-1$ → 返回 -1。

### 5.3 负权边
MST 可以处理负权边——贪心只关心相对顺序，不关心正负。

### 5.4 次小生成树
先求 MST，再枚举每条非树边 $(u,v,w)$，在形成的环上去掉最大边（严格次小要求该边 $< w$），取最小值。需要 LCA + 倍增维护路径最大边权。

---

## 六、洛谷例题链接

| 题目 | 类型 | 难度 |
|:---|:---|:---|
| <a href="https://www.luogu.com.cn/problem/P3366" target="_blank" rel="noopener noreferrer">P3366【模板】最小生成树</a> | MST 裸模板 | 普及/提高− |
| <a href="https://www.luogu.com.cn/problem/P1546" target="_blank" rel="noopener noreferrer">P1546 [USACO3.1] 最短网络 Agri-Net</a> | Prim 稠密图 | 普及− |
| <a href="https://www.luogu.com.cn/problem/P2330" target="_blank" rel="noopener noreferrer">P2330 [SCOI2005] 繁忙的都市</a> | MST 变种 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P1194" target="_blank" rel="noopener noreferrer">P1194 买礼物</a> | MST 建模 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P2872" target="_blank" rel="noopener noreferrer">P2872 [USACO07DEC] Building Roads S</a> | 部分边权 0 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P1550" target="_blank" rel="noopener noreferrer">P1550 [USACO08OCT] Watering Hole G</a> | 超级源点 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P4047" target="_blank" rel="noopener noreferrer">P4047 [JSOI2010] 部落划分</a> | 最小生成森林 | 提高+/省选− |
| <a href="https://www.luogu.com.cn/problem/P4180" target="_blank" rel="noopener noreferrer">P4180 [BJWC2010] 严格次小生成树</a> | 次小生成树 | 省选/NOI− |

推荐顺序：P3366 → P1546 → P2330 → P1194/P2872 → P1550 → P4047/P4180。

---

## 七、总结

- **Prim** = 点视角，墨水洇开，每次吸最近的点。稠密图 $O(V^2)$。
- **Kruskal** = 边视角，排序后用并查集连。稀疏图 $O(E\log E)$。

本质相同：每次选不形成环的最小边。赛场 90% 用 Kruskal，除非确定是稠密图。

> 关键词：最小生成树、MST、Prim、Kruskal、并查集、贪心、ACM模板
