
var multer = require("multer");

const fs = require("fs");
const path = require("path");

const uploadPath = path.join(__dirname, "../public/temp");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true }); 
}

const storage = multer.diskStorage({
   destination: function (req, file, cb) {
    cb(null, uploadPath); 
  },

  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });


module.exports = upload;
