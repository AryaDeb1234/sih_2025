const express = require('express');
const passport = require("passport"); //  use passport for JWT auth
const User = require("../models/user");
const QRCode = require('qrcode');
const Session = require('../models/session');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');


// Get session details by sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving session' });
  }
});

router.post(
  '/create',
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.role !== "teacher") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { className, subjectId, lat, lng, wifiCheckEnabled } = req.body;

      // Normalize IPs into array
      let allowedIps = [];
      if (wifiCheckEnabled && req.ipInfo?.ip) {
        allowedIps = req.ipInfo.ip
          .split(",")        // split comma-separated
          .map(ip => ip.trim()); // remove spaces
      }

      const newSession = new Session({
        sessionId: uuidv4(),
        className,
        subject: subjectId,
        lat,
        lng,
        status: 'active',
        wifiCheckEnabled,
        allowedIps,
        teacher: req.user._id
      });

      await newSession.save();

      QRCode.toDataURL(newSession.sessionId, (err, url) => {
        if (err) return res.status(500).json({ error: 'QR generation failed' });

        res.json({
          message: 'Session created successfully!',
          qrImage: url,
          sessionId: newSession.sessionId,
          session: newSession
        });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
);




// router.post(
//   '/create',
//   passport.authenticate("jwt", { session: false }),
//   async (req, res) => {
//     try {
//       if (req.user.role !== "teacher") {
//         return res.status(403).json({ error: "Access denied" });
//       }

//       const { className, subjectId, lat, lng, wifiCheckEnabled } = req.body;

//       const allowedIp = wifiCheckEnabled ? req.ipInfo.ip : null;

//       //  Create new session with sessionId and teacher reference
//       const newSession = new Session({
//         sessionId: uuidv4(),
//         className,
//         subject: subjectId,     // subject ref
//         lat,
//         lng,
//         status: 'active',
//         wifiCheckEnabled,
//         allowedIp,
//         teacher: req.user._id   // store teacher id
//       });

//       await newSession.save();

//       //  Generate QR code from sessionId
//       QRCode.toDataURL(newSession.sessionId, (err, url) => {
//         if (err) return res.status(500).json({ error: 'QR generation failed' });

//         res.json({
//           message: 'Session created successfully!',
//           qrImage: url,
//           sessionId: newSession.sessionId,
//           session: newSession
//         });
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to create session' });
//     }
//   }
// );



// End session manually
router.post('/end', async (req, res) => {
  const { sessionId } = req.body;

  const session = await Session.findOneAndUpdate(
    { sessionId },
    { status: 'inactive' },
    { new: true }
  );

  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({ message: 'Session ended successfully!', session });
});


// router.post('/create', async (req, res) => {
//   const { className, subjectId } = req.body;

//   const newSession = new Session({
//     sessionId: uuidv4(),
//     className,
//     subject: subjectId   // store ObjectId
//   });

//   await newSession.save();

//   QRCode.toDataURL(newSession.sessionId, (err, url) => {
//     if (err) return res.status(500).json({ error: 'QR generation failed' });
//     res.json({ qrImage: url, sessionId: newSession.sessionId });
//   });
// });

module.exports = router;
