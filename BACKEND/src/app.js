import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { ApiError } from "./utils/ApiError.js";


const app=express();

app.use(express.json())
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.get("/",(req,res)=>{
    res.send("Hello World");
});

//---------------------Routes------------------
import userRouter from "./auth/auth.routes.js" 
import materialRouter from "./upload/upload.routes.js"



app.use("/api/v0/users",userRouter)
app.use("/api/v0/material",materialRouter)



//------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }
  

  console.error(err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});


export {app}