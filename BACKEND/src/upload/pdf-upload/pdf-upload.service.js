import {ApiError} from "../../utils/ApiError.js"
import {asyncHandler} from "../../utils/asyncHandler.js"
import {ApiResponse} from "../../utils/ApiResponse.js"
import pool from "../../db/pool.js"
import {PDFParse} from "pdf-parse";
import GeminiService from "../../chatBot/chatBot.services.js";


const getPDFPageCount = async (pdfBuffer) => {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
        throw new Error("Invalid PDF buffer");
    }

    try {
        const parser = new PDFParse({
            data: pdfBuffer
        });

        const result = await parser.getInfo();

        await parser.destroy();

        return result.total;
    } catch (error) {
        console.error("Failed to read PDF:", error);
        throw new Error("Could not determine PDF page count");
    }
};



async function extractPdfText(buffer){
    const parser=new PDFParse({
        data:buffer
    });
    const result= await parser.getText();
    await parser.destroy();
    return result.text;
}


async function cleanPDFText(rawText, generateTitle = false){
    if (!rawText || !Array.isArray(rawText) || rawText.length === 0) {
    throw new ApiError(400, "No text found in PDF");
}
    const batchText = rawText
    .map((chunk, index) => `--- CHUNK ${index + 1} ---\n${chunk}`)
    .join("\n\n");


     const titleInstruction = generateTitle
    ? `
15. Generate ONE concise and descriptive title based ONLY on the provided chunks.
    The title should represent the overall document.
    Do not put the title inside any chunk.
`
    : `
15. Do NOT generate a title.
`;
    const outputFormat = generateTitle
    ? `
{
    "title": "A concise and descriptive title",
    "chunks": [
        "Cleaned version of chunk 1",
        "Cleaned version of chunk 2"
    ]
}

Rules:
- Exactly two fields: title and chunks.
- title must be a string.
- chunks must be an array of strings.
`
    : `
{
    "chunks": [
        "Cleaned version of chunk 1",
        "Cleaned version of chunk 2"
    ]
}

Rules:
- Exactly one field: chunks.
- chunks must be an array of strings.
`;

     const cleaningPrompt = `
    You are processing text extracted from a PDF.

    Your task is to clean PDF extraction artifacts and format the
    document as Markdown.

    IMPORTANT RULES:

    1. Preserve ALL meaningful information from the source.

    2. Do NOT summarize the document.

    3. Do NOT paraphrase or rewrite the content.

    4. Do NOT add information based on your own knowledge.

    5. Do NOT correct factual or technical content.

    6. NEVER modify code, commands, formulas, numbers, SQL queries,
    API syntax, mathematical expressions, or technical terminology.

    7. You MAY repair formatting problems clearly caused by PDF extraction.

    8. If a word is broken across lines, join it.

    9. If a sentence is broken across lines because of PDF layout,
    join the lines into the same paragraph.

    10. If code is broken across lines because of PDF layout,
        reconstruct the original code without changing it.

    11. Remove obvious page numbers and PDF markers such as:
        "-- 1 of 3 --"

    12. Remove repeated headers and footers only when they are clearly
        PDF layout artifacts.

    13. Preserve the original ordering of the document.

    14. Do not duplicate the document title inside content.

    ${titleInstruction}

    MARKDOWN FORMATTING:

    16. Return the cleaned content as Markdown.

    17. Convert clearly identifiable section titles into Markdown headings.
        Main sections should use ##.
        Subsections should use ###.
        Do NOT invent headings.

    18. Convert clearly identifiable numbered lists into Markdown
        numbered lists.

    19. Convert clearly identifiable bullet points into Markdown
        bullet lists.

    20. Preserve paragraphs and meaningful spacing.

    21. Detect code sections and wrap them in fenced code blocks.
        Use an appropriate language such as python only when the
        language is clearly identifiable.

    22. NEVER modify the content inside a code block.

    23. Markdown formatting must only represent structure that already
        exists in the source. Do not change the meaning of the document.

    OUTPUT:

    Return ONLY a valid JSON object.

    ${outputFormat}

    - No explanation before or after the JSON.
    - Do NOT wrap the JSON in Markdown.
    - Return exactly ONE cleaned chunk for every input chunk.
    - Do NOT merge chunks together.
    - Do NOT omit any chunks.
    - Preserve the original chunk order.
    - Do NOT put the title inside any chunk.
    - Each item in chunks must correspond to exactly one input chunk.
    - Preserve all meaningful information.
    - Ensure the response is valid JSON that can be parsed using JSON.parse().

    EXTRACTED PDF TEXT:

    ${batchText}
    `;
    const response= await GeminiService.generate(cleaningPrompt,"gemini-3.5-flash-lite");

    let text = response.text.trim();

    if (text.startsWith("```")) {
        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
    }

    const result = JSON.parse(text);
    console.log(response)
    return result;
}

export {extractPdfText,cleanPDFText,getPDFPageCount}