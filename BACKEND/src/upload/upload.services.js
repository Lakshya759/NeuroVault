import axios from "axios"
import pool from "../db/pool.js"
import {createChunkEmbeddingQuery,createMaterialChunkQuery,REGISTER_MATERIAL,CREATE_EMBEDDING,FETCH_MATERIAL} from "./upload.query.js"
import chunkText from "../utils/chunkText.js"

const getEmbedding = async (text) => {
    try {
        const response = await axios.post(
            "https://api.voyageai.com/v1/embeddings",
            {
                input: text,
                model: "voyage-4"
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(response.data.data)
        return response.data.data.map(item => item.embedding);

    } catch (error) {
        console.error(error.response?.data || error.message);
        throw error;
    }
};

const processText= async(title,content,uploadedBy)=>{
        const client = await pool.connect();
    try{   
        await client.query("BEGIN");

        const result = await client.query(
            REGISTER_MATERIAL,
            [title,content,uploadedBy]
        );

        //-------------------------------------------CHUNKING PROCESS------------------------------------------------



        const chunks=await chunkText(content);
        
        const materialId = result.rows[0].id;
        // 3. Store chunks first
        const chunkIds = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunkResult = await client.query(
                createMaterialChunkQuery,
                [materialId, i, chunks[i]]
            );

            chunkIds.push(chunkResult.rows[0].id);
        }

        // 4. Generate embeddings in batches
        const batchSize = 50;

        for (let i = 0; i < chunks.length; i += batchSize) {

            const batch = chunks.slice(i, i + batchSize);
            const batchChunkIds = chunkIds.slice(i, i + batchSize);

            // One Voyage request for the whole batch
            const embeddings = await getEmbedding(batch);
            console.log(embeddings)

            

            // 5. Store embeddings
            for (let j = 0; j < embeddings.length; j++) {
                const vector = `[${embeddings[j].join(",")}]`;
                await client.query(
                    createChunkEmbeddingQuery,
                    [
                        batchChunkIds[j],
                        vector
                    ]
                );
            }

            // If necessary, wait according to your Voyage rate limit
            // before processing the next batch.
        }

        await client.query("COMMIT");
        //-----------------------------------------------------------------------------------------------------------
        return  result.rows[0];
    }catch(error){
         await client.query("ROLLBACK");
        throw error;
    }finally {

        // Always release the client
        client.release();
    }
}

export {processText,getEmbedding};