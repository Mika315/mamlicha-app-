/* =============================================
   chatbot.js — "רוני" AI Stylist Chatbot Widget
   Present on all pages as floating sidebar
   ============================================= */

(function () {
  const CATEGORIES = [
    'חולצות וגופיות',
    'גוזיות וחולצות ספורט',
    'חזיות',
    'שמלות ערב',
    'שמלות כלה',
    'בגד ים',
    'אחר'
  ];

  // State
  let isOpen = false;
  let conversationHistory = []; // { role: 'user'|'assistant', content: string }
  let step = 'greeting'; // greeting → category → size → preferences → results

  // DOM
  const bubble = document.getElementById('chatbot-bubble');
  const toggleBtn = document.getElementById('chatbot-toggle');
  const windowEl = document.getElementById('chatbot-window');

  if (!bubble || !toggleBtn || !windowEl) return;

  // Build chatbot window
  windowEl.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">💅</div>
      <div>
        <div style="font-size:1rem">רוני הסטייליסטית</div>
        <div style="font-size:0.78rem;opacity:0.85">מבוססת בינה מלאכותית 💕</div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-quick-btns" id="chat-quick-btns"></div>
    <div class="chat-input-row">
      <button class="chat-send-btn" id="chat-send" title="שלחי">➤</button>
      <input type="text" class="chat-input" id="chat-input" placeholder="הקלידי הודעה..." />
    </div>
  `;

  // Toggle open/close
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    windowEl.classList.toggle('hidden', !isOpen);
    if (isOpen && conversationHistory.length === 0) {
      startGreeting();
    }
  });

  // Send on button click
  document.getElementById('chat-send').addEventListener('click', sendMessage);

  // Send on Enter
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ============ GREETING ============
  function startGreeting() {
    addBotMessage('שלום, אני רוני – הסטייליסטית האישית שלך 💕 אני מבוססת בינה מלאכותית ואעשה כל שביכולתי לעזור!');
    setTimeout(() => {
      addBotMessage('מה את מחפשת היום? 🛍️');
      showCategoryButtons();
      step = 'category';
    }, 700);
  }

  // ============ SHOW CATEGORY BUTTONS ============
  function showCategoryButtons() {
    const btnContainer = document.getElementById('chat-quick-btns');
    btnContainer.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-btn';
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        clearQuickBtns();
        addUserMessage(cat);
        conversationHistory.push({ role: 'user', content: cat });
        step = 'size';
        setTimeout(() => {
          addBotMessage('מה המידה שלך? 📏\nלדוגמה: "היקף 90, קאפ F"');
        }, 400);
      });
      btnContainer.appendChild(btn);
    });
  }

  // ============ SEND MESSAGE ============
  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    clearQuickBtns();

    addUserMessage(msg);
    conversationHistory.push({ role: 'user', content: msg });

    if (step === 'size') {
      step = 'preferences';
      setTimeout(() => {
        addBotMessage('תודה! ספרי לי עוד – סגנון, רמת תמיכה, תקציב, העדפות בד... 🌸');
      }, 400);
      return;
    }

    if (step === 'preferences') {
      step = 'results';
    }

    // Call AI backend
    addTypingIndicator();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: conversationHistory.slice(0, -1),
          message: msg
        })
      });
      const data = await res.json();
      removeTypingIndicator();

      const reply = data.success ? data.reply : 'מצטערת, הייתה שגיאה. נסי שוב 🙏';
      conversationHistory.push({ role: 'assistant', content: reply });
      addBotMessage(reply);

      // Offer to continue
      setTimeout(() => {
        const btnContainer = document.getElementById('chat-quick-btns');
        btnContainer.innerHTML = '';
        const continueBtn = document.createElement('button');
        continueBtn.className = 'chat-quick-btn';
        continueBtn.textContent = '🔄 חיפוש חדש';
        continueBtn.addEventListener('click', () => {
          clearQuickBtns();
          conversationHistory = [];
          step = 'category';
          addBotMessage('כמובן! מה את מחפשת הפעם? 💕');
          showCategoryButtons();
        });
        btnContainer.appendChild(continueBtn);
      }, 800);
    } catch (err) {
      removeTypingIndicator();
      addBotMessage('אופס! נראה שיש בעיה בחיבור לשרת. נסי שוב בעוד רגע 🙏');
    }
  }

  // ============ DOM HELPERS ============
  function addBotMessage(text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = escHtml(text).replace(/\n/g, '<br>');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addUserMessage(text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addTypingIndicator() {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.id = 'chat-typing';
    div.textContent = '...';
    div.style.opacity = '0.6';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  function clearQuickBtns() {
    const btnContainer = document.getElementById('chat-quick-btns');
    if (btnContainer) btnContainer.innerHTML = '';
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
