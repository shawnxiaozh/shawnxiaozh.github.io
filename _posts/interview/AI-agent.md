# AI Agent Interview: Building a Code Review Agent

## Summary

A payments company's PR volume tripled after engineers adopted AI coding tools. A PR that changed retry logic got approved and double-charged customers. You're asked to build an AI code review agent.

1. **Main:** How would you design it?
2. **Follow-up 1:** A teammate wants to put the whole repo in the prompt. Do you agree?
3. **Follow-up 2:** It leaves 15 comments per PR and nobody reads them anymore. What's going on?
4. **Follow-up 3:** You replay last month's bad PR, and it only shows up as a minor note. How do you stop this from happening again?
5. **Follow-up 4:** A model 40% cheaper looks just as good on three PRs. Do you switch?

> **How to use this note:** the questions only describe what happened, never the fix. If the question names the solution ("how would you split it into specialists?"), it has given the answer away. Let the candidate get there from the symptoms.

## Main question

> You're on the platform team at a payments company. Engineers now write most of their code with Claude Code or Codex, and PR volume has roughly tripled. Reviewers can't keep up: PRs sit for two days, or get approved after a 30-second skim.
>
> Last month a PR changed the retry logic in the `capture` endpoint. The diff looked clean, and two reviewers approved it. It had dropped the `Idempotency-Key` check, so a network retry charged some customers twice.
>
> Your manager asks you to build an AI code review agent that runs on every PR.
>
> **How would you design it? Walk me through your thinking, not the code.**

**What it tests:** do they work out *why* the bug got through before they design anything, or do they jump straight to "pick a model, write a prompt"?

**Interviewer notes:** don't volunteer where the rule lives. If they ask "was the idempotency rule written down anywhere?", the answer is: on a Confluence page, not in the code. Asking that question is already a strong signal.

**What a good answer covers:**

- **Start from the failure, not the model.** Two humans looked at the diff and missed it, so the bug wasn't visible from the diff alone. The reviewer, human or AI, was missing information. Swapping in a smarter model wouldn't have caught it.
- **Three layers of context**, each catching a different kind of bug:
  - **Code context**: the code around the change, such as who calls `capture` and how other endpoints handle retries. Catches "this breaks a pattern the rest of the repo follows."
  - **Task context**: the ticket, with its user story and acceptance criteria. Catches "the code is clean but doesn't do what was asked" (e.g. the ticket says return 409 for payments under review, but the code charges anyway).
  - **Org context**: engineering standards, security rules, downstream services that call this API. This is where the Idempotency-Key rule lives.
- **A rough pipeline:** PR opened → pull the diff → retrieve relevant context → review agent(s) generate candidate issues → dedupe, rank by severity, filter low-confidence ones → post comments, each pointing to a specific line and the rule or code it's based on.
- **Every comment needs evidence.** A human can check "Line 42 skips the Idempotency-Key check, which violates *Payments API Standards §3*" in 10 seconds. "Consider improving error handling" is noise. Evidence lets people trust the reviewer instead of rubber-stamping it.
- **Keep the reviewer separate from the writer.** Don't just ask the coding agent to review its own output: it's tuned to generate code, and it's anchored by its own prompt and reasoning. A separate reviewer should see the diff and the context, not the conversation that generated the code.
- **AI does the first pass, humans make the call.** The agent's job is to point the human's attention at the 2–3 things that matter, not to replace the approval.
- Red flag: "send the diff to GPT with a prompt that says *review this code*." That reviewer has the same information as the two humans who approved the bug.

## Follow-up 1: The whole repo

> The repo is big. A teammate says: "Context windows are huge now. Just put the whole repo in the prompt, then it can't miss anything."
>
> **Do you agree?**

**What it tests:** do they know that more context can make review worse, and can they describe a concrete way to choose what goes in?

**What a good answer covers:**

- No. More context isn't better context. Irrelevant code dilutes the model's attention and pulls it toward unrelated things. It also costs more and makes every PR slower.
- Better: **retrieve only what's relevant**. This is basically RAG over the codebase:
  - Split the code by **function / class** (using the AST), not by fixed line counts, so each chunk is a complete unit.
  - Embed the chunks, store them in a vector DB, and for each PR pull the top-K chunks most related to the change (e.g. for a change to `capture`, pull `refund`, `authorize` and the retry helper).
  - Combine it with keyword / symbol search. "Who calls this function" is a lookup, not a similarity question.
- In the DeepLearning.AI experiment, the top 15 chunks (~11% of the full repo text) beat full context on precision, recall and F1. Full context actually did *worse* than retrieved context.
- Keep the index fresh: re-index on every merge to main, so the agent isn't reviewing against last month's code.

## Follow-up 2: Nobody reads the comments

> Two weeks after launch, the agent leaves 15 comments per PR on average. Most are about naming and missing docstrings. Engineers have started ignoring it, including the one comment last week that was a real SQL injection.
>
> **What's going on, and what do you do about it?**

**What it tests:** can they name this as a precision problem, and do they understand that a reviewer nobody trusts is worth nothing, however much it finds?

**What a good answer covers:**

- This is a **precision** problem. Recall is fine, since it found the SQL injection, but the finding was buried in noise. Once people learn to ignore the bot, high recall is worth nothing.
- For a code reviewer, **precision usually matters more than recall**. One false alarm per PR costs trust every day. One missed minor issue costs little, because a human still reviews.
- Fixes:
  - **Tier by risk** instead of making every comment look equally urgent:
    - Low (style, naming) → auto-fix, or fold into one summary comment
    - Medium → "review recommended"
    - High (security, money, data integrity) → "action required", blocks the merge
  - **Drop low-confidence findings** before posting. Leaving a finding out is better than posting a guess.
  - **Narrow what each reviewer looks for.** One generalist prompt flags everything it notices. Focused reviewers with specific checklists say less and are right more often. Strong candidates bring this up here; Follow-up 3 tests whether they can do it well.
- Red flag: "tell the prompt to be more concise." That changes the length of the comments, not what the agent thinks is worth flagging.

## Follow-up 3: Replaying last month's PR

> You've shipped your fixes. To check them, you replay last month's double-charge PR through the new agent. It does catch the problem, but only as one line inside the folded "minor" summary: *"Consider following the Payments API standards for retry handling."* It's listed next to two docstring nits.
>
> **How do you make sure this kind of thing doesn't happen again?**

**What it tests:** can they tell *finding* a bug apart from *classifying it correctly*? Can they see that this is a money bug, not a style or security bug? And do they arrive at domain-specific reviewers on their own?

**Interviewer notes:** don't mention specialists, multiple agents or severity. If they only say "improve the prompt" or "add more rules," ask: *"Would that also have caught it if the Confluence page hadn't been retrieved?"* The specialist follow-up below is only for candidates who bring up splitting the reviewer themselves.

**What a good answer covers:**

- **Recall worked; severity failed.** The agent retrieved the right rule, but the part of the system that handled it treats "doesn't follow our standards" as a style category. A rule about money got the same weight as a rule about docstrings.
- **It's a money-correctness bug.** It isn't style, and it isn't really security either: nobody attacked anything, a network retry charged customers twice. Severity should come from what the bug *does*, not from which doc the rule happened to be in.
- **Fix: a dedicated Payment Safety reviewer.** Its checklist says "any change touching charges or retries must keep the idempotency check," and its default severity is high. It catches the bug from domain rules even if retrieval misses the doc, and cites the doc as evidence when retrieval finds it.
- **Add this PR to the eval set** (see Follow-up 4), with the expected result "high severity, blocks merge," so this exact regression can't come back quietly.

> **Only if they proposed splitting the reviewer:** "OK. For this repo, how many would you have, and where do you draw the lines?" If they keep adding categories, push: *"Why not one per OWASP Top 10 category?"*

**What it tests:** do they have a principled rule for where to split, or do they just add agents?

**What a good answer covers:**

- **Split by what each agent needs, not by how many categories you can name.** A category earns its own agent only if it differs on at least one of:
  1. **checklist**: what it's looking for
  2. **context source**: where it retrieves from
  3. **default severity**: block the merge, or just suggest

  If two agents match on all three, merge them. Ten OWASP agents would share the same context and the same severity.
- A reasonable split for this repo:

  | Specialist | Looks for | Context it retrieves | Default severity |
  |---|---|---|---|
  | **Security** | Injection, broken auth, leaked secrets | Security standards, auth code | High |
  | **Payment Safety** | Idempotency, double charges, amount precision, payment state transitions, retries | Payments standards, neighboring code like `capture` / `refund` | High |
  | **Spec Match** | Does the code do what the ticket asked (e.g. return 409 for payments under review) | Jira ticket, acceptance criteria | Medium–High |
  | **Conventions** | Does it follow how this repo does things (error handling, logging, docstrings) | Similar code chunks | Low |
  | **Compatibility** | Does it break downstream callers (changed signatures or response shapes) | Caller code in related repos | Medium–High |

  All of them run in parallel on the same context engine. Their results get merged, deduped and ranked by risk.
- **Overlap is fine.** Payment Safety flags the idempotency bug; Compatibility may flag it too, because downstream retry logic depends on that key. The dedupe step handles duplicates. For high-risk issues, two agents catching the same thing is redundancy you want.
- **How many:** start with 2–3 (e.g. Security, Payment Safety and one general agent). Add another only when the eval set shows a category that keeps getting missed. Every extra agent adds tokens, latency and comments. Too many, and you're back to Follow-up 2's noise problem.
- Red flag: one agent per OWASP category, plus performance, logging and so on, because "more specialists means more coverage."

## Follow-up 4: The cheaper model

> A new model comes out that's 40% cheaper. A teammate ran it on three recent PRs, and its comments look about as good as the current ones. They want to switch on Monday.
>
> **What do you say?**

**What it tests:** do they insist on measuring before changing anything? Do they see that "looks about as good on three PRs" is not evidence?

**What a good answer covers:**

- **Not yet. Three PRs judged by eye proves nothing.** You can't tell from reading comments whether the new model would miss the next double charge.
- **Build an eval set first** (ideally before launch, not now). Use real past PRs where you know the answer, including last month's double-charge PR, plus synthetic PRs with planted issues. For each PR, write down what it *should* find and at what severity.
- Measure **precision, recall and F1** against that set, and weight high-severity misses more heavily. Run it as a regression test: any change to the prompt, retrieval or model has to pass before it ships. Then "should we switch?" gets answered with data. If the cheaper model holds up on the eval set, switch.
- Track **online signals** too: how often engineers resolve vs. dismiss a comment, and how many bugs reach production that the agent should have caught.
- **Close the loop:** when the same kind of issue keeps showing up across PRs, turn it into a written rule or skill (e.g. "capture retry safety") and add it to the org context. Next time, the agent cites that rule directly. Over time the reviewer gets better at *this* codebase, not just better in general.
- Bonus: run the same review **locally before the PR is opened**. Authors fix the obvious things first, so human reviewers only see what's left, which are the higher-value issues.

## Reference

- DeepLearning.AI × Qodo, *AI Code Review* — https://www.deeplearning.ai/courses/ai-code-review
- dzlab, *AI code review agents* (reproduces the course labs, with code) — https://dzlab.github.io/genai/2026/08/11/ai-code-review-agents/
