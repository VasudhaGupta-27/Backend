const captureIP = (req, res, next) => {
  console.log("Request headers:", req.headers);
  console.log("Remote address:", req.connection?.remoteAddress);

  req.signerIp =
    req.headers["x-forwarded-for"] || req.connection?.remoteAddress;
  console.log("Captured IP in middleware:", req.signerIp);
  next();
};

module.exports = captureIP;

//What is this doing?
// It tries to find the client's IP address in two ways:

// ✅ First option:

// req.headers["x-forwarded-for"]
// This header is often set by proxies or load balancers.

// Example value: "123.45.67.89"

// ✅ If that's not available:

// req.connection.remoteAddress
// This is the IP of the direct connection to your server.

// Meaning:

// If there’s a proxy in front of your server (like Nginx or a cloud load balancer), it will usually set x-forwarded-for.

// Otherwise, you get the raw IP address of the connection
