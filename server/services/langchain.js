const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const mongoose = require('mongoose');

/**
 * Perform RAG vector search on the recommendations collection.
 * Returns a formatted string of top matching recommendations.
 * Falls back to empty string if DB is empty or search fails.
 */
async function retrieveRecommendations(query, k = 5) {
  try {
    // Check if collection has any documents first
    const collection = mongoose.connection.db.collection('recommendations');
    const count = await collection.countDocuments();

    if (count === 0) {
      console.log('[RAG] No recommendations in DB, skipping vector search');
      return '';
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'embedding-001'
    });

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
    return ''; // Always fall back gracefully
  }
}

module.exports = { retrieveRecommendations };
