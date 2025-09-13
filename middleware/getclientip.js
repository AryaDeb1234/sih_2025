// middleware/getClientIp.js

const normalizeIp=require("../middleware/normalize_ip");

module.exports = (req, res, next) => {
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip=normalizeIp(ip);
  console.log("Client IP:", ip);
  req.clientIp = ip.replace("::ffff:", ""); // clean IPv6 prefix if present
  next();
};
