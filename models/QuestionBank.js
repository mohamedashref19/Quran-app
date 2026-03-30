const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: Number },
  explanation: { type: String },
  lastUsed: { type: Date, default: null } 
}, { timestamps: true });

module.exports = mongoose.model('QuestionBank', questionBankSchema);