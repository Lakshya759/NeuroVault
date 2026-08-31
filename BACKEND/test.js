import { chunkText } from "./src/utils/chunkText.js";

const content = `
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
Retrieval-Augmented Generation (RAG) is a technique that combines
information retrieval with a large language model.

Instead of relying only on the knowledge stored in the model's parameters,
RAG first retrieves relevant information from an external knowledge base.

The retrieved information is then provided to the language model as context.
The LLM uses this context to generate a more accurate and grounded answer.

A typical RAG pipeline consists of document ingestion, document chunking,
embedding generation, vector storage, similarity search, context
construction, and LLM generation.
`;

const chunks = await chunkText(content);

console.log(chunks);
console.log("Number of chunks:", chunks.length);