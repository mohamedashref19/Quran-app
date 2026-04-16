const mongoose = require("mongoose");

const radioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  backupUrl: { type: String },
  category: { type: String, required: true }, 
  order: { type: Number, default: 99 }
});

module.exports = mongoose.model("Radio", radioSchema);