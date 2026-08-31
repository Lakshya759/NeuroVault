const REGISTER_MATERIAL=`INSERT INTO material (title,content,uploaded_by) VALUES($1,$2,$3)
RETURNING id,title,content
`

const FETCH_MATERIAL=`SELECT * FROM material WHERE uploaded_by=$1`;

const CREATE_EMBEDDING = `
INSERT INTO material_embeddings (
    material_id,
    embedding
)
VALUES ($1, $2)
RETURNING *;
`;

const createMaterialChunkQuery = `
    INSERT INTO material_chunks
    (material_id, chunk_index, content)
    VALUES ($1, $2, $3)
    RETURNING *;
`;

const createChunkEmbeddingQuery = `
    INSERT INTO material_embeddings
    (chunk_id, embedding)
    VALUES ($1, $2::vector)
    RETURNING *;
`;




export{
   createChunkEmbeddingQuery,createMaterialChunkQuery, REGISTER_MATERIAL,FETCH_MATERIAL,CREATE_EMBEDDING
}