---
title: Portfolio
layout: page
permalink: /portfolio
---

<script>
function color(text) {
  const randomColor = Math.floor(Math.random()*16777215).toString(16);
  document.getElementById('group').color = randomColor;
}
</script>


<body>
    <h1 id="group" class="portfolio-centered" style="margin-top: 3rem"> <a href="{{ site.url }}/portfolio/games"> Games </a> </h1>
    <h1 id="group" class="portfolio-centered"> <a href="{{ site.url }}/portfolio/artwork"> Artwork </a> </h1>
    <h1 id="group" class="portfolio-centered"> <a href="{{ site.url }}/portfolio/music"> Music </a> </h1>
</body>
