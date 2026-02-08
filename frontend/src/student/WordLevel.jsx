// import { useEffect, useRef, useState } from "react";
// import { apiFetch } from "../api/api";

// export default function WordLevel() {
//   const [word, setWord] = useState(null);
//   const [wordId, setWordId] = useState(null);
//   const [spoken, setSpoken] = useState("");
//   const [shownAt, setShownAt] = useState(null);
//   const [feedback, setFeedback] = useState(null);
//   const [isRecording, setIsRecording] = useState(false);

//   const recognitionRef = useRef(null);
//   const spokenRef = useRef("");
  
//   /* =========================
//      Load next word
//   ========================== */
//   const loadWord = async () => {
//     const res = await apiFetch("/api/words/next");
//     setWord(res.word);
//     setWordId(res.wordId);
//     setFeedback(null);
//     setSpoken("");
//     setShownAt(Date.now());
//   };

//   useEffect(() => {
//     loadWord();
//   }, []);

//   /* =========================
//      Setup Web Speech API
//   ========================== */
//   useEffect(() => {
//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       alert("Speech Recognition not supported in this browser");
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognition.lang = "en-US";
//     recognition.interimResults = false;
//     recognition.continuous = false;

//     recognition.onresult = (event) => {
//       const transcript = event.results[0][0].transcript;
//       spokenRef.current = transcript;
//       setSpoken(transcript);
//     };

//     recognition.onerror = (err) => {
//       console.error("Speech error:", err);
//       setIsRecording(false);
//     };

//     recognition.onend = () => {
//       setIsRecording(false);
//     };

//     recognitionRef.current = recognition;
//   }, []);

//   /* =========================
//      Recording controls
//   ========================== */
//   const startRecording = () => {
//     if (!recognitionRef.current) return;

//     setSpoken("");
//     setFeedback(null);
//     setShownAt(Date.now());
//     setIsRecording(true);
//     recognitionRef.current.start();
//   };

//   const stopRecording = async () => {
//     if (!recognitionRef.current) return;

//     recognitionRef.current.stop();
//     setIsRecording(false);

//     const currentWordId = wordId;
//     const currentWord = word;
//     const currentSpoken = spokenRef.current;
//     const currentShownAt = shownAt;

//     if (!currentSpoken) {
//       alert("Speech not captured. Please try again.");
//       return;
//     }

//     const responseTimeMs = Date.now() - currentShownAt;

//     const res = await apiFetch("/api/words/attempt", {
//       method: "POST",
//       body: JSON.stringify({
//         wordId: currentWordId,
//         expected: currentWord,
//         spoken: currentSpoken,
//         responseTimeMs,
//       }),
//     });

//     setFeedback(res);

//     setTimeout(() => {
//       loadWord();
//     }, 1500);
//   };

//   /* =========================
//      Render
//   ========================== */
//   if (!word) return <div>Loading...</div>;

//   return (
//     <div style={{ textAlign: "center", marginTop: 40 }}>
//       <h2>Say the word aloud</h2>

//       <h1 style={{ margin: "30px 0", fontSize: 60 }}>{word}</h1>

//       <div style={{ marginBottom: 20 }}>
//         <button
//           onClick={startRecording}
//           disabled={isRecording}
//           style={{ marginRight: 10, padding: 15 }}
//         >
//           Start Recording
//         </button>

//         <button
//           onClick={stopRecording}
//           disabled={!isRecording}
//           style={{ padding: 15 }}
//         >
//           Stop
//         </button>
//       </div>

//       {spoken && (
//         <p>
//           <strong>You said:</strong> {spoken}
//         </p>
//       )}

//       {feedback && (
//         <div style={{ marginTop: 15 }}>
//           <p
//             style={{
//               color: feedback.wordCorrect ? "green" : "orange",
//               fontWeight: "bold",
//             }}
//           >
//             {feedback.message}
//           </p>

//           {feedback.problemLetters?.length > 0 && (
//             <p>
//               Focus on:{" "}
//               <strong>{feedback.problemLetters.join(", ")}</strong>
//             </p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/api";

export default function WordLevel() {
  const [word, setWord] = useState(null);
  const [wordId, setWordId] = useState(null);
  const [spoken, setSpoken] = useState("");
  const [shownAt, setShownAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef(null);
  const spokenRef = useRef("");

  /* =========================
     Load next word
  ========================== */
  const loadWord = async () => {
    const res = await apiFetch("/api/words/next");
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
     Setup Web Speech API
  ========================== */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      spokenRef.current = transcript;
      setSpoken(transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
  }, []);

  /* =========================
     Recording controls
  ========================== */
  const startRecording = () => {
    if (!recognitionRef.current) return;

    setSpoken("");
    setFeedback(null);
    setShownAt(Date.now());
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const stopRecording = async () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsRecording(false);

    if (!spokenRef.current) {
      alert("Speech not captured. Please try again.");
      return;
    }

    const responseTimeMs = Date.now() - shownAt;

    const res = await apiFetch("/api/words/attempt", {
      method: "POST",
      body: JSON.stringify({
        wordId,
        expected: word,
        spoken: spokenRef.current,
        responseTimeMs,
      }),
    });

    setFeedback(res);
    speakFeedback(res);

    setTimeout(loadWord, 1500);
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
