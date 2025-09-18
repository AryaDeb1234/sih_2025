const express = require('express');
const passport=require("passport");
const User=require("../models/user");
const Attendance = require('../models/attendence');
const Session = require('../models/session');
const CollegeConfig = require('../models/college_config');
const { calculateDistance } = require('../utilis/check_gps_dis'); // save function above in utils

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

router.post('/mark', async (req, res) => {
  try {
    const { studentId, sessionId, lat, lng } = req.body;

    const session = await Session.findOne({ sessionId, status: 'active' });
    if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

    const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
    if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

    // ---- GPS Check (Mandatory) ----
    let gpsValid = false;
    if (lat && lng) {
      const distance = calculateDistance(lat, lng, session.lat, session.lng);
      gpsValid = distance <= 100; // within 100 meters
    }
    if (!gpsValid) {
      return res.status(403).json({ error: 'You are not within the allowed class area' });
    }

    // ---- WiFi/IP Check (Optional) ----
    if (session.wifiCheckEnabled) {
      const clientIp = req.ipInfo.ip.split(",")[0].trim(); // ✅ only first IP
      if (!session.allowedIps.includes(clientIp)) {
        return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
      }
    }

    // ---- Save attendance in Attendance collection ----
    const newAttendance = new Attendance({
      studentId,
      sessionId,
      markedAt: new Date(),
      ip: req.ipInfo.ip.split(",")[0].trim()
    });
    await newAttendance.save();

    // ---- Also update Session.students[] (no duplicates) ----
    const student = await User.findById(studentId).select("name email");
    if (student) {
      await Session.updateOne(
        { sessionId },
        {
          $addToSet: {
            students: {
              id: student._id,
              name: student.name,
              email: student.email,
            },
          },
        }
      );
    }

    res.json({
      message: 'Attendance marked successfully!',
      gpsValid,
      ip: req.ipInfo.ip.split(",")[0].trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
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
//       const clientIp = req.ipInfo.ip;
//       if (clientIp !== session.allowedIp) {
//         return res.status(403).json({ error: 'You are not connected to the allowed WiFi network' });
//       }
//     }

//     // Save attendance
//     const newAttendance = new Attendance({
//       studentId,
//       sessionId,
//       markedAt: new Date(),
//       ip: req.ipInfo.ip
//     });
//     await newAttendance.save();

//     res.json({ message: 'Attendance marked successfully!', gpsValid, ip: req.ipInfo.ip });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to mark attendance' });
//   }
// });




// router.post('/mark', async (req, res) => {
//   const { studentId, sessionId } = req.body;

//   const session = await Session.findOne({ sessionId, status: 'active' });
//   if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//   const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//   if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });
  
//   //console.log("id :-  "+session._id );
  
// const newAttendance = new Attendance({
//   studentId,
//   sessionId  // keep as string
// });
// await newAttendance.save();
 
//   res.json({ message: 'Attendance marked successfully!' });
// });


// router.post('/mark', async (req, res) => {
//   try {
//     const { studentId, sessionId, lat, lng } = req.body;

//     const session = await Session.findOne({ sessionId, status: 'active' });
//     if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });

//     const alreadyMarked = await Attendance.findOne({ studentId, sessionId });
//     if (alreadyMarked) return res.status(400).json({ error: 'Attendance already marked' });

//     // Load college config (just 1 document for now)
//     const config = await CollegeConfig.findOne();
//     if (!config) return res.status(500).json({ error: 'College config missing' });

//     // ---- WiFi Check ----
//     const clientIp = req.clientIp; 
//     const ipValid = config.wifiRanges.some(range => clientIp.startsWith(range));

//     // ---- GPS Check ----
//     let gpsValid = false;
//     if (lat && lng) {
//       const distance = calculateDistance(
//         lat, lng,
//         config.campusLocation.lat,
//         config.campusLocation.lng
//       );
//       gpsValid = distance <= config.radiusMeters;
//     }

//     if (!ipValid && !gpsValid) {
//       return res.status(403).json({ error: 'Not in campus WiFi or GPS area' });
//     }

//     // Save attendance
//     const newAttendance = new Attendance({
//       studentId,
//       sessionId,
//       markedAt: new Date()
//     });
//     await newAttendance.save();

//     res.json({ message: 'Attendance marked successfully!', ipValid, gpsValid });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to mark attendance' });
//   }
// });


module.exports = router;
