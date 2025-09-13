const express = require("express");
const passport = require("passport"); // ✅ use passport for JWT auth
const User = require("../models/user");
const Subject=require("../models/subject");
const { genpassword } = require("../lib/passwordutilis");
const CollegeConfig = require("../models/college_config");

const router = express.Router();

// Create teacher or student
router.post(
  "/create-user",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { name, email, role, subjects } = req.body;
      // subjects should be array of subjectIds for teacher

      if (!["teacher", "student"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Role must be teacher or student" });
      }
      if (!name) {
        return res.status(400).json({error:"Name is required"});
      }
      // Generate temporary password in plain text
      const tempPassword = Math.random().toString(36).slice(-8);

      const newUser = new User({
        name,
        email,
        role,
        department: req.body.department,
        semester: role === "student" ? req.body.semester : undefined,
        year: role === "student" ? req.body.year : undefined,
        subjects: role === "teacher" ? subjects : [], // store subjectIds
        password: tempPassword,
        isPasswordChanged: false,
      });

      await newUser.save();

      res.json({
        message: "User created successfully",
        email: newUser.email,
        tempPassword,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// Admin resets a user's password by email
router.post(
  "/reset-password",
  passport.authenticate("jwt", { session: false }), // only logged-in users
  async (req, res) => {
    try {
      // Only admin can reset passwords
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { email, tempPassword } = req.body;
      if (!email || !tempPassword) {
        return res
          .status(400)
          .json({ error: "email and tempPassword are required" });
      }

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Set new plain password
      user.password = tempPassword;
      user.isPasswordChanged = false; // force first login change

      await user.save();

      res.json({
        message: "Password reset successfully",
        email: user.email,
        tempPassword,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

// Configure college (wifi, location, radius)
router.post(
  "/college-config",
  passport.authenticate("jwt", { session: false }), // ✅ protect route with Passport
  async (req, res) => {
    try {
      // Only admin can update college config
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const config = await CollegeConfig.findOneAndUpdate({}, req.body, {
        upsert: true,
        new: true,
      });
      res.json({ message: "College config updated", config });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update config" });
    }
  }
);

module.exports = router;
