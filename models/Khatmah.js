const mongoose = require("mongoose");

const khatmahSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Khatmah must belong to a user"],
  },
  name: {
    type: String,
    default: "ختمة جديدة", 
  },
  durationDays: {
    type: Number,
    required: [true, "Please provide the duration in days (e.g., 30)"],
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["ongoing", "completed", "cancelled"],
    default: "ongoing",
  },
  currentSurah: {
    type: Number,
    default: 1, 
  },
  currentAyah: {
    type: Number,
    default: 1,
  },
  dailyTargetPages: {
    type: Number, 
  },
});

khatmahSchema.pre("save", async function () {
  if (this.isNew) {
    const end = new Date(this.startDate);
    end.setDate(end.getDate() + this.durationDays);
    this.endDate = end;

    this.dailyTargetPages = Math.ceil(604 / this.durationDays);
  }
});

khatmahSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Khatmah", khatmahSchema);