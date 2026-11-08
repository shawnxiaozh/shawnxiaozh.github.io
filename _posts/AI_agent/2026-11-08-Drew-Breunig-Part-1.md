---
layout: post
title: "Context Engineering · Module 1 · 07 Guest Speaker Drew Breunig (Part 1)"
date: 2026-11-08 14:00:00 +0800
tags: [ai-agent, context-engineering]
excerpt: "可靠性才是企业 agent 的关键：prompt debt，以及让 AI 像软件一样「无聊」 — Reliability, prompt debt, DSPy."
---

<div class="lang-zh" lang="zh" markdown="1">

> DeepLearning.AI × Chroma｜Module 1 嘉宾对谈｜
> 总览：[Module 1 Overview](/Context-Engineering-Module-1-Overview/)

## 嘉宾
**Drew Breunig**：Compound 的 CEO 兼创始人，正在为 O'Reilly 写一本关于
context engineering 的书，活跃于 DSPy 社区。每个模块之后都会有一段他的对谈节选，
这一段的主题是**构建更可靠的 agent**。

## 可靠性才是关键
- 新闻里看到的多是 agent 在 benchmark 上的惊人成绩，
  但在企业里构建可靠的 agent 是**完全不同的任务**。
- 企业关心的不是智能的理论上限，而是：**这件简单的事能不能稳定做对**，
  让组织里不会用这个工具的人也能放心用。
- 企业 agent 死在这里：**错 10% 就过线了**。用户会想，
  反正每次都得检查，不如自己做。

## Prompt debt：不可靠是怎么来的

```mermaid
flowchart LR
    A["赶着交付<br/>预算充足"] --> B["一个 prompt 交给<br/>最强的 frontier 模型"]
    B --> C["十次对九次<br/>做出漂亮的 demo"]
    C --> D["使用中不断冒出<br/>奇怪的边界 bug"]
    D --> E["把修补写进 prompt<br/>全大写、威胁、贿赂"]
    E --> D
    E --> F["Prompt debt<br/>脆弱、难改、绑死在模型上"]
```

- 典型做法：赶着交付、预算宽松，就把 prompt 丢给最大的 frontier 模型，让它自己摸索路径。
  十次能对九次，做出漂亮的 demo 交差。
- 问题：模型如何得到结果是个黑盒，使用中会不断发现奇怪的边界 bug，
  于是不停往 prompt 里加补丁（例如「这类收据记成 receipt，别记成 invoice」），
  甚至用全大写、威胁、贿赂模型等各种奇招。
- 这些招数都是**针对特定模型的**，相当于对模型过拟合。
  最后得到一个塞满经验和「民间智慧」的**脆弱 prompt**，难以修改；
  换新模型时往往只能推倒重来。
- Drew 把这叫 **prompt debt**，类似技术债。

## 出路：让 AI 更「无聊」，更像软件
DSPy 等项目的使命是让 AI **像软件一样有预期、有契约**。
走出 prompt debt 的团队，最后往往殊途同归，用上 DSPy 一直奉行的理念：
- **有类型的输入和输出**（typed inputs / outputs），可靠的契约
- **重试逻辑**
- **结构化的 prompt**，带一点 schema
- **拆成多个步骤**：别让一次调用做 20 件事，把能拆的拆出来，每一块都更可靠、更好评估

## Human-in-the-loop 还是全自动？
- Andrew 的看法：真实世界的复杂性无穷无尽，
  人持续在环中指导、反馈、把领域知识注入 prompt 和 harness，
  在可预见的未来会胜过纯 AI。
- Drew：这是**两种不同的任务**，设计应用时要先想清楚是不是 human-in-the-loop。
  - 很多企业退回到 human-in-the-loop，是因为**可靠性上不去**：10 次对 9 次，
    就让人来兜底。coding agent 就是这样——放任它一直写，会做出一串坏决定、
    层层叠加，浪费大量 token。
  - 但企业里 AI 创造价值最大的，是**人不在环中的 workflow**：
    任务切得足够小，小到能做可靠并固化下来。
    随着我们越来越会构建 workflow 和 agent，这部分会越来越多。

