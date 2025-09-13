const express = require('express');

const router = express.Router();

// Get attendance history of a student
router.get('/', async (req, res) => {
  return res.json("api is working")  
});



module.exports = router;
