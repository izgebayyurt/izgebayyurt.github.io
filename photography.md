---
title: Photography2
layout: page
permalink: /photography/2
---

<head>
 <link rel="stylesheet" type="text/css" href="photography.css" media="screen" />

<style media="screen" type="text/css">

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
  background-color: #008CBA;
}

.container {
  position: relative;
  width: 30%;
}

.container a:hover .overlay {
  opacity: 1;
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
}

</style>


</head>
 <body>
 
 
 
<div class="container">
  <img src="/assets/music.jpg" alt="Avatar" class="image">
  <div class="overlay">
    <div class="text">Test</div>
  </div>
</div>

 <h2 style="margin-top: 75px"> Songwriting Sessions </h2>
 <img src="/assets/music.jpg" style="width:504px;height:672px">
 <p> <i>27.12.2016</i> </p>
 
 <h2 style="margin-top: 30px"> Blidinje </h2>
 <img src="/assets/blidinje.jpg" style="width:672px;height:378px;">
 <p> <i>12.10.2016</i> </p>
 
 <h2 style="margin-top: 30px"> After the Rain </h2>
 <img src="/assets/rainy_park.jpg" style="width:672px;height:378px;">
 <p> <i>07.10.2016</i> </p>
 
 <h2 style="margin-top: 30px"> Kravice Falls </h2>
 <img src="/photos/kravice.jpg" style="width:504px;height:672px;">
 <p> <i>02.09.2017</i> </p>
 
 <h2 style="margin-top: 30px"> Artvin </h2>
 <img src="/assets/artvin.jpg" style="width:651px;height:225px;">
 <p> <i>09.09.2016</i> </p>
 
 <div class="center">
   <div class="pagination">
     <a href="https://izgebayyurt.github.io/photography">&laquo;</a>  
     <a href="https://izgebayyurt.github.io/photography">1</a>  
     <a class="active" href="#">2</a>
   </div>
 </div>  
</body>
