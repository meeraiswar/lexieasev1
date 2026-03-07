import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

let faceMesh = null;
let camera = null;
let isInitialized = false;

/* =========================
   Gaze State
========================= */
let previousGaze = null;
let currentFixationStart = null;
let fixationDurations = [];
let segmentActive = false;
let samples = 0;

const VELOCITY_THRESHOLD = 0.03;

/* =========================
   Utility: iris center
========================= */
function getIrisCenter(landmarks, startIdx) {
  let x = 0;
  let y = 0;

  for (let i = 0; i < 5; i++) {
    x += landmarks[startIdx + i].x;
    y += landmarks[startIdx + i].y;
  }

  return {
    x: x / 5,
    y: y / 5,
  };
}

/* =========================
   Initialize Once
========================= */
export async function initializeEyeTracking(videoElement) {
  if (isInitialized) return;

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
    if (!segmentActive) return;

    const landmarks = results.multiFaceLandmarks[0];
    const timestamp = performance.now();

    const leftIris = getIrisCenter(landmarks, 468);
    const rightIris = getIrisCenter(landmarks, 473);

    const gaze = {
      x: (leftIris.x + rightIris.x) / 2,
      y: (leftIris.y + rightIris.y) / 2,
      t: timestamp,
    };

    samples++;

    if (!previousGaze) {
      previousGaze = gaze;
      currentFixationStart = gaze.t;
      return;
    }

    const dx = gaze.x - previousGaze.x;
    const dy = gaze.y - previousGaze.y;
    const dt = (gaze.t - previousGaze.t) / 1000;

    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;

    if (velocity < VELOCITY_THRESHOLD) {
      if (!currentFixationStart) {
        currentFixationStart = gaze.t;
      }
    } else {
      if (currentFixationStart) {
        const duration = gaze.t - currentFixationStart;
        if (duration > 80) {
          fixationDurations.push(duration);
        }
        currentFixationStart = null;
      }
    }

    previousGaze = gaze;
  });

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });

  console.log("Starting MediaPipe camera...");
  await camera.start();

  isInitialized = true;
}

/* =========================
   Segment Control
========================= */

export function startSegment() {
  segmentActive = true;
  samples = 0;
  fixationDurations = [];
  previousGaze = null;
  currentFixationStart = null;
}

export function endSegment() {
  segmentActive = false;

  if (currentFixationStart) {
    const duration = performance.now() - currentFixationStart;
    if (duration > 80) {
      fixationDurations.push(duration);
    }
  }
}

export function getSegmentMetrics() {
  const fixationCount = fixationDurations.length;

  const meanFixationDuration =
    fixationCount > 0
      ? fixationDurations.reduce((a, b) => a + b, 0) / fixationCount
      : 0;

  return {
    samples,
    fixationCount,
    meanFixationDuration,
  };
}

export function shutdownEyeTracking() {
  if (camera) camera.stop();
  if (faceMesh) faceMesh.close();

  camera = null;
  faceMesh = null;
  isInitialized = false;
}
