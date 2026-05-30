(function () {
  var canvas = document.getElementById("main-canvas");
  var video = document.getElementById("webcam-video");
  var statusEl = document.querySelector("#ui-overlay p");
  var outfitNameEl = document.getElementById("outfit-name");
  var ctx = canvas.getContext("2d");
  var firstFrameLogged = false;
  var poseLandmarker = null;
  var poseApi = null;
  var overlayApi = null;
  var videoMetaReady = false;
  var outfitsAllLoaded = false;
  var outfitLoadCount = 0;
  var loopStarted = false;
  var scaleFactor = 1.5;
  var offsetX = 0;
  var offsetY = 0;
  var currentOutfitIndex = 0;

  var outfits = [
    { name: "T-Shirt", src: "outfits/tshirt.png" },
    { name: "Hoodie", src: "outfits/hoodie.png" },
    { name: "Jacket", src: "outfits/jacket.png" },
  ];

  var outfitImages = [];

  function resetOutfitAdjustments() {
    offsetX = 0;
    offsetY = 0;
    scaleFactor = 1.5;
  }

  function updateOutfitLabel() {
    if (outfitNameEl) {
      outfitNameEl.textContent = outfits[currentOutfitIndex].name;
    }
  }

  function logOutfitSwitch() {
    console.log("Switched to outfit:", outfits[currentOutfitIndex].name);
  }

  window.nextOutfit = function () {
    currentOutfitIndex = (currentOutfitIndex + 1) % outfits.length;
    resetOutfitAdjustments();
    updateOutfitLabel();
    logOutfitSwitch();
  };

  window.prevOutfit = function () {
    currentOutfitIndex =
      (currentOutfitIndex - 1 + outfits.length) % outfits.length;
    resetOutfitAdjustments();
    updateOutfitLabel();
    logOutfitSwitch();
  };

  for (var i = 0; i < outfits.length; i++) {
    (function (index) {
      var img = new Image();
      img.onload = function () {
        outfitLoadCount += 1;
        console.log("Outfit image loaded:", outfits[index].name);
        if (outfitLoadCount === outfits.length) {
          outfitsAllLoaded = true;
          tryStartAnimationLoop();
        }
      };
      img.onerror = function () {
        console.error("Outfit image failed to load:", outfits[index].src);
        statusEl.textContent =
          "Outfit error: could not load " + outfits[index].src;
      };
      img.src = outfits[index].src;
      outfitImages[index] = img;
    })(i);
  }

  updateOutfitLabel();

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
    resetOutfitAdjustments();
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
          if (overlayApi && outfitImages[currentOutfitIndex]) {
            overlayApi.drawOutfit(
              ctx,
              landmarks,
              outfitImages[currentOutfitIndex],
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
      !outfitsAllLoaded
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
        statusEl.textContent = "FitMirror — loading pose & outfits...";

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
      if (videoMetaReady && outfitsAllLoaded) {
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
