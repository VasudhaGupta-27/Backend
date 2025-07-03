Backend
Digitally Sign. Securely Share. Confidently Move Forward.

SignetFlow
🔐 Auth API
POST /api/auth/register
Register a new user.
POST /api/auth/login
Login and get a token.
Note: Protected routes require:
Authorization: <JWT Token>

📤 Upload PDF (User-Authenticated)
This feature allows logged-in users to upload PDF documents to the server using a protected API endpoint.

🧠 Flow
User selects a PDF file.
The frontend sends a multipart/form-data request to the backend with a JWT token.
The backend stores the file in /uploads and metadata in MongoDB.
🔌 API Endpoint
POST /api/docs/upload
Auth required: ✅ Yes (JWT token)
Content-Type: multipart/form-data
Field key: pdf (file)
🖥️ Frontend Page: Upload.jsx
The upload page uses:

FormData to attach the PDF.
localStorage to retrieve the token.
axios with multipart/form-data headers.
jsx
const formData = new FormData();
formData.append("pdf", selectedFile);

API.post("/docs/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer <token>`,
  },
});
