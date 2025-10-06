require("dotenv").config();
const express = require('express');
const passport=require("passport");
const User=require("../models/user");
const Attendance = require('../models/attendence');
const Session = require('../models/session');
const CollegeConfig = require('../models/college_config');
const { calculateDistance } = require('../utilis/check_gps_dis'); // save function above in utils

const upload = require("../middleware/multer");
const { uploadcloudinary } = require("../utilis/cloudinary");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();

// Get attendance history of a student
router.get('/history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const attendanceRecords = await Attendance.find({ studentId })
      .populate({
        path: "sessionId",
        select: "className subject createdAt",
        populate: { path: "subject", select: "subjectName subjectCode" }
      })
      .sort({ createdAt: -1 });

    if (!attendanceRecords.length) {
      return res.status(404).json({ message: 'No attendance records found.' });
    }

    res.json({ attendance: attendanceRecords });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance history.' });
  }
});


// router.post('/mark', async (req, res) => {
//   try {
//     const { studentId, sessionId, lat, lng } = req.body;

//     const session = await Session.findOne({ sessionId, status: 'active' });
//     if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//     const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//     if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

//     // ---- GPS Check (Mandatory) ----
//     let gpsValid = false;
//     if (lat && lng) {
//       const distance = calculateDistance(lat, lng, session.lat, session.lng);
//       gpsValid = distance <= 100; // within 100 meters
//     }
//     if (!gpsValid) {
//       return res.status(403).json({ error: 'You are not within the allowed class area' });
//     }

//     // ---- WiFi/IP Check (Optional) ----
//     if (session.wifiCheckEnabled) {
//       const clientIp = req.ipInfo.ip.split(",")[0].trim(); // ✅ only first IP
//       if (!session.allowedIps.includes(clientIp)) {
//         return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
//       }
//     }

//     // Save attendance
//     const newAttendance = new Attendance({
//       studentId,
//       sessionId,
//       markedAt: new Date(),
//       ip: req.ipInfo.ip.split(",")[0].trim() // ✅ store only first IP
//     });
//     await newAttendance.save();

//     res.json({
//       message: 'Attendance marked successfully!',
//       gpsValid,
//       ip: req.ipInfo.ip.split(",")[0].trim()
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to mark attendance' });
//   }
// });

// router.post('/mark', async (req, res) => {  used in server ******
//   try {
//     const { studentId, sessionId, lat, lng } = req.body;

//     const session = await Session.findOne({ sessionId, status: 'active' });
//     if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//     const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//     if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

//     // ---- GPS Check (Mandatory) ----
//     let gpsValid = false;
//     if (lat && lng) {
//       const distance = calculateDistance(lat, lng, session.lat, session.lng);
//       gpsValid = distance <= 100; // within 100 meters
//     }
//     if (!gpsValid) {
//       return res.status(403).json({ error: 'You are not within the allowed class area' });
//     }

//     // ---- WiFi/IP Check (Optional) ----
//     if (session.wifiCheckEnabled) {
//       const clientIp = req.ipInfo.ip.split(",")[0].trim(); // ✅ only first IP
//       if (!session.allowedIps.includes(clientIp)) {
//         return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
//       }
//     }

//     // ---- Save attendance in Attendance collection ----
//     const newAttendance = new Attendance({
//       studentId,
//       sessionId,
//       markedAt: new Date(),
//       ip: req.ipInfo.ip.split(",")[0].trim()
//     });
//     await newAttendance.save();

//     // ---- Also update Session.students[] (no duplicates) ----
//     const student = await User.findById(studentId).select("name email");
//     if (student) {
//       await Session.updateOne(
//         { sessionId },
//         {
//           $addToSet: {
//             students: {
//               id: student._id,
//               name: student.name,
//               email: student.email,
//             },
//           },
//         }
//       );
//     }

//     res.json({
//       message: 'Attendance marked successfully!',
//       gpsValid,
//       ip: req.ipInfo.ip.split(",")[0].trim()
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to mark attendance' });
//   }
// });

