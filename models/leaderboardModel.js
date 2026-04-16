const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'يجب إدخال الاسم للمشاركة في لوحة الشرف'],
    trim: true,
    maxlength: [20, 'الاسم يجب ألا يتجاوز 20 حرفاً']
  },
  score: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  date: {
    type: String, 
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

leaderboardSchema.index({ date: 1, score: -1, createdAt: 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);