import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {createMaterial,fetchMaterial} from "./text-upload/text-upload.controller.js"
import {uploadPDF}from "./pdf-upload/pdf-upload.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {getPDFStatus} from "./pdf-upload/pdf.status.js"


const router=Router()

router.route("/upload").post(verifyJWT,createMaterial)
router.route("/").get(verifyJWT,fetchMaterial)
router.route("/upload/pdf").post(verifyJWT,upload.single("file"),uploadPDF)
router.route("/pdf/status/:jobId").get(getPDFStatus);
export default router