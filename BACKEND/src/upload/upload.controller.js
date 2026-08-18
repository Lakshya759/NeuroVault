import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import pool from "../db/pool.js"
import {REGISTER_MATERIAL,CREATE_EMBEDDING,FETCH_MATERIAL} from "./upload.query.js"
import getEmbedding from "./upload.services.js"


const createMaterial = asyncHandler(async (req, res) => {

        const { title, content } = req.body;

        if (
            !title?.trim() ||
            !content?.trim()
        ) {
            throw new ApiError(
                400,
                "Title and content are required"
            );
        }
        
        const uploadedBy = req.user.id;

       
        
        const result = await pool.query(
            REGISTER_MATERIAL,
            [
                title,
                content,
                uploadedBy
            ]
        );
        const material=result.rows[0]
        const embedding = await getEmbedding(content);
        const vector = `[${embedding.join(",")}]`;
        
        await pool.query(
            CREATE_EMBEDDING,
            [material.id, vector]
        );

        return res.status(201).json(
            new ApiResponse(
                201,
                result.rows[0],
                "Material created successfully"
            )
        )
});

const fetchMaterial = asyncHandler(async(req,res)=>{
    const user=req.user;

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const material= await pool.query(
        FETCH_MATERIAL,
        [user.id]
    )

    if(!material){
        throw new ApiError(404, "No Notes Found")
    }
    
    res.status(200)
    .json(
        new ApiResponse(200,material.rows,"Material Fetched Successfully")
    )
})

export{createMaterial,fetchMaterial}

/*However, for your Personal Knowledge OS, I would not keep it this way for
Why?

Imagine the user uploads:

100-page PDF

Flow becomes:

Upload request
    ↓
Store material
    ↓
Generate embedding
    ↓
Store embedding
    ↓
Return response

If embedding takes 5–10 seconds:

User waits 5–10 seconds

and if Voyage is temporarily down:

Material upload fails

even though the material itself was valid.

Better architecture (what BullMQ is for)
Upload Material
    ↓
Store material in DB
    ↓
Add job to queue
    ↓
Return success immediately

Worker
    ↓
Generate embedding
    ↓
Store embedding */