const mongoose = require('mongoose');

const recitationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Recitation must belong to a user']
  },
  audioUrl: {
    type: String,
    required: [true, 'Recitation must have an audio URL']
  },
  surah: {
    type: Number,
    required: [true, 'Please provide the Surah number']
  },
  startAyah: { 
    type: Number, 
    default: 1 ,
},
endAyah: { 
    type: Number, 
   
},
  score: {
    type: Number,
    default: 0 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Recitation = mongoose.model('Recitation', recitationSchema);

module.exports = Recitation;