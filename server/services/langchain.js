const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');

/**
 * Custom embeddings class that wraps @google/generative-ai directly.
 * This avoids the @langchain/google-genai API version mismatch (v1beta 404 errors).
 * LangChain's MongoDBAtlasVectorSearch only needs embedDocuments + embedQuery.
 */
class GeminiEmbeddings {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.modelName = 'text-embedding-004';
  }

  async embedQuery(text) {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedDocuments(texts) {
    return Promise.all(texts.map(t => this.embedQuery(t)));
  }
}

/**
 * Perform RAG vector search on the recommendations collection.
 * Returns a formatted string of top matching recommendations.
 * Falls back gracefully if DB is empty or vector search fails.
 */
async function retrieveRecommendations(query, k = 5) {
  try {
    const collection = mongoose.connection.db.collection('recommendations');
    const count = await collection.countDocuments();

    if (count === 0) {
      console.log('[RAG] No recommendations in DB, skipping vector search');
      return '';
    }

    const embeddings = new GeminiEmbeddings();

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: 'vector_index',
      textKey: 'description',
      embeddingKey: 'embedding'
    });

    const results = await vectorStore.similaritySearch(query, k);

    if (!results || results.length === 0) {
      console.log('[RAG] Vector search returned no results');
      return '';
    }

    return results.map((doc, i) => {
      const m = doc.metadata;
      return `המלצה ${i + 1}:
- קטגוריה: ${m.category || ''}
- היקף: ${m.circumference || ''}
- קאפ: ${m.cup || ''}
- חנות/קישור: ${m.store || m.link || ''}
- תיאור: ${m.description || doc.pageContent || ''}`;
    }).join('\n\n');
  } catch (err) {
    console.error('[RAG] retrieval error:', err.message);
    return '';
  }
}

module.exports = { retrieveRecommendations };
