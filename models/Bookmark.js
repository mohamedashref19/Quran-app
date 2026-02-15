const mongoose = require("mongoose")

const bookmarkSchema  = new mongoose.Schema({
    user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Bookmark must belong to a user"],
  },
  surah: {
    type: Number,
    required: [true, "Bookmark must have a surah number"],
  },
  ayah: {
    type: Number,
    required: [true, "Bookmark must have an ayah number"],
  },
  note: {
    type: String,
    trim: true, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

bookmarkSchema.index({ user: 1, surah: 1, ayah: 1 }, { unique: true });

bookmarkSchema.pre("save",async function(){
    this.populate({
        path:"user",
        select:"name"
    })
})

module.exports =mongoose.model("Bookmark",bookmarkSchema)