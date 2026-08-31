import {ApiError} from "../../utils/ApiError.js"
import {asyncHandler} from "../../utils/asyncHandler.js"
import {ApiResponse} from "../../utils/ApiResponse.js"
import pool from "../../db/pool.js"
import {PDFParse} from "pdf-parse";
import GeminiService from "../../chatBot/chatBot.services.js";





async function extractPdfText(buffer){
    const parser=new PDFParse({
        data:buffer
    });
    const result= await parser.getText();
    await parser.destroy();
    return result.text;
}


async function cleanPDFText(rawText){
    if(!rawText || !rawText.trim()){
        throw new ApiError(400,"No text found in PDF");
    }
    const cleaningPrompt=`
    You are processing text extracted from a PDF.

    Your task is to clean formatting problems caused by PDF text extraction and generate a suitable title.

    IMPORTANT RULES:

1. Preserve ALL meaningful information from the source.

2. Do NOT summarize the document.

3. Do NOT paraphrase or rewrite the content.

4. Do NOT add information based on your own knowledge.

5. Do NOT correct factual or technical content.

6. NEVER modify code, commands, formulas, numbers, SQL queries,
   API syntax, mathematical expressions, or technical terminology.

7. You MAY repair formatting that was clearly caused by PDF extraction.

8. If a word is broken across a line because of PDF extraction,
   join it back together.

   Example:
   "DataFra"
   "me"
   → "DataFrame"

9. If a sentence is broken across lines because of PDF layout,
   join the lines into a single sentence.

10. If a code expression is broken across lines because of PDF layout,
    join the lines without changing the code.

    Example:
    pd.groupby('col').agg({'a':'mean','b':'sum'}
    )
    →
    pd.groupby('col').agg({'a':'mean','b':'sum'})

11. Remove obvious page numbers such as:
    "-- 1 of 3 --"
    "-- 2 of 3 --"

12. Remove repeated headers and footers only when they are clearly
    PDF layout artifacts.

13. Preserve meaningful headings.

14. Preserve the original ordering of the content.

15. Do not duplicate the document title inside the content.

16. Generate a concise title based ONLY on the provided document.

17. Return the cleaned content as plain text, not Markdown unless
    Markdown is already clearly part of the source.

    Return only the structured result.

PDF extraction often introduces line breaks in the middle of words,
sentences, and code.

You MUST repair these artifacts.

Examples:

"DataFra"
"me"
→ "DataFrame"

"numeric"
"ops"
→ "numeric ops"

"common M"
"L format"
→ "common ML format"

When two lines are clearly part of the same sentence, combine them.

When a code expression is split across lines, join the lines while
preserving the exact code.

Do not modify the actual code or technical content.

Do not include the document title inside content.

Do not include "Title:" inside the content.

Remove obvious PDF page markers such as "-- 1 of 3 --".

OUTPUT FORMAT:

Return ONLY a valid JSON object.

The response MUST contain exactly these two fields:

{
  "title": "A concise and descriptive title for the document",
  "content": "The cleaned document content"
}

Rules for the JSON response:

- Do NOT wrap the JSON in Markdown.
- Do NOT add any explanation before or after the JSON.
- Do NOT add any fields other than "title" and "content".
- "title" must be a string.
- "content" must be a string containing the complete cleaned document.
- Preserve line breaks inside the "content" string using valid JSON escaping.
- The "content" field must contain the entire cleaned document, not a summary.
- The generated title must NOT be repeated at the beginning of "content".
- Ensure the response is valid JSON that can be directly parsed using JSON.parse().

    EXTRACTED PDF TEXT:

    ${rawText}
    `
    
    const response= await GeminiService.generate(cleaningPrompt,"gemini-3.5-flash-lite");

    const result = JSON.parse(response.text);
    console.log(response)
    return result;
}

export {extractPdfText,cleanPDFText}