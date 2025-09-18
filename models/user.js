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
  semester: String,   // e.g., 1, 2, 3...
  year: String,       // e.g., 2025

  // For teachers
  subjects: [subjectSchema]

});

userSchema.post("save", async function (doc, next) {
  try {
    if (doc.role === "teacher" && doc.subjects && doc.subjects.length > 0) {
      for (const sub of doc.subjects) {
        // ✅ Upsert subject into global Subject collection
        await Subject.updateOne(
          { subjectCode: sub.subjectCode, department: sub.department }, // unique criteria
          {
            $setOnInsert: {
              subjectName: sub.subjectName,
              subjectCode: sub.subjectCode,
              semester: sub.semester,
              department: sub.department
            }
          },
          { upsert: true }
        );
      }
    }
    next();
  } catch (err) {
    console.error("Error syncing subjects:", err);
    next(err);
  }
});


module.exports = mongoose.model("User", userSchema);
