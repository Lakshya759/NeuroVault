import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

const chunkText = async (text) => {
    if (!text?.trim()) {
        return [];
    }

    const chunks = await splitter.splitText(text);

    return chunks;
};

export default  chunkText;