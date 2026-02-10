import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/api";
import { startFaceMesh, stopFaceMesh } from "../utils/faceMeshService";

function computeVisionDifficulty(metrics) {
  const { samples, blinkCount, eyeClosureMin } = metrics;

  if (samples < 60) {
    return { usable: false, isHard: false, score: 0 };
  }

  let score = 0;

  // VERY strong signal: deep eye closure
  if (eyeClosureMin < 0.009) {
    score += 0.7;
  }

  // Moderate signal: noticeable closure
  else if (eyeClosureMin < 0.011) {
    score += 0.4;
  }

  // Weak signal: blink instability (supporting only)
  if (blinkCount >= 4) {
    score += 0.2;
  }

  return {
    usable: true,
    isHard: score >= 0.6,
    score: Math.min(score, 1),
  };
}


export default function WordLevel() {
  const [word, setWord] = useState(null);
  const [wordId, setWordId] = useState(null);
  const [spoken, setSpoken] = useState("");
  const [shownAt, setShownAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const faceMetricsRef = useRef({
    blinkCount: 0,
    eyeClosureMin: 0,
    samples: 0,
  });

  useEffect(() => {
  console.log("Word changed:", word);

  if (!word || !videoRef.current) {
    console.log("Video is not ready yet");
    return;
  }  
  console.log("Starting FaceMesh (once)");

  startFaceMesh(videoRef, faceMetricsRef);

  return () => {
    console.log("Stopping FaceMesh (unmount)");
    stopFaceMesh();
  };
}, [videoRef.current]);

  useEffect(() => {
    if (!word) return;

    faceMetricsRef.current = {
      blinkCount: 0,
      eyeClosureMin: 1,
      samples: 0,
    };
  }, [word]);



  /* =========================
     Load next word
  ========================== */
  const loadWord = async () => {
    const res = await apiFetch("/api/words/next");
    console.log("Loaded word: ", res.word);
    setWord(res.word);
    setWordId(res.wordId);
    setFeedback(null);
    setSpoken("");
    setShownAt(Date.now());
  };

  useEffect(() => {
    loadWord();
  }, []);

  /* =========================
     Recording controls (MediaRecorder -> upload to Gemini)
  ========================== */
  const startRecording = async () => {
    try {
      setSpoken("");
      setFeedback(null);
      setShownAt(Date.now());

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });

        // stop tracks
        try {
          streamRef.current.getTracks().forEach(t => t.stop());
        } catch (e) {}

        const currentWordId = wordId;
        const currentWord = word;
        const responseTimeMs = Date.now() - shownAt;
    const faceMetrics = faceMetricsRef.current;
    const visionResult = computeVisionDifficulty(faceMetrics);
    console.log("Vision difficulty: ", visionResult);

        const form = new FormData();
        form.append('audio', blob, 'speech.webm');
        form.append('wordId', currentWordId);
        form.append('expected', currentWord);
        form.append('responseTimeMs', responseTimeMs);

        const res = await fetch('http://localhost:5001/api/words/attempt-audio', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });

        const data = await res.json();
        setFeedback(data);
        if (data?.transcript) setSpoken(data.transcript);

        setTimeout(() => loadWord(), 1500);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording start failed', err);
      alert('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  /* =========================
     Render
  ========================== */
  if (!word) return <div style={styles.loading}>Loading…</div>;
  const speakFeedback = (feedback) => {
  if (!("speechSynthesis" in window) || !feedback) return;

  let text = "";

  if (feedback.wordCorrect) {
    text = "Excellent pronunciation. Well done!";
  } else if (feedback.problemLetters?.length > 0) {
    text = `Good attempt. Focus on the letters ${feedback.problemLetters.join(
      ", "
    )}.`;
  } else {
    text = "Good effort. Try again slowly and clearly.";
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />
        <h2 style={styles.title}>🗣️ Word Pronunciation</h2>

        <div style={styles.wordDisplay}>{word}</div>

        <div style={styles.buttonRow}>
          <button
            onClick={startRecording}
            disabled={isRecording}
            style={{
              ...styles.primaryButton,
              opacity: isRecording ? 0.6 : 1,
            }}
          >
            🎤 Start
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            style={{
              ...styles.stopButton,
              opacity: !isRecording ? 0.6 : 1,
            }}
          >
            ⏹ Stop
          </button>
        </div>

        {spoken && (
          <p style={styles.spoken}>
            <strong>You said:</strong> {spoken}
          </p>
        )}

        {feedback && (
          <div style={styles.feedbackBox}>
            <p
              style={{
                ...styles.feedbackText,
                color: feedback.wordCorrect ? "#059669" : "#d97706",
              }}
            >
              {feedback.message}
            </p>

            {feedback.problemLetters?.length > 0 && (
              <p style={styles.problem}>
                Focus on:{" "}
                <strong>{feedback.problemLetters.join(", ")}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Styles (matches LetterLevel)
========================== */
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #f8fafc, #ffffff)",
    padding: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    maxWidth: 600,
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 20,
    color: "#0f172a",
  },
  wordDisplay: {
    fontSize: 64,
    fontWeight: 700,
    color: "#1e40af",
    margin: "30px 0",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  stopButton: {
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  spoken: {
    fontSize: 16,
    color: "#374151",
    marginTop: 10,
  },
  feedbackBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 600,
  },
  problem: {
    fontSize: 14,
    marginTop: 8,
    color: "#6b7280",
  },
  loading: {
    textAlign: "center",
    marginTop: 100,
    fontSize: 18,
  },
};
