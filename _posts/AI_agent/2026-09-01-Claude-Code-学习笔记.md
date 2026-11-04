---
layout: post
title: "Claude Code 学习笔记"
date: 2026-09-01 12:00:00 +0800
tags: [claude, ai-agent, sdlc]
excerpt: "skill 与 hook 的分工，以及 intent → spec → plan → build 这条 AI-native 研发流水线。"
---

1. claude.md: softer conventions
2. hook: hard rule

https://academy.claude.com/courses/claude-code-in-action/verification-skills
skill可以被动触发，比如让claude重构代码后，会自动触发一个跑UT的skill，如何让skill触发，
需要在description中写清楚如何触发。

https://academy.claude.com/courses/ai-native-sdlc-playbook/introduction
```mermaid
flowchart TD
    P["01 Plan 计划<br/>产品负责人 + Claude<br/>只写问题，不写方案"]
    A1(["intent.md<br/>要解决什么问题"])
    G1{{"人 · 产品负责人批准"}}

    SK["组织 skills<br/>品牌 · 安全 · 合规 · UX"]
    D["02 Design 需求与设计<br/>产品负责人 + Claude<br/>需求与设计压进同一次会话"]
    A2(["spec.md<br/>要做成什么样"])
    G2{{"人 · 产品负责人批准<br/>高风险叫上技术负责人"}}

    B["03 Build 构建<br/>工程师 + Claude"]
    PM["plan mode<br/>只读代码库，先出计划"]
    A3(["plan.md<br/>代码要怎么改"])
    G3{{"人 · 工程师 Accept<br/>之后才允许改文件"}}
    CD["写代码 + 写测试"]
    A4(["diff + tests"])

    T["04 Test 测试<br/>evals 贯穿实现过程<br/>而不是阶段末尾的质量闸"]

    HK["hooks<br/>确定性闸门"]
    DP["05 Deploy 部署<br/>多层 agent 评审"]
    G4{{"人 · 关键 / 受监管代码<br/>人工评审"}}
    A5(["merged PR<br/>+ 评审结论"])

    M["06 Maintain 运维<br/>agent 盯线上<br/>控制指标越界即诊断"]
    A6(["事故记录<br/>→ 新的 intent.md"])

    N3["③ skills 是生成时的护栏<br/>不是事后的检查表"]
    N1["① spec 与 plan 的分界线<br/>spec.md 不看代码库<br/>plan.md 读过代码库"]
    N2["② plan mode 产出的<br/>就是这个 plan.md"]
    N4["④ skill 是建议<br/>hook 才是硬闸门"]

    P --> A1 --> G1 --> D
    SK -.->|"生成时作为约束"| D
    D --> A2 --> G2 --> B
    B --> PM --> A3 --> G3 --> CD --> A4 --> T
    T --> DP
    HK -.->|"不合规就是过不去"| DP
    DP --> G4 --> A5 --> M --> A6
    A6 -->|"循环继续"| P

    N3 -.- SK
    N1 -.- A3
    N2 -.- PM
    N4 -.- HK

    classDef stage fill:#FFFFFF,stroke:#0D6E6B,stroke-width:1.6px,color:#131A1C
    classDef art fill:#DCEDEC,stroke:#0D6E6B,stroke-width:1.2px,color:#0B4F4D
    classDef gate fill:#F7E7D6,stroke:#A65510,stroke-width:1.2px,color:#7A3D0A
    classDef ctrl fill:#EEF2F3,stroke:#7E9294,stroke-width:1.2px,stroke-dasharray:4 3,color:#33403F
    classDef note fill:#FFF7E6,stroke:#A65510,stroke-width:1px,stroke-dasharray:3 3,color:#6B3A08

    class P,D,B,T,DP,M,PM,CD stage
    class A1,A2,A3,A4,A5,A6 art
    class G1,G2,G3,G4 gate
    class SK,HK ctrl
    class N1,N2,N3,N4 note
```
intend 跟claude聊其实相当于头脑风暴了，完善想法。
spec 来审视这个产品具体要做成什么样子的，同时也能提出一些意见来说明有哪些需要变更的
intend和spec是可以都由产品负责人来完成的。

> Read the attached intent.md and produce a requirements and design spec for integrating it into our existing codebase. Apply the skills available to you so the plan conforms to our brand guidelines, security policies and UX standards. Document the spec fully as spec.md, ready to hand to the engineering team. Describe clearly any areas of concern, especially where you cannot satisfy contradicting policies.
请阅读附带的 intent.md 文件，并制定一份集成到我们现有代码库中的需求与设计规范。请运用你所拥有的技能来编写这份文档，使其符合我们的品牌指南、安全政策以及用户体验标准。请将这份规范详细整理成 spec.md 文件，以便提交给工程团队。同时，请明确指出任何可能存在的问题点，尤其是那些与现有政策相冲突的情况。
> 

提炼一些skill，并写好这些skill如何触发。

构建一个goal询来起来

> ## Verifying your work

- Build: make build (must finish with "Build succeeded")
- Test: make test (all green; never skip or delete a failing test)
- Lint: make lint (zero warnings)

Run all three before reporting any task complete, and paste the output.
If a test fails, fix the code, not the test.
