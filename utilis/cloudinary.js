require("dotenv").config();

const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.cloudinary_cloud_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret,
});

const uploadoncloudinary = async (localfilepath) => {
  if (!localfilepath) return null;

  try {
    // Upload to Cloudinary
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });

    console.log("File is uploaded on Cloudinary:", response.url);

    return response;
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return null;
  } finally {
    // Always try to delete the temp file
    if (fs.existsSync(localfilepath)) {
      fs.unlinkSync(localfilepath);
    } else {
      console.warn("Temp file not found for deletion:", localfilepath);
    }
  }
};

module.exports = {
  uploadcloudinary: uploadoncloudinary,
};
