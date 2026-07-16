import {logoutUser,getUser,loginUser,registerUser} from "./auth.controller.js"
import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router=Router()
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/user").get(verifyJWT,getUser)
router.route("/logout").get(verifyJWT,logoutUser)
export default router