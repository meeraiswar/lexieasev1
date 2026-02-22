import mongoose from "mongoose";

const sentenceAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sentenceId: String,
  expected: String,
  spoken: String,
  sentenceCorrect: Boolean,
  sentenceAccuracy: Number,
  responseTimeMs: Number,
  problemLetters: [String],
}, { timestamps: true });

export default mongoose.model("SentenceAttempt", sentenceAttemptSchema);
