import {ApiError} from "../../utils/ApiError.js"
import {asyncHandler} from "../../utils/asyncHandler.js"
import {ApiResponse} from "../../utils/ApiResponse.js"
import pool from "../../db/pool.js"
import { extractPdfText ,cleanPDFText,getPDFPageCount} from "./pdf-upload.service.js";
import {createChunkEmbeddingQuery, createMaterialChunkQuery,REGISTER_MATERIAL,FETCH_MATERIAL,CREATE_EMBEDDING} from "../upload.query.js"
import {getEmbedding,processText} from "../upload.services.js"
import chunkText from "../../utils/chunkText.js"
import supabase from "../../utils/supabaseConfig.js";
import crypto from "crypto";
import { pdfQueue } from "../../queues/pdf.queue.js";




const uploadPDF = asyncHandler(async (req, res) => {

    if (!req.file) {
        throw new ApiError(400, "PDF file is required");
    }

    const pages=await getPDFPageCount(req.file.buffer);
    if(pages>20){
        throw new ApiError(402,"File must have less than 50 pages");
    }

    //=================STORING THE PDF ON SUPABASE================

    const fileName = `${crypto.randomUUID()}.pdf`;
    const filePath = `pdfs/${fileName}`;
    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(filePath, req.file.buffer, {
            contentType: "application/pdf",
            upsert: false
    });
    
    if (error) {
        throw new ApiError(500, error.message);
    }
    
    //============================================================

    const job = await pdfQueue.add(
        "process-pdf",
        {
            filePath,
            uploadedBy: req.user.id
        },
        {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000
            },
            removeOnComplete: 100,
            removeOnFail: 100
        }
    );

    return res.status(202).json(
        new ApiResponse(
            202,
            {
                jobId: job.id
            },
            "PDF uploaded and processing started"
        )
    );

   
    
});

export  {uploadPDF};