import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import pool from "../db/pool.js"
import {REGISTER_MATERIAL,CREATE_EMBEDDING} from "./upload.query.js"
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

export{createMaterial}

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