const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid Token" });
  }
};

module.exports = authMiddleware;

// Basically authmiddleware is use to verify weather incoming request have token, if not than we will not allow it to process furture
// it token is there than we will set the token id to user id so that it is furthur used for fetching user data
