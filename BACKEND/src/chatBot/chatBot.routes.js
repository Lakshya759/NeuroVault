import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {generateConversation,getAllConversations,getConversation,sendMessage} from "../chatBot/chatBot.controller.js"

const router=Router();
router.route("/conversations").post(verifyJWT,generateConversation);
router.route("/conversations").get(verifyJWT,getAllConversations);
router.route("/conversations/:id").get(verifyJWT,getConversation);
router.route("/conversations/:id/message").post(verifyJWT,sendMessage);



export default router