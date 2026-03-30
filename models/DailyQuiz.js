const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }], 
  correctAnswer: { type: Number }, 
  explanation: { type: String }    
});

const dailyQuizSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, 
  questions: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.model('DailyQuiz', dailyQuizSchema);