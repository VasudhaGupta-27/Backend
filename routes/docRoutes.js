const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");
const uploadDocument = require("../controllers/docController");
const Signature = require("../models/Signature");
const Document = require("../models/Document");
const fs = require("fs");
const path = require("path");

router.post("/upload", auth, upload.single("pdf"), uploadDocument);
router.get("/", auth, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user }).sort({
      uploadedAt: -1,
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});
router.get("/pending", auth, async (req, res) => {
  try {
    const pendingSignatures = await Signature.find({
      signer: req.user,
      status: "pending",
    });

    const docIds = [
      ...new Set(pendingSignatures.map((sig) => sig.file.toString())),
    ];

    const docs = await Document.find({ _id: { $in: docIds } }).sort({
      uploadedAt: -1,
    });

    res.json(docs);
  } catch (error) {
    console.error("Pending docs error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});
router.get("/signed", auth, async (req, res) => {
  try {
    const signedSignatures = await Signature.find({
      signer: req.user,
      status: "signed",
    });

    const docIds = [
      ...new Set(signedSignatures.map((sig) => sig.file.toString())),
    ];

    // Fetch documents and include signedFile
    const docs = await Document.find({
      _id: { $in: docIds },
      signedFile: { $exists: true, $ne: null },
    })
      .select("originalname uploadedAt signedFile") // <-- ensure signedFile is included
      .sort({ uploadedAt: -1 });

    res.json(docs);
  } catch (error) {
    console.error("Signed docs error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});
router.get("/rejected", auth, async (req, res) => {
  try {
    // Find all rejected signatures for this user
    const rejectedSignatures = await Signature.find({
      signer: req.user,
      status: "rejected",
    });

    // Get unique document IDs
    const docIds = [
      ...new Set(rejectedSignatures.map((sig) => sig.file.toString())),
    ];

    // Fetch the documents
    const docs = await Document.find({ _id: { $in: docIds } }).sort({
      uploadedAt: -1,
    });

    // Attach rejectReason to each doc (from the first matching signature)
    const docsWithReason = docs.map((doc) => {
      const sig = rejectedSignatures.find(
        (s) => s.file.toString() === doc._id.toString()
      );
      return {
        ...doc.toObject(),
        rejectReason: sig ? sig.rejectReason : "",
      };
    });

    res.json(docsWithReason);
    console.log(docsWithReason);
    
  } catch (error) {
    console.error("Rejected docs error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// DELETE /api/docs/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: "Document not found" });

    // Delete all signatures related to this document
    await Signature.deleteMany({ file: doc._id });

    // Delete signed PDF file if exists
    if (doc.signedFile) {
      const signedPath = path.join(__dirname, "..", doc.signedFile);
      if (fs.existsSync(signedPath)) {
        fs.unlinkSync(signedPath);
      }
    }

    // Optionally delete the original PDF file as well
    if (doc.filepath) {
      const origPath = path.join(__dirname, "..", doc.filepath);
      if (fs.existsSync(origPath)) {
        fs.unlinkSync(origPath);
      }
    }

    // Delete the document itself
    await doc.deleteOne();

    res.json({ msg: "Document and related data deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ msg: "Failed to delete document" });
  }
});

router.delete("/signed/:id", auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: "Document not found" });

    // Delete signed PDF file from local storage
    if (doc.signedFile) {
      const signedPath = path.join(__dirname, "..", doc.signedFile);
      if (fs.existsSync(signedPath)) {
        fs.unlinkSync(signedPath);
      }
      doc.signedFile = undefined;
      await doc.save();
    }

    res.json({ msg: "Signed PDF deleted" });
  } catch (error) {
    console.error("Signed PDF delete error:", error);
    res.status(500).json({ msg: "Failed to delete signed PDF" });
  }
});

module.exports = router;
