const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error('⚠️  GEMINI_API_KEY is not set in environment variables!');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a text embedding vector for RAG.
 */
async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate a chat response using generateContent (simpler than startChat, no history issues).
 * All context is embedded directly in the prompt.
 */
async function generateChatResponse(history, userMessage, contextText = '') {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `את "רוני", סטייליסטית אישית ועוזרת חכמה באתר הקהילה "ממליצה לך בגדול".
האתר מיועד לנשים ונערות בעלות חזה גדול (מידות D עד L).
ענו בעברית בלבד. היי חמה, אישית ומעודדת.
אם יש המלצות רלוונטיות ממסד הנתונים — ציין אותן בצורה ברורה עם קישורים.
אם אין — ספקי עצות כלליות מועילות בהתאם למידה ולקטגוריה.`;

  const dbContext = contextText
    ? `\n\nהמלצות רלוונטיות ממסד הנתונים של האתר:\n${contextText}`
    : '\n\n(אין עדיין המלצות ספציפיות במסד הנתונים לבקשה זו — ענו עם עצות כלליות.)';

  const fullPrompt = `${systemPrompt}${dbContext}\n\nשאלת המשתמשת:\n${userMessage}`;

  console.log('[Gemini] Calling generateContent, prompt length:', fullPrompt.length);

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();

  console.log('[Gemini] Response received, length:', text.length);
  return text;
}

module.exports = { generateEmbedding, generateChatResponse };
