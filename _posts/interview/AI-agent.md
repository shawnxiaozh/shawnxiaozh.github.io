# AI Agent Interview: Building a Code Review Agent

## Summary

A payments company's PR volume tripled after engineers adopted AI coding tools. A PR that dropped the `Idempotency-Key` check got approved and double-charged customers. You're asked to build an AI code review agent.

1. **Main:** How would you design it?
2. **Follow-up 1:** Why not just put the whole repo in the prompt?
3. **Follow-up 2:** It leaves 15 comments per PR and engineers ignore it. What's wrong, and how do you fix it?
4. **Follow-up 3:** How would you split it into specialist agents, and which one catches the missing Idempotency-Key?
5. **Follow-up 4:** How do you prove it's catching real bugs, and how do you switch models safely?

## Main question

> You're on the platform team at a payments company. Engineers now write most of their code with Claude Code or Codex, and PR volume has roughly tripled. Reviewers can't keep up: PRs sit for two days, or get approved after a 30-second skim.
>
> Last month a PR changed the retry logic in the `capture` endpoint. The diff looked clean and got approved. But it dropped the `Idempotency-Key` check, so a network retry charged some customers twice. The rule "every capture call must check the Idempotency-Key" was written down — in a Confluence page, not in the code.
>
> Your manager asks you to build an AI code review agent that runs on every PR.
>
> **How would you design it? Walk me through your thinking, not the code.**

**What a good answer covers:**

- **Start from the failure, not the model.** The bug wasn't visible in the diff. The rule lived in a doc, and the reviewer never saw it. So the core problem is *context*, not which LLM to use. Swapping in a smarter model wouldn't have caught it.
- **Three layers of context**, each catching a different kind of bug:
  - **Code context** — the code around the change: who calls `capture`, how other endpoints handle retries. Catches "this breaks a pattern the rest of the repo follows."
  - **Task context** — the ticket: user story and acceptance criteria. Catches "the code is clean but doesn't do what was asked" (e.g. the ticket says return 409 for payments under review, the code charges anyway).
  - **Org context** — engineering standards, security rules, downstream services that call this API. Catches the Idempotency-Key case.
- **A rough pipeline:** PR opened → pull the diff → retrieve relevant context → review agent(s) generate candidate issues → dedupe, rank by severity, filter low-confidence ones → post comments, each pointing to a specific line and the rule or code it's based on.
- **Every comment needs evidence.** "Line 42 skips the Idempotency-Key check, which violates *Payments API Standards §3*" is something a human can verify in 10 seconds. "Consider improving error handling" is noise. Evidence is what lets people trust the reviewer instead of rubber-stamping it.
- **The reviewer should be separate from the writer.** Don't just ask the coding agent to review its own output. It's tuned to generate code, and it's anchored by its own prompt and reasoning. A separate reviewer should see the diff and the context, not the generation conversation.
- **AI does the first pass, humans make the call.** The agent's job is to point the human's attention at the 2–3 things that matter, not to replace the approval.
- Red flag: "send the whole diff to GPT with a prompt that says *review this code*." That's exactly the setup that approved the bug last month.

## Follow-up 1: How much context?

> The repo is big. A teammate says: "Context windows are huge now. Just put the whole repo in the prompt, then it can't miss anything."
>
> **Do you agree?**

**What a good answer covers:**

- No. More context isn't better context. Irrelevant code dilutes the model's attention and pulls it toward unrelated things. It also costs more and is slower on every PR.
- Better: **retrieve only what's relevant** — basically RAG over the codebase:
  - Split the code by **function / class** (using the AST), not by fixed line counts, so each chunk is a complete unit.
  - Embed the chunks, store them in a vector DB, and for each PR pull the top-K chunks most related to the change (e.g. for a change to `capture`, pull `refund`, `authorize`, the retry helper).
  - Combine it with keyword / symbol search — "who calls this function" is a lookup, not a similarity question.
- In the DeepLearning.AI experiment, the top 15 chunks (~11% of the full repo text) beat full context on precision, recall and F1. Full context was actually *worse* than retrieved context.
- Keep the index fresh: re-index on merge to main, so the agent isn't reviewing against last month's code.

## Follow-up 2: Engineers stop reading the comments

> Two weeks after launch, the agent leaves 15 comments per PR on average. Most are about naming and missing docstrings. Engineers have started ignoring it — including the one comment that was a real SQL injection.
>
> **What's going wrong, and how do you fix it?**

**What a good answer covers:**

