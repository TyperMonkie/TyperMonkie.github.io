---
title: ”进益资本“因子挖掘比赛
date: 2026-09-21
category: 进益资本
summary: 思路和学习目标
---

有，而且你这个比赛其实正好卡在一个很明确的研究方向里：

> **用深度学习从历史价格、成交量、盘口等时间序列中，预测未来收益/涨跌，并进一步做股票排序。**

和你任务最相关的，不是那些“用新闻情感预测苹果股票明天涨不涨”的泛 AI 金融论文，而是下面几类。

你可以先看这 6 篇，按“和你比赛的相关程度”排序：

1. **MASTER: Market-Guided Stock Transformer for Stock Price Forecasting**  
   这篇我最推荐你先看。它不是只看一只股票自己的时间序列，而是同时考虑“股票自身的时间变化”和“不同股票之间的关系”，并用 Transformer 建模。这个和你的比赛很接近，因为你最终也是同一个时间点对很多股票打分排序。:chatgpt-content-reference{index="0"}  
   [MASTER 论文](https://arxiv.org/abs/2312.15235?utm_source=chatgpt.com)

2. **Learning Multiple Stock Trading Patterns with Temporal Routing Adaptor and Optimal Transport（TRA）**  
   这篇非常贴近比赛评价方式，因为它直接做 **stock ranking**，而且论文里就报告了 IC，并比较 Attention-LSTM、Transformer 等模型。例如论文报告其方法把某些基线的 IC 从约 0.053 提升到 0.059。它背后的核心想法也很金融：市场不是永远一种模式，而是会在不同“市场状态”之间变化。:chatgpt-content-reference{index="2"}  
   [TRA 论文](https://arxiv.org/abs/2106.12950?utm_source=chatgpt.com)

3. **DeepLOB: Deep Convolutional Neural Networks for Limit Order Books**  
   如果你想搞懂比赛里的 `bid_price1~10`、`ask_volume1~10` 这些盘口数据怎么被 AI 使用，这篇几乎是经典必读。它直接把 Limit Order Book 当输入，用 CNN 提取盘口结构，再用 LSTM 捕捉时间关系，预测未来价格运动。:chatgpt-content-reference{index="4"}  
   [DeepLOB 论文](https://arxiv.org/abs/1808.03668?utm_source=chatgpt.com)

4. **Deep Learning for Forecasting Stock Returns in the Cross-Section**  
   这篇虽然比较老，但“Cross-Section”跟你的任务特别重要。它不是问“一只股票未来会不会涨”，而是预测很多股票未来收益，然后在同一个时间点进行横向比较。这个思想和你比赛最终 `score` 排序高度相关。:chatgpt-content-reference{index="6"}  
   [Cross-sectional return prediction 论文](https://arxiv.org/abs/1801.01777?utm_source=chatgpt.com)

5. **On Evaluating Loss Functions for Stock Ranking: An Empirical Analysis With Transformer Model**  
   这篇是 2025 年的，跟你后面很可能会遇到的问题直接相关：

   > “我到底该用 MSE，还是直接优化股票排序？”

   它系统比较了 pointwise、pairwise、listwise 等不同 ranking loss 对 Transformer 股票排序的影响。你的比赛最后核心又恰好是排序/IC，所以等 baseline 跑通后，这篇很值得研究。:chatgpt-content-reference{index="8"}  
   [Stock Ranking Loss 论文](https://arxiv.org/abs/2510.14156?utm_source=chatgpt.com)

6. **DoubleAdapt: A Meta-learning Approach to Incremental Learning for Stock Trend Forecasting**  
   这篇解决的是金融里一个巨大的麻烦：**市场分布会变。**  
   比如你 2023 年训练出来的模式，2024 年可能就没那么好用了。这叫 distribution shift / concept drift。DoubleAdapt 就是在研究如何让模型适应这种变化。:chatgpt-content-reference{index="10"}  
   [DoubleAdapt 论文](https://arxiv.org/abs/2306.09862?utm_source=chatgpt.com)

---

## 其中 DeepLOB 和你的任务非常像

我们具体看看为什么。

你的输入可能是：

\[
X\in\mathbb R^{T\times F}
\]

比如：

\[
T=120\text{分钟}
\]

每分钟包含：

\[
F=
[\text{OHLCV},
\text{bid prices},
\text{ask prices},
\text{bid volumes},
\text{ask volumes},...]
\]

DeepLOB 也是类似：

```text
历史盘口序列
      ↓
CNN
      ↓
提取盘口局部结构
      ↓
LSTM
      ↓
提取时间依赖
      ↓
未来价格方向
```

它的区别主要是：

> DeepLOB 更偏高频盘口和短期价格方向预测。

而你：

> 分钟级行情 + 盘口 → 未来 30 分钟收益 score。

所以它不是直接复制就能比赛，但**思想高度相关**。:chatgpt-content-reference{index="12"}

---

# MASTER 可能反而更接近你最终应该做的东西

你现在的第一版模型，我们之前说：

```text
一只股票过去120分钟
       ↓
Transformer
       ↓
score
```

这个模型有个明显缺陷。

假设今天整个科技板块突然大涨。

股票 A、B、C：

```text
A ↑
B ↑
C ↑
```

其实它们之间有很强关联。

但你如果：

```text
股票A → Transformer → scoreA
股票B → Transformer → scoreB
股票C → Transformer → scoreC
```

完全独立处理，

模型根本不知道：

> “A 和 B 其实都是半导体股，它们现在正在一起异动。”

MASTER 就是在解决这种问题。

它会同时建模：

\[
\text{intra-stock}
\]

即：

> 一只股票自己随时间的变化。

以及：

\[
\text{inter-stock}
\]

即：

> 不同股票之间的关系。 :chatgpt-content-reference{index="13"}

这和你最后的：

\[
股票A=0.9
\]

\[
股票B=0.6
\]

\[
股票C=-0.3
\]

这种**横截面排序**非常契合。

---

# 你以后很可能会形成“两级 Transformer”

比如你可以想象：

第一层：

\[
\boxed{\text{Temporal Transformer}}
\]

负责：

> 每只股票过去 120 分钟发生了什么？

例如：

```text
股票A：

09:31
09:32
...
11:30
   ↓
Temporal Transformer
   ↓
一个256维股票表示
```

于是：

\[
A\rightarrow h_A\in R^{256}
\]

\[
B\rightarrow h_B\in R^{256}
\]

\[
C\rightarrow h_C\in R^{256}
\]

然后第二层：

\[
\boxed{\text{Cross-Sectional Transformer}}
\]

输入：

\[
[h_A,h_B,h_C,\dots]
\]

让股票之间互相 Attention：

```text
股票A ←→ 股票B
股票A ←→ 股票C
股票B ←→ 股票C
```

最后：

\[
h'\_A\rightarrow score_A
\]

\[
h'\_B\rightarrow score_B
\]

……

这个结构其实就已经非常接近现代股票 Transformer 的思路了。

---

# 还有一类研究：直接让模型学习“排序”

这个和你比赛可能尤其重要。

第一版你可能训练：

\[
\hat y_i=model(X_i)
\]

然后：

\[
L\_{MSE}
=
(\hat y_i-y_i)^2
\]

这意味着：

> 我要求预测收益数值尽可能准确。

比如：

真实：

```text
A +2%
B +1%
C -1%
```

预测：

```text
A +1.8%
B +0.9%
C -0.7%
```

很好。

但比赛真正关心很多时候是：

\[
A>B>C
\]

而不是：

> A 究竟是 +1.8% 还是 +2.0%。

于是有人会直接训练：

> A 应该排在 B 前面。

这叫：

### Pairwise Ranking

如果：

\[
y_A>y_B
\]

那么希望：

\[
score_A>score_B
\]

比如一种简单 loss：

\[
L=
-\log\sigma(score_A-score_B)
\]

这就不是预测具体收益。

而是在训练：

> **谁比谁好。**

2025 年那篇 ranking-loss 论文就是专门研究这件事情的。:chatgpt-content-reference{index="14"}

这个我觉得你后期一定值得试。

---

# 还有一条路线：强化学习

比如经典的 **AlphaStock**。

它不只是：

\[
历史数据\rightarrow未来收益
\]

而是进一步：

\[
市场状态
\rightarrow
模型
\rightarrow
直接决定买哪些股票、分配多少仓位
\]

然后 reward 直接考虑：

\[
收益
\]

甚至：

\[
Sharpe
\]

AlphaStock 就使用深度强化学习和 attention 来做股票选择，并把风险收益权衡放进投资策略学习里。:chatgpt-content-reference{index="15"}

[AlphaStock 论文](https://arxiv.org/abs/1908.02646?utm_source=chatgpt.com)

但我**不建议你现在从强化学习开始**。

因为你的比赛已经帮你定义好了：

\[
X\rightarrow score
\]

直接监督学习会清楚很多。

---

# HIST 是另外一个挺有意思的方向

HIST：

> Hierarchical Information / Concept-based Stock Forecasting

它发现一个问题：

股票之间不是完全独立的。

比如：

```text
贵州茅台
五粮液
泸州老窖
```

可能共享：

> 白酒概念。

```text
中芯国际
北方华创
兆易创新
```

可能共享：

> 半导体概念。

所以可以构造图：

```text
股票A ─┐
股票B ─┼→ 半导体
股票C ─┘
```

然后使用 Graph Neural Network 学习股票之间共享的信息。

HIST 同时利用预定义概念和隐藏概念来预测股票趋势。:chatgpt-content-reference{index="17"}

[HIST 论文](https://arxiv.org/abs/2110.13716?utm_source=chatgpt.com)

不过你现在的比赛是“端到端”，是否允许额外行业/概念信息需要严格看赛道规则，所以这个更适合当研究思想，而不是第一版直接使用。

---

# 还有一大批纯“时间序列预测模型”

它们不一定是金融论文，但和你做模型非常有关系。

比如：

```text
LSTM
TCN
Transformer
Informer
PatchTST
TimesNet
TimeMixer
Mamba
```

它们解决的是统一问题：

\[
过去的多变量序列
\rightarrow
未来
\]

例如 TimeMixer 使用不同时间尺度的信息，把细粒度变化和更长期趋势混合起来；论文在多个标准时间序列 benchmark 上与 PatchTST、TimesNet 等方法进行了比较。:chatgpt-content-reference{index="19"}

这种模型可以理解为：

> “发动机”。

而 MASTER / TRA / DeepLOB 更像：

> “针对股票问题特别设计过的汽车”。

---

# 你可以把整个 AI 量化领域画成这样

```text
                     AI 股票预测
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
  单股票时间序列      股票间关系         直接交易策略
       │                 │                 │
 LSTM / TCN          MASTER            AlphaStock
 Transformer          HIST                  RL
 Mamba                GNN
 PatchTST
       │
       ↓
历史 → 未来收益
                         │
                         ↓
                  Cross-sectional
                     Ranking
                         │
                    TRA / RankLoss
                         │
                         ↓
                 score_A > score_B
```

而你的比赛大概就在正中央：

\[
\boxed{
\text{Temporal Forecasting}

- \text{Cross-sectional Ranking}
- \text{Market Microstructure}
  }
  \]

其中：

**Temporal Forecasting**

因为你要看过去的分钟序列。

**Cross-sectional Ranking**

因为你最终给市场所有股票打 score。

**Market Microstructure**

因为你还有 bid / ask / order book。

---

# 如果你是以“参加比赛”为目的，我建议阅读顺序

不用一口气看 50 篇。

### 第一阶段：理解自己的任务

先看：

**DeepLOB**

重点看：

> 输入到底怎么组织？

> CNN/LSTM 怎么吃盘口数据？

> label 怎么定义？

不用看所有数学推导。:chatgpt-content-reference{index="20"}

然后看：

**Deep Learning for Forecasting Stock Returns in the Cross-Section**

重点理解：

> 为什么不是简单判断涨跌，而是股票之间比较。:chatgpt-content-reference{index="21"}

---

### 第二阶段：你开始搭 Transformer

看：

**MASTER**

重点看：

> Temporal information 怎么提取？

> stocks 之间怎么互相 attention？

> 最后怎么输出 score？:chatgpt-content-reference{index="22"}

这篇我觉得对你价值最大。

---

### 第三阶段：baseline 能跑以后

看：

**TRA**

理解：

\[
\text{市场可能有多个 regime}
\]

不同情况下可能需要不同预测模式。:chatgpt-content-reference{index="23"}

再看：

**Ranking Loss**

开始尝试：

\[
MSE
\]

vs

\[
Pairwise Loss
\]

vs

\[
Listwise Loss
\]

因为你的目标是 IC / 排序。:chatgpt-content-reference{index="24"}

---

# 如果让我现在给你设计一条“从论文到比赛”的模型路线

我不会让你一上来复现 MASTER。

而是：

```text
V0
MLP
```

输入固定窗口拉平：

\[
120\times70
\rightarrow MLP
\rightarrow score
\]

这是 sanity check。

↓

```text
V1
LSTM / TCN
```

确认时序建模有没有用。

↓

```text
V2
Vanilla Transformer
```

就是我们前面讨论的：

\[
70\rightarrow256
\]

\[
120\times256
\]

\[
\downarrow
\]

4～6 层 Transformer Encoder

\[
\downarrow
\]

Mean Pooling

\[
\downarrow
\]

MLP

\[
\downarrow
score
\]

↓

```text
V3
DeepLOB思想
```

盘口先做局部特征提取：

\[
OrderBook
\rightarrow CNN/MLP
\]

然后和 OHLCV embedding 融合。

↓

```text
V4
MASTER思想
```

加入：

\[
Temporal Attention

- Cross-Stock Attention
  \]

↓

```text
V5
Ranking Loss
```

不只：

\[
MSE
\]

还尝试直接优化排序。

↓

最后如果时间很多：

```text
TRA
Mamba
多尺度时间建模
Market regime
```

---

其中我觉得你**最需要认真读的三篇**就是：

\[
\boxed{\text{DeepLOB}}
\]

帮助你理解盘口。

\[
\boxed{\text{MASTER}}
\]

帮助你理解 Transformer 股票预测。

\[
\boxed{\text{TRA}}
\]

帮助你理解为什么金融时间序列和普通时间序列不一样，以及 IC/股票 ranking 到底怎么进入模型设计。

你现在甚至可以先不碰几十篇论文。**把这三篇吃透，再结合比赛官方 Transformer baseline，基本就能开始认真设计你自己的模型了。**
