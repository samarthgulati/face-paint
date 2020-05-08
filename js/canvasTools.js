var dc = new DrawingCanvas('paint', 1024, 1024);
var size = document.querySelector('#size');
var color = document.querySelector('#color');
var undo = document.querySelector('#undo');
var clear = document.querySelector('#clear');
function updateColor() {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color.value);
  dc.color = result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    255,
  ] : null;
}
function updateBrushSize() {
  dc.size = size.value;
}
color.addEventListener('change', updateColor);
size.addEventListener('change', updateBrushSize);
undo.addEventListener('click', dc.undo);
clear.addEventListener('click', dc.clear);