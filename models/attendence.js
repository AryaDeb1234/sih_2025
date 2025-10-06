const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true }, // existing
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // existing
  status: { type: String, enum: ["present", "absent"], default: "present" }, // existing
  createdAt: { type: Date, default: Date.now }, // existing

  // 🔹 New fields
  ip: { type: String }, // optional: store client IP
  gpsValid: { type: Boolean, default: false }, // optional: GPS verification
  faceVerified: { type: Boolean, default: false }, // result from microservice
  faceConfidence: { type: Number, default: 0 }, // confidence score
  liveImage: { type: String } // optional: URL of the uploaded live image
});

module.exports = mongoose.model("Attendance", attendanceSchema);