## 要点
- 企业 agent 的门槛是**可靠性**，不是 benchmark 上的智能。
- 不断给 prompt 打补丁会积累 **prompt debt**；
  解法是类型化输入输出、重试、结构化 prompt、拆分步骤。
- 先判断应用是否 human-in-the-loop；
  全自动的价值来自**足够小、能做可靠**的任务。

</div>

<div class="lang-en" lang="en" markdown="1">

> DeepLearning.AI × Chroma | Module 1 guest conversation |
> Overview: [Module 1 Overview](/Context-Engineering-Module-1-Overview/)

## The Guest
**Drew Breunig**: CEO and founder of Compound, writing a book on context engineering for
O'Reilly, and active in the DSPy community. Each module ends with an excerpt of his
conversation with the instructor; this one is about **building more reliable agents**.

## Reliability Is the Key Word
- The headlines show agents hitting impressive benchmark results, but building a
  reliable agent inside an enterprise is a **completely different task**.
- Enterprises don't care about the theoretical limits of intelligence; they ask: **can
  this one simple thing be done reliably**, so people who don't know the tool can use it
  with confidence?
- That's where enterprise agents die: **wrong 10% of the time is past the threshold**.
  If you have to check all the work, you might as well do it yourself.

## Prompt Debt: How Unreliability Creeps In

```mermaid
flowchart LR
    A["Pressure to ship<br/>generous budget"] --> B["One prompt to the<br/>biggest frontier model"]
    B --> C["Nails it 9 out of 10<br/>great demo"]
    C --> D["Weird edge-case<br/>bugs keep appearing"]
    D --> E["Patch the prompt<br/>all caps, threats, bribes"]
    E --> D
    E --> F["Prompt debt<br/>brittle, hard to change, model-specific"]
```

- The usual path: under pressure to ship and with budget to spare, you hand a prompt to
  the biggest frontier model and let it discover the path. It nails it nine times out
  of ten — a great demo for your boss.
- The problem: how the model gets there is a black box. Edge-case bugs keep surfacing,
  so you keep adding fixes to the prompt ("log this kind of receipt as a receipt, not an
  invoice"), maybe in all caps, maybe threatening or bribing the model.
- These hacks are **specific to that model** — you're overfitting to it. You end up with
  a **fragile prompt** full of folk wisdom that's hard to change, and moving to a new
  model often means starting over.
- Drew calls this **prompt debt**, like technical debt.

## The Way Out: Make AI More Boring, More Like Software
The mission of DSPy and similar work is to make AI **behave like software, with
expectations and contracts**. Teams that get through prompt debt tend to arrive at the
same ideas DSPy has long followed:
- **Typed inputs and outputs** with reliable contracts
- **Retry logic**
- **Structured prompts** with a bit of schema
- **Decomposing into multiple steps**: instead of one call doing 20 things, split off
  pieces that are more reliable and easier to evaluate

## Human in the Loop or Not?
- The instructor's view: the real world is fractally messy, so a human continually in
  the loop — coaching, giving feedback, putting subject-matter expertise into prompts and
  harness design — will beat an AI-only approach for the foreseeable future.
- Drew: these are **two different tasks**; decide up front whether your application is
  human-in-the-loop.
  - Enterprises often fall back to human-in-the-loop because **they can't get
    reliability high enough**: 9 out of 10, so a human smooths over the bumps. Coding
    agents work this way — left alone, they stack bad decisions and waste tokens.
  - But most enterprise value comes from **workflows without a human in the loop**: a
    task small enough to make reliable and encode. That will grow as we get better at
    building workflows and agents.

## Takeaways
- The bar for enterprise agents is **reliability**, not benchmark intelligence.
- Patching prompts endlessly builds **prompt debt**; the fix is typed I/O, retries,
  structured prompts and decomposed steps.
- Decide whether the app is human-in-the-loop; fully automated value comes from tasks
  **small enough to make reliable**.

</div>
