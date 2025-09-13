// models/collegeConfig.js
const mongoose = require("mongoose");

const collegeConfigSchema = new mongoose.Schema({
  collegeName: String,
  wifiRanges: [String],   // ["192.168.10.", "10.0.0."]
  campusLocation: {
    lat: Number,
    lng: Number
  },
  radiusMeters: Number
});

module.exports = mongoose.model("CollegeConfig", collegeConfigSchema);
