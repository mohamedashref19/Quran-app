const mongoose = require("mongoose");

const reciterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Reciter must have a name"],
    trim: true,
  },
  nameAr: { type: String, required: true },
  server: {
    type: String,
    required: [true, "Reciter must have a server URL"],
  },
  rewaya: {
    type: String,
    default: "حفص عن عاصم", 
  },
  image: {
    type: String, 
    default: "default-reciter.png",
  },
  priority: { type: Number, default: 999 },
  slug: {
    type: String,
    unique: true,
  },
  order: { type: Number, default: 99 }
});

module.exports = mongoose.model("Reciter", reciterSchema);