const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file,cb) =>{
        cb(null,"uploads/")
    },
    filename: (req, file, cb) =>{
        const ext = path.extname(file.originalname); // extract extenstion of uploaded file
        const name = file.originalname.replace(ext,"").replace(/\s+/g, '-').toLowerCase(); // remove spaces and convert to lower case
        cb(null, `${name}-${Date.now()}${ext}`); // concat new file name with unique date to remove duplicacy , with extenstion
    }
});
const fileFilter = (req,file,cb) =>{
    if (file.mimetype === "application/pdf") {
        cb(null, true)
    } // check wheather uploaded file type is pdf, if yes than callback function have no error and its true (allowed)
    else{
        cb(new Error("Only PDFs are allowed"), false) // if not than cb will give an error and false (not allowed)
    }
}
const upload = multer({storage, fileFilter})

module.exports = upload;