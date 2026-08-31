import {ApiError} from "../../utils/ApiError.js"
import {asyncHandler} from "../../utils/asyncHandler.js"
import {ApiResponse} from "../../utils/ApiResponse.js"
import pool from "../../db/pool.js"
import { extractPdfText ,cleanPDFText} from "./pdf-upload.service.js";
import {createChunkEmbeddingQuery, createMaterialChunkQuery,REGISTER_MATERIAL,FETCH_MATERIAL,CREATE_EMBEDDING} from "../upload.query.js"
import {getEmbedding,processText} from "../upload.services.js"
import chunkText from "../../utils/chunkText.js"






const uploadPDF = asyncHandler(async (req, res) => {

    if (!req.file) {
        throw new ApiError(400, "PDF file is required");
    }

    const rawText = await extractPdfText(req.file.buffer);

    if (!rawText || !rawText.trim()) {
        throw new ApiError(
            400,
            "Could not extract text from the PDF"
        );
    }

    const cleanedDocument = await cleanPDFText(rawText);
   

    const title = cleanedDocument.title;
    const content = cleanedDocument.content;
    console.log(title)
    console.log(content)


    if (!title?.trim() || !content?.trim()) {
        throw new ApiError( 400, "Title and content are required");
    }
    
    const uploadedBy = req.user.id;
    const result=processText(title,content,uploadedBy);
    return res.status(201).json(
        new ApiResponse(
            201,
            result,
            "Material created successfully"
        )
    )
    // const client = await pool.connect();
    // try{

    //         await client.query("BEGIN");

    //         const material = await client.query(
    //             REGISTER_MATERIAL,
    //             [title,content,uploadedBy]
    //         );


    //     //-------------------------------------------CHUNKING EMBEDDING AND STORE THEM IN DATABASE PROCESS------------------------------------------------



    //         const chunks=await chunkText(content);
    //         console.log(chunks);
    //         const materialId = material.rows[0].id;
    //         for (let i = 0; i < chunks.length; i++) {
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


    //         }


    //     //-----------------------------------------------------------------------------------------------------------
            
    //         return res.status(201).json(
    //             new ApiResponse(
    //                 201,
    //                 result.rows[0],
    //                 "Material created successfully"
    //             )
    //         )

    // }catch(error){
    //      await client.query("ROLLBACK");
    //     throw error;
    // }finally {

    //     // Always release the client
    //     client.release();
    // }

    
});

export  {uploadPDF};