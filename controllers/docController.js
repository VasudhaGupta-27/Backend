const Document = require("../models/Document");

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      // if there is no file in req than it will give error
      return res.status(400).json({ msg: "No file uploaded" });
    }
    
    const newDoc = new Document({
      // if there is a file, than map its attributes with schema
      filename: req.file.filename,
      originalname: req.file.originalname, // <-- add this
      filepath: req.file.path,
      user: req.user,
    });
    await newDoc.save(); // save the file in db
    res.status(201).json({ msg: "File uploaded", doc: newDoc });
  } catch (err) {
    res.status(500).json({ msg: "Upload failed", error: err.message });
  }
};

module.exports = uploadDocument;
