import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {CREATE_USER,GET_USER_BY_EMAIL,GET_USER_BY_ID} from "./auth.query.js"
import pool from "../db/pool.js"
const generateJWT=(user)=>{
    const token=jwt.sign(
       { userId:user.id,
        email:user.email
       },
       process.env.JWT_SECRET,
       {
        expiresIn:process.env.JWT_EXPIRES_IN
       }
    )
    return token;
}

const registerUser=asyncHandler(async(req,res)=>{
    const {name,email,password}=req.body;
    if(!name?.trim() || !email?.trim() ||!password?.trim()
    ){
        throw new ApiError(400,"All The Fields Are Required")
    }
    const existingUsers=await pool.query(
        GET_USER_BY_EMAIL,[email]
    )
    if(existingUsers.rows.length>0){
        throw new ApiError(400,"user already exist");
    }
    const hashedPassword=await bcrypt.hash(password,10);
    const user=await pool.query(CREATE_USER,[name,email,hashedPassword]);

    return res.status(200).json(new ApiResponse(200,user.rows[0],"user created successfully"));
})

const loginUser= asyncHandler(async(req,res)=>{
    const{email,password}=req.body;


    const result=await pool.query(GET_USER_BY_EMAIL,[email]);


    if(result.rows.length===0){
        throw new ApiError(404,"User with email not found");
    }

    const user=result.rows[0];


    const isMatch=await bcrypt.compare(
        password,
        user.password
    );


    if(!isMatch){
        throw new ApiError(400,"Wrong User Credential")
    }


    const options={
        httpOnly:true,
        secure: true,
        sameSite: "None"
    }


    const token=generateJWT(user);
    return res.status(200)
    .cookie("token",token,options)
    .json(new ApiResponse(200,{},"Login Successful"))
});

const getUser=asyncHandler(async(req,res)=>{
    const users=req.user;
    if(users){
        res.status(200).json(
            new ApiResponse(200,users,"User Fetched Successfully")
        )
    }
    else{
        throw new ApiError(404,"User not found")
    }
});

const logoutUser=asyncHandler(async(req,res)=>{
    const options={
        httpOnly:true,
        secure: true,
        sameSite: "None"
    }
    return res.status(200)
    .clearCookie("token",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))
})

export{logoutUser,getUser,loginUser,registerUser}