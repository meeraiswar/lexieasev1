export function computeVisualHesitationScore(metrics) {
  const { samples, fixationCount, meanFixationDuration } = metrics;

  // ---- Basic usability checks ----
  if (
    !samples ||
    samples < 60 ||
    !fixationCount ||
    fixationCount < 1 ||
    !meanFixationDuration
  ) {
    return {
      usable: false,
      score: 0,
      isHard: false,
    };
  }

  // ---- Normalize Mean Fixation Duration ----
  const normalizedMFD = Math.max(
    0,
    Math.min(1, (meanFixationDuration - 150) / 200)
  );

  // ---- Normalize Fixation Count ----
  const normalizedFC = Math.max(
    0,
    Math.min(1, (fixationCount - 2) / 4)
  );

  // ---- Combine ----
  const score =
    0.6 * normalizedMFD +
    0.4 * normalizedFC;

  return {
    usable: true,
    score: Math.min(score, 1),
    isHard: score >= 0.6,
  };
}
