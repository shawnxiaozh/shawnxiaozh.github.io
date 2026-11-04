---
layout: page
title: Tags
permalink: /tags/
---

{% comment %}
  按 tag 下文章数量降序排列（数量相同的 tag 之间再按字母/拼音排序，保持稳定）。
  Liquid 的 sort 不支持"按 size 取值降序"这种自定义 key，所以先按数量分桶：
  统计每个 tag 的文章数 -> 去重降序排列出现过的数量 -> 按数量从多到少，
  把该数量下的 tag（取自字母序基准 tag_names）依次收集进 sorted_tag_names。
{% endcomment %}
{% assign tag_names = site.tags | sort %}
{% assign tag_counts = "" | split: "" %}
{% for tag in tag_names %}
  {% assign tag_counts = tag_counts | push: tag[1].size %}
{% endfor %}
{% assign sorted_counts = tag_counts | sort | reverse | uniq %}
{% assign sorted_tag_names = "" | split: "" %}
{% for count in sorted_counts %}
  {% for tag in tag_names %}
    {% if tag[1].size == count %}
      {% assign sorted_tag_names = sorted_tag_names | push: tag[0] %}
    {% endif %}
  {% endfor %}
{% endfor %}
{% if sorted_tag_names and sorted_tag_names.size > 0 %}
  <p>Choose any tag below to focus on the posts filed under it.</p>

  <div class="tag-filter">
    <button class="tag-chip is-active" data-tag="">All <span>{{ site.posts | size }}</span></button>
    {% for tag_name in sorted_tag_names %}
      {% assign tag_slug = tag_name | slugify %}
      <button class="tag-chip" data-tag="{{ tag_slug }}">
        {{ tag_name }} <span>{{ site.tags[tag_name] | size }}</span>
      </button>
    {% endfor %}
  </div>

  <div class="tag-panels">
    {%- comment -%} 默认面板：全部文章，每篇只出现一次 {%- endcomment -%}
    <section class="tag-panel is-active" data-tag="">
      <h2>All posts <span>({{ site.posts | size }})</span></h2>
      <ul>
        {% for post in site.posts %}
          <li>
            <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span>
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          </li>
        {% endfor %}
      </ul>
    </section>
    {% for tag_name in sorted_tag_names %}
      {% assign tag_slug = tag_name | slugify %}
      {% assign posts_in_tag = site.tags[tag_name] %}
      <section class="tag-panel" data-tag="{{ tag_slug }}">
        <h2 id="{{ tag_slug }}">{{ tag_name }} <span>({{ posts_in_tag | size }})</span></h2>
        <ul>
          {% for post in posts_in_tag %}
            <li>
              <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span>
              <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            </li>
          {% endfor %}
        </ul>
      </section>
    {% endfor %}
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var chips = Array.prototype.slice.call(document.querySelectorAll('.tag-chip'));
      var panels = Array.prototype.slice.call(document.querySelectorAll('.tag-panel'));
      var panelContainer = document.querySelector('.tag-panels');
      if (!chips.length || !panels.length || !panelContainer) {
        return;
      }

      function activate(tagSlug) {
        chips.forEach(function(chip) {
          chip.classList.toggle('is-active', chip.dataset.tag === tagSlug);
        });
        panels.forEach(function(panel) {
          panel.classList.toggle('is-active', panel.dataset.tag === tagSlug);
        });
      }

      panelContainer.classList.add('js-ready');

      var initial = window.location.hash ? window.location.hash.replace('#', '') : '';
      var initialMatch = panels.find(function(panel) { return panel.dataset.tag === initial; });
      // 没有 hash（或 hash 对不上任何 tag）时显示 All
      var defaultTag = initialMatch ? initial : '';

      activate(defaultTag);

      chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
          var targetTag = chip.dataset.tag;
          activate(targetTag);
          // All 不留 hash，保证 /tags/ 链接干净
          history.replaceState(null, '', targetTag ? '#' + targetTag : window.location.pathname);
        });
      });
    });
  </script>
{% else %}
  <p>No tagged posts yet.</p>
{% endif %}
