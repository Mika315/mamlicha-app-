/* =============================================
   recommend.js — Submit recommendation + face blur
   ============================================= */

(function () {
  // Populate circumference dropdown
  const circumferenceSel = document.getElementById('circumference');
  if (circumferenceSel) {
    for (let v = 60; v <= 150; v += 5) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `${v} ס"מ`;
      circumferenceSel.appendChild(opt);
    }
  }

  // ============ CANVAS BLUR TOOL ============
  const imageInput = document.getElementById('image-input');
  const canvasWrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('imageCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let originalImage = null;
  let isDrawing = false;

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          originalImage = img;
          const maxW = Math.min(window.innerWidth - 60, 560);
          const scale = Math.min(maxW / img.width, 400 / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvasWrap.style.display = 'block';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function applyBlur(x, y) {
    const brushSize = parseInt(document.getElementById('brush-size')?.value || 30);
    const r = brushSize;
    const x0 = Math.max(0, x - r);
    const y0 = Math.max(0, y - r);
    const w = Math.min(r * 2, canvas.width - x0);
    const h = Math.min(r * 2, canvas.height - y0);

    ctx.save();
    ctx.filter = 'blur(12px)';
    ctx.drawImage(canvas, x0, y0, w, h, x0, y0, w, h);
    ctx.restore();
  }

  if (canvas) {
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; applyBlur(...Object.values(getPos(e))); });
    canvas.addEventListener('mousemove', (e) => { if (isDrawing) applyBlur(...Object.values(getPos(e))); });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; applyBlur(...Object.values(getPos(e))); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDrawing) applyBlur(...Object.values(getPos(e))); }, { passive: false });
    canvas.addEventListener('touchend', () => { isDrawing = false; });
  }

  const btnReset = document.getElementById('btn-reset-canvas');
  if (btnReset && canvas && ctx) {
    btnReset.addEventListener('click', () => {
      if (originalImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      }
    });
  }

  // ============ FORM SUBMIT ============
  const form = document.getElementById('recommend-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('alert-msg');
      showAlert(alertEl, '', '');

      const circumference = document.getElementById('circumference').value;
      const cup = document.getElementById('cup').value;
      const category = document.getElementById('category').value;

      if (!circumference || !cup || !category) {
        return showAlert(alertEl, 'error', 'יש למלא את כל שדות החובה (היקף, קאפ, קטגוריה)');
      }

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'שולחת...';

      try {
        // Upload image if exists
        let imageUrl = '';
        if (canvas && canvasWrap.style.display !== 'none') {
          try {
            const base64 = canvas.toDataURL('image/jpeg', 0.85);
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64, folder: 'mamlicha/recommendations' })
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              imageUrl = uploadData.url;
            } else {
              showAlert(alertEl, 'error', '⚠️ העלאת התמונה נכשלה: ' + (uploadData.message || 'שגיאה לא ידועה') + ' — ניתן לשלוח ללא תמונה.');
              submitBtn.disabled = false;
              submitBtn.textContent = '💕 שלחי המלצה';
              return;
            }
          } catch (uploadErr) {
            showAlert(alertEl, 'error', '⚠️ שגיאה בהעלאת התמונה. בדקי את חיבור האינטרנט ונסי שוב.');
            submitBtn.disabled = false;
            submitBtn.textContent = '💕 שלחי המלצה';
            return;
          }
        }

        const features = [...document.querySelectorAll('input[name="features"]:checked')].map(cb => cb.value);

        const payload = {
          circumference: parseInt(circumference),
          cup,
          category,
          link: document.getElementById('link').value.trim(),
          store: document.getElementById('store').value.trim(),
          features,
          description: document.getElementById('description').value.trim(),
          imageUrl,
          isAnonymous: document.getElementById('is-anonymous').checked,
          email: document.getElementById('email').value.trim()
        };

        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          showAlert(alertEl, 'success', '💕 ההמלצה שלך נשלחה בהצלחה! תודה שחלקת עם הקהילה!');
          form.reset();
          canvasWrap.style.display = 'none';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showAlert(alertEl, 'error', data.message || 'שגיאה בשליחה, נסי שוב');
        }
      } catch (err) {
        showAlert(alertEl, 'error', 'שגיאת שרת. נסי שוב מאוחר יותר.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💕 שלחי המלצה';
      }
    });
  }

  function showAlert(el, type, msg) {
    if (!el) return;
    el.className = 'alert' + (type ? ` ${type} show` : '');
    el.textContent = msg;
  }
})();
