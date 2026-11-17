---
layout: page
title: To Watch / Read
permalink: /todo/
description: "Videos and articles I want to get to. Finished ones move to the done list."
---

{%- assign today = site.time | date: "%Y-%m-%d" -%}
{%- assign todo = site.data.watchlist | where: "status", "todo" | sort: "added" | reverse -%}

<p><a href="{{ '/done/' | relative_url }}">See what I've finished →</a></p>

<h2>Available now</h2>
<ul>
{%- for item in todo -%}
  {%- unless item.available and item.available > today -%}
    {% include watchlist-item.html item=item date=item.added %}
  {%- endunless -%}
{%- endfor -%}
</ul>

<h2>Coming later</h2>
<ul>
{%- for item in todo -%}
  {%- if item.available and item.available > today -%}
    {% include watchlist-item.html item=item date=item.available %}
  {%- endif -%}
{%- endfor -%}
</ul>
