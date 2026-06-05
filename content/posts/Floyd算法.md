---
title: "Floyd算法——从朴素三重循环到ACM赛场板子"
date: 2026-06-05T02:00:00+08:00
draft: false
categories: ["图论", "算法竞赛进阶指南"]
description: "图论全源最短路之Floyd-Warshall算法详解，对比Dijkstra，ACM竞赛向"
tags: ["图论", "最短路", "Floyd", "全源最短路", "动态规划", "传递闭包"]
math: true
---

> 当 Dijkstra 在单源最短路上大杀四方的时候，Floyd 用三重循环悄悄解决了另一个问题：**所有点对之间的最短距离**。这篇文章把 Floyd 从头拆解到尾，附带赛场上能直接用的优化板子。

---

## 背景

如果你已经学了 Dijkstra（还没学的话可以先看[这篇](/posts/迪杰斯特拉算法/)），知道它能在 $O((V+E) \log V)$ 的时间内求出**某一个起点**到所有点的最短距离。

但有些题目会让你求**任意两点之间的最短距离**，而且可能要做 $Q$ 次查询（$Q$ 可能很大）。如果用 Dijkstra，每次查询都得跑一遍，时间复杂度 $O(Q \cdot (V+E) \log V)$，在 $V \le 500$、$Q \le 10^5$ 的题目里勉强能过，但代码量偏大。

这时候 Floyd-Warshall 算法的优势就体现出来了：**一次预处理 $O(V^3)$，之后每次查询 $O(1)$**。

这篇文章假设你已经会存图（邻接矩阵就行），了解最基本的最短路概念。如果还不熟，建议先翻一下 Dijkstra 那篇。

---

## 一、Floyd 与 Dijkstra 的区别

在我刚学图论的时候，最困惑的就是"什么时候用 Dijkstra，什么时候用 Floyd"。下面这张表帮你一次理清：

| 维度 | Dijkstra | Floyd-Warshall |
|:---:|:---:|:---:|
| **解决问题** | 单源最短路（一个起点 → 所有点） | 全源最短路（所有点对之间） |
| **时间复杂度** | 朴素 $O(V^2)$，堆优化 $O((V+E) \log V)$ | $O(V^3)$ |
| **空间复杂度** | 邻接表 $O(V+E)$，邻接矩阵 $O(V^2)$ | $O(V^2)$（一个二维数组） |
| **处理负权边** | ❌ 不行（贪心依赖非负权） | ✅ 可以（但不能有负环） |
| **处理负环** | ❌ 不行 | ✅ 可以检测（对角线出现负数） |
| **适用数据规模** | $V \le 10^5$（堆优化），$V \le 5000$（朴素） | $V \le 500$（典型），极限 $V \le 800$ |
| **代码量** | 堆优化约 15 行 | **核心 4 行** |
| **查询单次时间** | 每次都要跑一遍 $O((V+E) \log V)$ | 预处理后 $O(1)$ |

一句话总结：

> - **$V$ 很小（≤ 500），需要多次查询任意两点距离** → Floyd
> - **$V$ 很大，只关心一个起点** → Dijkstra
> - **$V$ 很大，需要所有点对** → 跑 $V$ 次 Dijkstra（堆优化），$O(V \cdot (V+E) \log V)$，在稀疏图上比 Floyd 的 $O(V^3)$ 快

---

## 二、Floyd 的核心思想——标准定义 + 人话版

### 2.1 标准定义

Floyd-Warshall 算法是一种**动态规划**算法。定义状态：

$$
\text{dp}[k][i][j] = \text{从 } i \text{ 到 } j \text{，只经过编号 } \le k \text{ 的中间点，得到的最短距离}
$$

状态转移方程：

$$
\text{dp}[k][i][j] = \min\bigl(\text{dp}[k-1][i][j],\quad \text{dp}[k-1][i][k] + \text{dp}[k-1][k][j]\bigr)
$$

意思是：从 $i$ 到 $j$ 的最短路，要么**不经过 $k$**，要么**经过 $k$**（即先从 $i$ 到 $k$，再从 $k$ 到 $j$）。

