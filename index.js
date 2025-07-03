const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const docRoutes = require("./routes/docRoutes");
const signatureRoutes = require("./routes/signature");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Updated CORS: allows both localhost and Netlify frontend
app.use(
  cors({
    origin: "http://localhost:5173", // <-- no trailing slash
    credentials: true,
  })
);

app.use(express.json());

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/signed", express.static(path.join(__dirname, "signed")));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/docs", docRoutes);
app.use("/api/signature", signatureRoutes);
app.get("/", (req, res) => res.send("API is running"));

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error", err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
