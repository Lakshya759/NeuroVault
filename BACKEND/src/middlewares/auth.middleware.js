import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import pool from "../db/pool.js"


export const verifyJWT=asyncHandler(async (req,res,next)=>{
    try {
        console.log("cookies",req.cookies)
        const token=req.cookies?.token
        if(!token){
            throw new ApiError(401,"Unauthorised Access")
        }
        const decodedToken=jwt.verify(token,process.env.JWT_SECRET)
        const user=await pool.query(`SELECT id,name,email FROM users WHERE id=$1`,[decodedToken?.id])
    
        
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
        req.user=user
        next()
    } catch (error) {
        throw new ApiError(error.statusCode || 401, error?.message || "Something went wrong while verifying jwt")
    }

})