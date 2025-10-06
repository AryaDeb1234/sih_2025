const express = require("express");
const passport = require("passport"); //  use passport for JWT auth
const User = require("../models/user");
const Subject = require("../models/subject");
const { genpassword } = require("../lib/passwordutilis");
const CollegeConfig = require("../models/college_config");


const axios = require("axios");
const FormData = require("form-data");
const upload = require("../middleware/multer");
const { uploadcloudinary } = require("../utilis/cloudinary");
const fs = require("fs");

const router = express.Router();

// Create teacher or student
// router.post(
//   "/create-user",
//   passport.authenticate("jwt", { session: false }),
//   async (req, res) => {
//     try {
//       if (req.user.role !== "admin") {
//         return res.status(403).json({ error: "Access denied" });
//       }

//       const { name, email, role, subjects } = req.body;
//       // subjects should be array of subjectIds for teacher

//       var check=User.find({"email":email});
//       // if(check){
//       //   return res.status(401).json({error:"User already exist"});
//       // }

//       if (!["teacher", "student","admin"].includes(role)) {
//         return res
//           .status(400)
//           .json({ error: "Role must be teacher or student or admin" });
//       }
//       if (!name) {
//         return res.status(400).json({error:"Name is required"});
//       }
//       // Generate temporary password in plain text
//       const tempPassword = Math.random().toString(36).slice(-8);

//       const newUser = new User({
//         name,
//         email,
//         role,
//         department: req.body.department,
//         semester: role === "student" ? req.body.semester : undefined,
//         year: role === "student" ? req.body.year : undefined,
//         subjects: role === "teacher" ? subjects : [], // store subjectIds
//         password: tempPassword,
//         isPasswordChanged: false,
//       });

//       await newUser.save();

//       res.json({
//         message: "User created successfully",
//         email: newUser.email,
//         tempPassword,
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: "Failed to create user or user / email already exist" });
//     }
//   }
// );

// router.post(     /////2
//   "/create-user",
//   passport.authenticate("jwt", { session: false }),
//   upload.single("avatar"), // ✅ allow image upload
//   async (req, res) => {
//     try {
//       if (req.user.role !== "admin") {
//         return res.status(403).json({ error: "Access denied" });
//       }

//       const { name, email, role, subjects } = req.body;

//       // ✅ Check role
//       if (!["teacher", "student", "admin"].includes(role)) {
//         return res
//           .status(400)
//           .json({ error: "Role must be teacher, student, or admin" });
//       }

//       if (!name || !email) {
//         return res.status(400).json({ error: "Name and email are required" });
//       }

//       // 🔹 Upload avatar if provided
//       let avatarUrl =
//         "https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small_2x/default-avatar-profile-icon-of-social-media-user-vector.jpg";

//       if (req.file && role === "student") {//*********working  */
//         // only students will have face image stored
//         const result = await uploadcloudinary(req.file.path);
//         avatarUrl = result.secure_url;

//         // delete local temp file
//         try {
//           fs.unlinkSync(req.file.path);
//         } catch (e) {
//           console.warn("File not found for deletion:", req.file.path);
//         }
//       }

//       // if (req.file && role === "student") {
//       //   // 1️⃣ Upload avatar to Cloudinary
//       //   const result = await uploadcloudinary(req.file.path);
//       //   avatarUrl = result.secure_url;

//       //   // 2️⃣ Call Flask microservice to get face encoding
//       //   const form = new FormData();
//       //   form.append("profileImage", fs.createReadStream(req.file.path));

//       //   const flaskRes = await axios.post(
//       //     process.env.FLASK_SERVICE_URL + "/encode-face",
//       //     form,
//       //     { headers: form.getHeaders() }
//       //   );

//       //   const faceEncoding = flaskRes.data.encoding; // array of floats

//       //   // 3️⃣ Save encoding to DB
//       //   newUser.faceEncoding = faceEncoding;

//       //   // 4️⃣ Delete local temp file
//       //   try {
//       //     fs.unlinkSync(req.file.path);
//       //   } catch (e) {
//       //     console.warn(e);
//       //   }
//       // }

//       // ✅ Generate temporary password
//       const tempPassword = Math.random().toString(36).slice(-8);

//       // ✅ Create new user
//       const newUser = new User({
//         name,
//         email,
//         role,
//         department: req.body.department,
//         semester: role === "student" ? req.body.semester : undefined,
//         year: role === "student" ? req.body.year : undefined,
//         subjects: role === "teacher" ? subjects : [],
//         password: tempPassword,
//         isPasswordChanged: false,
//         avatar: role === "student" ? avatarUrl : undefined, // store avatar only for student
//       });

//       await newUser.save();

//       res.json({
//         message: "User created successfully",
//         email: newUser.email,
//         tempPassword,
//         avatar: newUser.avatar,
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: "Failed to create user" });
//     }
//   }
// );


router.post(
  "/create-user",
  passport.authenticate("jwt", { session: false }),
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { name, email, role, subjects, department, semester, year } = req.body;

      if (!["teacher", "student", "admin"].includes(role)) {
        return res.status(400).json({ error: "Role must be teacher, student, or admin" });
      }
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // ✅ Default avatar
      let avatarUrl =
        "https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small_2x/default-avatar-profile-icon-of-social-media-user-vector.jpg";

      // ✅ If student uploaded avatar → upload to Cloudinary
      if (req.file && role === "student") {
        const result = await uploadcloudinary(req.file.path);
        avatarUrl = result.secure_url;
      }

      // ✅ Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      // ✅ Create user object
      const newUser = new User({
        name,
        email,
        role,
        department,
        semester: role === "student" ? semester : undefined,
        year: role === "student" ? year : undefined,
        subjects: role === "teacher" ? subjects : [],
        password: tempPassword,
        isPasswordChanged: false,
        avatar: role === "student" ? avatarUrl : undefined,
      });

      // ✅ Face encoding (only for students)
      if (role === "student" && avatarUrl) {
        try {
          console.log("📡 Calling Flask service at:", process.env.FLASK_SERVICE_URL || "http://localhost:3001");

          // Directly send the Cloudinary URL to Flask
          const flaskRes = await axios.post(
            (process.env.FLASK_SERVICE_URL || "http://localhost:3001") + "/encode-face",
            { image_url: avatarUrl }
          );

          if (flaskRes.data && Array.isArray(flaskRes.data.encoding)) {
            newUser.faceEncoding = flaskRes.data.encoding;
            console.log("✅ Flask encoding success, length:", newUser.faceEncoding.length);
          } else {
            console.warn("⚠️ Flask returned no encoding, using empty array");
            newUser.faceEncoding = [];
          }
        } catch (err) {
          console.warn("❌ Flask encoding failed:", err.response?.data || err.message);
          newUser.faceEncoding = [];
        }
      }

      // ✅ Save user in MongoDB
      await newUser.save();

      res.status(201).json({
        message: "User created successfully",
        email: newUser.email,
        tempPassword,
        avatar: newUser.avatar,
        faceEncodingLength: newUser.faceEncoding?.length || 0,
      });
    } catch (err) {
      console.error("🔥 Error creating user:", err);
      res.status(500).json({ error: "Failed to create user", details: err.message });
    } finally {
      // ✅ Cleanup local uploaded file (if exists)
      if (req.file?.path) {
        fs.unlink(req.file.path, (e) => e && console.warn("Failed to delete temp file:", req.file.path));
      }
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
