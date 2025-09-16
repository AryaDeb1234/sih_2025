const express = require("express");
const passport = require("passport");
const User = require("../models/user");
const Attendance = require('../models/attendence');
const Session = require('../models/session');
const { genpassword } = require("../lib/passwordutilis");

const router = express.Router();

const isAuthenticated = passport.authenticate("jwt", { session: false });

// GET /user/:id - Get user details by ID
// router.get("/:id",  async (req, res) => {
//   try {
//     const userId = req.params.id;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.json({ user });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch user details" });
//   }
// });

router.get("/current-user", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id; // comes from JWT payload
    console.log(userId);

    const existuser = await User.findById(userId).select("-password");
    if (!existuser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, existuser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /student/:id/attendance-summary
router.get(
  "/student/:id/attendance-summary",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const studentId = req.params.id;

      const student = await User.findById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      // 1. Fetch all sessions
      const sessions = await Session.find();

      if (!sessions.length) {
        return res.json({ summary: [] });
      }
 
      // 2. Fetch student's attendance records
      const attendances = await Attendance.find({ studentId });

      // 3. Group by subject
      const subjectStats = {};

      for (const session of sessions) {
        const subject = session.className;

        if (!subjectStats[subject]) {
          subjectStats[subject] = {
            subjectName: subject,
            totalClasses: 0,
            totalPresents: 0,
          };
        }

        subjectStats[subject].totalClasses += 1;

        // check if this student has a "present" attendance for this session
        const present = attendances.find(
          (a) => a.sessionId === session.sessionId && a.status === "present"
        );
        if (present) subjectStats[subject].totalPresents += 1;
      }

      // 4. Convert to array and add percentage
      const summary = Object.values(subjectStats).map((s) => ({
        ...s,
        percentage:
          s.totalClasses > 0
            ? ((s.totalPresents / s.totalClasses) * 100).toFixed(2)
            : "0.00",
      }));

      res.json({ summary });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance summary" });
    }
  }
);



// GET /student/:id/attendance/:subjectName
router.get(
  "/student/:id/attendance/:subjectName",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { id: studentId, subjectName } = req.params;

      // Find all sessions of this subject
      const sessions = await Session.find({ className: subjectName });

      if (!sessions.length)
        return res.status(404).json({ error: "No sessions found for subject" });

      // Get all attendances for this student in these sessions
      const sessionIds = sessions.map((s) => s.sessionId);
      const attendances = await Attendance.find({
        studentId,
        sessionId: { $in: sessionIds },
      });

      // Map results
      const details = sessions.map((s) => {
        const att = attendances.find((a) => a.sessionId === s.sessionId);
        return {
          sessionId: s.sessionId,
          date: s.createdAt,
          status: att ? att.status : "absent", // default absent if not marked
        };
      });

      res.json({ subject: subjectName, details });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance details" });
    }
  }
);



// GET /user/:id/subjects - Get subjects for a teacher by their ID
router.get("/teacher/:id/subjects", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const teacherId = req.params.id;

    const teacher = await User.findById(teacherId).select("role subjects");

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (teacher.role !== "teacher") {
      return res.status(400).json({ error: "User is not a teacher" });
    }

    res.json({ subjects: teacher.subjects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});



// GET /teacher/:id/attendance-stats
router.get("/teacher/:id/attendance-stats", 
  passport.authenticate("jwt", { session: false }), 
  async (req, res) => {
    try {
      const teacherId = req.params.id;

      // 1. Find the teacher
      const teacher = await User.findById(teacherId).select("role");
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });
      if (teacher.role !== "teacher") return res.status(400).json({ error: "User is not a teacher" });

      // 2. Find all sessions created by this teacher
      const sessions = await Session.find({ teacher: teacherId });

      if (!sessions.length) return res.status(404).json({ error: "No sessions found for teacher" });

      // 3. Compute attendance stats for each session
      const stats = [];
      for (const session of sessions) {
        const attendances = await Attendance.find({ sessionId: session.sessionId })
                                            .populate("studentId", "name email");

        stats.push({
          sessionId: session.sessionId,
          className: session.className,
          status: session.status,
          createdAt: session.createdAt,
          totalMarked: attendances.length,
          students: attendances.map(a => ({
            id: a.studentId._id,
            name: a.studentId.name,
            email: a.studentId.email
          }))
        });
      }

      res.json({ stats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance stats" });
    }
});










// POST /user/change-password //                       apadato proyojon nei
// router.post(
//   "/change-password",
//   passport.authenticate("jwt", { session: false }),
//   async (req, res) => {
//     try {
//       const { newPassword } = req.body;
//       const user = await User.findById(req.user._id); // user from JWT
//       if (!user) return res.status(404).json({ error: "User not found" });

//       // Generate hash + salt using PBKDF2
//       const { hash, salt } = genpassword(newPassword);

//       user.password = hash;
//       user.salt = salt;
//       user.isPasswordChanged = true;

//       await user.save();

//       res.json({ message: "Password updated successfully" });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: "Failed to change password" });
//     }
//   }
// );

module.exports = router;
