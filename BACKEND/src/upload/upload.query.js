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


export{
    REGISTER_MATERIAL,FETCH_MATERIAL,CREATE_EMBEDDING
}