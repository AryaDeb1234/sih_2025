const mongoose = require("mongoose");
const Subject = require("./subject");


const subjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true },
  subjectCode: { type: String, required: true },
  semester: { type: Number, required: true },
  department: { type: String, required: true }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: { type: String, enum: ["admin", "teacher", "student"], required: true },
  password: String,      // hash
  salt: String,          // salt
  isPasswordChanged: { type: Boolean, default: false },

    // Common fields
  department: { type: String },

  // For students
  semester: { type: Number },   // e.g., 1, 2, 3...
  year: { type: Number },       // e.g., 2025

  // For teachers
  subjects: [subjectSchema]

});


module.exports = mongoose.model("User", userSchema);
