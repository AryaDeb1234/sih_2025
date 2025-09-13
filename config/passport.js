const fs = require("fs");
const path = require("path");
const user = require("../models/user");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

// Load public key for verifying JWT
const pub_key = process.env.PUBLIC_KEY
  ? process.env.PUBLIC_KEY.replace(/\\n/g, "\n")
  : fs.readFileSync(path.join(__dirname, "..", "rsa_public.pem"), "utf8");

// 🔥 Debug logs
console.log("Loaded public key:");
console.log(pub_key.slice(0, 50) + "...");
console.log("Public key ends with:");
console.log(pub_key.slice(-50));

// Options for JWT strategy
const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: pub_key,
  algorithms: ["RS256"],
};

// JWT strategy
const strategy = new JwtStrategy(options, async (payload, done) => {
  try {
    console.log("Decoded JWT payload:", payload); // 🔥 Debug

    let existingUser = await user.findById(payload.sub);
    if (existingUser) {
      console.log("User found for JWT:", existingUser._id); // 🔥 Debug
      return done(null, existingUser);
    } else {
      console.log("No user found for JWT payload"); // 🔥 Debug
      return done(null, false);
    }
  } catch (err) {
    console.error("Error in JWT strategy:", err); // 🔥 Debug
    return done(err, false);
  }
});

// Export function to initialize JWT strategy
module.exports = (passport) => {
  passport.use(strategy);
};
