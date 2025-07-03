const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/authMiddleware");
const Signature = require("../models/Signature");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const Document = require("../models/Document");
const fontkit = require("@pdf-lib/fontkit");
// For Aduit Log
const captureIP = require("../middleware/captureIP");

router.post("/place", auth, captureIP, async (req, res) => {
  try {
    const {
      fileId,
      pageNumber,
      xCoordinate,
      yCoordinate,
      signature,
      font,
      renderedPageHeight,
      renderedPageWidth,
    } = req.body;

    // Enhanced validation
    if (
      !fileId ||
      pageNumber == null ||
      xCoordinate == null ||
      yCoordinate == null ||
      !signature ||
      renderedPageHeight == null
    ) {
      return res.status(400).json({
        success: false,
        msg: "Missing required fields",
        required: {
          fileId: !!fileId,
          pageNumber: pageNumber != null,
          xCoordinate: xCoordinate != null,
          yCoordinate: yCoordinate != null,
          signature: !!signature,
          renderedPageHeight: renderedPageHeight != null,
        },
      });
    }

    // Convert and validate numbers
    const x = parseFloat(xCoordinate);
    const y = parseFloat(yCoordinate);
    const renderedHeight = parseFloat(renderedPageHeight);

    if (isNaN(x) || isNaN(y) || isNaN(renderedHeight)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid numeric values",
        details: {
          xCoordinate: xCoordinate,
          yCoordinate: yCoordinate,
          renderedPageHeight: renderedPageHeight,
        },
      });
    }

    // Get document and verify existence
    const document = await Document.findById(fileId);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, msg: "Document not found" });
    }

    // Load PDF and verify page
    const pdfPath = path.join(__dirname, "..", document.filepath);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    if (pageNumber < 1 || pageNumber > pages.length) {
      return res.status(400).json({
        success: false,
        msg: "Invalid page number",
        pageCount: pages.length,
      });
    }

    const page = pages[pageNumber - 1];
    const pdfPageHeight = page.getHeight();
    const pdfPageWidth = page.getWidth();

    // Calculate scaling factors
    const heightScale = pdfPageHeight / renderedHeight;
    let widthScale = heightScale; // Assume proportional scaling

    if (renderedPageWidth) {
      widthScale = pdfPageWidth / parseFloat(renderedPageWidth);
    }

    // Convert coordinates
    const pdfX = x * widthScale;
    const pdfY = pdfPageHeight - y * heightScale; // Convert from top-left to bottom-left origin

    // Boundary checking
    if (pdfX < 0 || pdfX > pdfPageWidth || pdfY < 0 || pdfY > pdfPageHeight) {
      return res.status(400).json({
        success: false,
        msg: "Signature position outside page bounds",
        bounds: {
          x: { min: 0, max: pdfPageWidth, value: pdfX },
          y: { min: 0, max: pdfPageHeight, value: pdfY },
        },
      });
    }

    // Remove previous signatures
    await Signature.deleteMany({
      file: fileId,
      signer: req.user,
    });
    console.log(req.signerIp);

    // Create new signature
    const newSignature = new Signature({
      file: fileId,
      signer: req.user,
      pageNumber,
      xCoordinate: x,
      yCoordinate: y,
      signature,
      font,
      pdfPageHeight,
      pdfPageWidth,
      renderedPageHeight: renderedHeight,
      renderedPageWidth: renderedPageWidth
        ? parseFloat(renderedPageWidth)
        : null,
      ipAddress: req.signerIp,
      status: "pending",
    });

    await newSignature.save();

    res.json({
      success: true,
      msg: "Signature placed successfully",
      data: {
        pdfCoordinates: { x: pdfX, y: pdfY },
        browserCoordinates: { x, y },
        pageDimensions: {
          pdf: { width: pdfPageWidth, height: pdfPageHeight },
          rendered: { height: renderedHeight, width: renderedPageWidth },
        },
        scaleFactors: { width: widthScale, height: heightScale },
      },
    });
  } catch (error) {
    console.error("Signature placement error:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
});

