
import { Worker } from "bullmq";
import IORedis from "ioredis";

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import supabase from "../utils/supabaseConfig.js";
import { parsePDF } from "../upload/pdf-upload/pdf_parser.js"

import chunkText from "../utils/chunkText.js";

import { cleanPDFText } from "../upload/pdf-upload/pdf-upload.service.js";
import { processText } from "../upload/upload.services.js";


const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

function extractTitle(markdown) {

    const headingMatch = markdown.match(/^#{1,2}\s+(.+)$/m);

    if (headingMatch) {
        return headingMatch[1].trim();
    }

    const firstLine = markdown
        .split("\n")
        .map(line => line.trim())
        .find(line => line.length > 0);

    return firstLine
        ? firstLine.slice(0, 100)
        : "Untitled Document";
}


const worker = new Worker(
    "pdf-processing",

    async (job) => {

        console.log(`Processing job ${job.id}`);

        const { filePath, uploadedBy } = job.data;

        let tempDir;

        try {

            // =========================================
            // STEP 1: DOWNLOAD PDF FROM SUPABASE
            // =========================================

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

            await job.updateProgress(10);


            // =========================================
            // STEP 2: CREATE TEMPORARY PDF FILE
            // =========================================

            tempDir = await mkdtemp(
                path.join(tmpdir(), "neurovault-pdf-")
            );

            const tempPdfPath = path.join(
                tempDir,
                "input.pdf"
            );

            await writeFile(tempPdfPath, pdfBuffer);


            // =========================================
            // STEP 3: PYTHON PDF PARSING
            // =========================================

            const parsedData = await parsePDF(tempPdfPath);

            const markdown = parsedData.markdown;

            if (!markdown || !markdown.trim()) {
                throw new Error(
                    "Could not extract text from the PDF"
                );
            }

            console.log("PDF parsing completed");

            console.log(
                "Extracted characters:",
                markdown.length
            );

            await job.updateProgress(20);


            // =========================================
            // STEP 4: CHUNKING THE MARKDOWN
            // =========================================

            // const chunks = await chunkText(markdown);

            // if (!chunks || chunks.length === 0) {
            //     throw new Error(
            //         "No chunks generated from PDF"
            //     );
            // }

            // console.log("Total chunks:", chunks.length);
            // for(let i=0;i<chunks.length;i=i+1){
            //     console.log(chunks[i]);
            // }

            // await job.updateProgress(30);


            // =========================================
            // STEP 5: CLEAN CHUNKS USING GEMINI
            // =========================================

            // const batchSize = 5;

            // const cleanedChunks = [];

            // let title = null;

            // for (let i = 0; i < chunks.length; i += batchSize) {

            //     const batch = chunks.slice(
            //         i,
            //         i + batchSize
            //     );

            //     const isFirstBatch = i === 0;

            //     const result = await cleanPDFText(
            //         batch,
            //         isFirstBatch
            //     );

            //     if (isFirstBatch) {
            //         title = result.title;
            //     }

            //     cleanedChunks.push(
            //         ...result.chunks
            //     );

            //     const progress =
            //         30 +
            //         Math.round(
            //             ((i + batch.length) / chunks.length) * 40
            //         );

            //     await job.updateProgress(progress);

            //     await new Promise(
            //         resolve => setTimeout(resolve, 1000)
            //     );
            // }


            // =========================================
            // STEP 6: CREATE FINAL CONTENT
            // =========================================

            // const content = chunks.join("\n\n");

            // if (!title?.trim() || !content?.trim()) {
            //     throw new Error(
            //         "Could not generate valid content from PDF"
            //     );
            // }

            await job.updateProgress(50);


            // =========================================
            // STEP 7: SAVE CONTENT
            // =========================================
            const title =extractTitle(markdown)

            const result = await processText(
                title,
                markdown,
                uploadedBy
            );

            await job.updateProgress(100);

            return {
                materialId: result.id,
                title
            };


        } catch (error) {

            console.error(
                `❌ Job ${job.id} failed:`,
                error
            );

            throw error;

        } finally {

            // =========================================
            // STEP 8: DELETE TEMPORARY PDF
            // =========================================

            if (tempDir) {
                await rm(tempDir, {
                    recursive: true,
                    force: true
                }).catch(error => {
                    console.error(
                        "Temporary PDF cleanup failed:",
                        error
                    );
                });
            }
        }

    },

    {
        connection,
        concurrency: 1
    }
);


worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
});


worker.on("failed", (job, error) => {
    console.error(
        `❌ Job ${job?.id} failed:`,
        error.message
    );
});


worker.on("error", (error) => {
    console.error("Worker error:", error);
});


console.log("👷 PDF Worker is running...");
