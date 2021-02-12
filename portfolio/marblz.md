---
title: Marblz
layout: page
permalink: /portfolio/marblz
---
<head>
<style>
.center {
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
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

/* Three image containers (use 25% for four, and 50% for two, etc) */
.column {
  float: left;
  width: 50%;
  padding: 5px;
}

/* Clear floats after image containers */
.row::after {
  content: "";
  clear: both;
  display: table;
}

</style>
</head>

<p align="justify" style="margin-top: 6rem;">
Marblz was written during the 2019 Bowdoin Hackathon in collaboration with <a href="https://www.linkedin.com/in/tylerhansencode/"> Tyler Hansen. </a> During the 8 hour challenge, we worked together to create art and sound assets while building the game in Unity. The idea for the game came to me from a physical arcade game I played when I was a child. The premise of that game was to catch the balls falling to a setup similar to a <a href="https://en.wikipedia.org/wiki/Bean_machine"> bean machine </a> using a bucket controlled by the player and dropping them through the hole in the middle of the board. If you collected enough balls in given time you would get a plush toy as a prize. I must have played the game countless times because the bag filled with over 30 plush toys is still somewhere in the house :) </p>

<div class="row">
    <div class="column">
        <img src="/assets/marblz/main_menu.png" style="width:100%">
    </div>
    <div class="column">
        <img src="/assets/marblz/gameplay.gif" style="width:100%">
    </div>
</div>