// GET all signatures for a specific file
router.get("/file/:fileId", auth, async (req, res) => {
  try {
    const signatures = await Signature.find({
      file: req.params.fileId,
      status: "pending",
    });
    res.json(signatures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Failed to fetch signatures" });
  }
});

// New Finalize Singed PDF
router.post("/finalize", auth, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ msg: "Missing file" });
    }
    const document = await Document.findById(fileId);
    if (!document) {
      return res.status(400).json({ msg: "Document not found" });
    } // Fetch pending signatures

    const signaure = await Signature.find({ 
      file: fileId, 
      status: { $in: ["pending", "signed"] } 
    });

    // Load the orignal path from uploads folder
    const orignalPath = path.join(__dirname, "..", document.filepath);

    //It's like taking the PDF file from your computer and putting all its content into a variable.
    const existingPDfBytes = fs.readFileSync(orignalPath);
    const pdfDoc = await PDFDocument.load(existingPDfBytes);
    pdfDoc.registerFontkit(fontkit);

    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const availableFonts = {
      "Great Vibes": fs.readFileSync(
        path.join(__dirname, "..", "fonts", "GreatVibes-Regular.ttf")
      ),
      "Dancing Script": fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "fonts",
          "DancingScript-VariableFont_wght.ttf"
        )
      ),
      Pacifico: fs.readFileSync(
        path.join(__dirname, "..", "fonts", "Pacifico-Regular.ttf")
      ),
      Satisfy: fs.readFileSync(
        path.join(__dirname, "..", "fonts", "Satisfy-Regular.ttf")
      ),
      "Shadows Into Light": fs.readFileSync(
        path.join(__dirname, "..", "fonts", "ShadowsIntoLight-Regular.ttf")
      ),
      Caveat: fs.readFileSync(
        path.join(__dirname, "..", "fonts", "Caveat-VariableFont_wght.ttf")
      ),
      "Homemade Apple": fs.readFileSync(
        path.join(__dirname, "..", "fonts", "HomemadeApple-Regular.ttf")
      ),
      "Indie Flower": fs.readFileSync(
        path.join(__dirname, "..", "fonts", "IndieFlower-Regular.ttf")
      ),
      // fallback
      cursive: fs.readFileSync(
        path.join(__dirname, "..", "fonts", "GreatVibes-Regular.ttf")
      ),
      Default: fs.readFileSync(
        path.join(__dirname, "..", "fonts", "GreatVibes-Regular.ttf")
      ),
    };

    const pages = pdfDoc.getPages();
    for (const sig of signaure) {
      const pageIndex = sig.pageNumber - 1;
      if (pages[pageIndex]) {
        const page = pages[pageIndex];
        const pdfHeight = page.getHeight();
        const pdfWidth = page.getWidth();
        const browserHeight = sig.renderedPageHeight || pdfHeight;
        const browserWidth = sig.renderedPageWidth || pdfWidth;

        const scaleY = pdfHeight / browserHeight;
        const scaleX = pdfWidth / browserWidth;

        // Convert browser (top-left origin) to PDF (bottom-left origin)
        const pdfX = sig.xCoordinate * scaleX;
        const pdfY = pdfHeight - sig.yCoordinate * scaleY;

        // Get the font bytes for this signature
        function normalizeFontName(fontName) {
          if (!fontName) return "Default";
          return fontName.replace(/['"]/g, "").split(",")[0].trim();
        }

        const normalizedFontName = normalizeFontName(sig.font);
        const fontBytes =
          availableFonts[normalizedFontName] || availableFonts.Default;

        const embeddedFont = await pdfDoc.embedFont(fontBytes);

        const fontSize = 20;
        const ascent = embeddedFont.heightAtSize(fontSize);
        page.drawText(sig.signature, {
          x: pdfX,
          y: pdfY - ascent, // Use ascent instead of fontSize * 0.8
          size: fontSize,
          font: embeddedFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    const newFilename = `signed-${Date.now()}.pdf`;
    const newFilePath = path.join(__dirname, "..", "signed", newFilename);
    const pdfBytes = await pdfDoc.save();
    await Signature.updateMany(
      { file: fileId, status: "pending" },
      { $set: { status: "signed" } }
    );
    await Signature.deleteMany({ file: fileId, status: "pending" });

    fs.writeFileSync(newFilePath, pdfBytes);

    // When you finalize and save the signed PDF, store the path in the Document model:
    document.signedFile = `signed/${newFilename}`;
    await document.save();

    res.json({
      msg: "Signed PDF generated sucessfully",
      signedFile: `signed/${newFilename}`,
    });
  } catch (error) {
    console.error("❌ Error finalizing signed PDF:", error);
    res.status(500).json({ msg: "Failed to finalize signed PDF" });
  }
});

router.delete("/clear-signatures", auth, async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ msg: "Missing file ID" });
    }

    // Delete all signatures for the file by the current user
    await Signature.deleteMany({ file: fileId, signer: req.user });

    res.json({ msg: "Signatures cleared successfully" });
  } catch (error) {
    console.error("Error clearing signatures:", error);
    res.status(500).json({ msg: "Failed to clear signatures" });
  }
});

// Remove a specific signature by ID (only by the owner)
router.delete("/remove/:signatureId", auth, async (req, res) => {
  try {
    const { signatureId } = req.params;
    const signature = await Signature.findById(signatureId);

    if (!signature) {
      return res.status(404).json({ msg: "Signature not found" });
    }
    // Only allow the owner to delete
    if (signature.signer.toString() !== req.user) {
      return res
        .status(403)
        .json({ msg: "Not authorized to delete this signature" });
    }

    await Signature.deleteOne({ _id: signatureId });
    res.json({ msg: "Signature removed successfully" });
  } catch (error) {
    console.error("Error removing signature:", error);
    res.status(500).json({ msg: "Failed to remove signature" });
  }
});

//Audit Route
router.get("/audit/:fileID", auth, async (req, res) => {
  try {
    const fileid = req.params.fileID;

    const audit = await Signature.find({ file: fileid })
      .populate("signer", "name email")
      .select("signer signedAt ipAddress");
 
    res.json(audit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Status Managment reason for accept the signed file
router.post("/accept/:id",auth,async (req,res) => {
  try {
    const signature = await Signature.findById(req.params.id);
    if (!signature) {
      return res.status(404).json({msg: "Signature not found"})
    }
    signature.status = "signed";
    signature.signedAt = new Date();

    await signature.save()
    // Upadating documents status
    await Document.findByIdAndUpdate(signature.file, {status: "signed"})
    res.json({msg: "Signature Accepted"})
  } catch (error) {
    console.error(error);
    res.status(500).json({msg: "Serve error"})
  }
})
// Status Managment Reson for reject the signed file
router.post("/reject/:id", auth, async (req,res)=>{
  try {
    const {reason} = req.body;
    const signature = await Signature.findById(req.params.id);
    if (!signature) {
      return res.status(404).json({msg: "Signature not found"})
    }
    signature.status = "rejected";
    signature.rejectReason = reason;

    await signature.save();
    await Document.findByIdAndUpdate(signature.file, {status: "rejected"})
    res.json({msg: "Signature rejected"})
  } catch (error) {
    console.error(error);
    res.status(500).json({msg: "Server error"})
    
  }
})
module.exports = router;