- This is a **precision** problem. Recall is fine — it found the SQL injection — but it was buried in noise. Once people learn to ignore the bot, a high-recall reviewer is worth nothing.
- For a code reviewer, **precision usually matters more than recall**. One false alarm per PR costs trust every day. One missed minor issue costs little, because a human still reviews.
- Fixes:
  - **Split into specialist agents** instead of one generalist: a security agent that only looks for injection, auth gaps and leaked secrets; a conventions agent that only checks the change against how this repo already does things. Run them in parallel on the same retrieved context, then merge and dedupe. Each one has a focused prompt, so it says less and is right more often. (In the course: F1 went from ~61% to ~71%; recall dipped slightly, precision rose a lot.)
  - **Tier by risk** instead of making every comment look equally urgent:
    - Low (style, naming) → auto-fix or fold into one summary comment
    - Medium → "review recommended"
    - High (security, money, data integrity) → "action required", blocks the merge
  - **Drop low-confidence findings** before posting. Leaving it out is better than posting a guess.
- Red flag: "tell the prompt to be more concise." That doesn't change what it thinks is worth flagging.

## Follow-up 3: Which specialists, and who catches the bug?

> OK, you want specialist agents. For this payments repo, **how many would you have, and how do you decide where to split?** And concretely: the missing Idempotency-Key check from last month — **which agent should catch it?**

**What a good answer covers:**

- **Split by what each agent needs, not by how many you can think of.** A category earns its own agent only if it has a different:
  1. **checklist** — what it's looking for
  2. **context source** — where it retrieves from
  3. **default severity** — block the merge, or just suggest

  If two agents match on all three, merge them.
- A reasonable split for this repo:

  | Specialist | Looks for | Context it retrieves | Default severity |
  |---|---|---|---|
  | **Security** | Injection, broken auth, leaked secrets | Security standards, auth code | High |
  | **Payment Safety** | Idempotency, double charges, amount precision, payment state transitions, retries | Payments standards, neighboring code like `capture` / `refund` | High |
  | **Spec Match** | Does the code do what the ticket asked (e.g. return 409 for payments under review) | Jira ticket, acceptance criteria | Medium–High |
  | **Conventions** | Does it follow how this repo does things (error handling, logging, docstrings) | Similar code chunks | Low |
  | **Compatibility** | Does it break downstream callers (changed signatures or response shapes) | Caller code in related repos | Medium–High |

  All of them run in parallel on the same context engine; their results get merged, deduped and ranked by risk.
- **The Idempotency-Key bug is not really a security bug.** Nobody attacked anything — a network retry charged customers twice. It's a **money-correctness** problem.
  - With only the course's two agents (security + conventions), it would land on **Conventions**, and only if retrieval happened to pull the Confluence rule. That agent's prompt is mostly about style, so the finding would likely be ranked low and buried next to docstring nits.
  - That's why a payments team should have a dedicated **Payment Safety** agent. Its checklist says "any change touching charges or retries must keep the idempotency check." It catches the bug from domain rules even if the doc isn't retrieved, and cites the doc as evidence when it is.
- **Overlap is fine.** Payment Safety flags it; Compatibility may flag it too, because downstream retry logic depends on that key. The dedupe step handles duplicates. For high-risk issues, two agents catching the same thing is redundancy you want.
- **How many:** start with 2–3 (e.g. Security + Payment Safety + one general agent). Add a new one only when the eval set shows a category that keeps getting missed. Every extra agent adds tokens, latency and comments — too many and you're back to Follow-up 2's noise problem.
- Red flag: "one agent per OWASP category, plus one for performance, one for logging…" — splitting by brainstorm instead of by checklist / context / severity.

## Follow-up 4: How do you know it's working?

> Your VP asks: "Is this thing actually catching bugs, or just generating comments?" And next month you want to switch models.
>
> **How do you measure it, and how do you change it safely?**

**What a good answer covers:**

- **Build an eval set before tuning anything.** Take real past PRs where you know the answer — including last month's double-charge bug — plus synthetic PRs with planted issues. For each PR, write down the issues it *should* find.
- Measure **precision, recall and F1** against that set. Run it as a regression test: any change to the prompt, retrieval or model has to pass before it ships. This is how you answer "should we switch models" with data instead of vibes.
- Track **online signals** too: how often engineers resolve vs. dismiss a comment, and how many bugs still reach production that the agent should have caught.
- **Close the loop:** when the same kind of issue keeps showing up across PRs, turn it into a written rule or skill (e.g. "capture retry safety") and add it to the org context. Next time, the agent cites that rule directly. Over time the reviewer gets better at *this* codebase, not just better in general.
- Bonus: run the same review **locally before the PR is opened**. Authors fix the obvious stuff first, so human reviewers only see what's left — which are the higher-value issues.

## Reference

- DeepLearning.AI × Qodo, *AI Code Review* — https://www.deeplearning.ai/courses/ai-code-review
- dzlab, *AI code review agents* (reproduces the course labs, with code) — https://dzlab.github.io/genai/2026/08/11/ai-code-review-agents/
