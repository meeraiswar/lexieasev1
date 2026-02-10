import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

/**
 * Module-level state (not React state)
 */
let faceMesh = null;
let camera = null;
let isRunning = false;

// Blink / eye state
let baselineEyeOpen = null;
let eyeWasClosed = false;
let closedFrames = 0;

// Tunables (can adjust later)
const BLINK_DROP_RATIO = 0.65; // eye closes to <65% of baseline
const MIN_FRAMES_FOR_BLINK = 2;

/**
 * Utility: compute eye openness
 * Uses vertical distance between eyelids
 */
function computeEyeOpenness(landmarks, topIdx, bottomIdx) {
  const top = landmarks[topIdx];
  const bottom = landmarks[bottomIdx];
  return Math.abs(top.y - bottom.y);
}

/**
 * START FaceMesh
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {React.RefObject<Object>} metricsRef
 */
export async function startFaceMesh(videoRef, metricsRef) {
  console.log("startFaceMesh called");

  if (!videoRef?.current || isRunning) return;

  isRunning = true;

  // Reset internal blink state
  baselineEyeOpen = null;
  eyeWasClosed = false;
  closedFrames = 0;

  faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults((results) => {
    if (!results.multiFaceLandmarks?.length) return;

    const landmarks = results.multiFaceLandmarks[0];

    // ---- Eye openness (both eyes) ----
    const leftEyeOpen = computeEyeOpenness(landmarks, 159, 145);
    const rightEyeOpen = computeEyeOpenness(landmarks, 386, 374);
    const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2;

    // ---- Update sample count ----
    metricsRef.current.samples += 1;

    // ---- Establish baseline after initial frames ----
    if (baselineEyeOpen === null && metricsRef.current.samples > 30) {
      baselineEyeOpen = eyeOpen;
    }

    if (!baselineEyeOpen) return;

    const blinkThreshold = baselineEyeOpen * BLINK_DROP_RATIO;

    // ---- Blink detection (debounced + duration-based) ----
    if (eyeOpen < blinkThreshold) {
      closedFrames += 1;
      eyeWasClosed = true;
    } else {
      if (eyeWasClosed && closedFrames >= MIN_FRAMES_FOR_BLINK) {
        metricsRef.current.blinkCount += 1;
      }
      closedFrames = 0;
      eyeWasClosed = false;
    }

    // ---- Track minimum eye openness (primary signal) ----
    if (eyeOpen < metricsRef.current.eyeClosureMin) {
      metricsRef.current.eyeClosureMin = eyeOpen;
    }
  });

  camera = new Camera(videoRef.current, {
    onFrame: async () => {
      if (!isRunning) return;
      await faceMesh.send({ image: videoRef.current });
    },
    width: 640,
    height: 480,
  });

  try {
    await camera.start();
    console.log("FaceMesh camera started");
  } catch (err) {
    console.error("FaceMesh camera start failed:", err);
    isRunning = false;
  }
}

/**
 * STOP FaceMesh
 */
export function stopFaceMesh() {
  isRunning = false;

  if (camera) {
    camera.stop();
    camera = null;
  }

  if (faceMesh) {
    faceMesh.close();
    faceMesh = null;
  }

  baselineEyeOpen = null;
  eyeWasClosed = false;
  closedFrames = 0;

  console.log("FaceMesh stopped");
}
