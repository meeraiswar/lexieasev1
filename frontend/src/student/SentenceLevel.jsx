import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function LetterReport() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(7);
  const [userInfo, setUserInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [user, data] = await Promise.all([
          apiFetch("/api/auth/me"),
          apiFetch(`/api/reports/student/letters?timeframe=${timeframe}`),
        ]);
        setUserInfo(user);
        setReport(data);
      } catch (error) {
        console.error("Failed to fetch letter report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [timeframe]);

  const downloadPDFReport = () => {
    if (!report?.metrics) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const { metrics } = report;
      const studentName = userInfo?.name || "Student";
      const date = new Date().toLocaleDateString();

      // ── PAGE 1 ──────────────────────────────────────────────────
      // Header
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("LexCura Speech Therapy", 105, 13, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Letter & Phoneme Naming — Clinical Progress Report", 105, 22, { align: "center" });
      doc.setFontSize(9);
      doc.text(
        `Student: ${studentName}   |   Period: Last ${timeframe} Days   |   Generated: ${date}`,
        105,
        30,
        { align: "center" }
      );

      // ── SECTION 1: Summary ────────────────────────────────
      let y = 46;
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("1. Letter Naming Performance Summary", 15, y);
      y += 2;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 6;

      const successRate = parseFloat(metrics.overview.successRate);
      const avgRTsec = (metrics.overview.avgResponseTime / 1000).toFixed(2);
      const rtInterpretation =
        metrics.overview.avgResponseTime < 2000
          ? "Fast — within typical range for letter naming"
          : metrics.overview.avgResponseTime < 4000
          ? "Moderate — mild delay; targeted practice recommended"
          : "Slow — significant naming latency; intervention indicated";

      const accuracyLevel =
        successRate >= 80 ? "Strong" : successRate >= 60 ? "Developing" : "Needs Support";

      doc.autoTable({
        startY: y,
        head: [["Metric", "Value", "Clinical Interpretation"]],
        body: [
          ["Letter Accuracy", `${metrics.overview.successRate}%`, accuracyLevel],
          [
            "Correct Responses",
            `${metrics.overview.correctAttempts} / ${metrics.overview.totalAttempts}`,
            "Total session attempts",
          ],
          ["Avg Response Time", `${avgRTsec}s`, rtInterpretation],
          [
            "Speed Target",
            "< 2.0s",
            metrics.overview.avgResponseTime < 2000 ? "✓ Achieved" : "✗ Not yet achieved",
          ],
          [
            "Trend",
            metrics.trend?.direction === "insufficient_data"
              ? "More data needed"
              : metrics.trend?.direction,
            metrics.trend?.direction === "improving"
              ? "Positive trajectory"
              : metrics.trend?.direction === "declining"
              ? "Needs attention"
              : metrics.trend?.direction === "stable"
              ? "Consistent performance"
              : "Practice more sessions",
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
        columnStyles: { 2: { cellWidth: 80 } },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── SECTION 2: Response Time Analysis ────────────────────
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("2. Response Time Analysis", 15, y);
      y += 2;
      doc.line(15, y, 195, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const rtNote = [
        "Rapid Automatic Naming (RAN) speed for letters is a core predictor of phonological awareness.",
        "Target: students should aim to name letters in under 2 seconds consistently.",
        `This student's average: ${avgRTsec}s — ${
          metrics.overview.avgResponseTime < 2000
            ? "within target range."
            : "above target; focused drills on high-error letters are recommended."
        }`,
      ];
      rtNote.forEach((line) => {
        doc.text(line, 15, y);
        y += 5;
      });
      y += 4;

      doc.autoTable({
        startY: y,
        head: [["Response Time Zone", "Range", "This Student"]],
        body: [
          [
            "Fluent (Low Risk)",
            "< 2.0s",
            metrics.overview.avgResponseTime < 2000 ? "✓ Here" : "",
          ],
          [
            "Borderline",
            "2.0s – 4.0s",
            metrics.overview.avgResponseTime >= 2000 &&
            metrics.overview.avgResponseTime < 4000
              ? "✓ Here"
              : "",
          ],
          [
            "Significant Delay (High Risk)",
            "> 4.0s",
            metrics.overview.avgResponseTime >= 4000 ? "✓ Here" : "",
          ],
        ],
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── SECTION 3: Problem Letters ──────────────────────────────
      if (metrics.problemLetters?.length > 0) {
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("3. High-Error Letters (Priority Practice Targets)", 15, y);
        y += 2;
        doc.setDrawColor(220, 38, 38);
        doc.line(15, y, 195, y);
        doc.setDrawColor(16, 185, 129);
        y += 6;

        doc.autoTable({
          startY: y,
          head: [["Letter", "Errors", "Error Rate", "Priority", "Recommended Drill"]],
          body: metrics.problemLetters.map((item, i) => [
            item.letter.toUpperCase(),
            item.errorCount,
            `${item.errorRate}%`,
            i < 2 ? "HIGH" : "MEDIUM",
            "Isolation drill + minimal pairs practice",
          ]),
          theme: "striped",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── SECTION 4: Letter Mastery Overview ───────────────────────
      if (metrics.letterMastery?.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(16, 185, 129);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("4. Letter Mastery Overview", 15, y);
        y += 2;
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y, 195, y);
        y += 6;

        doc.autoTable({
          startY: y,
          head: [["Letter", "Attempts", "Avg Score", "Mastery Level"]],
          body: metrics.letterMastery.map((item) => [
            item.letter.toUpperCase(),
            item.pulls,
            `${(item.avgReward * 100).toFixed(1)}%`,
            item.avgReward >= 0.8
              ? "Mastered"
              : item.avgReward >= 0.6
              ? "Developing"
              : "Needs Focus",
          ]),
          theme: "striped",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── PAGE 2: Daily Progress + Action Plan ──────────────
      doc.addPage();
      y = 20;

      if (metrics.daily?.length > 0) {
        doc.setTextColor(16, 185, 129);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("5. Daily Progress Log", 15, y);
        y += 2;
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y, 195, y);
        y += 6;

        doc.autoTable({
          startY: y,
          head: [["Date", "Sessions", "Success Rate", "Performance"]],
          body: metrics.daily.map((day) => [
            new Date(day.date).toLocaleDateString(),
            day.attempts,
            `${day.successRate}%`,
            parseFloat(day.successRate) >= 80
              ? "Strong"
              : parseFloat(day.successRate) >= 60
              ? "Developing"
              : "Needs Practice",
          ]),
          theme: "striped",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Action Plan ────────────────────────────────────────
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("6. Personalised Letter Action Plan", 15, y);
      y += 2;
      doc.setDrawColor(15, 118, 110);
      doc.line(15, y, 195, y);
      y += 6;

      const actions = [];
      if (metrics.overview.avgResponseTime >= 2000)
        actions.push([
          "Speed Drills",
          "Daily 5-min timed naming of top 5 error letters using flashcards",
        ]);
      if (metrics.problemLetters?.length > 0)
        actions.push([
          "Letter Mastery",
          `Focus on: ${metrics.problemLetters
            .slice(0, 3)
            .map((l) => l.letter.toUpperCase())
            .join(", ")} — 20 reps each before next session`,
        ]);
      if (successRate < 60)
        actions.push([
          "Session Frequency",
          "Increase to daily short sessions (10 min) rather than longer infrequent ones",
        ]);
      actions.push([
        "Phoneme Isolation",
        "Practice each problem letter sound in isolation, then in CVC words",
      ]);
      actions.push([
        "Progress Check",
        "Re-assess in 2 weeks; compare avg response time and success rate",
      ]);

      doc.autoTable({
        startY: y,
        head: [["Strategy", "Action"]],
        body: actions,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255 },
        columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
      });

      y = doc.lastAutoTable.finalY + 10;

      // Disclaimer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "italic");
      doc.text(
        "This report is generated by LexCura and is intended to support — not replace — clinical assessment by a qualified speech-language pathologist.",
        15,
        y,
        { maxWidth: 180 }
      );

      // Footer all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(15, 285, 195, 285);
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.setFont("helvetica", "normal");
        doc.text("LexCura Speech Therapy — Confidential Clinical Report", 15, 290);
        doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
      }

      doc.save(
        `LexCura_Letter_Report_${studentName.replace(/\s+/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (error) {
      console.error("PDF error:", error);
      alert("Failed to generate report.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading letter report...</p>
      </div>
    );
  }

  if (!report?.metrics) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🔤</div>
        <h2 style={styles.emptyTitle}>No Letter Data Yet</h2>
        <p style={styles.emptyText}>
          Complete some letter exercises to see your report here.
        </p>
        <button
          style={styles.startButton}
          onClick={() => navigate("/student/letter-level")}
        >
          Start Practising Letters
        </button>
      </div>
    );
  }

  const { metrics } = report;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔤 Letter Practice Report</h1>
          <p style={styles.subtitle}>Welcome, {userInfo?.name || "Student"}</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={downloading ? styles.downloadButtonDisabled : styles.downloadButton}
            onClick={downloadPDFReport}
            disabled={downloading}
          >
            {downloading ? "⏳ Generating..." : "📥 Download PDF"}
          </button>
          <div style={styles.filterContainer}>
            {[7, 30, 90].map((t) => (
              <button
                key={t}
                style={timeframe === t ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setTimeframe(t)}
              >
                {t} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="🎯"
          label="Success Rate"
          value={`${metrics.overview.successRate}%`}
          trend={metrics.trend}
          color="#10b981"
        />
        <StatCard
          icon="⚡"
          label="Avg Response Time"
          value={`${(metrics.overview.avgResponseTime / 1000).toFixed(1)}s`}
          color="#f59e0b"
        />
        <StatCard
          icon="✅"
          label="Total Attempts"
          value={metrics.overview.totalAttempts}
          subValue={`${metrics.overview.correctAttempts} correct`}
          color="#3b82f6"
        />
        <StatCard
          icon="📉"
          label="Trend"
          value={
            !metrics.trend || metrics.trend.direction === "insufficient_data"
              ? "Collecting data..."
              : metrics.trend.direction === "improving"
              ? "↗ Improving"
              : metrics.trend.direction === "declining"
              ? "↘ Declining"
              : "→ Stable"
          }
          color={
            metrics.trend?.direction === "improving"
              ? "#10b981"
              : metrics.trend?.direction === "declining"
              ? "#ef4444"
              : "#3b82f6"
          }
        />
      </div>

      {/* Trend Card */}
      {metrics?.trend && metrics.trend.direction !== "insufficient_data" && (
        <TrendCard trend={metrics.trend} />
      )}

      {/* Letter Mastery Grid */}
      {metrics.letterMastery?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🔡 Letter Mastery Overview</h3>
          <LetterMasteryGrid data={metrics.letterMastery} />
        </div>
      )}

      {/* Problem Areas */}
      <div style={styles.twoColumnGrid}>
        {metrics.problemLetters?.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚠️ Problem Letters</h3>
            <div style={styles.problemList}>
              {metrics.problemLetters.map((item, idx) => (
                <div key={idx} style={styles.problemItem}>
                  <div
                    style={{
                      ...styles.badge,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    }}
                  >
                    {item.letter.toUpperCase()}
                  </div>
                  <div style={styles.problemInfo}>
                    <span style={styles.problemCount}>{item.errorCount} errors</span>
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${item.errorRate}%`,
                          background: "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                  <span style={styles.errorRateLabel}>{item.errorRate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accuracy Breakdown by Letter */}
        {metrics.letterMastery?.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Top Letters by Attempts</h3>
            <div style={styles.problemList}>
              {[...metrics.letterMastery]
                .sort((a, b) => b.pulls - a.pulls)
                .slice(0, 6)
                .map((item, idx) => {
                  const pct = Math.round(item.avgReward * 100);
                  return (
                    <div key={idx} style={styles.problemItem}>
                      <div
                        style={{
                          ...styles.badge,
                          background:
                            pct >= 80
                              ? "linear-gradient(135deg,#10b981,#059669)"
                              : pct >= 60
                              ? "linear-gradient(135deg,#f59e0b,#d97706)"
                              : "linear-gradient(135deg,#ef4444,#dc2626)",
                        }}
                      >
                        {item.letter.toUpperCase()}
                      </div>
                      <div style={styles.problemInfo}>
                        <span style={styles.problemCount}>
                          {item.pulls} attempt{item.pulls !== 1 ? "s" : ""}
                        </span>
                        <div style={styles.progressBarBg}>
                          <div
                            style={{
                              ...styles.progressBarFill,
                              width: `${pct}%`,
                              background:
                                pct >= 80
                                  ? "#10b981"
                                  : pct >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                      <span style={styles.errorRateLabel}>{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Daily Progress Chart */}
      {metrics.daily?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📈 Daily Progress</h3>
          <DailyProgressChart data={metrics.daily} />
        </div>
      )}

      {/* CTA */}
      <div style={styles.ctaCard}>
        <div>
          <h3 style={styles.ctaTitle}>Keep it up! 🚀</h3>
          <p style={styles.ctaText}>
            Practice letters daily to strengthen your phonemic awareness.
          </p>
        </div>
        <button
          style={styles.ctaButton}
          onClick={() => navigate("/student/letter-level")}
        >
          Continue Practice
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ icon, label, value, subValue, trend, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}15` }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <div style={styles.statContent}>
        <span style={styles.statLabel}>{label}</span>
        <h3 style={{ ...styles.statValue, color }}>{value}</h3>
        {subValue && <span style={styles.statSubValue}>{subValue}</span>}
        {trend &&
          trend.direction !== "stable" &&
          trend.direction !== "insufficient_data" && (
            <TrendBadge direction={trend.direction} change={trend.change} />
          )}
      </div>
    </div>
  );
}

function TrendBadge({ direction, change }) {
  const isImproving = direction === "improving";
  return (
    <span
      style={{
        ...styles.trendBadge,
        background: isImproving ? "#dcfce7" : "#fee2e2",
        color: isImproving ? "#16a34a" : "#dc2626",
      }}
    >
      {isImproving ? "↗" : "↘"} {Math.abs(parseFloat(change))}%
    </span>
  );
}

function TrendCard({ trend }) {
  const isImproving = trend.direction === "improving";
  const isStable = trend.direction === "stable";
  return (
    <div
      style={{
        ...styles.trendCard,
        background: isImproving
          ? "linear-gradient(135deg, #10b981, #34d399)"
          : isStable
          ? "linear-gradient(135deg, #3b82f6, #60a5fa)"
          : "linear-gradient(135deg, #f59e0b, #fbbf24)",
      }}
    >
      <div style={styles.trendIcon}>
        {isImproving ? "🎉" : isStable ? "📊" : "💪"}
      </div>
      <div style={styles.trendContent}>
        <h3 style={styles.trendTitle}>
          {isImproving
            ? "You're Improving!"
            : isStable
            ? "Steady Progress"
            : "Let's Focus"}
        </h3>
        <p style={styles.trendText}>
          {isImproving &&
            `Your success rate increased by ${Math.abs(
              parseFloat(trend.change)
            )}% recently. Keep it up!`}
          {isStable && "Your performance is consistent. Keep practising!"}
          {!isImproving &&
            !isStable &&
            `Recent success rate dropped by ${Math.abs(
              parseFloat(trend.change)
            )}%. Focus on problem letters below.`}
        </p>
        <div style={styles.trendStats}>
          <div>
            <span style={styles.trendStatLabel}>Previous</span>
            <span style={styles.trendStatValue}>
              {(trend.previousAvg * 100).toFixed(1)}%
            </span>
          </div>
          <div style={styles.trendArrow}>→</div>
          <div>
            <span style={styles.trendStatLabel}>Recent</span>
            <span style={styles.trendStatValue}>{trend.recentAccuracy}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LetterMasteryGrid({ data }) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  const masteryMap = {};
  data.forEach((item) => {
    masteryMap[item.letter.toLowerCase()] = item;
  });

  return (
    <div style={styles.masteryGrid}>
      {alphabet.map((char) => {
        const item = masteryMap[char];
        const pct = item ? Math.round(item.avgReward * 100) : null;
        const bg =
          pct === null
            ? "#f1f5f9"
            : pct >= 80
            ? "#d1fae5"
            : pct >= 60
            ? "#fef3c7"
            : "#fee2e2";
        const textColor =
          pct === null
            ? "#94a3b8"
            : pct >= 80
            ? "#065f46"
            : pct >= 60
            ? "#92400e"
            : "#991b1b";
        return (
          <div
            key={char}
            title={
              item
                ? `${char.toUpperCase()}: ${item.pulls} attempts, ${pct}% avg score`
                : `${char.toUpperCase()}: not yet practised`
            }
            style={{
              ...styles.masteryCell,
              background: bg,
              color: textColor,
            }}
          >
            <span style={styles.masteryLetter}>{char.toUpperCase()}</span>
            {pct !== null && (
              <span style={styles.masteryPct}>{pct}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DailyProgressChart({ data }) {
  const maxRate = Math.max(...data.map((d) => parseFloat(d.successRate)));
  return (
    <div style={styles.chartContainer}>
      <div style={styles.chartBars}>
        {data.map((day, idx) => {
          const height = maxRate > 0 ? (parseFloat(day.successRate) / maxRate) * 100 : 0;
          return (
            <div key={idx} style={styles.chartBarWrapper}>
              <div style={styles.chartBarAccuracy}>{day.successRate}%</div>
              <div
                style={{
                  ...styles.chartBar,
                  height: `${height}%`,
                  background:
                    parseFloat(day.successRate) >= 80
                      ? "#10b981"
                      : parseFloat(day.successRate) >= 60
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              />
              <span style={styles.chartDate}>
                {new Date(day.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = {
  page: {
    padding: "32px",
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#f0fdf4",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "16px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#10b981",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: { fontSize: "16px", color: "#64748b" },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    textAlign: "center",
    padding: "40px",
  },
  emptyIcon: { fontSize: "64px", marginBottom: "24px" },
  emptyTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "16px",
    color: "#64748b",
    marginBottom: "32px",
    maxWidth: "400px",
  },
  startButton: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    border: "none",
    padding: "14px 32px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px",
  },
  subtitle: { fontSize: "15px", color: "#64748b", margin: 0 },
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  downloadButton: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  downloadButtonDisabled: {
    background: "#94a3b8",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "not-allowed",
    opacity: 0.7,
    whiteSpace: "nowrap",
  },
  filterContainer: {
    display: "flex",
    gap: "8px",
    background: "white",
    padding: "4px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  filterBtn: {
    padding: "8px 16px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  filterBtnActive: {
    padding: "8px 16px",
    border: "none",
    background: "#10b981",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  statIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: { fontSize: "13px", color: "#64748b", fontWeight: "500" },
  statValue: { fontSize: "28px", fontWeight: "700", lineHeight: 1 },
  statSubValue: { fontSize: "13px", color: "#64748b" },
  trendBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    marginTop: "4px",
  },
  trendCard: {
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "24px",
    color: "white",
    display: "flex",
    gap: "24px",
    alignItems: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  },
  trendIcon: { fontSize: "48px", flexShrink: 0 },
  trendContent: { flex: 1 },
  trendTitle: { fontSize: "24px", fontWeight: "700", marginBottom: "8px" },
  trendText: {
    fontSize: "15px",
    opacity: 0.95,
    marginBottom: "16px",
    lineHeight: 1.5,
  },
  trendStats: { display: "flex", alignItems: "center", gap: "16px" },
  trendStatLabel: {
    display: "block",
    fontSize: "12px",
    opacity: 0.8,
    marginBottom: "4px",
  },
  trendStatValue: { display: "block", fontSize: "20px", fontWeight: "700" },
  trendArrow: { fontSize: "20px", opacity: 0.8 },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "24px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "20px",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  problemList: { display: "flex", flexDirection: "column", gap: "12px" },
  problemItem: { display: "flex", alignItems: "center", gap: "16px" },
  badge: {
    minWidth: "48px",
    height: "48px",
    borderRadius: "12px",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "700",
    flexShrink: 0,
    padding: "0 8px",
  },
  problemInfo: { flex: 1 },
  problemCount: {
    fontSize: "14px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px",
  },
  errorRateLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
    minWidth: "36px",
    textAlign: "right",
  },
  progressBarBg: {
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  // Mastery grid
  masteryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
    gap: "10px",
  },
  masteryCell: {
    borderRadius: "12px",
    padding: "10px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    cursor: "default",
    transition: "transform 0.15s",
  },
  masteryLetter: { fontSize: "20px", fontWeight: "700" },
  masteryPct: { fontSize: "11px", fontWeight: "600" },
  // Chart
  chartContainer: { padding: "8px 0 0" },
  chartBars: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    height: "110px",
    paddingBottom: "28px",
    position: "relative",
  },
  chartBarWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "4px",
    height: "100%",
    position: "relative",
  },
  chartBarAccuracy: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "2px",
  },
  chartBar: {
    width: "100%",
    borderRadius: "5px 5px 0 0",
    minHeight: "8px",
    transition: "height 0.3s ease",
  },
  chartDate: {
    position: "absolute",
    bottom: 0,
    fontSize: "10px",
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  ctaCard: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    borderRadius: "20px",
    padding: "32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "white",
    flexWrap: "wrap",
    gap: "20px",
  },
  ctaTitle: {
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "8px",
    marginTop: 0,
  },
  ctaText: { fontSize: "15px", opacity: 0.9, margin: 0 },
  ctaButton: {
    background: "white",
    color: "#059669",
    border: "none",
    padding: "14px 28px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  button:hover:not(:disabled) { transform: translateY(-2px); }
  [title]:hover { transform: scale(1.08); }
`;
document.head.appendChild(styleSheet);