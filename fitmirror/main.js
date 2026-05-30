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
  var scaleFactor = 1.5;
  var offsetX = 0;
  var offsetY = 0;

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

  function logOffset() {
    console.log("Offset:", offsetX, offsetY);
  }

  function changeScale(delta) {
    scaleFactor = Math.min(3.0, Math.max(0.5, scaleFactor + delta));
    console.log("Scale factor:", scaleFactor);
  }

  window.moveOutfit = function (direction) {
    if (direction === "up") {
      offsetY -= 5;
    } else if (direction === "down") {
      offsetY += 5;
    } else if (direction === "left") {
      offsetX -= 5;
    } else if (direction === "right") {
      offsetX += 5;
    }
    logOffset();
  };

  window.resetOutfit = function () {
    offsetX = 0;
    offsetY = 0;
    scaleFactor = 1.5;
    console.log("Scale factor:", scaleFactor);
    logOffset();
  };

  window.scaleOutfit = function (direction) {
    if (direction === "up") {
      changeScale(0.05);
    } else if (direction === "down") {
      changeScale(-0.05);
    }
  };

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
              canvas.height,
              scaleFactor,
              offsetX,
              offsetY
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

  document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      changeScale(0.05);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      changeScale(-0.05);
    } else if (event.key === "w" || event.key === "W") {
      window.moveOutfit("up");
    } else if (event.key === "s" || event.key === "S") {
      window.moveOutfit("down");
    } else if (event.key === "a" || event.key === "A") {
      window.moveOutfit("left");
    } else if (event.key === "d" || event.key === "D") {
      window.moveOutfit("right");
    }
  });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent =
      "Camera error: getUserMedia is not supported in this browser";
    return;
  }

  startCamera();
})();