因为 $k$ 那一维可以滚动掉（每次只用上一次的状态），所以空间优化到二维：

$$
\text{dist}[i][j] = \min\bigl(\text{dist}[i][j],\quad \text{dist}[i][k] + \text{dist}[k][j]\bigr)
$$

这就是你看到的那个著名的三重循环。

### 2.2 人话版

想象你有一张城市地图，你想知道**任意两个城市之间的最短路径**。

Floyd 的做法是：**一个一个城市地"开放"作为中转站**。

- 初始：你只能直接走，没有中转站。
- 第 1 轮：开放 1 号城市作为中转站。检查每一对城市 $(i, j)$：如果"从 $i$ 到 $j$ 直走"比"从 $i$ 先到 1 号、再从 1 号到 $j$"更长，那就改成走 1 号中转。
- 第 2 轮：继续开放 2 号城市……一直到所有城市都当过中转站。

当所有城市都当过一遍中转站后，$\text{dist}[i][j]$ 就是 $i$ 到 $j$ 的真正最短距离。

> 一句话：**Floyd 的核心就是"试试让 $k$ 当中间人，看能不能缩短 $i$ 到 $j$ 的距离"。**

---

## 三、图解 Floyd 的一轮迭代

假设有 4 个城市，初始距离矩阵如下（$\infty$ 表示不直接相连）：

