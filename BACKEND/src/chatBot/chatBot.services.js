import ai from "./geminiConfig.js";

class GeminiService {
    static async generate(prompt) {
        try {
            const response = await ai.models.generateContent({
                model:"gemini-3.5-flash",
                contents: prompt,
            });

            return {
                text: response.text,
                usage: response.usageMetadata,
            };
        } catch (error) {
            console.error("Gemini Error:", error);
            throw new Error("Failed to generate AI response");
        }
    }
}

export default GeminiService;