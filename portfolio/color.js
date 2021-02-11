var colorArr = [
  "#FF1D58",
  "#F75990",
  "#FFF685",
  "#00DDFF",
  "#0049B7",
];

function color() {
  var items = document.getElementsByClassName("random-colored");
  var i;
  var randomColor = colorArr[Math.floor(Math.random()*colorArr.length)];

  for (i = 0; i < items.length; i++) {
    items[i].style.color = randomColor;
  }
}
