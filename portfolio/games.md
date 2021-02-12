---
title: Games
layout: page
permalink: /portfolio/games
---

<head>
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
    <h2 style="margin-top: 6rem; margin-bottom: 1rem;"> <a href="{{ site.url }}/portfolio/soviet_scoot"> Soviet Scoot </a> </h2>
    <p> <i> 2020 January </i> </p>
    <h2 style="margin-bottom: 1rem;"> <a href="{{ site.url }}/portfolio/marblz"> Marblz </a> </h2>
    <p> <i> 2019 February </i> </p>
    <h2 style="margin-bottom: 1rem;"> <a href="{{ site.url }}/portfolio/asteroids"> Asteroids </a> </h2>
    <p> <i> 2018 December </i> </p>
</body>