```text
初始 dist[i][j]（直接距离）:
    | 1   2   3   4
 ---+----------------
  1 | 0   5  ∞  10
  2 | ∞   0   3  ∞
  3 | ∞  ∞   0   1
  4 | ∞  ∞  ∞   0
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" style="width:100%; max-width:600px; display:block; margin:16px auto;">
  <text x="300" y="20" text-anchor="middle" font-size="16" fill="#2c3e50" font-weight="bold">Floyd 图解：当 k=2 作为中转站时</text>
  <g style="cursor:pointer" onclick="var s=this.closest('svg');var t=this.querySelector('text');if(s.animationsPaused()){s.unpauseAnimations();t.textContent='⏸ 暂停'}else{s.pauseAnimations();t.textContent='▶ 播放'}">
    <rect x="520" y="2" width="72" height="24" rx="5" fill="#fafafa" stroke="#ccc"/>
    <text x="556" y="19" text-anchor="middle" font-size="12" fill="#666">⏸ 暂停</text>
  </g>

  <!-- 4个城市节点 -->
  <circle cx="300" cy="70" r="28" fill="#e8f8f5" stroke="#27ae60" stroke-width="2.5"/>
  <text x="300" y="76" text-anchor="middle" font-size="18" fill="#2c3e50" font-weight="bold">1</text>

  <circle cx="120" cy="170" r="28" fill="#d5f5e3" stroke="#27ae60" stroke-width="3"/>
  <text x="120" y="176" text-anchor="middle" font-size="18" fill="#2c3e50" font-weight="bold">2</text>
  <text x="120" y="210" text-anchor="middle" font-size="11" fill="#e74c3c" font-weight="bold">中转站 k</text>

  <circle cx="480" cy="170" r="28" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
  <text x="480" y="176" text-anchor="middle" font-size="18" fill="#333">3</text>

  <circle cx="300" cy="280" r="28" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
  <text x="300" y="286" text-anchor="middle" font-size="18" fill="#333">4</text>

  <!-- 边：1→2 (权5) -->
  <line x1="282" y1="88" x2="138" y2="152" stroke="#3498db" stroke-width="2"/>
  <text x="195" y="110" font-size="14" fill="#3498db" font-weight="bold">5</text>

  <!-- 边：1→4 (权10) -->
  <line x1="316" y1="96" x2="308" y2="255" stroke="#3498db" stroke-width="2"/>
  <text x="335" y="178" font-size="14" fill="#3498db" font-weight="bold">10</text>

  <!-- 边：2→3 (权3) -->
  <line x1="146" y1="180" x2="455" y2="180" stroke="#3498db" stroke-width="2"/>
  <text x="295" y="170" font-size="14" fill="#3498db" font-weight="bold">3</text>

  <!-- 边：3→4 (权1) -->
  <line x1="468" y1="196" x2="318" y2="260" stroke="#3498db" stroke-width="2"/>
  <text x="410" y="238" font-size="14" fill="#3498db" font-weight="bold">1</text>

  <!-- 当 k=2 时，高亮 1→2→3 的路径 -->
  <g>
    <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.02;0.08;0.42;0.48;1" dur="6s" repeatCount="indefinite"/>
    <!-- 高亮路径 1→2→3 -->
    <line x1="282" y1="88" x2="138" y2="152" stroke="#e74c3c" stroke-width="4" stroke-dasharray="8,4"/>
    <line x1="146" y1="180" x2="455" y2="180" stroke="#e74c3c" stroke-width="4" stroke-dasharray="8,4"/>
    <!-- 标注 -->
    <rect x="200" y="290" width="200" height="56" rx="8" fill="#fff5f5" stroke="#e74c3c" stroke-width="1.5"/>
    <text x="300" y="310" text-anchor="middle" font-size="12" fill="#e74c3c" font-weight="bold">dist[1][3] 被更新：</text>
    <text x="300" y="330" text-anchor="middle" font-size="12" fill="#c0392b">∞ → dist[1][2] + dist[2][3]</text>
    <text x="300" y="345" text-anchor="middle" font-size="12" fill="#c0392b">∞ → 5 + 3 = 8</text>
  </g>

  <!-- 更新后的矩阵（显示在右下角） -->
  <g>
    <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.45;0.55;1" dur="6s" repeatCount="indefinite"/>
    <text x="15" y="320" font-size="11" fill="#888">更新后 dist:</text>
    <text x="15" y="338" font-size="10" fill="#555">[1][3] = 8（原来 ∞）</text>
    <text x="15" y="353" font-size="10" fill="#555">[1][4] 待后续检查</text>
  </g>

  <text x="300" y="370" text-anchor="middle" font-size="11" fill="#888">当 k=2 时，所有 i→2→j 的路径都会被检查，看能否缩短 i→j</text>
</svg>

当 $k=2$ 开放为中转站时，算法检查每一对 $(i, j)$：
- `dist[1][3] = min(∞, dist[1][2] + dist[2][3]) = min(∞, 5+3) = 8` ← **缩短了！**
- `dist[1][4] = min(10, dist[1][2] + dist[2][4]) = min(10, 5+∞) = 10` ← 没变

当 $k$ 从 1 到 4 全部轮完一遍，矩阵中的所有值就都是最终的最短距离了。

---

## 四、基础版代码实现

```cpp
// Floyd-Warshall 基础版，O(V³)
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 505;
const int INF = 0x3f3f3f3f; // 约 1e9，适合 int 范围

int dist[MAXN][MAXN];
int n; // 点数，编号从 1 开始

void floyd() {
    for (int k = 1; k <= n; k++)          // 枚举中转站
        for (int i = 1; i <= n; i++)      // 枚举起点
            for (int j = 1; j <= n; j++)  // 枚举终点
                if (dist[i][k] != INF && dist[k][j] != INF)  // 防止溢出
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
}

