const express = require("express");
const User = require("../models/user");
const { validpassword, genpassword, issuejwt } = require("../lib/passwordutilis");

const router = express.Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  if (!user.isPasswordChanged) {
  if (password !== user.password) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  return res.json({ 
    message: "First login, change your password", 
    forcePasswordChange: true,
    userId: user._id 
  });
} else {
    // normal login
    if (!validpassword(password, user.password, user.salt)) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // generate JWT
    const tokenData = issuejwt(user);
    return res.json({ token: tokenData.token, user });
  }
});

// POST /auth/force-change-password
router.post("/force-change-password", async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "userId and newPassword are required" });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { salt, hash } = genpassword(newPassword);
  user.password = hash;
  user.salt = salt;
  user.isPasswordChanged = true;

  await user.save();
  res.json({ message: "Password changed successfully" });
});

module.exports = router;
