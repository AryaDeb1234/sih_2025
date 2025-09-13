const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true }, // or ref Session if you want
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["present", "absent"], default: "present" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Attendance", attendanceSchema);
