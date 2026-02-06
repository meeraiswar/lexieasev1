import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

/**
 * Internal state (module-level, not React state)
 */
let faceMesh = null;
let camera = null;
let isRunning = false;

/**
 * Utility: compute eye openness (very simple EAR-like proxy)
 * Uses vertical distance between eyelids.
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
  console.log("FaceMesh is running");
  faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true, // enables iris landmarks
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults((results) => {
    if (!results.multiFaceLandmarks?.length) return;

    const landmarks = results.multiFaceLandmarks[0];

    /**
     * Left eye landmarks (MediaPipe indices)
     * Upper eyelid: 159
     * Lower eyelid: 145
     */
    const eyeOpen = computeEyeOpenness(landmarks, 159, 145);

    // ---- Update metrics ----
    metricsRef.current.samples += 1;

    // Blink detection (threshold is empirical)
    if (eyeOpen < 0.015) {
      metricsRef.current.blinkCount += 1;
    }

    // Track max eye closure (strain / hesitation signal)
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
}
