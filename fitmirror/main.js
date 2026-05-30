(function () {
  var canvas = document.getElementById("main-canvas");
  var video = document.getElementById("webcam-video");
  var statusEl = document.querySelector("#ui-overlay p");
  var ctx = canvas.getContext("2d");
  var firstFrameLogged = false;
  var poseLandmarker = null;
  var poseApi = null;
  var overlayApi = null;
  var videoMetaReady = false;
  var outfitLoaded = false;
  var loopStarted = false;

  var outfitImg = new Image();
  outfitImg.onload = function () {
    outfitLoaded = true;
    console.log("Outfit image loaded");
    tryStartAnimationLoop();
  };
  outfitImg.onerror = function () {
    console.error("Outfit image failed to load");
    statusEl.textContent =
      "Outfit error: could not load outfits/tshirt.png";
  };
  outfitImg.src = "outfits/tshirt.png";

  // Debug shoulder/hip indices (BlazePose)
  var DEBUG_LANDMARKS = [11, 12, 23, 24];

  function drawDebugDots(landmarks) {
    ctx.fillStyle = "red";
    for (var i = 0; i < DEBUG_LANDMARKS.length; i++) {
      var idx = DEBUG_LANDMARKS[i];
      var point = landmarks[idx];
      if (!point) continue;
      var x = point.x * canvas.width;
      var y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFrame() {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (!firstFrameLogged) {
        console.log("Drawing frame");
        firstFrameLogged = true;
      }

      if (poseLandmarker && poseApi) {
        var landmarks = poseApi.detectPose(
          poseLandmarker,
          video,
          performance.now()
        );
        if (landmarks) {
          if (overlayApi) {
            overlayApi.drawOutfit(
              ctx,
              landmarks,
              outfitImg,
              canvas.width,
              canvas.height
            );
          }
          drawDebugDots(landmarks);
        }
      }
    }
    requestAnimationFrame(drawFrame);
  }

  function tryStartAnimationLoop() {
    if (
      loopStarted ||
      !videoMetaReady ||
      !poseLandmarker ||
      !outfitLoaded
    ) {
      return;
    }
    loopStarted = true;
    statusEl.textContent = "FitMirror — tracking active";
    requestAnimationFrame(drawFrame);
  }

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(function (stream) {
        video.srcObject = stream;
        console.log("Camera started");
        statusEl.textContent = "FitMirror — loading pose & outfit...";

        video.addEventListener("loadedmetadata", function onMeta() {
          video.removeEventListener("loadedmetadata", onMeta);
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          videoMetaReady = true;
          tryStartAnimationLoop();
        });
      })
      .catch(function (err) {
        console.error("Camera failed:", err);
        statusEl.textContent =
          "Camera error: " + (err.message || "Could not access webcam");
      });
  }

  import("./overlay.js").then(function (overlayModule) {
    overlayApi = overlayModule;
  });

  import("./pose.js")
    .then(function (poseModule) {
      poseApi = poseModule;
      return poseModule.initPose();
    })
    .then(function (landmarker) {
      poseLandmarker = landmarker;
      tryStartAnimationLoop();
    })
    .catch(function (err) {
      console.error("Pose init failed:", err);
      statusEl.textContent =
        "Pose error: " + (err.message || "Could not load pose model");
      if (videoMetaReady && outfitLoaded) {
        loopStarted = true;
        requestAnimationFrame(drawFrame);
      }
    });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent =
      "Camera error: getUserMedia is not supported in this browser";
    return;
  }

  startCamera();
})();
