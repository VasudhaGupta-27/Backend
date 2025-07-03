const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true,
  },
  signer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageNumber: {
    type: Number,
    required: true,
  },
  xCoordinate: {
    type: Number,
    required: true,
  },
  yCoordinate: {
    type: Number,
    required: true,
  },
  signature: {
    type: String,
    required: true,
  },
  status: {
  type: String,
  enum: ["pending", "signed", "rejected"],
  default: "pending"
},
rejectReason: {
  type: String,
  default: ""
},
  font: {
    type: String,
    default: "cursive",
  },
  // Audit Trial
  ipAddress: String,
  signedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Signature", signatureSchema);
