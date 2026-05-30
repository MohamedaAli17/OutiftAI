(function () {
  var OUTFIT_API = "http://127.0.0.1:8000/api/outfits";
  var OUTFIT_MANIFEST = "outfits/manifest.json";

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

  var outfits = [];
  var outfitImages = [];

  function nameFromFilename(filename) {
    var base = filename.replace(/\.[^.]+$/, "");
    return base
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  function normalizeOutfitList(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter(function (item) {
        return item && item.src;
      })
      .map(function (item) {
        var src = item.src;
        if (src.indexOf("outfits/") !== 0) {
          src = "outfits/" + src.replace(/^\.?\//, "");
        }
        var name = item.name || nameFromFilename(src);
        return { name: name, src: src };
      });
  }

  function discoverFromDirectoryListing() {
    return fetch("outfits/?" + Date.now())
      .then(function (response) {
        if (!response.ok) {
          throw new Error("directory listing " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var list = [];
        var seen = {};
        var re = /href="([^"?#]+\.(?:png|jpg|jpeg|webp))"/gi;
        var match;
        while ((match = re.exec(html)) !== null) {
          var file = decodeURIComponent(match[1]).replace(/^\.\//, "");
          if (file.indexOf("/") !== -1) {
            continue;
          }
          var key = file.toLowerCase();
          if (seen[key]) {
            continue;
          }
          seen[key] = true;
          list.push({
            name: nameFromFilename(file),
            src: "outfits/" + file,
          });
        }
        if (list.length === 0) {
          throw new Error("no images in outfits/ listing");
        }
        console.log("Outfits found via folder listing:", list.length);
        return list;
      });
  }

  function discoverFromManifest() {
    return fetch(OUTFIT_MANIFEST + "?t=" + Date.now()).then(function (response) {
      if (!response.ok) {
        throw new Error("manifest " + response.status);
      }
      return response.json();
    });
  }

  function outfitImageUrl(src) {
    var slash = src.lastIndexOf("/");
    if (slash === -1) {
      return encodeURI(src);
    }
    return (
      src.slice(0, slash + 1) + encodeURIComponent(src.slice(slash + 1))
    );
  }

  function discoverOutfits() {
    return fetch(OUTFIT_API, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("API " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        console.log("Outfits auto-scanned from server:", data.length);
        return normalizeOutfitList(data);
      })
      .catch(function (apiErr) {
        console.log("Outfit API unavailable:", apiErr.message);
        return discoverFromDirectoryListing()
          .then(function (list) {
            return normalizeOutfitList(list);
          })
          .catch(function (dirErr) {
            console.log("Folder listing unavailable:", dirErr.message);
            return discoverFromManifest().then(function (data) {
              console.log("Outfits loaded from manifest.json");
              return normalizeOutfitList(data);
            });
          });
      });
  }

  function finishOutfitPreload(loadedOutfits, loadedImages, failedSources) {
    if (outfitsAllLoaded) {
      return;
    }
    outfits = loadedOutfits;
    outfitImages = loadedImages;
    currentOutfitIndex = 0;
    outfitsAllLoaded = true;

    if (failedSources.length > 0) {
      console.warn(
        "Skipped missing or invalid outfit file(s):",
        failedSources.join(", ")
      );
    }

    if (outfits.length === 0) {
      if (outfitNameEl) {
        outfitNameEl.textContent = "No outfits";
      }
      statusEl.textContent =
        "No outfits — double-click START-FitMirror.bat, then refresh (or add images to outfits/)";
    } else {
      updateOutfitLabel();
      if (failedSources.length > 0) {
        statusEl.textContent =
          "FitMirror — " +
          outfits.length +
          " outfit(s) loaded (" +
          failedSources.length +
          " skipped)";
      }
    }

    tryStartAnimationLoop();
  }

  function preloadOutfits() {
    outfitImages = [];
    outfitLoadCount = 0;
    outfitsAllLoaded = false;

    if (outfits.length === 0) {
      console.log("No outfit images found in outfits/");
      finishOutfitPreload([], [], []);
      return;
    }

    var loadedOutfits = [];
    var loadedImages = [];
    var failedSources = [];
    var pending = outfits.length;

    for (var i = 0; i < outfits.length; i++) {
      (function (index) {
        var img = new Image();
        img.onload = function () {
          console.log("Outfit image loaded:", outfits[index].name);
          loadedOutfits.push(outfits[index]);
          loadedImages.push(img);
          pending -= 1;
          if (pending === 0) {
            finishOutfitPreload(loadedOutfits, loadedImages, failedSources);
          }
        };
        img.onerror = function () {
          console.error("Outfit image failed to load:", outfits[index].src);
          failedSources.push(outfits[index].src);
          pending -= 1;
          if (pending === 0) {
            finishOutfitPreload(loadedOutfits, loadedImages, failedSources);
          }
        };
        img.src = outfitImageUrl(outfits[index].src);
      })(i);
    }

    // Safety: never block the camera if images hang
    setTimeout(function () {
      if (!outfitsAllLoaded) {
        console.warn("Outfit preload timed out — starting camera anyway");
        finishOutfitPreload(loadedOutfits, loadedImages, failedSources);
      }
    }, 12000);
  }

  function startOutfitDiscovery() {
    statusEl.textContent = "FitMirror — scanning outfits...";
    discoverOutfits()
      .then(function (list) {
        outfits = list;
        console.log(
          "Outfits discovered:",
          outfits.map(function (o) {
            return o.name + " (" + o.src + ")";
          }).join(", ") || "(none)"
        );
        preloadOutfits();
      })
      .catch(function (err) {
        console.error("Outfit discovery failed:", err);
        outfits = [];
        outfitsAllLoaded = true;
        if (outfitNameEl) {
          outfitNameEl.textContent = "No outfits";
        }
        statusEl.textContent =
          "Camera on — double-click START-FitMirror.bat to auto-detect outfits";
        tryStartAnimationLoop();
      });
  }

  function resetOutfitAdjustments() {
    offsetX = 0;
    offsetY = 0;
    scaleFactor = 1.5;
  }

  function updateOutfitLabel() {
    if (!outfitNameEl) {
      return;
    }
    if (outfits.length === 0) {
      outfitNameEl.textContent = "No outfits";
      return;
    }
    outfitNameEl.textContent = outfits[currentOutfitIndex].name;
  }

  function logOutfitSwitch() {
    console.log("Switched to outfit:", outfits[currentOutfitIndex].name);
  }

  window.nextOutfit = function () {
    if (outfits.length === 0) {
      return;
    }
    currentOutfitIndex = (currentOutfitIndex + 1) % outfits.length;
    resetOutfitAdjustments();
    updateOutfitLabel();
    logOutfitSwitch();
  };

  window.prevOutfit = function () {
    if (outfits.length === 0) {
      return;
    }
    currentOutfitIndex =
      (currentOutfitIndex - 1 + outfits.length) % outfits.length;
    resetOutfitAdjustments();
    updateOutfitLabel();
    logOutfitSwitch();
  };

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
          if (
            overlayApi &&
            outfits.length > 0 &&
            outfitImages[currentOutfitIndex]
          ) {
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
    if (outfits.length > 0) {
      statusEl.textContent = "FitMirror — tracking active";
    }
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

  startOutfitDiscovery();
  startCamera();
})();
