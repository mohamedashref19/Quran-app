const mongoose = require("mongoose");

const reciterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Reciter must have a name"],
    trim: true,
  },
  server: {
    type: String,
    required: [true, "Reciter must have a server URL"],
  },
  rewaya: {
    type: String,
    default: "Hafs A'n Assem", 
  },
  image: {
    type: String, 
    default: "default-reciter.png",
  },
  slug: {
    type: String,
    unique: true,
  },
});

module.exports = mongoose.model("Reciter", reciterSchema);