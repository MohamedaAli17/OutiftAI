// Loads BlazePose via the official Tasks Vision bundle (ES module CDN).
import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

let firstLandmarksLogged = false;

/**
 * Loads WASM + BlazePose and returns a landmarker configured for per-frame video.
 */
export async function initPose() {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  console.log("Pose model loaded");
  return poseLandmarker;
}

/**
 * Runs pose detection on the current video frame.
 * @returns {Array|null} Normalized landmark list for one person, or null if none.
 */
export function detectPose(poseLandmarker, videoElement, timestamp) {
  if (!poseLandmarker || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }

  const result = poseLandmarker.detectForVideo(videoElement, timestamp);
  if (!result.landmarks || result.landmarks.length === 0) {
    return null;
  }

  const landmarks = result.landmarks[0];
  if (!firstLandmarksLogged) {
    console.log("Landmarks detected:", landmarks.length);
    firstLandmarksLogged = true;
  }
  return landmarks;
}
