---
title: Portfolio
layout: page
permalink: /portfolio
---

<head>  
<script src="portfolio/color.js"></script>  

<style>

 .center {
     text-align: center;
 }

   p {
     display: block;
     margin-top: 0.5em;
     margin-bottom: 0.5em;
     margin-left: 0;
    margin-right: 0;
 }

   .pagination {
     display: inline-block;
 }
 .pagination a {
     color: black;
     float: left;
     padding: 8px 16px;
     text-decoration: none;
     text-align: center;
 }

 .pagination a.active {
     background-color: white;
     color: #4b0082;
 }

.pagination a:hover:not(.active) {color: #aa33ff;}

  .overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  width: 100%;
  opacity: 0;
  transition: .5s ease;
  background-color: black;
}

.container {
  position: relative;
  width: 100%;
}

.container:hover .overlay {
  opacity: 0.5;
}

.text {
  color: white;
  font-size: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  text-align: center;
  opacity: 1
}

</style>
</head>  


<body>
    <h1 class="portfolio-centered" style="padding-top:1rem; margin-top:6rem; margin-right:auto; margin-left:auto; margin-bottom:auto; display:table;">
        <a href="{{ site.url }}/portfolio/games" class="random-colored" onmouseover="color()">
            Games
        </a>
    </h1>

    <h1 class="portfolio-centered" style="padding-top:1rem; margin:auto; display:table;">
        <a href="{{ site.url }}/portfolio/artwork" class="random-colored" onmouseover="color()">        
            Artwork
        </a>
    </h1>

    <h1 class="portfolio-centered" style="padding-top:1rem; margin:auto; display:table;">
        <a href="{{ site.url }}/portfolio/music" class="random-colored" onmouseover="color()">
            Music
        </a>
    </h1>
</body>
