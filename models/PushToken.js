const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  device: { 
    type: String, 
    default: 'android' 
  },
   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

module.exports = mongoose.model('PushToken', pushTokenSchema);