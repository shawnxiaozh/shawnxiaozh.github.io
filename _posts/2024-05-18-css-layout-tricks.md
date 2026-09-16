---
layout: post
title: "CSS Layout Cheatsheet"
date: 2024-02-04 14:30:00 +0800
tags: [css, frontend, ruby, tooling]
excerpt: "A quick cheat sheet of layout snippets I reach for often."
---

Here are a couple of snippets that have been on repeat for me lately:

### 1. Two-column layout

```css
.two-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 2rem;
}
```

### 2. Card list

```css
.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
```

I'll keep expanding this list as I bump into new patterns worth saving.
