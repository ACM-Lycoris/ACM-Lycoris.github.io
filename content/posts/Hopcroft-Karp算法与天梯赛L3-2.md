---
title: "图论Hopcroft-Karp算法与2026天梯赛L3-2"
date: 2026-04-25T22:14:41+08:00
draft: false
categories: ["图论"]
tags: ["算法", "图论", "二分图", "Hopcroft-Karp", "天梯赛"]
---

> 从零入门二分图最大匹配，附天梯赛 2026 L3-2 的建模思路。

---

## 背景

这篇文章面向两类读者：

1. 学过 BFS/DFS，但对“增广路”理解不牢。
2. 做题时知道要用二分图匹配，但写不出稳定的 Hopcroft-Karp。

如果你是第一次接触图论，也可以看，但建议先补一下 BFS、DFS 和图的基本表示
什么 你说你不会BFS和DFS?

---

## 一、什么是二分图

二分图是把点分成两组 $L$ 和 $R$，并且所有边都只在两组之间连接，不会出现组内连边。

一个直观场景：左边是学生，右边是公司，边表示“可以投递”。

```text
LEFT SET (L)                      RIGHT SET (R)
  ┌───┐                           ┌───┐
  │小明│────────────────────────→│字节│
  └───┘                           └───┘
  ┌───┐                           ┌───┐
  │小红│────────────────────────→│腾讯│
  └───┘                           └───┘
  ┌───┐                           ┌───┐
  │小刚│────────────────────────→│美团│
  └───┘                           └───┘
```

---

## 二、什么是匹配与最大匹配

匹配是一组边，要求任意两条匹配边不能共享端点。

在“学生-公司”语义下就是：

1. 一个学生最多匹配一个公司。
2. 一个公司最多匹配一个学生。

匹配边数尽可能大，就是最大匹配。

---

## 三、增广路：匹配增长的唯一通道

从一个未匹配左点出发，沿着“未匹配边、匹配边、未匹配边、匹配边……”交替前进，最终到达一个未匹配右点，这条路就是增广路。

找到增广路后，把路径上的边状态全部翻转（匹配变未匹配，未匹配变匹配），匹配数会恰好加 1。

> 定理：当且仅当不存在增广路时，当前匹配是最大匹配。

这句话几乎是所有二分图匹配算法的出发点。

---

## 四、从匈牙利到 Hopcroft-Karp

匈牙利算法（这里指 DFS 版二分图增广）是“每次找一条增广路”。

它的瓶颈在于串行：

1. 找到一条。
2. 翻转。
3. 再从头找下一条。

Hopcroft-Karp 的关键升级是：

1. 先 BFS 分层，定位“最短增广路长度”。
2. 再 DFS 只在分层图上找路。
3. 一轮内增广一批“点互不相交”的最短增广路。

这就是它能从 O(E·V) 提升到 O(E·根号下V) 的核心原因。

---

## 五、Hopcroft-Karp 核心机制

### 5.1 BFS 分层（找最短增广路长度）

从所有未匹配左点同时出发：

1. 左点沿未匹配边走到右点。
2. 右点若已匹配，再沿匹配边回到左点。

最终得到层次数组 dist，并确定本轮最短增广路长度。

### 5.2 DFS 批量增广（只走合法层次）

DFS 只允许从深度 $d$ 走到 $d+1$，所以只会探索“本轮最短路”。

注意一个常见误区：

> 同一轮可同时增广的多条路径，必须是点互不相交（至少左侧和右侧匹配点不能冲突）。

如果两条路径共享顶点，它们不能在同一轮同时翻转。

### 5.3 一轮流程

```text
初始化空匹配
  -> BFS 分层（若不存在增广路则结束）
  -> 多次 DFS 寻找并翻转最短增广路
  -> 进入下一轮
```

---

## 六、复杂度对比