// 初始化
void init() {
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= n; j++) {
            dist[i][j] = (i == j) ? 0 : INF;
        }
    }
}
```

核心只有 4 行，但这里有两个细节需要特别注意：

1. **$k$ 必须在最外层**：如果你把循环顺序写成 `i → j → k`，结果会是错的——因为你可能用到了还没更新完的中间状态。
2. **INF 判溢出**：`dist[i][k] + dist[k][j]` 时如果两边都是 INF，int 会溢出成负数，所以要加判断。

---

## 五、ACM 赛场级优化板子

以下板子在比赛中可以直接抄，融合了几个常用优化：

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

const int MAXN = 505;
const ll INF = 1e18;

ll dist[MAXN][MAXN];
int n, m; // n 个点，m 条边

void init() {
    // 初始化：自己到自己是 0，其他是 INF
    for (int i = 1; i <= n; i++) {
        fill(dist[i] + 1, dist[i] + n + 1, INF);
        dist[i][i] = 0;
    }
}

void floyd() {
    for (int k = 1; k <= n; k++) {
        // 小优化：如果 dist[i][k] 已经是 INF，内层直接跳过
        for (int i = 1; i <= n; i++) {
            if (dist[i][k] == INF) continue;
            for (int j = 1; j <= n; j++) {
                if (dist[k][j] == INF) continue;
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
            }
        }
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q; // q 次查询
    cin >> n >> m >> q;

    init();

    // 读入 m 条边（有向边，无向边读两条）
    for (int i = 0; i < m; i++) {
        int u, v;
        ll w;
        cin >> u >> v >> w;
        dist[u][v] = min(dist[u][v], w); // 处理重边：取最小权值
    }

    floyd();

    // 处理查询
    while (q--) {
        int u, v;
        cin >> u >> v;
        if (dist[u][v] >= INF / 2) cout << "-1\n"; // 不可达
        else cout << dist[u][v] << '\n';
    }

    return 0;
}
```

### 板子里的几个优化点

| 优化 | 说明 |
|:---|:---|
| `dist[i][k] == INF → continue` | 如果 $i$ 到 $k$ 不可达，$i→k→j$ 这条路就不可能走得通，直接跳过内层循环，**常数优化明显** |
| `dist[k][j] == INF → continue` | 同理，$k$ 到 $j$ 不可达也跳过 |
| `dist[u][v] = min(dist[u][v], w)` | 处理重边（多条同向边取最小的），很多模板题都有重边 |
| `INF / 2` 判断不可达 | 因为 INF 参与了加法，有些"不可达"的路径可能会被更新成 `INF + 负数 ≠ INF`。判断 `>= INF/2` 更安全 |
| `fill` 初始化 | 比 `memset` 更直观，且对 `ll` 数组正确（`memset` 对 `ll` 按字节填充不是 `1e18`） |

> 这个板子可以直接过洛谷 P1119（灾后重建）这类 Floyd 变种题。核心的 `dist[i][k] == INF → continue` 在稀疏图上能带来非常显著的常数优化。

---

## 六、三个重要应用场景

### 6.1 传递闭包

**问题**：给定有向图，判断任意两点 $i$ 和 $j$ 之间是否存在路径（不关心距离）。

把 Floyd 的 `min` 和 `+` 换成 `|` 和 `&` 即可：

```cpp
// reach[i][j] = 是否存在 i→j 的路径
for (int k = 1; k <= n; k++)
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++)
            reach[i][j] |= (reach[i][k] & reach[k][j]);
```

也可以用 `bitset` 优化到 $O(V^3 / 64)$，对于 $V \le 2000$ 的题很有效。

### 6.2 求最小环

在 Floyd 的第 $k$ 轮时，所有经过编号 $< k$ 的中间点的最短路已经求出。此时对每个 $k$，枚举 $i, j < k$：

```cpp
ll min_cycle = INF;
for (int k = 1; k <= n; k++) {
    // 此时 dist[i][j] 是只经过 < k 的中间点的最短路
    for (int i = 1; i < k; i++)
        for (int j = i + 1; j < k; j++)
            min_cycle = min(min_cycle, dist[i][j] + G[i][k] + G[k][j]);
    // 正常的 Floyd 松弛
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++)
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
}
```

### 6.3 负环检测

跑完 Floyd 后，检查对角线：

```cpp
bool has_negative_cycle = false;
for (int i = 1; i <= n; i++)
    if (dist[i][i] < 0) has_negative_cycle = true;
```

如果一个点绕一圈回到自己的距离变成了负数，说明图中存在负环。

---

## 七、复杂度分析

| 指标 | 数值 |
|:---|:---|
| 时间 | $O(V^3)$，三重循环，每层 $V$ 次 |
| 空间 | $O(V^2)$，一个 $V \times V$ 的矩阵 |
| 适合的 $V$ | $\le 500$ 稳妥，$\le 800$ 勉强（约 $5 \times 10^8$ 次操作，带优化剪枝可过） |
| 不适合的 $V$ | $\ge 1000$，$V^3 = 10^9$，大概率 TLE |

