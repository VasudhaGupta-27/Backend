const mongoose = require("mongoose");
const upload = require("../middleware/upload");

const docSchema = new mongoose.Schema({
  filename: String,
  filepath: String, // file name and file path is the path where file stored
  // Document.js
  originalname: { type: String, required: true },
  user: {
    type: mongoose.Schema.Types.ObjectId, // user associated with document
    ref: "User",
    required: true,
  },
  uploadedAt: {
    // it will hold the timestamp when document is uploaded
    type: Date,
    default: Date.now,
  },
  signedFile: { type: String },
  status: {
    type: String,
    enum: ["pending", "signed", "rejected"],
    default: "pending",
  },
});

module.exports = mongoose.model("Document", docSchema);