| 算法                 | 核心策略             | 复杂度        |
| -------------------- | -------------------- | ------------- |
| 匈牙利（DFS 增广版） | 一次找一条增广路     | $O(VE)$       |
| Hopcroft-Karp        | 一轮找多条最短增广路 | $O(E\sqrt V)$ |

在大图上，Hopcroft-Karp 通常有明显优势。

---

## 七、C++ 函数模板（可直接套）

下面给出常用、稳健的 HK 写法（函数式，不封装类）。

```cpp
#include <bits/stdc++.h>
using namespace std;

const int INF = 1e9;

// 左侧点编号: 1..nL
// 右侧点编号: 1..nR
// adj[u] 存储 u 能连到的所有右点 v
vector<vector<int>> adj;
vector<int> pairU, pairV, dist;

bool bfs(int nL) {
    queue<int> q;

    for (int u = 1; u <= nL; ++u) {
        if (pairU[u] == 0) {
            dist[u] = 0;
            q.push(u);
        } else {
            dist[u] = INF;
        }
    }

    dist[0] = INF; // NIL 节点，表示“到未匹配右点的出口”

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        if (dist[u] < dist[0]) {
            for (int v : adj[u]) {
                int nxt = pairV[v];
                if (dist[nxt] == INF) {
                    dist[nxt] = dist[u] + 1;
                    q.push(nxt);
                }
            }
        }
    }

    return dist[0] != INF;
}

bool dfs(int u) {
    if (u == 0) return true;

    for (int v : adj[u]) {
        int nxt = pairV[v];
        if (dist[nxt] == dist[u] + 1 && dfs(nxt)) {
            pairU[u] = v;
            pairV[v] = u;
            return true;
        }
    }

    dist[u] = INF; // 剪枝：本轮从 u 出发已无可行最短路
    return false;
}

int hopcroftKarp(int nL, int nR) {
    pairU.assign(nL + 1, 0);
    pairV.assign(nR + 1, 0);
    dist.assign(nL + 1, INF);

    int matching = 0;
    while (bfs(nL)) {
        for (int u = 1; u <= nL; ++u) {
            if (pairU[u] == 0 && dfs(u)) {
                ++matching;
            }
        }
    }
    return matching;
}
```

### 使用方式

```cpp
int nL, nR, m;
cin >> nL >> nR >> m;
adj.assign(nL + 1, {});

for (int i = 0; i < m; ++i) {
    int u, v;
    cin >> u >> v;
    adj[u].push_back(v);
}

cout << hopcroftKarp(nL, nR) << '\n';
```

---

## 八、天梯赛 2026 L3-2：建模要点

### 8.1 图怎么建

把红色花纹作为左点、蓝色花纹作为右点。

每块工厂板块 $(r_i, b_i)$ 对应一条边 $r_i \to b_i$。

### 8.2 为什么会出现最大匹配

这题的最优策略本质上是在做“尽量多的有效配对”，而“配对互不冲突”正是匹配定义。

所以核心变成：

1. 先把题目操作抽象成二分图。
2. 再求这张图上的最大匹配数 $M$。

### 8.3 结论（按题解模型）

在该题标准建模下，最终答案可写为：

ans= n + M;

其中 n 是板块数，M 是最大匹配数。

实现时通常就是：

```cpp
int M = hopcroftKarp(nL, nR);
cout << n + M << '\n';
```

于是，经过我们一顿操作,就有这样的AC代码

