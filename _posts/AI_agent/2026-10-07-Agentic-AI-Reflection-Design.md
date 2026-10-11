# 笔记：SQL 生成中的反思与外部反馈

Oct 8, 2026 · @shawn

## 背景

反思能不能真正提升 SQL 质量，关键看反思时有没有拿到 SQL 的执行结果。

- 出处：DeepLearning.AI《Agentic AI》Module 2（反思设计模式），Ungraded Lab「Improving SQL Generation with Reflection」
- 场景：给定数据库 schema 和一个自然语言问题（如对产品交易表做统计），让 LLM 写 SQL
- 做法：同一个问题走两种反思写法，对比效果
- 注意：本笔记依据课程对这个 lab 的标准设计整理，函数名可能和 notebook 里略有不同

## 写法一：只反思，没有外部反馈

LLM 只能读 SQL 文本自己挑错，语法错误能发现，逻辑错误基本发现不了。

```python
sql_v1 = generate_sql(question, schema)            # 第一版 SQL
sql_v2 = refine_sql(question, sql_v1, schema)      # 让 LLM 看着 SQL 文本自己挑错
```

容易漏掉的逻辑错误（读起来都「很合理」）：

- 把退货（负数量）也算成了销量
- 该用 `SUM(qty * price)` 的地方用了 `COUNT`
- JOIN 或 GROUP BY 写错，结果重复计算

## 写法二：先执行，再带结果反思（lab 重点）

反思的 prompt 里多了「这条 SQL 实际返回了什么」，LLM 能拿结果对照问题，有针对性地改 SQL。

```python
sql_v1 = generate_sql(question, schema)
df_v1  = execute_sql(sql_v1, db)                   # 先真的跑一遍
feedback, sql_v2 = refine_sql_external_feedback(
    question, sql_v1, df_v1, schema                # 把执行结果一起交给 LLM
)
df_v2 = execute_sql(sql_v2, db)
```

流程：

1. 生成第一版 SQL
2. 在数据库上执行，拿到结果或报错
3. 把问题 + SQL + 执行结果一起交给 LLM 反思，输出反馈和第二版 SQL
4. 执行第二版，对比前后结果

执行结果能暴露的问题：报错、空结果、出现负数、数值量级不对。

## 核心结论

两版代码几乎一样，唯一关键的改动是 `refine` 函数多传了一个参数：SQL 的执行结果（外部反馈）。

|  | 写法一：只反思 | 写法二：带外部反馈 |
| --- | --- | --- |
| LLM 看到什么 | 问题 + SQL 文本 | 问题 + SQL 文本 + 执行结果 |
| 能发现的错 | 主要是语法错误 | 语法错误 + 结果不合理的逻辑错误 |
| 提升效果 | 有限 | 明显 |

通用原则：反思的效果主要取决于有没有新信息进来。只让模型「再看一遍自己的输出」提升有限；把真实环境的反馈（代码执行、报错、测试结果）放进来，提升才明显。
