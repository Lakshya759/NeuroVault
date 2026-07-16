import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {createMaterial} from "./upload.controller.js"



const router=Router()
router.route("/upload").post(verifyJWT,createMaterial)

export default router