```cpp
#include<bits/stdc++.h>
using namespace std;
using ll  = long long;
using ull = unsigned long long;

const int N= 114514;//最大顶点数，板块数量上限

vector<int> adj[N];
//adj[红色花纹]={蓝色花纹1，蓝色花纹2....}
//每个工厂板块对应一对红r->蓝b

int pairU[N];   // pairU[红色花纹] = 当前匹配的蓝色花纹 (0 表示未匹配)
int pairV[N];   // pairV[蓝色花纹] = 当前匹配的红色花纹 (0 表示未匹配)
int dist[N];    // dist[红色花纹]  = BFS 时该红色节点所在的层次（距离）

bool BFS(int n){//从节点n开始广搜构建带层次的一个图，并判断能不能继续往下匹配
    queue<int> q;//存红色节点

    for(int u=1;u<=n;u++){
        if(pairU[u]==0){
            dist[u]=0;
            q.push(u);//如果一个节点没有匹配，就从这个节点开始匹配
        }else{
            dist[u]=INT_MAX;//已匹配的红色初始一定不可达
            //后面如果能到达了再更新
        }
    }

    dist[0]=INT_MAX;//dist[0]表示当前已知的最短的增广路长度+1
    //初始未找到，若dist[u]>=dist[0]说明再往后找不到最短的增广路

    while(!q.empty()){
        int u=q.front();
        q.pop();

        if(dist[u]<dist[0]){
            for(int v:adj[u]){
                //遍历u链接的所有蓝色v
                if(pairV[v]==0){
                    //表示找到一条增广路终点的时候
                    if(dist[0]==INT_MAX){//还没有其他增广路
                        dist[0]=dist[u]+1;
                    }
                }else{
                    int u2=pairV[v];//蓝色v已经匹配过红色了
                    //
                    if(dist[u2]==INT_MAX){
                        dist[u2]=dist[u]+1;//u-v存在，v到u2存在，u2就可以抵达
                        q.push(u2);
                    }
                }
            }
        }
    }
    return dist[0]!=INT_MAX;
}

bool DFS(int u){//DFS成功表示u出发，成功找到一条增广路
    if(u==0){
        return true;
    }//到达虚拟节点，表示找到增广路

    for(int v:adj[u]){
        if(pairV[v]==0&&dist[0]==dist[u]+1&&DFS(0)){
            //v没有匹配，且到v的距离正好是最短增广路
            pairU[u]=v;
            pairV[v]=u;
            return true;
        }
        else if(pairV[v]!=0&&dist[pairV[v]]==dist[u]+1&&DFS(pairV[v])){
            //如果v已经匹配了一个红色且u到这个红色的层次正好差1且DFS成了
            pairU[u]=v;
            pairV[v]=u;
            return true;
        }
    }

    dist[u]=INT_MAX;//没匹配上
    return false;

}

int Hop(int n){
    memset(pairU, 0, sizeof(pairU));
    memset(pairV, 0, sizeof(pairV));

    int matching = 0;   // 当前匹配数

    // 反复进行 BFS + DFS，直到找不到增广路
    while (BFS(n)) {
        // 对每一个未匹配的红色节点，尝试 DFS 找增广路
        for (int u = 1; u <= n; u++) {
            if (pairU[u] == 0 && DFS(u)) {
                ++matching;   // 每找到一条增广路，匹配数 +1
            }
        }
    }
    return matching;
}

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T;
    cin>>T;
    while(T--){
        int n;
        cin>>n;
        for(int i=1;i<=n;i++){
            adj[i].clear();
        }
        for(int i=1;i<=n;i++){
            int r,b;
            cin>>r>>b;
            adj[r].push_back(b);
        }

        int maxMatch=Hop(n);

        cout<<n+maxMatch<<endl;
    }

    return 0;
}
```

---

## 九、容易写错的 6 个点

1. 把“同轮可增广路径”误写成可以共享点。
2. BFS 不用所有未匹配左点同时入队。
3. DFS 没有限制层次，导致退化或错配。
4. 忘了对失败点做剪枝（`dist[u] = INF`）。
5. 左右点编号范围没处理好（越界/混用）。
6. 把匈牙利复杂度写成 HK 复杂度。

---

## 十、总结

Hopcroft-Karp 可以浓缩成三句话：

1. 用 BFS 找“最短增广路层次”。
2. 用 DFS 在层次图中“批量增广”。
3. 重复直到没有增广路。

掌握这三步，再复杂的二分图匹配题基本都能落地（加油！）

---

> 关键词：二分图、增广路、最大匹配、Hopcroft-Karp、天梯赛
