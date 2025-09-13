 const mongoose = require('mongoose');
 const Subject = require("./subject");

// const sessionSchema = new mongoose.Schema({
//   sessionId: { type: String, required: true, unique: true },
//   className: String,
//   // subject: String,
//   subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" }, // ref instead of string
//   status: { type: String, default: 'active' }, // active or inactive
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Session', sessionSchema);

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  className: String,
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  status: { type: String, default: 'active' }, 
  createdAt: { type: Date, default: Date.now },

  // 📍 Store teacher's location when session/QR is created
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  wifiCheckEnabled: { type: Boolean, default: false },
  allowedIp: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

module.exports = mongoose.model('Session', sessionSchema);
