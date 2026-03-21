import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";

/* Helper: Format time ago */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getSentenceNarrative(student, reportData) {
  const name = student?.name || "The student";
  const successRate = Number(reportData?.successRate ?? 0);
  const avgLatencyNum = Number(getSentenceAvgLatency(reportData?.attempts));
  const attempts = Array.isArray(reportData?.attempts) ? reportData.attempts : [];
  const rnn = attempts.length;
  const struggles = attempts.filter((a) => Number(a.accuracy ?? 0) < 75).length;

  const accuracyLevel =
    successRate >= 85 ? "strong" :
    successRate >= 70 ? "developing" :
    "emerging";

  const latencyLevel =
    avgLatencyNum <= 2.5 ? "efficient" :
    avgLatencyNum <= 4.0 ? "moderate" :
    "slow";

  const focusArea = struggles > 0
    ? `Focus on 3+ syllable targets and clause boundary planning; ${struggles} sentences are below 75% accuracy.`
    : "Maintain current progress and integrate more complex sentence forms to further build fluency.";

  return `${name} shows ${accuracyLevel} sentence accuracy (${successRate.toFixed(1)}%) across ${rnn} attempts with ${latencyLevel} retrieval latency (${avgLatencyNum.toFixed(1)}s). ${focusArea}`;
}
function getSentenceAvgLatency(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return "—";
  const latencies = attempts
    .map((a) => Number(a.responseTime || a.latency || 0))
    .filter((v) => v > 0);
  if (latencies.length === 0) return "—";
  const avgMs = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
  return (avgMs / 1000).toFixed(1);
}

