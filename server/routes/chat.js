const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../services/gemini');
const { retrieveRecommendations } = require('../services/langchain');

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { history = [], message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'הודעה חסרה' });

    console.log('[Chat] Step received, message:', message.substring(0, 60));

    // Retrieve relevant recommendations via RAG (with fallback)
    let contextText = '';
    try {
      contextText = await retrieveRecommendations(message);
      console.log('[Chat] RAG context length:', contextText.length);
    } catch (ragErr) {
      console.error('[Chat] RAG error (continuing without context):', ragErr.message);
    }

    // Build LangChain-compatible history format for Gemini
    const geminiHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const reply = await generateChatResponse(geminiHistory, message, contextText);
    console.log('[Chat] Reply generated, length:', reply.length);

    res.json({ success: true, reply });
  } catch (err) {
    console.error('[Chat] Gemini error:', err);
    res.status(500).json({ success: false, message: 'שגיאה בשרת הצ\'אט' });
  }
});

module.exports = router;
