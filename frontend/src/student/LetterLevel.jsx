import React, { useState, useRef, useEffect } from "react";

export default function LetterLevelGemini() {
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");
  const [score, setScore] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const token = localStorage.getItem("token");

  /* =========================
     Check browser support
  ========================== */
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setStatus("❌ Microphone recording not supported in this browser.");
    }
  }, []);

  /* =========================
     Fetch next letter (Bandit)
  ========================== */
  const fetchNextLetter = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/letters/next", {
        method: "GET",
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await res.json();
      setLetter(data.letter.toUpperCase());
      setScore(null);
      setStatus("");
    } catch (err) {
      console.error("Failed to fetch next letter:", err);
      setStatus("❌ Could not load next letter");
    }
  };

  useEffect(() => {
    fetchNextLetter();
  }, []);

  /* =========================
     Recording logic
  ========================== */
  const startRecording = async () => {
    if (!isSupported) {
      setStatus("❌ Recording not supported");
      return;
    }

    try {
      setScore(null);
      setStatus("🎤 Starting microphone...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        await submitAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus("🎤 Listening... Say the letter clearly");

      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          stopRecording();
        }
      }, 3000);
    } catch (error) {
      console.error("Microphone error:", error);
      setIsRecording(false);
      setStatus("❌ Microphone access error");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /* =========================
     Submit audio → Gemini → Bandit
  ========================== */
  const submitAudio = async (audioBlob) => {
    try {
      setStatus("⏳ Processing with Gemini AI...");

      const formData = new FormData();
      formData.append("letter", letter.toLowerCase());
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("http://localhost:5001/api/letters/attempt", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Letter evaluation failed");
      }

      setScore(data.score);
      setStatus(data.message);
<<<<<<< HEAD
      
              if (data.score >= 90) {
          speakFeedback("Excellent work! Congratulations.");
        } else if (data.score >= 75) {
          speakFeedback("Well done. You are very close.");
        } else if (data.score >= 55) {
          speakFeedback("Good effort. Relax and try again.");
        } else {
          speakFeedback("Don't worry. Take your time and keep trying.");
        }

      // Show what was heard
      console.log(`Expected: ${letter}, Heard: ${data.transcript}, Score: ${data.score}`);
      
=======

      // Load next adaptive letter after short delay
      setTimeout(() => {
        fetchNextLetter();
      }, 1200);
>>>>>>> upstream/main
    } catch (error) {
      console.error("Submit error:", error);
      setStatus(`❌ ${error.message}`);
      setScore(null);
    }
  };

<<<<<<< HEAD
  const nextLetter = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const currentIndex = letters.indexOf(letter);
    const nextIndex = (currentIndex + 1) % 26;
    setLetter(letters[nextIndex]);
    setScore(null);
    setStatus("");
  };

  const randomLetter = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let newLetter;
    do {
      newLetter = letters[Math.floor(Math.random() * 26)];
    } while (newLetter === letter);
    
    setLetter(newLetter);
    setScore(null);
    setStatus("");
  };

  const speakFeedback = (text) => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel(); // stop any previous speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;   // calm pace
  utterance.pitch = 1.05; // friendly tone
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔤 Letter Practice</h2>
        
        
        <div style={styles.letterDisplay}>
          {letter}
        </div>
=======
  /* =========================
     Render (UNCHANGED UI)
  ========================== */
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔤 Letter Pronunciation Practice</h2>
        <div style={styles.badge}>Powered by Gemini AI ✨</div>

        <div style={styles.letterDisplay}>{letter || "…"}</div>
>>>>>>> upstream/main

        <div style={styles.instructions}>
          Click the microphone and clearly say:{" "}
          <strong>"{letter}"</strong>
        </div>

        <div style={styles.buttonContainer}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported}
            style={{
              ...styles.recordButton,
              opacity: !isSupported ? 0.6 : 1,
              cursor: !isSupported ? "not-allowed" : "pointer",
              backgroundColor: isRecording ? "#ef4444" : "#3b82f6",
            }}
          >
            {isRecording ? "🔴 Stop (3s max)" : "🎤 Speak"}
          </button>
        </div>

        {status && <p style={styles.status}>{status}</p>}

        {score !== null && (
          <div
            style={{
              ...styles.scoreContainer,
              backgroundColor: score >= 80 ? "#d1fae5" : "#fee2e2",
            }}
          >
            <p
              style={{
                ...styles.score,
                color: score >= 80 ? "#059669" : "#dc2626",
              }}
            >
              Score: {score}/100
            </p>
          </div>
        )}

        <div style={styles.tips}>
          <h4 style={styles.tipsTitle}>💡 Tips for better recognition:</h4>
          <ul style={styles.tipsList}>
            <li>Speak clearly and at normal volume</li>
            <li>Say just the letter name (e.g., "Ay" for A)</li>
            <li>Reduce background noise</li>
            <li>Allow microphone access</li>
          </ul>
        </div>
<<<<<<< HEAD

       
=======
>>>>>>> upstream/main
      </div>
    </div>
  );
}

const styles = {
  container: {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "linear-gradient(to bottom, #f8fafc, #ffffff)",
  padding: "24px"
},

  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    maxWidth: "600px",
    width: "100%"
  },
  title: {
  fontSize: "26px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "12px",
  textAlign: "center",
  letterSpacing: "-0.5px"
},

  
 letterDisplay: {
  fontSize: "120px",
  fontWeight: 700,
  color: "#1e40af",
  margin: "28px 0",
  fontFamily: '"Inter", system-ui, sans-serif',
  textAlign: "center"
},

  instructions: {
    fontSize: "18px",
    color: "#6b7280",
    marginBottom: "30px",
    textAlign: "center"
  },
  buttonContainer: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  recordButton: {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    border: "none",
    borderRadius: "8px",
    transition: "all 0.2s",
    minWidth: "140px"
  },
  nextButton: {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  randomButton: {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  status: {
    fontSize: "18px",
    color: "#4b5563",
    margin: "20px 0",
    textAlign: "center",
    minHeight: "30px"
  },
  scoreContainer: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  score: {
    fontSize: "36px",
    fontWeight: "bold",
    margin: "0 0 10px 0"
  },
  feedback: {
    fontSize: "24px",
    margin: "10px 0 0 0"
  },
  tips: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    textAlign: "left"
  },
  tipsTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "10px"
  },
  tipsList: {
    fontSize: "14px",
    color: "#6b7280",
    paddingLeft: "20px",
    margin: 0
  },
  
};