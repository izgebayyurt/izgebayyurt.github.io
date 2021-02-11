var colorArr = [
  "#001f3f",
  "#39CCCC",
  "#3D9970",
  "#85144b",
  "#F9C5BD",
  "#7C677F",
  "#DE354C",
  "#3C1874",
  "#FFDF6C",
  "#F1824A"
];

function color() {
  var items = document.getElementsByClassName("random-colored");
  var i;
  var randomColor = colorArr[Math.floor(Math.random()*colorArr.length)];

  for (i = 0; i < items.length; i++) {
    items[i].style.color = randomColor;
  }
}
