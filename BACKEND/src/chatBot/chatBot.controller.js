import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import pool from "../db/pool.js"
import { getConversationMemory, sendMessageQuery,generateConversationQuery, getAllConversationQuery ,getConversationQuery,getConversationTurnsQuery,similarityMatching} from "./chatBot.query.js"
import GeminiService from "./chatBot.services.js";
import getEmbedding from "../upload/upload.services.js"
const generateConversation= asyncHandler(async(req,res)=>{
    const user=req.user;
    const {title}=req.body;
    const generated= await pool.query(generateConversationQuery,[user.id,title]);
    res.status(201).json(new ApiResponse(201,generated.rows[0],"The converrsation generated"));
});

//===============================================================================================


const getAllConversations= asyncHandler(async(req,res)=>{
    const user=req.user;
    const conversations=await pool.query(getAllConversationQuery,[user.id])


    if(conversations.rows.length==0){
        throw new ApiError(404,"No Converation Found");
    }

    res.status(200)
    .json(new ApiResponse(200,conversations.rows,"Conversations fetched successfully"));
});


//================================================================================================


const getConversation= asyncHandler(async(req,res)=>{
    const user=req.user;
    const {id}=req.params;

    const conversation=await pool.query(getConversationQuery,[id,user.id]);
    const conversationTurns=await pool.query(getConversationTurnsQuery,[id]);


    if(conversation.rows.length==0){
        throw new ApiError(404,"No Converation Found");
    }


    res.status(200)
    .json(new ApiResponse(200,{
            conversation: conversation.rows[0],
            conversationTurns: conversationTurns.rows
        },"Conversations fetched successfully"));
});


//======================================================================================================

const vagueWords = new Set([
    "it",
    "this",
    "that",
    "these",
    "those",
    "they",
    "them",
    "its",
    "their",
    "there",
    "here"
]);

const shortVaguePhrases = new Set([
    "what does it mean",
    "what does that mean",
    "what about it",
    "why is that",
    "why is it",
    "how does it work",
    "how does that work",
    "what about that",
    "explain that",
    "explain this",
    "tell me more",
    "what about this"
]);

function needsQuestionRewrite(question, recentMessages) {
    // First message → nothing to resolve
    
    if (recentMessages.length === 0) {
        return false;
    }

    const normalized = question
        .toLowerCase()
        .trim()
        .replace(/[?!.,]/g, "");

    // Very short questions are more likely to depend on history
    const wordCount = normalized.split(/\s+/).length;

    // if (wordCount <= 5) {
    //     return true;
    // }

    // Exact/common vague phrases
    if (shortVaguePhrases.has(normalized)) {
        return true;
    }

    // Check for vague pronouns/references
    const words = new Set(normalized.split(/\s+/));

    for (const word of vagueWords) {
        if (words.has(word)) {
            return true;
        }
    }

    return false;
}




const sendMessage = asyncHandler(async (req, res) => {
    console.time("controller");
    const { id } = req.params;
    const { question } = req.body;

    if (!question?.trim()) throw new ApiError(400, "Question is required");

    // Verify the conversation belongs to the logged-in user---------------------------------------
    console.time("query");
    const conversation = await pool.query(getConversationQuery, [id, req.user.id]);
    console.timeEnd("query");


    if (conversation.rows.length === 0) {
        throw new ApiError(404, "Conversation not found");
    }

    // CHECKING IF QUESTION REWRITING REQUIRED-----------------------------------------------------
    const memoryResult = await pool.query(
        getConversationMemory,
        [id]
    );
    const recentMessages = memoryResult.rows[0].recent_messages;
    const isRewriteNeeded=needsQuestionRewrite(question,recentMessages);

    //QUESTION REWRITING---------------------------------------------------------------------------
    console.time("rewrite");
    let retrievalQuery = question;
    console.log(isRewriteNeeded)
    if(isRewriteNeeded){
        const recentConversation = recentMessages
            .map(turn => `
        User: ${turn.question}
        Assistant: ${turn.answer}
        `)
            .join("\n---\n");

        const retrievalPrompt = `
        Given the conversation context and the user's current question,
        rewrite the current question into a standalone search query.

        Recent conversation:
        ${recentConversation}

        Current question:
        ${question}

        Rules:
        - Resolve references such as "it", "this", "that", "they", etc.
        - Include important entities and concepts from the conversation.
        - Preserve the user's actual intent.
        - Return ONLY the standalone search query.
        `;
        const retrievalResponse = await GeminiService.generate(retrievalPrompt,"gemini-3.5-flash-lite");
        retrievalQuery = retrievalResponse.text.trim();
    }
    console.timeEnd("rewrite");



    // Retrival Step-----------------------------------------------------------------------
    
    console.time("embedding");

    const queryEmbedding = await getEmbedding(retrievalQuery);
    
    
    console.timeEnd("embedding");
    
    console.time("vector-search");
    const result = await pool.query(
        similarityMatching,
        [JSON.stringify(queryEmbedding)]
    );

    
    console.timeEnd("vector-search");
    
    // CONTEXT GENERATION-------------------------------------------------------------------

    const context = result.rows.length > 0
        ? result.rows
            .map((note, index) => `
    Note ${index + 1}
    Title: ${note.title}
    Similarity: ${note.similarity}
    Content:
    ${note.content}
    `)
            .join("\n---\n")
        : "No relevant notes were found.";
    
    console.log(context)


    // PROMPT GENERATION-----------------------------------------------------------------
    const prompt = `
    You are a personal knowledge assistant.

    You have access to the user's personal notes provided in CONTEXT.

    CONTEXT:
    ${context}

    QUESTION:
    ${question}

    Instructions:

    1. If the provided context contains relevant information:
    - Answer the question primarily using the user's notes.
    - Do not contradict the user's notes.
    - You may use your general knowledge only to clarify or explain
        information from the notes.

    2. If the context is empty, irrelevant, or does not contain enough
    information to answer the question:
    - Start your response with exactly this message:

    "⚠️ I couldn't find any relevant notes for this question. You may want
    to study this topic and add it to your knowledge base."

    - After that message, answer the user's question using your general
        knowledge.
    - Make it clear that this part of the answer comes from general
        knowledge rather than the user's notes.

    3. Never pretend that information from your general knowledge came from
    the user's notes.

    4. Do not invent information.

    Provide a clear and useful answer.
    `;



    // Dummy response
    console.time("gemini");
    const dummyResponse = await GeminiService.generate(prompt,"gemini-3.5-flash-lite");


    console.timeEnd("gemini");
    // const dummyResponse ={
    //     text:"dummy response"
    // };
    // Save question and answer
    console.time("query");
    const generatedTurn = await pool.query(sendMessageQuery, [
        id,
        question,
        retrievalQuery,
        dummyResponse.text,
        "COMPLETED"
    ]);
    console.timeEnd("query");
    console.timeEnd("controller");
    res.status(201).json(
        new ApiResponse(
            201,
            generatedTurn.rows[0],
            "Message sent successfully"
        )
    );
});

export{generateConversation,getAllConversations,getConversation,sendMessage}