---
layout: page
title: Done
permalink: /done/
description: "Videos and articles I've finished, newest first."
---

{%- assign done = site.data.watchlist | where: "status", "done" | sort: "done_on" | reverse -%}

<p><a href="{{ '/todo/' | relative_url }}">← Back to the to-do list</a></p>

{% if done.size > 0 %}
<ul>
{%- for item in done -%}
  {% include watchlist-item.html item=item date=item.done_on %}
{%- endfor -%}
</ul>
{% else %}
<p>Nothing finished yet.</p>
{% endif %}
