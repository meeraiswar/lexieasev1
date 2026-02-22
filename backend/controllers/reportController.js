import SentenceAttempt from "../models/SentenceAttempt.js";
import LetterState from "../models/LetterState.js";
import { SENTENCES } from "../data/sentences.js";

export const generateStudentReport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const studentId = req.user._id;
    const { timeframe = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const attempts = await SentenceAttempt.find({
      studentId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    if (!attempts.length) {
      return res.json({
        success: true,
        message: "No data available yet",
        metrics: null,
      });
    }

    // === OVERALL METRICS ===
    const total = attempts.length;
    const correctAttempts = attempts.filter(a => a.sentenceCorrect).length;
    const avgAccuracy = attempts.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / total;
    const avgResponseTime = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / total;

    // === TREND ANALYSIS ===
    const trend = calculateTrend(attempts);

    // === PROBLEM LETTERS ANALYSIS ===
    const letterFrequency = {};
    attempts.forEach(attempt => {
      attempt.problemLetters.forEach(letter => {
        letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
      });
    });

    const topProblemLetters = Object.entries(letterFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([letter, count]) => ({
        letter,
        errorCount: count,
        errorRate: ((count / total) * 100).toFixed(1)
      }));

    // === SENTENCE-LEVEL INSIGHTS ===
    const sentenceStats = {};
    attempts.forEach(attempt => {
      if (!sentenceStats[attempt.sentenceId]) {
        sentenceStats[attempt.sentenceId] = {
          attempts: 0,
          correct: 0,
          totalAccuracy: 0,
          totalTime: 0
        };
      }
      const stats = sentenceStats[attempt.sentenceId];
      stats.attempts++;
      if (attempt.sentenceCorrect) stats.correct++;
      stats.totalAccuracy += attempt.sentenceAccuracy;
      stats.totalTime += attempt.responseTimeMs;
    });

    const mostDifficultSentences = Object.entries(sentenceStats)
      .map(([sentenceId, stats]) => ({
        sentenceId,
        sentence: SENTENCES.find(s => s.id === sentenceId)?.text || "Unknown",
        attempts: stats.attempts,
        successRate: ((stats.correct / stats.attempts) * 100).toFixed(1),
        avgAccuracy: ((stats.totalAccuracy / stats.attempts) * 100).toFixed(1),
        avgTime: Math.round(stats.totalTime / stats.attempts)
      }))
      .sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate))
      .slice(0, 3);

    // === PROGRESS TIMELINE ===
    const dailyProgress = groupByDay(attempts);

    // === PERSONALIZED FEEDBACK ===
    const feedback = generateFeedback({
      avgAccuracy,
      trend,
      topProblemLetters,
      avgResponseTime,
      correctAttempts,
      total
    });

    // === LETTER STATE DATA ===
    const letterStates = await LetterState.find({ studentId })
      .sort({ avgReward: 1 })
      .limit(10);

    const letterProgress = letterStates.map(ls => ({
      letter: ls.letter,
      strength: (ls.avgReward * 100).toFixed(1),
      attempts: ls.pulls
    }));

    return res.json({
      success: true,
      metrics: {
        overview: {
          totalAttempts: total,
          correctAttempts,
          successRate: ((correctAttempts / total) * 100).toFixed(1),
          accuracyPercentage: (avgAccuracy * 100).toFixed(1),
          avgResponseTime: Math.round(avgResponseTime),
        },
        trend: {
          direction: trend.direction,
          change: trend.change,
          recentAccuracy: (trend.recentAvg * 100).toFixed(1),
          previousAvg: trend.previousAvg,
        },
        problemAreas: {
          letters: topProblemLetters,
          sentences: mostDifficultSentences,
        },
        progress: {
          daily: dailyProgress,
          letterStrength: letterProgress,
        },
        feedback,
        timeframe,
      },
    });

  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// === HELPER FUNCTIONS ===

function calculateTrend(attempts) {
  if (attempts.length < 4) {
    return { direction: 'insufficient_data', change: 0, recentAvg: 0, previousAvg: 0 };
  }

  const half = Math.floor(attempts.length / 2);
  const firstHalf = attempts.slice(0, half);
  const secondHalf = attempts.slice(half);

  const firstAvg = firstHalf.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  let direction;
  if (change > 5) direction = 'improving';
  else if (change < -5) direction = 'declining';
  else direction = 'stable';

  return {
    direction,
    change: change.toFixed(1),
    recentAvg: secondAvg,
    previousAvg: firstAvg,
  };
}

function groupByDay(attempts) {
  const groups = {};
  
  attempts.forEach(attempt => {
    const date = new Date(attempt.createdAt).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = { attempts: 0, correct: 0, totalAccuracy: 0 };
    }
    groups[date].attempts++;
    if (attempt.sentenceCorrect) groups[date].correct++;
    groups[date].totalAccuracy += attempt.sentenceAccuracy;
  });

  return Object.entries(groups).map(([date, stats]) => ({
    date,
    attempts: stats.attempts,
    accuracy: ((stats.totalAccuracy / stats.attempts) * 100).toFixed(1),
    successRate: ((stats.correct / stats.attempts) * 100).toFixed(1),
  }));
}

function generateFeedback({ avgAccuracy, trend, topProblemLetters, avgResponseTime, correctAttempts, total }) {
  const messages = [];
  const recommendations = [];

  // Performance feedback
  if (avgAccuracy >= 0.9) {
    messages.push("Excellent work! Your pronunciation is very strong.");
  } else if (avgAccuracy >= 0.7) {
    messages.push("Good progress! Keep practicing to improve accuracy.");
  } else {
    messages.push("Keep trying! Focus on the problem areas highlighted below.");
  }

  // Trend feedback
  if (trend.direction === 'improving') {
    messages.push(`Great job! Your accuracy improved by ${Math.abs(parseFloat(trend.change))}% recently.`);
  } else if (trend.direction === 'declining') {
    messages.push(`Your recent accuracy decreased by ${Math.abs(parseFloat(trend.change))}%. Let's focus on problem areas.`);
    recommendations.push("Take more time with each sentence");
  }

  // Speed feedback
  if (avgResponseTime < 2000) {
    messages.push("Your response time is excellent!");
  } else if (avgResponseTime > 5000) {
    messages.push("Try to respond a bit faster as you gain confidence.");
    recommendations.push("Practice reading sentences aloud before recording");
  }

  // Problem letter feedback
  if (topProblemLetters.length > 0) {
    const letters = topProblemLetters.slice(0, 3).map(l => l.letter).join(', ');
    recommendations.push(`Focus extra practice on these sounds: ${letters}`);
  }

  // Consistency feedback
  const successRate = (correctAttempts / total) * 100;
  if (successRate < 50) {
    recommendations.push("Review the pronunciation guide for difficult sounds");
    recommendations.push("Practice in a quiet environment");
  }

  return {
    messages,
    recommendations,
    motivationalQuote: getMotivationalMessage(avgAccuracy, trend.direction),
  };
}

function getMotivationalMessage(accuracy, trend) {
  if (accuracy >= 0.9) {
    return "You're mastering this! Keep up the fantastic work! 🌟";
  } else if (trend === 'improving') {
    return "Every practice session makes you better. You're on the right track! 📈";
  } else {
    return "Progress takes time. Keep practicing, you've got this! 💪";
  }
}