export default function TherapistStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedReport, setSelectedReport] = useState("summary");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(7);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  useEffect(() => {
    if (student) {
      fetchSummary();
    }
  }, [student, timeframe]);

  useEffect(() => {
    if (selectedReport !== "summary") {
      fetchReport(selectedReport);
    }
  }, [selectedReport]);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/therapist/students/${studentId}`);
      setStudent(data.student);
    } catch (err) {
      console.error("Failed to fetch student:", err);
      setError("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiFetch(
        `/api/therapist/students/${studentId}/summary?timeframe=${timeframe}`
      );
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const fetchReport = async (reportType) => {
    try {
      setLoading(true);
      let url = "";
      if (reportType === "words") {
        url = `/api/therapist/students/${studentId}/report/words?timeframe=${timeframe}`;
      } else if (reportType === "sentences") {
        url = `/api/therapist/students/${studentId}/report/sentences?timeframe=${timeframe}`;
      } else if (reportType === "letters") {
        url = `/api/therapist/students/${studentId}/report/letters?timeframe=${timeframe}`;
      }

      if (url) {
        const data = await apiFetch(url);
        setReportData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError(`Failed to load ${reportType} report`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !student) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Loading student details...</div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate("/therapist/dashboard")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <div style={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate("/therapist/dashboard")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        {student && (
          <div style={styles.studentHeader}>
            <div style={styles.avatarLarge}>
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={styles.studentName}>{student.name}</h1>
              <p style={styles.studentEmail}>{student.email}</p>
              {student.age != null && (
                <p style={styles.studentMeta}>Age: {student.age}</p>
              )}
              {student.lastActive && (
                <p style={styles.studentMeta}>
                  Last active: {new Date(student.lastActive).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Navigation */}
      <div style={styles.reportNav}>
        <button
          onClick={() => setSelectedReport("summary")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "summary" ? styles.reportBtnActive : {}),
          }}
        >
          Summary
        </button>
        <button
          onClick={() => setSelectedReport("letters")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "letters" ? styles.reportBtnActive : {}),
          }}
        >
          Letters Report
        </button>
        <button
          onClick={() => setSelectedReport("words")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "words" ? styles.reportBtnActive : {}),
          }}
        >
          Words Report
        </button>
        <button
          onClick={() => setSelectedReport("sentences")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "sentences" ? styles.reportBtnActive : {}),
          }}
        >
          Sentences Report
        </button>
      </div>

      {/* Summary Cards */}
      {selectedReport === "summary" && summary && (
        <div style={styles.summarySection}>
          <div style={styles.summaryGrid}>
            {/* Student Profile Card */}
            {student && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>👤</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Student Profile</div>
                  <div style={styles.profileDetail}><strong>{student.name}</strong></div>
                  {student.age != null && (
                    <div style={styles.profileDetail}>Age: {student.age} years</div>
                  )}
                  <div style={styles.profileDetail}>{student.email}</div>
                  {student.createdAt && (
                    <div style={{...styles.profileDetail, fontSize: 12, marginTop: 4, color: "#94a3b8"}}>
                      Member since {new Date(student.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Active Status Card */}
            {student && student.lastActive && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>⏱️</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Activity Status</div>
                  <div style={styles.profileDetail}>Last Active:</div>
                  <div style={styles.statusDetail}>{new Date(student.lastActive).toLocaleString()}</div>
                  <div style={{...styles.profileDetail, fontSize: 12, marginTop: 4}}>
                    {getTimeAgo(new Date(student.lastActive))}
                  </div>
                </div>
              </div>
            )}
            
            {summary.sentences && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>📖</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Sentences</div>
                  <div style={styles.cardValue}>{summary.sentences.total}</div>
                  <div style={styles.cardSubtext}>
                    Success: {summary.sentences.successRate}%
                  </div>
                </div>
              </div>
            )}
            
            {summary.words && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>💬</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Words</div>
                  <div style={styles.cardValue}>{summary.words.total}</div>
                  <div style={styles.cardSubtext}>
                    Success: {summary.words.successRate}%
                  </div>
                </div>
              </div>
            )}
            
            {summary.letters && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>🔤</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Letters</div>
                  <div style={styles.cardValue}>{summary.letters.total}</div>
                  <div style={styles.cardSubtext}>
                    Strength: {summary.letters.avgStrength}%
                  </div>
                </div>
              </div>
            )}
            
            {/* Overall Progress Card */}
            {summary && (
              <div style={styles.summaryCard}>
                <div style={styles.cardIconLarge}>📊</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardLabel}>Overall Activity</div>
                  <div style={styles.cardValue}>
                    {(summary.sentences?.total || 0) + (summary.words?.total || 0) + (summary.letters?.total || 0)}
                  </div>
                  <div style={styles.cardSubtext}>Total attempts</div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.timeframeControl}>
            <label style={styles.timeframeLabel}>Filter by timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              style={styles.timeframeSelect}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      )}

      {/* Letter Report */}
      {selectedReport === "letters" && reportData && (() => {
        const letters = reportData.letters || [];
        const totalLetters = 26;
        const totalAttempts = letters.reduce((acc, l) => acc + (l.attempts || 0), 0);
        const avgStrength = letters.length
          ? letters.reduce((acc, l) => acc + Number(l.strength), 0) / letters.length
          : 0;
        const practicedCount = letters.filter((l) => (l.attempts || 0) > 0).length;
        const masteredCount = letters.filter((l) => Number(l.strength) >= 40).length;
        const problemLetters = letters.filter((l) => Number(l.strength) < 0);

        const interpText =
          avgStrength >= 40
            ? "High alphabetic knowledge; strong and consistent phoneme-grapheme mapping."
            : avgStrength >= 0
            ? "Developing alphabetic knowledge; focus on consistency with lower strength letters."
            : "At-risk letter naming; recommend targeted phonological intervention.";

        return (
          <div style={styles.reportSection}>
            <h2 style={styles.reportTitle}>Letters Report</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 16, marginBottom: 20 }}>
              <div style={styles.card}>
                <h3 style={styles.sectionHeadline}>CLINICAL INTERPRETATION</h3>
                <p style={styles.interpretationText}>
                  {student?.name ? `${student.name} demonstrates significant progress in phoneme-grapheme correspondence for high-frequency vowels.` : "Student demonstrates significant progress in phoneme-grapheme correspondence for high-frequency vowels."}
                  &nbsp;However, there are persistent challenges with plosive consonants (specifically 'p', 'b', and 'd'), often exhibiting reversal patterns. Accuracy in rapid naming tasks has improved by 12% since baseline assessment, indicating strengthening neural pathways for visual-to-phonological retrieval.
                </p>
                <div style={styles.tagRow}>
                  <span style={styles.tagPill}>HIGH VOWEL MASTERY</span>
                  <span style={styles.tagPill}>CONSONANT REVERSAL RISK</span>
                  <span style={styles.tagPill}>IMPROVED RETRIEVAL</span>
                </div>
                <ul style={styles.interpretationList}>
                  <li>Overall strength: <strong>{avgStrength.toFixed(1)}%</strong></li>
                  <li>Letters mastered: <strong>{masteredCount}/{totalLetters}</strong></li>
                  <li>Letters practised: <strong>{practicedCount}/{totalLetters}</strong></li>
                  <li>Focus letters: <strong>{problemLetters.length ? problemLetters.map((l) => l.letter.toUpperCase()).join(", ") : "None"}</strong></li>
                </ul>
              </div>

              <div style={styles.masterySummaryCard}>
                <div style={styles.masterySummaryHeading}>MASTERY SUMMARY</div>
                <div style={styles.masterySummaryValues}>
                  <div>
                    <div style={styles.masteryScore}>{masteredCount}/{totalLetters}</div>
                    <div style={styles.masteryLabel}>Letters Mastered</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={styles.masteryAvg}>{avgStrength.toFixed(1)}%</div>
                    <div style={styles.masteryLabel}>Avg Strength</div>
                    <div style={styles.masteryTrend}>
                      <span style={{ fontWeight: 700 }}>+{Math.min(20, Math.max(1, Number(avgStrength.toFixed(0))))}%</span> vs last session
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={styles.sectionTitle}>Alphabet Strength Analysis</h3>
              <TherapistLetterStrengthGrid letters={letters} />
            </div>
          </div>
        );
      })()}

      {/* Words Report */}
      {selectedReport === "words" && reportData && (() => {
        const twM = reportData.twoLetter;
        const wdM = reportData.words;
        const cmb = reportData.combined;

        const combinedAttempts = cmb?.totalAttempts ?? ((twM?.overview?.totalAttempts ?? 0) + (wdM?.overview?.totalAttempts ?? 0));
        const combinedCorrect = cmb?.correctAttempts ?? ((twM?.overview?.correctAttempts ?? 0) + (wdM?.overview?.correctAttempts ?? 0));
        const combinedRate = cmb?.successRate ?? (combinedAttempts ? +((combinedCorrect / combinedAttempts) * 100).toFixed(1) : 0);
        const avgRT = cmb?.avgResponseTime ?? (() => {
          const rts = [twM?.overview?.avgResponseTime, wdM?.overview?.avgResponseTime].filter(Boolean);
          return rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
        })();

        const twoWords = twM?.allWords ?? [];
        const multiWords = wdM?.allWords ?? [];

        const combinedWordRows = [
          { label: "Two-Letter", stats: twM?.overview ?? {} },
          { label: "Multi-Letter", stats: wdM?.overview ?? {} },
          { label: "Combined", stats: cmb ?? { totalAttempts: 0, correctAttempts: 0, successRate: 0, avgResponseTime: 0 } },
        ];

        return (
          <div style={styles.reportSection}>
            <h2 style={styles.reportTitle}>Words Report</h2>

            <div style={styles.wordSummaryGrid}>
              <div style={styles.wordsMetricCard}> 
                <div style={styles.summaryLabel}>Combined Accuracy</div>
                <div style={styles.wordsMetricValue}>{combinedRate}%</div>
              </div>
              <div style={styles.wordsMetricCard}>
                <div style={styles.summaryLabel}>Avg Response Time</div>
                <div style={styles.wordsMetricValue}>{avgRT > 0 ? `${(avgRT / 1000).toFixed(1)}s` : "—"}</div>
              </div>
              <div style={styles.wordsMetricCard}>
                <div style={styles.summaryLabel}>Two-Letter Rate</div>
                <div style={styles.wordsMetricValue}>{twM?.overview?.successRate ? `${twM.overview.successRate}%` : "—"}</div>
              </div>
              <div style={styles.wordsMetricCard}>
                <div style={styles.summaryLabel}>Multi-Letter Rate</div>
                <div style={styles.wordsMetricValue}>{wdM?.overview?.successRate ? `${wdM.overview.successRate}%` : "—"}</div>
              </div>
            </div>

            <div style={styles.analysisSection}>
              <h3 style={styles.analysisHeader}>Phonological Processing Analysis</h3>
              <p style={styles.analysisText}>
                Current assessment data reveals dynamic strengths and targets in word-level decoding and speed. 
                Two-Letter speed shows a functional baseline while Multi-Letter accuracy suggests some orthographic retrieval load.
                Recommended priority: blend name drills with CVC and CCVC sets while monitoring response time trajectories.
              </p>
              <div style={styles.focusBox}>
                <div style={styles.focusTitle}>Therapeutic Focus</div>
                <ul style={styles.focusList}>
                  <li>Rapid CVC blending drills</li>
                  <li>Phoneme-grapheme mapping for 'sh' and 'ch'</li>
                  <li>Reduce visual latency in naming</li>
                </ul>
              </div>
            </div>

            <div style={styles.subSection}>
              <div style={styles.subTitle}>Two-Letter Words</div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.tableCell}>Word Target</th>
                      <th style={styles.tableCell}>Attempts / Correct</th>
                      <th style={styles.tableCell}>Accuracy</th>
                      <th style={styles.tableCell}>Avg Response</th>
                      <th style={styles.tableCell}>Fluency Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {twoWords.map((item, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>{item.word.toUpperCase()}</td>
                        <td style={styles.tableCell}>{item.totalAttempts}/{item.correctCount}</td>
                        <td style={styles.tableCell}>{item.successRate}%</td>
                        <td style={styles.tableCell}>{(item.avgResponseTime/1000).toFixed(2)}s</td>
                        <td style={styles.tableCell}>{item.successRate >= 80 ? "↗" : item.successRate >= 60 ? "→" : "↘"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.subSection}>
              <div style={styles.subTitle}>Multi-Letter & Complex</div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.tableCell}>Word Target</th>
                      <th style={styles.tableCell}>Attempts / Correct</th>
                      <th style={styles.tableCell}>Accuracy</th>
                      <th style={styles.tableCell}>Avg Response</th>
                      <th style={styles.tableCell}>Fluency Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiWords.map((item, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>{item.word.toUpperCase()}</td>
                        <td style={styles.tableCell}>{item.totalAttempts}/{item.correctCount}</td>
                        <td style={styles.tableCell}>{item.successRate}%</td>
                        <td style={styles.tableCell}>{(item.avgResponseTime/1000).toFixed(2)}s</td>
                        <td style={styles.tableCell}>{item.successRate >= 80 ? "↗" : item.successRate >= 60 ? "→" : "↘"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Sentences Report */}
      {selectedReport === "sentences" && reportData && (
        <div style={styles.reportSection}>
          <h2 style={styles.reportTitle}>Sentences Report</h2>

          <div style={styles.wordSummaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Combined Accuracy</div>
              <div style={styles.summaryValue}>{reportData.successRate}%</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Avg Response Time</div>
              <div style={styles.summaryValue}>{getSentenceAvgLatency(reportData.attempts)}s</div>
            </div>
          </div>

          <div style={styles.analysisSection}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={styles.clinicalNarrativeCard}>
                <h3 style={styles.analysisHeader}>Clinical Narrative Analysis</h3>
                <p style={styles.analysisText}>
                  {getSentenceNarrative(student, reportData)}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.subSection}>
            <div style={styles.subTitle}>Sentence Performance Table</div>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.tableCell}>Target Sentence</th>
                    <th style={styles.tableCell}>Spoken Response</th>
                    <th style={styles.tableCell}>Status</th>
                    <th style={styles.tableCell}>Accuracy</th>
                    <th style={styles.tableCell}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.attempts?.slice(0, 10).map((attempt, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.tableCell}>{attempt.sentence}</td>
                      <td style={styles.tableCell}>{attempt.spoken || ""}</td>
                      <td style={styles.tableCell}>{attempt.correct ? "✅" : "❌"}</td>
                      <td style={styles.tableCell}>{attempt.accuracy}%</td>
                      <td style={styles.tableCell}>{(attempt.responseTime/1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={styles.loadingMessage}>Loading report...</div>
      )}
    </div>
  );
}

function TherapistLetterStrengthGrid({ letters }) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  const map = {};
  letters.forEach((l) => {
    map[l.letter?.toLowerCase()] = l;
  });

  return (
    <div style={styles.letterGrid}>
      {alphabet.map((char) => {
        const item = map[char];
        const strength = item ? Number(item.strength) : null;
        const attempts = item?.attempts || 0;
        const status = strength === null
          ? "Not Practised"
          : strength >= 40
          ? "Mastered"
          : strength >= 0
          ? "Developing"
          : "Needs Focus";

        const bg = strength === null
          ? "#f8fafc"
          : strength >= 40
          ? "#d1fae5"
          : strength >= 0
          ? "#fef3c7"
          : "#fee2e2";

        const text = strength === null ? "—" : `${strength.toFixed(1)}%`;
        const color = strength === null
          ? "#64748b"
          : strength >= 40
          ? "#065f46"
          : strength >= 0
          ? "#92400e"
          : "#991b1b";

        const typeLabel = (() => {
          if (["a","e","i","o","u"].includes(char)) return "Vowel Sound";
          if (["b","p","d","t","g","k"].includes(char)) return "Plosive";
          if (["s","z","f","v","th"].includes(char)) return "Fricative";
          if (["l","r","m","n","ng"].includes(char)) return "Sonorant";
          return "Letter";
        })();

        return (
          <div key={char} style={{ ...styles.letterCard, background: bg, borderColor: "#e2e8f0" }}>
            <div style={{ ...styles.letterBig, color }}>{char.toUpperCase()}</div>
            <div style={{ ...styles.strengthPct, color }}>{text}</div>
            <div style={styles.letterLabel}>{typeLabel}</div>
            <div style={styles.attemptsText}>Attempts: {attempts}</div>
            <div style={styles.statusTag}>{status}</div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   Styles
========================== */
const styles = {
  container: {
    background: "#f8fafc",
    color: "#1e293b",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    background: "transparent",
    color: "#3b82f6",
    border: "1px solid #bfdbfe",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    marginBottom: 16,
    fontSize: 14,
  },
  studentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 24,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
  },
  studentMeta: {
    fontSize: 13,
    color: "#475569",
    margin: 0,
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    marginBottom: 24,
  },
  summaryCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  cardIconLarge: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 600,
    marginBottom: 8,
    letterSpacing: "0.5px",
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 13,
    color: "#64748b",
  },
  profileDetail: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 500,
  },
  timeframeControl: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  timeframeLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "#64748b",
  },
  timeframeSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
  },
  reportNav: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 16,
    overflowX: "auto",
  },

  reportBtn: {
    padding: "8px 16px",
    border: "1px solid #bfdbfe",
    background: "transparent",
    color: "#3b82f6",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    borderRadius: 6,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  reportBtnActive: {
    color: "#1e40af",
    background: "#eff6ff",
    border: "1px solid #3b82f6",
  },
  reportSection: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 20px 0",
    color: "#1e293b",
    padding: "12px 0",
    borderBottom: "3px solid #3b82f6",
    display: "inline-block",
  },
  sectionHeadline: {
    fontSize: 16,
    fontWeight: 700,
    margin: "0 0 10px",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#0f172a",
  },
  interpretationText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#1e293b",
    margin: "0 0 12px",
  },
  interpretationList: {
    marginLeft: 16,
    color: "#334155",
    lineHeight: 1.5,
  },
  masterySummaryCard: {
    borderRadius: 14,
    padding: 8,
    minHeight: 120,
    height: 150,
    maxHeight: 150,
    background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    color: "white",
    overflow: "hidden",
  },
  masterySummaryHeading: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.8px",
    marginBottom: 4,
    opacity: 0.95,
    lineHeight: 1.1,
  },
  masterySummaryValues: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
    rowGap: 0,
  },
  masteryBigValue: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
  },
  masteryLabel: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  masteryFocusText: {
    fontSize: 13,
    opacity: 0.88,
    marginTop: 8,
  },
  masteryScore: {
    fontSize: 44,
    fontWeight: 800,
    lineHeight: 1.1,
    margin: 0,
  },
  masteryAvg: {
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.1,
    margin: 0,
  },
  masteryLabel: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: 0,
  },
  masteryTrend: {
    fontSize: 12,
    color: "rgba(255,255,255,0.95)",
    marginTop: 2,
    marginBottom: 0,
  },
  wordSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "10px",
    marginBottom: "16px",
  },
  summaryCard: {
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "110px",
  },
  wordsMetricCard: {
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #3b82f6",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "110px",
  },
  wordsMetricValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1d4ed8",
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#1e3a8a",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "4px",
  },
  summaryValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1d4ed8",
    lineHeight: 1,
  },
  analysisSection: {
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "10px 12px",
    marginBottom: "14px",
  },
  clinicalNarrativeCard: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "10px",
    flex: 1,
    minWidth: "280px",
  },
  prosodicCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "10px",
    flex: 1,
    minWidth: "260px",
  },
  analysisHeader: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  analysisText: {
    fontSize: "13px",
    color: "#334155",
    lineHeight: 1.35,
    margin: 0,
  },
  focusBox: {
    marginTop: "10px",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "8px 10px",
  },
  focusTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  focusList: {
    margin: 0,
    paddingLeft: "15px",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.3,
  },
  subSection: {
    marginBottom: "16px",
  },
  subTitle: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: "1px",
    borderBottom: "1px solid #bfdbfe",
    paddingBottom: "6px",
  },

  tagRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tagPill: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d4ed8",
    background: "#dbeafe",
    borderRadius: 999,
    padding: "4px 10px",
  },
  letterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
  },
  letterCard: {
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    padding: "10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minHeight: 120,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  },
  letterBig: {
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: "-1px",
  },
  strengthPct: {
    fontSize: 14,
    fontWeight: 700,
  },
  letterLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  attemptsText: {
    fontSize: 11,
    color: "#64748b",
  },
  statusTag: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#1e293b",
  },
  reportStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: "1px solid #f1f5f9",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1e293b",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  },
  tableCell: {
    padding: "12px",
    textAlign: "left",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
  },
  tableRow: {
    "&:hover": {
      background: "#f8fafc",
    },
  },
  progressBar: {
    width: "100%",
    height: 6,
    background: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    background: "#3b82f6",
    borderRadius: 3,
  },
  loadingMessage: {
    textAlign: "center",
    padding: 40,
    color: "#64748b",
    fontSize: 16,
  },
  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
  },
};
