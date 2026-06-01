/* =============================================
   forum.js — Community forum: posts & replies
   ============================================= */

(function () {
  loadPosts();

  // ============ CANVAS BLUR (Forum image) ============
  const forumImageInput = document.getElementById('forum-image-input');
  const forumCanvasWrap = document.getElementById('forum-canvas-wrap');
  const forumCanvas = document.getElementById('forumImageCanvas');
  const forumCtx = forumCanvas ? forumCanvas.getContext('2d') : null;
  let forumOriginalImage = null;
  let isDrawing = false;

  if (forumImageInput) {
    forumImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          forumOriginalImage = img;
          const maxW = Math.min(window.innerWidth - 60, 500);
          const scale = Math.min(maxW / img.width, 350 / img.height, 1);
          forumCanvas.width = img.width * scale;
          forumCanvas.height = img.height * scale;
          forumCtx.drawImage(img, 0, 0, forumCanvas.width, forumCanvas.height);
          forumCanvasWrap.style.display = 'block';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function applyBlur(canvas, ctx, x, y, brushSize) {
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

  if (forumCanvas) {
    const bs = () => parseInt(document.getElementById('forum-brush-size')?.value || 30);
    forumCanvas.addEventListener('mousedown', (e) => { isDrawing = true; const p = getPos(forumCanvas, e); applyBlur(forumCanvas, forumCtx, p.x, p.y, bs()); });
    forumCanvas.addEventListener('mousemove', (e) => { if (isDrawing) { const p = getPos(forumCanvas, e); applyBlur(forumCanvas, forumCtx, p.x, p.y, bs()); } });
    forumCanvas.addEventListener('mouseup', () => { isDrawing = false; });
    forumCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; const p = getPos(forumCanvas, e); applyBlur(forumCanvas, forumCtx, p.x, p.y, bs()); }, { passive: false });
    forumCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDrawing) { const p = getPos(forumCanvas, e); applyBlur(forumCanvas, forumCtx, p.x, p.y, bs()); } }, { passive: false });
    forumCanvas.addEventListener('touchend', () => { isDrawing = false; });
  }

  const forumBtnReset = document.getElementById('forum-btn-reset');
  if (forumBtnReset) {
    forumBtnReset.addEventListener('click', () => {
      if (forumOriginalImage && forumCtx) {
        forumCtx.clearRect(0, 0, forumCanvas.width, forumCanvas.height);
        forumCtx.drawImage(forumOriginalImage, 0, 0, forumCanvas.width, forumCanvas.height);
      }
    });
  }

  // ============ ANONYMOUS TOGGLE ============
  const anonCheck = document.getElementById('post-anonymous');
  const nameWrap = document.getElementById('post-name-wrap');
  if (anonCheck) {
    anonCheck.addEventListener('change', () => {
      if (nameWrap) nameWrap.style.display = anonCheck.checked ? 'none' : 'block';
    });
  }

  // ============ SUBMIT NEW POST ============
  const postForm = document.getElementById('forum-post-form');
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('forum-alert');
      showAlert(alertEl, '', '');

      const title = document.getElementById('post-title').value.trim();
      const body = document.getElementById('post-body').value.trim();
      if (!title || !body) {
        return showAlert(alertEl, 'error', 'יש למלא כותרת ותוכן הפוסט');
      }

      const submitBtn = postForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'שולחת...';

      try {
        // Upload image if exists
        let imageUrl = '';
        if (forumCanvas && forumCanvasWrap.style.display !== 'none') {
          const base64 = forumCanvas.toDataURL('image/jpeg', 0.85);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, folder: 'mamlicha/forum' })
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) imageUrl = uploadData.url;
        }

        const isAnonymous = document.getElementById('post-anonymous').checked;
        const payload = {
          title,
          body,
          displayName: isAnonymous ? '' : (document.getElementById('post-display-name')?.value.trim() || ''),
          isAnonymous,
          email: document.getElementById('post-email')?.value.trim() || '',
          imageUrl
        };

        const res = await fetch('/api/forum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          showAlert(alertEl, 'success', '💕 הפוסט שלך פורסם בהצלחה!');
          postForm.reset();
          forumCanvasWrap.style.display = 'none';
          loadPosts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showAlert(alertEl, 'error', data.message || 'שגיאה בפרסום');
        }
      } catch (err) {
        showAlert(alertEl, 'error', 'שגיאת שרת. נסי שוב מאוחר יותר.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💌 פרסמי פוסט';
      }
    });
  }

  // ============ LOAD POSTS ============
  async function loadPosts() {
    const container = document.getElementById('forum-posts');
    const loading = document.getElementById('forum-loading');
    const empty = document.getElementById('forum-empty');
    if (!container) return;

    loading.style.display = 'block';
    container.innerHTML = '';
    empty.style.display = 'none';

    try {
      const res = await fetch('/api/forum');
      const data = await res.json();
      loading.style.display = 'none';

      if (!data.success || !data.data.length) {
        empty.style.display = 'block';
        return;
      }
      data.data.forEach(post => container.appendChild(buildPost(post)));
    } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
    }
  }

  function buildPost(post) {
    const el = document.createElement('article');
    el.className = 'forum-post';
    el.dataset.id = post._id;

    const date = new Date(post.createdAt).toLocaleDateString('he-IL');
    const name = post.isAnonymous ? 'אנונימית' : (post.displayName || 'אנונימית');
    const repliesHtml = post.replies.map(r => buildReplyHtml(r)).join('');

    el.innerHTML = `
      <div class="forum-post-header">
        <span class="forum-post-title">${escHtml(post.title)}</span>
        <span class="forum-post-meta">${escHtml(name)} • ${date}</span>
      </div>
      <div class="forum-post-body">${escHtml(post.body)}</div>
      ${post.imageUrl ? `<img class="forum-post-img" src="${escHtml(post.imageUrl)}" alt="תמונה" loading="lazy" />` : ''}
      <div class="replies" id="replies-${post._id}">${repliesHtml}</div>
      <div>
        <button class="toggle-reply-btn" data-id="${post._id}">💬 הגיבי לפוסט זה</button>
        <form class="reply-form" id="reply-form-${post._id}" style="display:none;margin-top:0.5rem">
          <textarea placeholder="כתבי תגובה..." required></textarea>
          <div class="checkbox-group" style="margin:0.4rem 0">
            <label class="checkbox-label" style="font-size:0.85rem">
              <input type="checkbox" class="reply-anon" /> אנונימי
            </label>
            <input type="text" class="form-control reply-name" placeholder="שם (אופציונלי)" style="max-width:180px;padding:0.4rem 0.7rem;font-size:0.85rem" />
          </div>
          <button type="submit" class="btn btn-primary" style="font-size:0.85rem;padding:0.5rem 1rem">שלחי</button>
        </form>
      </div>
    `;

    // Toggle reply form
    el.querySelector('.toggle-reply-btn').addEventListener('click', () => {
      const form = el.querySelector(`#reply-form-${post._id}`);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // Submit reply
    el.querySelector(`#reply-form-${post._id}`).addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const body = form.querySelector('textarea').value.trim();
      const isAnon = form.querySelector('.reply-anon').checked;
      const displayName = form.querySelector('.reply-name').value.trim();
      if (!body) return;

      try {
        const res = await fetch(`/api/forum/${post._id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body, isAnonymous: isAnon, displayName })
        });
        const data = await res.json();
        if (data.success) {
          const repliesContainer = el.querySelector(`#replies-${post._id}`);
          repliesContainer.insertAdjacentHTML('beforeend', buildReplyHtml(data.data));
          form.reset();
          form.style.display = 'none';
        }
      } catch (err) {
        console.error(err);
      }
    });

    return el;
  }

  function buildReplyHtml(reply) {
    const date = new Date(reply.createdAt).toLocaleDateString('he-IL');
    const name = reply.isAnonymous ? 'אנונימית' : (reply.displayName || 'אנונימית');
    return `<div class="reply">
      <div class="reply-meta">${escHtml(name)} • ${date}</div>
      <div>${escHtml(reply.body)}</div>
    </div>`;
  }

  function showAlert(el, type, msg) {
    if (!el) return;
    el.className = 'alert' + (type ? ` ${type} show` : '');
    el.textContent = msg;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
