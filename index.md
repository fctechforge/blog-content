---
layout: default
title: Home
---

# {{ site.title }}

{{ site.description }}

This site publishes technical notes, theory articles, and labs from the private authoring workflow.

## Recent Posts

{% if site.posts and site.posts.size > 0 %}
{% for post in site.posts limit:10 %}
- [{{ post.title }}]({{ post.url | relative_url }}){% if post.date %} - {{ post.date | date: "%Y-%m-%d" }}{% endif %}
{% endfor %}
{% else %}
No posts published yet.
{% endif %}
