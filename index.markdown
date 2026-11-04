---
layout: page
title: Articles
description: Technical notes, tinkering logs and learning reflections — newest first.
permalink: /
---

<section class="article-archive">
  {% assign posts_by_year = site.posts
    | group_by_exp: "post", "post.date | date: '%Y'"
    | sort: "name"
    | reverse %}
  {% for year in posts_by_year %}
    {% assign posts_in_year = year.items | sort: "date" | reverse %}
    <div class="article-year" id="year-{{ year.name }}">
      <header class="article-year-header">
        <h2>{{ year.name }}</h2>
        <span>{{ posts_in_year | size }} {% if posts_in_year.size == 1 %}post{% else %}posts{% endif %}</span>
      </header>
      <ul class="article-list">
        {% for post in posts_in_year %}
          <li class="article-entry">
            <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span>
            <div class="article-entry-content">
              <a class="article-entry-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
              {% if post.excerpt %}
                <p class="article-entry-excerpt">{{ post.excerpt | strip_html | truncate: 180 }}</p>
              {% endif %}
              {% if post.tags.size > 0 %}
                <div class="article-entry-tags">
                  {% for tag in post.tags %}
                    <span class="article-tag">{{ tag }}</span>
                  {% endfor %}
                </div>
              {% endif %}
            </div>
          </li>
        {% endfor %}
      </ul>
    </div>
  {% endfor %}
</section>
