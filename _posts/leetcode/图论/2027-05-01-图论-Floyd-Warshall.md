---
layout: post
title: "图论 · Floyd-Warshall"
date: 2025-01-25
tags: [leetcode, 图论]
---

求解图中任意两点的最短路径的算法。算法以三重循环考察任意顶点`i`到任意顶点`j`是否有经过任意顶点`k`的可松弛路径，即对每一个顶点k，考察是否有`d(i, k) + d(k, j) < d(i, j)`，若有则更新`d(i,j) = d(i, k) + d(k, j)`。

该算法本质上是动态规划，`dp[k][i][j]`表示顶点`(i, j)`之间经过前`k`个顶点的松弛，得到的顶点`i`到`j`到最短路径长度。

`dp[k][i][j] = min{dp[k - 1][i][j], dp[k - 1][i][k] + dp[k - 1][k][j]}`

算法过程：

1. 建图及初始化
    1. 使用邻接矩阵存图， `distances[i][j] = w `表明节点`i`到节点`j`的最短路径为`w`。
    2. 初始化`distances[i][j] = +infinity, distances[i][i] = 0`。
2. 外层循环执行`|V|`次，每次固定顶点k
    1. 中层循环执行`|V|`次，每次固定顶点i
        1. 内层循环执行`|V|`次，每次固定顶点j
            1. 考察是否有`d(i, k) + d(k, j) < d(i, j)`，若有则松弛。
3. 外层循环结束后，所有顶点对的最短距离被求出
4. 检查图中是否有负权环，再次对所有边进行松弛操作，若有边可被松弛，则有负权环。

```java
for(k : V) {
    for(i : V) {
        for(j : V) {
            if(d(i, k) + d(k, j) < d(i, j)) {
                d(i, j) = d(i, k) + d(k, j);
            }
        }
    }
}
```

Floyd能够求有负权的非负圈图的最短路径，因为算法会处理所有顶点的 所有入边的松弛；但Floyd不能处理**负权环**的最短路径，因为负权环没有最短路径，但floyd可以求是否包含负权环，最后对所有边进行松弛操作，有边可被松弛，则有负权环。

时间复杂度`O(V^3)`.

# [1462. 课程表 IV](https://leetcode.cn/problems/course-schedule-iv/)
```java
class Solution {
  public List<Boolean> checkIfPrerequisite(int numCourses, int[][] prerequisites, int[][] queries) {

    int n = numCourses;
    int[][] distances = new int[n][n];
    int INF = Integer.MAX_VALUE;
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n; j++) {
        distances[i][j] = i == j ? 0 : INF;
      }
    }
    for (int[] prerequisite : prerequisites) {
      int u = prerequisite[0];
      int v = prerequisite[1];
      distances[u][v] = 1;
    }
    for (int k = 0; k < n; k++) {
      for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
          if (distances[i][k] != INF && distances[k][j] != INF) {
            if (distances[i][k] + distances[k][j] < distances[i][j]) {
              distances[i][j] = distances[i][k] + distances[k][j];
            }
          }
        }
      }
    }
    List<Boolean> ans = new ArrayList<>();
    for (int[] query : queries) {
      int u = query[0];
      int v = query[1];
      ans.add(distances[u][v] < INF);
    }
    return ans;
  }
}
```

# [1334. 阈值距离内邻居最少的城市](https://leetcode.cn/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/)
[https://leetcode.cn/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/solutions/2525946/dai-ni-fa-ming-floyd-suan-fa-cong-ji-yi-m8s51/](https://leetcode.cn/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/solutions/2525946/dai-ni-fa-ming-floyd-suan-fa-cong-ji-yi-m8s51/)

```java
class Solution {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
      int[][] distances = new int[n][n];
      int INF = Integer.MAX_VALUE;
      for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
          distances[i][j] = i == j ? 0 : INF;
        }
      }
      for(int[] edge : edges) {
        int u = edge[0];
        int v = edge[1];
        int w = edge[2];
        distances[u][v] = w;
        distances[v][u] = w;
      }
      for(int k = 0; k < n; k++) {
        for(int i = 0; i < n; i++) {
          for(int j = 0; j < n; j++) {
            if(distances[i][k] != INF && distances[k][j] != INF) {
              if(distances[i][k] + distances[k][j] < distances[i][j]) {
                distances[i][j] = distances[i][k] + distances[k][j];
              }
            }
          }
        }
      }
      int[] cnt = new int[n];
      for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
          if(distances[i][j] <= distanceThreshold) {
            cnt[i]++;
          }
        }
      }
      int min = INF; 
      int ans = 0;
      for(int i = 0; i < n; i++) {
        if(cnt[i] <= min) {
          min = cnt[i];
          ans = i;
        }
      }
      return ans;
    }
}
```
