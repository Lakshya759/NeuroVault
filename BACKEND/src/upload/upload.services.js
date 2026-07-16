import axios from "axios"
const getEmbedding = async (text) => {
    try {
        const response = await axios.post(
            "https://api.voyageai.com/v1/embeddings",
            {
                input: text,
                model: "voyage-4-lite"
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.data[0].embedding;

    } catch (error) {
        console.error(error.response?.data || error.message);
        throw error;
    }
};

export default getEmbedding;