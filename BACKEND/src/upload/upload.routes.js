import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {createMaterial,fetchMaterial} from "./upload.controller.js"



const router=Router()
router.route("/upload").post(verifyJWT,createMaterial)
router.route("/").get(verifyJWT,fetchMaterial)
export default router