var webcam = document.querySelector('#webcam');
var model, mera; 
async function renderPredictions(t) {
  requestAnimationFrame(renderPredictions);
  const predictions = await model.estimateFaces(webcam);

  if (predictions.length > 0) {
    var positionBufferData = TRIANGULATION.reduce((acc, val) => acc.concat(predictions[0].scaledMesh[val]), []);
    mera.render(positionBufferData);
  }
}
async function main() {
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    webcam.srcObject = stream;
    var {w, h} = await new Promise(function(res) {
      webcam.onloadedmetadata = function() {
        var w = webcam.videoWidth;
        var h = webcam.videoHeight;
        res({w, h})
      }
    });
    webcam.height = h;
    webcam.width = w;
    mera = new FacemeshMap('mera', 'assets/mesh_map_texture.png', w, h);
    webcam.setAttribute('autoplay', true);
    webcam.setAttribute('muted', true);
    webcam.setAttribute('playsinline', true);
    webcam.play();
    
    // Load the MediaPipe facemesh model.
    model = await facemesh.load({
      maxContinuousChecks: 5,
      detectionConfidence: 0.9,
      maxFaces: 1,
      iouThreshold: 0.3,
      scoreThreshold: 0.75
    });
    renderPredictions();
  } catch(e) {
    console.error(e);
  }
}
main();
window.onresize = main;