---

## 八、洛谷例题链接

以下题目都是 Floyd 或 Floyd 变种在洛谷上的模板/经典题：

| 题目 | 类型 | 难度 |
|:---|:---|:---|
| <a href="https://www.luogu.com.cn/problem/B3647" target="_blank" rel="noopener noreferrer">B3647【模板】Floyd</a> | Floyd 裸模板 | 入门 |
| <a href="https://www.luogu.com.cn/problem/P1119" target="_blank" rel="noopener noreferrer">P1119 灾后重建</a> | Floyd 变种（动态加点） | 提高+/省选− |
| <a href="https://www.luogu.com.cn/problem/P1522" target="_blank" rel="noopener noreferrer">P1522 [USACO2.4] 牛的旅行 Cow Tours</a> | Floyd + 枚举连边 | 提高+/省选− |
| <a href="https://www.luogu.com.cn/problem/P6175" target="_blank" rel="noopener noreferrer">P6175 无向图的最小环问题</a> | Floyd 求最小环 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P2419" target="_blank" rel="noopener noreferrer">P2419 [USACO08JAN] Cow Contest S</a> | Floyd 传递闭包 | 普及+/提高 |
| <a href="https://www.luogu.com.cn/problem/P2886" target="_blank" rel="noopener noreferrer">P2886 [USACO07NOV] Cow Relays G</a> | Floyd + 矩阵快速幂（广义矩阵乘法） | 省选/NOI− |
| <a href="https://www.luogu.com.cn/problem/P3905" target="_blank" rel="noopener noreferrer">P3905 道路重建</a> | Floyd 变种 | 普及/提高− |

推荐的刷题顺序：B3647（模板）→ P2419（传递闭包）→ P1119（动态加点）→ P6175（最小环）→ P1522 → P2886（进阶）。

---

## 九、常见易错点

1. **$k$ 必须在最外层**：这是 Floyd 正确性的基石。如果你写成 `i → j → k`，动态规划的正确转移顺序就被破坏了。

2. **INF 取值和溢出**：如果你用 `int` 和 `0x3f3f3f3f`，注意 `0x3f3f3f3f + 0x3f3f3f3f` 会溢出（约等于 `0x7e7e7e7e`，还在正数范围，但如果再加就危险了）。最安全的方式是像板子里那样用 `continue` 跳过不可达的中间点。

3. **重边处理**：输入数据可能包含多条 $u \to v$ 的边，建图时要取最小值 `dist[u][v] = min(dist[u][v], w)`。

4. **无向图要加两条边**：`dist[u][v] = dist[v][u] = min(dist[u][v], w)`。

5. **邻接矩阵 vs 邻接表**：Floyd 只能用邻接矩阵（需要 $O(1)$ 访问任意两点间的距离），这是它的局限性之一。

6. **不能处理负环**：Floyd 可以处理负权边，但不能处理负环。如果存在负环，最短距离无定义（可以无限绕圈变小）。

---

## 十、总结

Floyd 算法本质上就是一个**动态规划**：

1. 定义状态：$\text{dp}[k][i][j]$ = 从 $i$ 到 $j$，只用 $\le k$ 的点做中转的最短距离。
2. 转移方程：要么不经过 $k$，要么经过 $k$。
3. 滚动掉第一维 → 三重循环 → 代码只有 4 行。

用一句话记住它：

> **让每个点都当中转站试试，看能不能让别的两个点之间的路更短。**

它虽然 $O(V^3)$ 看起来慢，但在 $V \le 500$ 的场景下，配合 `continue` 剪枝优化，实际运行速度完全可以接受。而且代码短、不容易写错，是 ACM 赛场上处理**多源最短路**和**传递闭包**的首选武器。

> 关键词：Floyd-Warshall、全源最短路、动态规划、传递闭包、最小环、ACM模板