router.post(
  '/mark',
  upload.single("liveImage"), // Expect live image file from frontend
  async (req, res) => {
    try {
      const { studentId, sessionId, lat, lng } = req.body;

      // 1️⃣ Validate session
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

      // 2️⃣ Check if already marked
      const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
      if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

      // 3️⃣ GPS check
      let gpsValid = false;
      if (lat && lng) {
        const distance = calculateDistance(lat, lng, session.lat, session.lng);
        gpsValid = distance <= 100;
      }
      if (!gpsValid) return res.status(403).json({ error: 'You are not within the allowed class area' });

      // 4️⃣ WiFi/IP check (optional)
      if (session.wifiCheckEnabled) {
        const clientIp = req.ipInfo.ip.split(",")[0].trim();
        if (!session.allowedIps.includes(clientIp)) {
          return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
        }
      }

      // 5️⃣ Fetch student face encoding
      const student = await User.findById(studentId);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (!student.faceEncoding || student.faceEncoding.length === 0) {
        return res.status(400).json({ error: 'No face encoding stored for this student' });
      }

      // 6️⃣ Send live image + stored encoding to Flask
      let faceResult = null;
      if (req.file) {
        const form = new FormData();
        form.append("profileEncoding", JSON.stringify(student.faceEncoding)); // stored encoding
        form.append("liveImage", fs.createReadStream(req.file.path));

        const flaskRes = await axios.post(
          process.env.FLASK_SERVICE_URL + "/verify-face",
          form,
          { headers: form.getHeaders() }
        );

        faceResult = flaskRes.data;

        // Delete temp live image
        try { fs.unlinkSync(req.file.path); } catch (e) { console.warn(e); }

        if (!faceResult.match) {
          return res.status(403).json({ error: 'Face verification failed', confidence: faceResult.confidence });
        }
      } else {
        return res.status(400).json({ error: 'Live image is required for face verification' });
      }

      // 7️⃣ Save attendance
      const newAttendance = new Attendance({
        studentId,
        sessionId,
        markedAt: new Date(),
        ip: req.ipInfo.ip.split(",")[0].trim(),
        faceVerified: faceResult.match,
        faceConfidence: faceResult.confidence
      });
      await newAttendance.save();

      // 8️⃣ Update Session.students[] (no duplicates)
      await Session.updateOne(
        { sessionId },
        { $addToSet: { students: { id: student._id, name: student.name, email: student.email } } }
      );

      res.json({
        message: 'Attendance marked successfully!',
        gpsValid,
        ip: req.ipInfo.ip.split(",")[0].trim(),
        faceVerified: faceResult.match,
        confidence: faceResult.confidence
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  }
);


///////////////////////////////////////////////////////////// working postion 

// router.post(
//   '/mark',
//   upload.single("liveImage"), // Expect live image file from frontend
//   async (req, res) => {
//     try {
//       const { studentId, sessionId, lat, lng } = req.body;

//       // 1️⃣ Validate session
//       const session = await Session.findOne({ sessionId, status: 'active' });
//       if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//       // 2️⃣ Check if already marked
//       const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//       if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

//       // 3️⃣ GPS check
//       let gpsValid = false;
//       if (lat && lng) {
//         const distance = calculateDistance(lat, lng, session.lat, session.lng);
//         gpsValid = distance <= 100;
//       }
//       if (!gpsValid) return res.status(403).json({ error: 'You are not within the allowed class area' });

//       // 4️⃣ WiFi/IP check (optional)
//       if (session.wifiCheckEnabled) {
//         const clientIp = req.ipInfo.ip.split(",")[0].trim();
//         if (!session.allowedIps.includes(clientIp)) {
//           return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
//         }
//       }

//       // 5️⃣ Fetch student profile image
//       const student = await User.findById(studentId);
//       if (!student) return res.status(404).json({ error: 'Student not found' });

//       // 6️⃣ Send live image + profile image to Flask microservice
//       let faceResult = null;
//       if (req.file) {
//         const form = new FormData();
//         form.append("profileImageUrl", student.avatar); // profile image URL
//         form.append("liveImage", fs.createReadStream(req.file.path)); // live image file

//         const flaskRes = await axios.post(
//           process.env.FLASK_SERVICE_URL + "/verify-face", // set your Flask API URL in .env
//           form,
//           { headers: form.getHeaders() }
//         );

//         faceResult = flaskRes.data; // expected: { match: true/false, confidence: 0.9, etc. }

//         // Delete temp live image
//         try { fs.unlinkSync(req.file.path); } catch (e) { console.warn(e); }

//         if (!faceResult.match) {
//           return res.status(403).json({ error: 'Face verification failed', confidence: faceResult.confidence });
//         }
//       } else {
//         return res.status(400).json({ error: 'Live image is required for face verification' });
//       }

//       // 7️⃣ Save attendance
//       const newAttendance = new Attendance({
//         studentId,
//         sessionId,
//         markedAt: new Date(),
//         ip: req.ipInfo.ip.split(",")[0].trim(),
//         faceVerified: faceResult.match,
//         faceConfidence: faceResult.confidence
//       });
//       await newAttendance.save();

//       // 8️⃣ Update Session.students[] (no duplicates)
//       await Session.updateOne(
//         { sessionId },
//         { $addToSet: { students: { id: student._id, name: student.name, email: student.email } } }
//       );

//       res.json({
//         message: 'Attendance marked successfully!',
//         gpsValid,
//         ip: req.ipInfo.ip.split(",")[0].trim(),
//         faceVerified: faceResult.match,
//         confidence: faceResult.confidence
//       });

//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to mark attendance' });
//     }
//   }
// );

//testing purpose
// router.post(
//   '/mark',
//   upload.single("liveImage"), // expect live image from frontend
//   async (req, res) => {
//     try {
//       const { studentId, sessionId, lat, lng } = req.body;

//       const session = await Session.findOne({ sessionId, status: 'active' });
//       if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//       const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//       if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

//       // ---- GPS check ----
//       let gpsValid = false;
//       if (lat && lng) {
//         const distance = calculateDistance(lat, lng, session.lat, session.lng);
//         gpsValid = distance <= 100;
//       }
//       if (!gpsValid) return res.status(403).json({ error: 'You are not within the allowed class area' });

//       // ---- WiFi/IP check ----
//       if (session.wifiCheckEnabled) {
//         const clientIp = req.ipInfo.ip.split(",")[0].trim();
//         if (!session.allowedIps.includes(clientIp)) {
//           return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
//         }
//       }

//       // ---- Mock face verification ----
//       let faceResult = { match: true, confidence: 0.99 }; // ✅ simulate success for testing

//       // Optionally save live image to Cloudinary (just for testing upload)
//       let liveImageUrl = null;
//       if (req.file) {
//         const result = await uploadcloudinary(req.file.path);
//         liveImageUrl = result.secure_url;

//         // delete temp file
//         try { fs.unlinkSync(req.file.path); } catch (e) { console.warn(e); }
//       }

//       // ---- Save attendance ----
//       const newAttendance = new Attendance({
//         studentId,
//         sessionId,
//         markedAt: new Date(),
//         ip: req.ipInfo.ip.split(",")[0].trim(),
//         faceVerified: faceResult.match,
//         faceConfidence: faceResult.confidence,
//         liveImage: liveImageUrl
//       });
//       await newAttendance.save();

//       // ---- Update session.students ----
//       const student = await User.findById(studentId).select("name email");
//       if (student) {
//         await Session.updateOne(
//           { sessionId },
//           { $addToSet: { students: { id: student._id, name: student.name, email: student.email } } }
//         );
//       }

//       res.json({
//         message: 'Attendance marked successfully (mock face verification)!',
//         gpsValid,
//         ip: req.ipInfo.ip.split(",")[0].trim(),
//         faceVerified: faceResult.match,
//         confidence: faceResult.confidence,
//         liveImage: liveImageUrl
//       });

//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to mark attendance' });
//     }
//   }
// );







module.exports = router;
