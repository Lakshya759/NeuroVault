import {Worker} from "bullmq";
import IORedis from "ioredis";
import supabase from "../utils/supabaseConfig.js";
import { extractPdfText } from "../upload/pdf-upload/pdf-upload.service.js";
import chunkText from "../utils/chunkText.js"
import { cleanPDFText } from "../upload/pdf-upload/pdf-upload.service.js";
import { processText } from "../upload/upload.services.js";

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

const worker = new Worker(
    "pdf-processing",

    async (job) => {

        console.log(`Processing job ${job.id}`);

        const { filePath, uploadedBy } = job.data;
        try{
        // processing goes here
            const { data, error } = await supabase.storage
                .from(process.env.SUPABASE_BUCKET)
                .download(filePath);

            if (error) {
                throw new Error(
                    `Failed to download PDF: ${error.message}`
                );
            }
            const pdfBuffer = Buffer.from(
                await data.arrayBuffer()
            );

            //=============PDF PARSING==============================
            const rawText = await extractPdfText(pdfBuffer);

            if (!rawText || !rawText.trim()) {
                throw new Error(
                    "Could not extract text from the PDF"
                );
            }

            await job.updateProgress(20);
            //=======================================================
            //===================CHUNKING THE TEXT===================
            const chunks = await chunkText(rawText);

            if (!chunks || chunks.length === 0) {
                throw new Error("No chunks generated from PDF");
            }
            await job.updateProgress(30);
            //=======================================================
            //===============PROCESSING THE CHUNK WITH GEMINI==============
            const batchSize = 5;

            const cleanedChunks = [];

            let title = null;

            for (let i = 0; i < chunks.length; i += batchSize) {

                const batch = chunks.slice(
                    i,
                    i + batchSize
                );

                const isFirstBatch = i === 0;

                const result = await cleanPDFText(
                    batch,
                    isFirstBatch
                );

                if (isFirstBatch) {
                    title = result.title;
                }

                cleanedChunks.push(
                    ...result.chunks
                );

                const progress =
                    30 +
                    Math.round(
                        ((i + batch.length) / chunks.length) * 40
                    );

                await job.updateProgress(progress);

                await new Promise(
                    resolve => setTimeout(resolve, 1000)
                );
            }
            //===============================================================
            //===================CREATING THE FINAL CONTENT===========================================

            const content = cleanedChunks.join("\n\n");
            if (!title?.trim() || !content?.trim()) {
                throw new Error(
                    "Scanned PDFs are not Allowed"
                );
            }
            await job.updateProgress(75);
            //==================================================================
            const result = await processText(
                title,
                content,
                uploadedBy
            );
            await job.updateProgress(100);

            
            return {
                materialId: result.id,
                title
            };
        }catch(error){
            console.error(`❌ Job ${job.id} failed:`,error);
            throw error;
        }

    },

    {
        connection,
        concurrency: 1
    }
);
worker.on(
    "completed",
    (job)=>{
        console.log(`✅ Job ${job.id} completed`)
    }
);

worker.on(
    "failed",
    (job,error)=>{
        console.error( `❌ Job ${job?.id} failed:`,error.message)
    }
);

worker.on(
    "error",
    (error) => {

        console.error(
            "Worker error:",
            error
        );
    }
);

console.log(
    "👷 PDF Worker is running...");








