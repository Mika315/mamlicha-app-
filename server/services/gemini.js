const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error('⚠️  GEMINI_API_KEY is not set in .env!');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a text embedding vector for a given text string.
 */
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.error('Gemini embedding error:', err);
    throw err;
  }
}

/**
 * Generate a chat response from Gemini using the full conversation history.
 */
async function generateChatResponse(history, userMessage, contextText = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemInstruction = `את "רוני", סטייליסטית אישית ועוזרת חכמה באתר הקהילה "ממליצה לך בגדול" – אתר המיועד לנשים ונערות בעלות חזה גדול (מידות D עד L).
עניי רק בהמלצות לבגדים שמתאימות לחזה גדול.
ענו בעברית בלבד. היי חמה, אישית ומעודדת.
אם יש לך המלצות רלוונטיות ממסד הנתונים, ציין אותן בצורה ברורה עם קישורים.
${contextText
  ? `הקשר ממסד הנתונים:\n${contextText}`
  : 'עדיין אין המלצות במאגר שלנו לקטגוריה זו, אבל את יכולה לעזור עם עצות כלליות!'}`;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemInstruction }]
        },
        {
          role: 'model',
          parts: [{ text: 'הבנתי! אני רוני, הסטייליסטית שלך. אשמח לעזור!' }]
        },
        ...history
      ]
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error('Gemini chat error:', err);
    throw err;
  }
}

module.exports = { generateEmbedding, generateChatResponse };
