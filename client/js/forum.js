/* =============================================
   forum.js — Community forum
   Features: real-time search, 10-per-page pagination,
             instant post after submit, iOS-safe canvas blur
   ============================================= */

(function () {

  var POSTS_PER_PAGE = 10;

  /* State */
  var allPosts    = [];   // full list from server
  var filtered    = [];   // after search filter
  var currentPage = 1;

  /* DOM refs */
  var searchInput     = document.getElementById('forum-search');
  var postsContainer  = document.getElementById('forum-posts');
  var loadingEl       = document.getElementById('forum-loading');
  var emptyEl         = document.getElementById('forum-empty');
  var paginationEl    = document.getElementById('forum-pagination');
  var btnPrev         = document.getElementById('btn-prev');
  var btnNext         = document.getElementById('btn-next');
  var pageIndicator   = document.getElementById('page-indicator');

  /* =============================================
     LOAD & RENDER POSTS
  ============================================= */
  function loadPosts(scrollToTop) {
    if (!postsContainer) return;
    loadingEl.style.display = 'block';
    postsContainer.innerHTML = '';
    emptyEl.style.display = 'none';
    paginationEl.style.display = 'none';

    fetch('/api/forum')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      loadingEl.style.display = 'none';
      allPosts = (data.success && data.data) ? data.data : [];
      applySearchFilter();
      if (scrollToTop) window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(function() {
      loadingEl.style.display = 'none';
      emptyEl.style.display = 'block';
    });
  }

  function applySearchFilter() {
    var q = (searchInput ? searchInput.value.trim().toLowerCase() : '');
    if (!q) {
      filtered = allPosts.slice();
    } else {
      filtered = allPosts.filter(function(p) {
        return (p.title  && p.title.toLowerCase().indexOf(q)  !== -1) ||
               (p.body   && p.body.toLowerCase().indexOf(q)   !== -1);
      });
    }
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    postsContainer.innerHTML = '';
    emptyEl.style.display = 'none';
    paginationEl.style.display = 'none';

    if (!filtered.length) {
      emptyEl.style.display = 'block';
      return;
    }

    var totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
    var start = (currentPage - 1) * POSTS_PER_PAGE;
    var page  = filtered.slice(start, start + POSTS_PER_PAGE);

    page.forEach(function(post) {
      postsContainer.appendChild(buildPost(post));
    });

    /* Pagination */
    if (totalPages > 1) {
      paginationEl.style.display = 'flex';
      pageIndicator.textContent  = 'עמוד ' + currentPage + ' מתוך ' + totalPages;
      btnPrev.disabled = (currentPage === 1);
      btnNext.disabled = (currentPage === totalPages);
    }
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', function() {
      if (currentPage > 1) { currentPage--; renderPage(); window.scrollTo({ top: postsContainer.offsetTop - 80, behavior: 'smooth' }); }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', function() {
      var totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
      if (currentPage < totalPages) { currentPage++; renderPage(); window.scrollTo({ top: postsContainer.offsetTop - 80, behavior: 'smooth' }); }
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', applySearchFilter);
  }

  /* =============================================
     BUILD POST ELEMENT
  ============================================= */
  function buildPost(post) {
    var el   = document.createElement('article');
    el.className  = 'forum-post';
    el.dataset.id = post._id;

    var date = formatDateTime(post.createdAt);
    var name = post.isAnonymous ? 'אנונימית' : (post.displayName || 'אנונימית');
    var repliesHtml = (post.replies || []).map(buildReplyHtml).join('');

    el.innerHTML =
      '<div class="forum-post-header">' +
        '<span class="forum-post-title">' + escHtml(post.title) + '</span>' +
        '<span class="forum-post-meta">' + escHtml(name) + ' • ' + date + '</span>' +
      '</div>' +
      '<div class="forum-post-body">' + escHtml(post.body) + '</div>' +
      (post.imageUrl ? '<img class="forum-post-img" src="' + escHtml(post.imageUrl) + '" alt="תמונה" loading="lazy" />' : '') +
      '<div class="replies" id="replies-' + post._id + '">' + repliesHtml + '</div>' +
      '<div>' +
        '<button class="btn btn-outline toggle-reply-btn" data-id="' + post._id + '" style="font-size:0.85rem;padding:0.4rem 0.9rem;margin-top:0.5rem">💬 הגיבי</button>' +
        '<form class="reply-form" id="reply-form-' + post._id + '" style="display:none;margin-top:0.5rem">' +
          '<textarea class="form-control" placeholder="כתבי תגובה..." required style="margin-bottom:0.4rem;min-height:60px"></textarea>' +
          '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.4rem">' +
            '<label class="checkbox-label" style="font-size:0.85rem"><input type="checkbox" class="reply-anon" /> אנונימי</label>' +
            '<input type="text" class="form-control reply-name" placeholder="שם (אופציונלי)" style="max-width:180px;padding:0.35rem 0.7rem;font-size:0.85rem" />' +
          '</div>' +
          '<button type="submit" class="btn btn-primary" style="font-size:0.85rem;padding:0.45rem 1rem">שלחי</button>' +
        '</form>' +
      '</div>';

    /* Toggle reply form */
    el.querySelector('.toggle-reply-btn').addEventListener('click', function() {
      var form = el.querySelector('#reply-form-' + post._id);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    /* Submit reply */
    el.querySelector('#reply-form-' + post._id).addEventListener('submit', function(e) {
      e.preventDefault();
      var form       = e.target;
      var body       = form.querySelector('textarea').value.trim();
      var isAnon     = form.querySelector('.reply-anon').checked;
      var dispName   = form.querySelector('.reply-name').value.trim();
      if (!body) return;

      fetch('/api/forum/' + post._id + '/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: body, isAnonymous: isAnon, displayName: dispName })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          var container = el.querySelector('#replies-' + post._id);
          container.insertAdjacentHTML('beforeend', buildReplyHtml(data.data));
          form.reset();
          form.style.display = 'none';
        }
      })
      .catch(function(err) { console.error('reply error', err); });
    });

    return el;
  }

  function buildReplyHtml(reply) {
    var date = formatDateTime(reply.createdAt);
    var name = reply.isAnonymous ? 'אנונימית' : (reply.displayName || 'אנונימית');
    return '<div class="reply">' +
      '<div class="reply-meta">' + escHtml(name) + ' • ' + date + '</div>' +
      '<div>' + escHtml(reply.body) + '</div>' +
    '</div>';
  }

  /* =============================================
     CANVAS BLUR (iOS-safe: scale-down/up, no ctx.filter)
  ============================================= */
  var MAX_DIM     = 1920;
  var BLUR_FACTOR = 10;

  var forumImageInput = document.getElementById('forum-image-input');
  var forumCanvasWrap = document.getElementById('forum-canvas-wrap');
  var forumCanvas     = document.getElementById('forumImageCanvas');
  var forumCtx        = forumCanvas ? forumCanvas.getContext('2d') : null;

  var forumOrigCanvas  = null;
  var forumBlurCanvas  = null;
  var isDrawing        = false;
  var fScaleToOrig     = 1;
  var fCursorTimer     = null;

  if (forumCanvas) forumCanvas.style.touchAction = 'none';

  function fMakeOffscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function fGetBrush() {
    var el = document.getElementById('forum-brush-size');
    return parseInt(el ? el.value : 30) || 30;
  }

  function forumRenderCanvas(showCursor, cx, cy) {
    if (!forumCtx || !forumBlurCanvas) return;
    forumCtx.clearRect(0, 0, forumCanvas.width, forumCanvas.height);
    forumCtx.drawImage(forumBlurCanvas, 0, 0, forumCanvas.width, forumCanvas.height);
    if (showCursor && cx !== undefined) {
      var r = fGetBrush();
      forumCtx.beginPath();
      forumCtx.arc(cx, cy, r, 0, Math.PI * 2);
      forumCtx.strokeStyle = 'rgba(231,84,128,1)';
      forumCtx.lineWidth   = 3;
      forumCtx.stroke();
      forumCtx.beginPath();
      forumCtx.arc(cx, cy, r, 0, Math.PI * 2);
      forumCtx.fillStyle = 'rgba(231,84,128,0.15)';
      forumCtx.fill();
      forumCtx.beginPath();
      forumCtx.arc(cx, cy, 5, 0, Math.PI * 2);
      forumCtx.fillStyle = 'rgba(231,84,128,1)';
      forumCtx.fill();
    }
  }

  function forumApplyBlurAt(ox, oy) {
    if (!forumOrigCanvas || !forumBlurCanvas) return;
    var r   = Math.max(4, Math.round(fGetBrush() * fScaleToOrig));
    var pad = r;
    var sx  = Math.max(0, Math.floor(ox - r - pad));
    var sy  = Math.max(0, Math.floor(oy - r - pad));
    var sw  = Math.min((r + pad) * 2, forumOrigCanvas.width  - sx);
    var sh  = Math.min((r + pad) * 2, forumOrigCanvas.height - sy);
    if (sw <= 0 || sh <= 0) return;

    var sW  = Math.max(2, Math.round(sw / BLUR_FACTOR));
    var sH  = Math.max(2, Math.round(sh / BLUR_FACTOR));
    var small = fMakeOffscreen(sW, sH);
    var sCtx  = small.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(forumOrigCanvas, sx, sy, sw, sh, 0, 0, sW, sH);

    var tmp  = fMakeOffscreen(sw, sh);
    var tCtx = tmp.getContext('2d');
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(small, 0, 0, sw, sh);

    var bx   = Math.max(0, Math.floor(ox - r));
    var by   = Math.max(0, Math.floor(oy - r));
    var bw   = Math.min(r * 2, forumBlurCanvas.width  - bx);
    var bh   = Math.min(r * 2, forumBlurCanvas.height - by);
    var bCtx = forumBlurCanvas.getContext('2d');
    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(ox, oy, r, 0, Math.PI * 2);
    bCtx.clip();
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
  }

  function fGetPos(e) {
    var rect   = forumCanvas.getBoundingClientRect();
    var scaleX = forumCanvas.width  / rect.width;
    var scaleY = forumCanvas.height / rect.height;
    var src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function fToOrig(p) { return { x: p.x * fScaleToOrig, y: p.y * fScaleToOrig }; }

  function fSetupCanvas(bmpOrImg, natW, natH) {
    var capS = Math.min(MAX_DIM / natW, MAX_DIM / natH, 1);
    var capW = Math.round(natW * capS);
    var capH = Math.round(natH * capS);
    var maxW  = Math.min(window.innerWidth - 40, 500);
    var scale = Math.min(maxW / capW, 380 / capH, 1);
    var dispW = Math.round(capW * scale);
    var dispH = Math.round(capH * scale);

    forumCanvas.width  = dispW;
    forumCanvas.height = dispH;
    forumCanvas.style.width  = '';
    forumCanvas.style.height = '';
    fScaleToOrig = capW / dispW;

    forumOrigCanvas = fMakeOffscreen(capW, capH);
    forumOrigCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);
    forumBlurCanvas = fMakeOffscreen(capW, capH);
    forumBlurCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);

    forumRenderCanvas(false);
    forumCanvasWrap.style.display = 'block';
    if (bmpOrImg && typeof bmpOrImg.close === 'function') bmpOrImg.close();
  }

  if (forumImageInput) {
    forumImageInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none' })
        .then(function(bmp) { fSetupCanvas(bmp, bmp.width, bmp.height); })
        .catch(function() { fFallbackLoad(file); });
      } else { fFallbackLoad(file); }
    });
  }

  function fFallbackLoad(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() { fSetupCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (forumCanvas) {
    forumCanvas.addEventListener('mousedown', function(e) { isDrawing = true; var p = fGetPos(e); var o = fToOrig(p); forumApplyBlurAt(o.x, o.y); forumRenderCanvas(true, p.x, p.y); });
    forumCanvas.addEventListener('mousemove', function(e) { var p = fGetPos(e); var o = fToOrig(p); if (isDrawing) forumApplyBlurAt(o.x, o.y); forumRenderCanvas(true, p.x, p.y); });
    forumCanvas.addEventListener('mouseup',    function() { isDrawing = false; forumRenderCanvas(false); });
    forumCanvas.addEventListener('mouseleave', function() { isDrawing = false; forumRenderCanvas(false); });

    forumCanvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (fCursorTimer) { clearTimeout(fCursorTimer); fCursorTimer = null; }
      isDrawing = true;
      var p = fGetPos(e); var o = fToOrig(p);
      forumApplyBlurAt(o.x, o.y); forumRenderCanvas(true, p.x, p.y);
    }, { passive: false });
    forumCanvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var p = fGetPos(e); var o = fToOrig(p);
      if (isDrawing) forumApplyBlurAt(o.x, o.y);
      forumRenderCanvas(true, p.x, p.y);
    }, { passive: false });
    forumCanvas.addEventListener('touchend', function(e) {
      isDrawing = false;
      if (e.changedTouches && e.changedTouches.length) {
        var rect = forumCanvas.getBoundingClientRect();
        var t  = e.changedTouches[0];
        var lx = (t.clientX - rect.left) * (forumCanvas.width  / rect.width);
        var ly = (t.clientY - rect.top)  * (forumCanvas.height / rect.height);
        forumRenderCanvas(true, lx, ly);
        fCursorTimer = setTimeout(function() { forumRenderCanvas(false); fCursorTimer = null; }, 500);
      } else { forumRenderCanvas(false); }
    });
  }

  var fBtnReset = document.getElementById('forum-btn-reset');
  if (fBtnReset) {
    fBtnReset.addEventListener('click', function() {
      if (forumOrigCanvas && forumBlurCanvas) {
        var bCtx = forumBlurCanvas.getContext('2d');
        bCtx.clearRect(0, 0, forumBlurCanvas.width, forumBlurCanvas.height);
        bCtx.drawImage(forumOrigCanvas, 0, 0);
        forumRenderCanvas(false);
      }
    });
  }

  /* =============================================
     ANONYMOUS TOGGLE
  ============================================= */
  var anonCheck = document.getElementById('post-anonymous');
  var nameWrap  = document.getElementById('post-name-wrap');
  if (anonCheck) {
    anonCheck.addEventListener('change', function() {
      if (nameWrap) nameWrap.style.display = anonCheck.checked ? 'none' : 'block';
    });
  }

  /* =============================================
     SUBMIT NEW POST — new post prepended immediately
  ============================================= */
  var postForm = document.getElementById('forum-post-form');
  if (postForm) {
    postForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('forum-alert');
      showAlert(alertEl, '', '');

      var title = document.getElementById('post-title').value.trim();
      var body  = document.getElementById('post-body').value.trim();
      if (!title || !body) {
        return showAlert(alertEl, 'error', 'יש למלא כותרת ותוכן');
      }

      var submitBtn = postForm.querySelector('[type="submit"]');
      submitBtn.disabled    = true;
      submitBtn.textContent = 'שולחת...';

      var isAnonymous = document.getElementById('post-anonymous').checked;
      var dispNameEl  = document.getElementById('post-display-name');
      var payload = {
        title:       title,
        body:        body,
        displayName: isAnonymous ? '' : (dispNameEl ? dispNameEl.value.trim() : ''),
        isAnonymous: isAnonymous,
        imageUrl:    ''
      };

      function doPost(imageUrl) {
        payload.imageUrl = imageUrl;
        fetch('/api/forum', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            showAlert(alertEl, 'success', '💕 הפוסט פורסם בהצלחה!');
            postForm.reset();
            if (forumCanvasWrap) forumCanvasWrap.style.display = 'none';
            if (nameWrap) nameWrap.style.display = 'block';

            /* Prepend new post to local state and re-render — no page reload needed */
            allPosts.unshift(data.data);
            applySearchFilter();

            /* Scroll to top of posts list */
            if (postsContainer) {
              var top = postsContainer.getBoundingClientRect().top + window.pageYOffset - 80;
              window.scrollTo({ top: top, behavior: 'smooth' });
            }
          } else {
            showAlert(alertEl, 'error', data.message || 'שגיאה בפרסום');
          }
        })
        .catch(function() { showAlert(alertEl, 'error', 'שגיאת שרת. נסי שוב.'); })
        .finally(function() { submitBtn.disabled = false; submitBtn.textContent = '💌 פרסמי פוסט'; });
      }

      if (forumBlurCanvas && forumCanvasWrap && forumCanvasWrap.style.display !== 'none') {
        var base64 = forumBlurCanvas.toDataURL('image/jpeg', 0.92);
        fetch('/api/upload', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ image: base64, folder: 'mamlicha/forum' })
        })
        .then(function(r) { return r.json(); })
        .then(function(up) {
          doPost(up.success ? up.url : '');
        })
        .catch(function() { doPost(''); });
      } else {
        doPost('');
      }
    });
  }

  /* =============================================
     HELPERS
  ============================================= */
  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('he-IL') + ' • ' +
           d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  function showAlert(el, type, msg) {
    if (!el) return;
    el.className   = 'alert' + (type ? ' ' + type + ' show' : '');
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

  /* Initial load */
  loadPosts(false);

})();
