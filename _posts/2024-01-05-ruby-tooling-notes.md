---
layout: post
title: "Ruby Tooling Notes"
date: 2023-02-09 10:00:00 +0800
tags: [ruby, tooling]
excerpt: "A few reminders from my day-to-day experience with bundler and rbenv."
---

I've been tinkering with both Jekyll and Rails lately, so I pulled together a checklist of the tools I lean on the most:

## Version management

* `rbenv` + `ruby-build` remain the lightest setup on macOS; don't forget to `rbenv rehash`.

## Dependencies

* Always run commands through `bundle exec`, especially when juggling multiple projects.

## Debugging

* `pry` + `pry-byebug` are still my go-to pair; single-stepping with access to locals is priceless.

I'll keep adding more war stories here. Drop me a line if you have good tips to share.
