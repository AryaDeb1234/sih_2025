// models/subject.js
const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true },
  subjectCode: { type: String, required: true },
  semester: { type: Number, required: true },
  department: { type: String, required: true }
}, { _id: false }
);

module.exports = mongoose.model("Subject", subjectSchema);
