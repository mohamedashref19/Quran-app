const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  //  (0، 1، -1)
  hijriOffset: {
    type: Number,
    default: 0,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

settingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
});

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
