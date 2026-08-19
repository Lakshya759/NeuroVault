const generateConversationQuery=`
INSERT INTO conversation (user_id,title)
VALUES($1,$2) RETURNING *;
`;
//=================================================

const getAllConversationQuery=`
SELECT * FROM conversation where user_id=$1;
`
//=====================================================
const getConversationQuery=`
SELECT *
FROM conversation
WHERE id = $1
AND user_id = $2;
`

//=====================================================
const getConversationTurnsQuery=`
SELECT *
FROM conversationTurn
WHERE conversation_id = $1
ORDER BY created_at ASC;
`
//=====================================================
const sendMessageQuery=`
INSERT INTO conversationTurn (
    conversation_id,
    question,
    rewritten_question,
    answer,
    status
)
VALUES ($1, $2,$3, $4,$5)
RETURNING *;
`

//=====================================================
const similarityMatching=`
     SELECT
        m.id,
        m.title,
        m.content,
        1 - (me.embedding <=> $1::vector) AS similarity
    FROM material_embeddings me
    JOIN material m
        ON m.id = me.material_id
    WHERE 1 - (me.embedding <=> $1::vector) >= 0.40
    ORDER BY me.embedding <=> $1::vector
    LIMIT 3;
`

//==============================================================
const getConversationMemory = `
    SELECT
        c.summary,
        COALESCE(
            json_agg(
                json_build_object(
                    'question', t.question,
                    'rewritten_question', t.rewritten_question,
                    'answer', t.answer,
                    'created_at', t.created_at
                )
                ORDER BY t.created_at ASC
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
        ) AS recent_messages
    FROM conversation c
    LEFT JOIN LATERAL (
        SELECT
            id,
            question,
            rewritten_question,
            answer,
            created_at
        FROM conversationturn
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 5
    ) t ON true
    WHERE c.id = $1
    GROUP BY c.id, c.summary;
`;

export{
    generateConversationQuery,
    getAllConversationQuery,
    getConversationQuery,
    sendMessageQuery,
    getConversationTurnsQuery,
    similarityMatching,
    getConversationMemory

}