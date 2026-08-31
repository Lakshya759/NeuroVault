import {ApiError} from "../../utils/ApiError.js"
import {asyncHandler} from "../../utils/asyncHandler.js"
import {ApiResponse} from "../../utils/ApiResponse.js"
import pool from "../../db/pool.js"
import {createChunkEmbeddingQuery,createMaterialChunkQuery,REGISTER_MATERIAL,CREATE_EMBEDDING,FETCH_MATERIAL} from "../upload.query.js"
import {processText,getEmbedding} from "../upload.services.js"
import chunkText from "../../utils/chunkText.js"


const createMaterial = asyncHandler(async (req, res) => {

        const { title, content } = req.body;

        if (!title?.trim() ||!content?.trim()) {
            throw new ApiError(400,"Title and content are required");
        }
        
        const uploadedBy = req.user.id;
        const result=await processText(title,content,uploadedBy);
        return res.status(201).json(
            new ApiResponse(
                201,
                result,
                "Material created successfully"
            )
        )

    //     const client = await pool.connect();
    // try{   
    //     await client.query("BEGIN");

    //     const result = await client.query(
    //         REGISTER_MATERIAL,
    //         [title,content,uploadedBy]
    //     );

    //     //-------------------------------------------CHUNKING PROCESS------------------------------------------------



    //     const chunks=await chunkText(content);
    //     console.log(chunks);
    //     const materialId = result.rows[0].id;
    //     for (let i = 0; i < chunks.length; i++) {
    //             // 1. Chunking
    //             const chunkResult =await client.query(
    //                 createMaterialChunkQuery,
    //                 [materialId,i,chunks[i]]
    //             );

    //             const chunkId = chunkResult.rows[0].id;

    //             // 2. Generate embedding
    //             const embedding = await getEmbedding(chunks[i]);

    //             // 3. Store embedding
    //             await client.query(
    //                 createChunkEmbeddingQuery,
    //                 [chunkId,JSON.stringify(embedding)]
    //             );


    //     }


    //     await client.query("COMMIT");
    //     //-----------------------------------------------------------------------------------------------------------
    //     return res.status(201).json(
    //         new ApiResponse(
    //             201,
    //             result.rows[0],
    //             "Material created successfully"
    //         )
    //     )
    // }catch(error){
    //      await client.query("ROLLBACK");
    //     throw error;
    // }finally {

    //     // Always release the client
    //     client.release();
    // }
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