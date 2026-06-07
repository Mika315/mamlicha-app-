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
  let forumOrigCanvas = null;
  let forumBlurCanvas = null;
  let isDrawing = false;

  function makeOffscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function getForumBrushSize() {
    return parseInt(document.getElementById('forum-brush-size')?.value || 30);
  }

  function forumRenderCanvas(showCursor, cx, cy) {
    if (!forumCtx || !forumBlurCanvas) return;
    forumCtx.clearRect(0, 0, forumCanvas.width, forumCanvas.height);
    forumCtx.drawImage(forumBlurCanvas, 0, 0);
    if (showCursor) {
      const r = getForumBrushSize();
      forumCtx.beginPath();
      forumCtx.arc(cx, cy, r, 0, Math.PI * 2);
      forumCtx.strokeStyle = 'rgba(231,84,128,0.85)';
      forumCtx.lineWidth = 2;
      forumCtx.setLineDash([5, 4]);
      forumCtx.stroke();
      forumCtx.setLineDash([]);
    }
  }

  function forumApplyBlurAt(x, y) {
    if (!forumOrigCanvas || !forumBlurCanvas) return;
    const r = getForumBrushSize();
    const blurPx = 14;
    const pad = blurPx * 3;

    const bx = Math.max(0, Math.floor(x - r));
    const by = Math.max(0, Math.floor(y - r));
    const bw = Math.min(r * 2, forumBlurCanvas.width - bx);
    const bh = Math.min(r * 2, forumBlurCanvas.height - by);
    if (bw <= 0 || bh <= 0) return;

    const sx = Math.max(0, bx - pad);
    const sy = Math.max(0, by - pad);
    const sw = Math.min(bw + pad * 2, forumOrigCanvas.width - sx);
    const sh = Math.min(bh + pad * 2, forumOrigCanvas.height - sy);

    const tmp = makeOffscreen(sw, sh);
    const tCtx = tmp.getContext('2d');
    tCtx.filter = `blur(${blurPx}px)`;
    tCtx.drawImage(forumOrigCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    tCtx.filter = 'none';

    const bCtx = forumBlurCanvas.getContext('2d');
    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.clip();
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
  }

  function getPos(cvs, e) {
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  if (forumImageInput) {
    forumImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxW = Math.min(window.innerWidth - 60, 500);
          const scale = Math.min(maxW / img.width, 350 / img.height, 1);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          forumCanvas.width = w; forumCanvas.height = h;

          forumOrigCanvas = makeOffscreen(w, h);
          forumOrigCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

          forumBlurCanvas = makeOffscreen(w, h);
          forumBlurCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

          forumRenderCanvas(false);
          forumCanvasWrap.style.display = 'block';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (forumCanvas) {
    forumCanvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const p = getPos(forumCanvas, e);
      forumApplyBlurAt(p.x, p.y);
      forumRenderCanvas(true, p.x, p.y);
    });
    forumCanvas.addEventListener('mousemove', (e) => {
      const p = getPos(forumCanvas, e);
      if (isDrawing) forumApplyBlurAt(p.x, p.y);
      forumRenderCanvas(true, p.x, p.y);
    });
    forumCanvas.addEventListener('mouseup', () => { isDrawing = false; forumRenderCanvas(false); });
    forumCanvas.addEventListener('mouseleave', () => { isDrawing = false; forumRenderCanvas(false); });

    forumCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDrawing = true;
      const p = getPos(forumCanvas, e);
      forumApplyBlurAt(p.x, p.y);
      forumRenderCanvas(true, p.x, p.y);
    }, { passive: false });
    forumCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const p = getPos(forumCanvas, e);
      if (isDrawing) forumApplyBlurAt(p.x, p.y);
      forumRenderCanvas(true, p.x, p.y);
    }, { passive: false });
    forumCanvas.addEventListener('touchend', () => { isDrawing = false; forumRenderCanvas(false); });
  }

  const forumBtnReset = document.getElementById('forum-btn-reset');
  if (forumBtnReset) {
    forumBtnReset.addEventListener('click', () => {
      if (forumOrigCanvas && forumBlurCanvas) {
        forumBlurCanvas.getContext('2d').clearRect(0, 0, forumBlurCanvas.width, forumBlurCanvas.height);
        forumBlurCanvas.getContext('2d').drawImage(forumOrigCanvas, 0, 0);
        forumRenderCanvas(false);
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
        // Upload image if exists (export from blurCanvas — no cursor artifact)
        let imageUrl = '';
        if (forumBlurCanvas && forumCanvasWrap.style.display !== 'none') {
          const base64 = forumBlurCanvas.toDataURL('image/jpeg', 0.85);
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
          <button type="submit" class="btn btn-primary" style="font-size:0.85rem;padding: