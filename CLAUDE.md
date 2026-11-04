# CLAUDE.md

Jekyll blog published with GitHub Pages (`jekyll-theme-cayman`). Posts live in `_posts/`;
algorithm notes are grouped under `_posts/leetcode/` (Jekyll picks up nested folders, and
the `render_with_liquid: false` default in `_config.yml` applies to them too).

## Migrating notes from Yuque into `_posts/`

Many notes are still being migrated from Yuque exports into `_posts/`, a few at a time.
Every export needs the same cleanup before it will build on GitHub Pages — the Pages
build fails (or the page renders wrong) without it.

Checklist for each migrated file:

1. **Filename**: `YYYY-MM-DD-title.md`. No spaces (use `-`); Chinese characters in the
   title are fine — e.g. `2024-11-01-搜索-DFS.md`.
2. **Strip the `<font>` tags.** Yuque wraps nearly every line in
   `<font style="color:rgb(51, 51, 51);">…</font>`. Delete the tags, keep the text.
   Watch for lines that are *only* a font tag (they become blank) and for headings that
   end up empty (`## ` with no text) — delete those.
3. **Nothing to do about `{{` / `{%`.** Java code like

   ```
   private int[][] directions = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
   ```

   used to break the build, because Liquid runs before Markdown and doesn't know about
   code fences. `_config.yml` now sets `render_with_liquid: false` for `_posts`, so post
   bodies are plain Markdown and need **no** `{% raw %}` wrapping. Don't add raw tags —
   with Liquid off they'd render as literal text. (The cost: `{{ site.xxx }}` no longer
   works inside a post body. Layouts are unaffected.)
4. **Language on the fence**: Yuque emits ```` ```plain ```` for code — change it to the
   real language (usually `java`).
5. Collapse runs of 3+ blank lines, and trim trailing blank lines at the end of file.
6. Check for stray NUL bytes (`\x00`) — one Yuque export had one inside a table cell,
   which makes git treat the file as binary.

`_posts/leetcode/2024-10-01-搜索-BFS.md` and `_posts/leetcode/2024-11-01-搜索-DFS.md` are
already cleaned up and are the reference for how a migrated note should look.

## Math formulas in posts

A post is read in two places that render math differently: the published Pages site
(kramdown + MathJax 3, loaded by `_includes/head-custom.html`) and github.com's own file
view (KaTeX). Follow these rules and a formula renders in both; break them and it renders
in one, or silently stays as literal `$$…$$` text.

1. **`$$…$$` only, and only as a standalone block** — blank line before and after, at the
   left margin. kramdown recognises nothing but `$$`; single `$` is GitHub-only and stays
   literal on the site (the old `$ f(n) = … $` formulas elsewhere in
   `2025-06-01-算法-动态规划-入门.md` are broken for exactly this reason).
2. **No inline math.** GitHub only recognises an opening `$$` preceded by whitespace or
   start-of-line, so `，$$p$$` after a Chinese punctuation mark stays literal there while
   rendering fine on the site. Write inline symbols as `` `dp[i]` `` / plain text instead.
3. **No indented `$$` blocks** — one inside a `-` list item renders on the site but not on
   GitHub. Unindent it, or keep that bit as plain text.
4. **Never a raw `<` or `>` inside math — use `\lt` / `\gt`.** GitHub double-escapes them
   into a literal `&lt;`, and the `&` is an alignment character to KaTeX, which then fails
   with *"Extra open brace or missing close brace"* (this bites hardest in `\begin{cases}`,
   where `&` already means something). `\le` / `\ge` are fine as-is.
5. Code fences are safe — both renderers skip `pre`/`code`, so `$` and `$$` inside Java
   snippets are left alone.

To check a section before pushing, POST it to GitHub's own renderer and count what came
back — anything left as literal `$$` in the output would break on github.com:

```bash
python3 -c "
import json,urllib.request,re
seg=open('/tmp/section.md').read()
r=urllib.request.Request('https://api.github.com/markdown',
    data=json.dumps({'text':seg,'mode':'gfm'}).encode(),
    headers={'Accept':'application/vnd.github+json','Content-Type':'application/json'})
h=urllib.request.urlopen(r).read().decode()
print('rendered:', h.count('js-display-math'))
print('leftover:', re.findall(r'\\\$\\\$[^\$\n]{0,30}', re.sub(r'<math-renderer.*?</math-renderer>','',h,flags=re.S)))
"
```

`_posts/leetcode/2025-06-01-算法-动态规划-入门.md`, section *122 → 从 O(n^2) 的 DP 推到
O(n)*, is the reference for how a formula-heavy passage should look.

- `.private/` is local-only working material. It is git-ignored (`.gitignore`) and
  excluded from the build (`_config.yml`; the leading dot also keeps Jekyll out by
  default). Those entries must stay — nothing under it belongs in the repo or on the
  published site.
- Posts in this repo currently have **no YAML front matter** and still publish (Jekyll
  renders them and Liquid runs over them — which is why step 3 matters). Adding front
  matter (`layout`/`title`/`date`/`tags`/`excerpt`, as in
  `_posts/2026-07-25-singapore-food.md`) gives a proper title and excerpt on the
  articles list, so prefer adding it for new posts.
- Explanations added to posts are written in Chinese, followed by a short English summary
  of the idea.
- `_site/` is build output — never edit it by hand.
- Local build: `bundle exec jekyll build` (needs the bundler version pinned in
  `Gemfile.lock`). The system Ruby at `/usr/bin/bundle` is broken — use rbenv:
  `PATH="$HOME/.rbenv/shims:$PATH" bundle exec jekyll build`.
- `_includes/head-custom.html` overrides the cayman theme's empty include; it is where
  MathJax is loaded from. See the math section above before touching it.
