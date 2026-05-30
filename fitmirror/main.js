(function () {
  var canvas = document.getElementById("main-canvas");
  var video = document.getElementById("webcam-video");
  var statusEl = document.querySelector("#ui-overlay p");
  var ctx = canvas.getContext("2d");
  var firstFrameLogged = false;

  function drawFrame() {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (!firstFrameLogged) {
        console.log("Drawing frame");
        firstFrameLogged = true;
      }
    }
    requestAnimationFrame(drawFrame);
  }

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(function (stream) {
        video.srcObject = stream;
        console.log("Camera started");

        video.addEventListener("loadedmetadata", function onMeta() {
          video.removeEventListener("loadedmetadata", onMeta);
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          requestAnimationFrame(drawFrame);
        });
      })
      .catch(function (err) {
        console.error("Camera failed:", err);
        statusEl.textContent =
          "Camera error: " + (err.message || "Could not access webcam");
      });
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = "Camera error: getUserMedia is not supported in this browser";
    return;
  }

  startCamera();
})();
