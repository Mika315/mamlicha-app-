/* =============================================
   recommend.js — Submit recommendation + face blur
   iOS Safari fix: ctx.filter is silently ignored on iOS < 18.
   Blur uses scale-down/scale-up which works on ALL browsers.
   ============================================= */

(function () {

  /* ---------- circumference dropdown ---------- */
  var circumferenceSel = document.getElementById('circumference');
  if (circumferenceSel) {
    for (var v = 60; v <= 150; v += 5) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v + ' ס"מ';
      circumferenceSel.appendChild(opt);
    }
  }

  /* =============================================
     CANVAS BLUR — works on iOS Safari, Android, Desktop
     Blur method: scale-down × factor then scale-up (pixelate)
       — ctx.filter:'blur()' is silently ignored on iOS < 18
       — scale-down/up works everywhere and is fast
     Architecture:
       displayCanvas  — small, fits screen (shown to user)
       origCanvas     — capped res (max 1920px, never modified)
       blurCanvas     — same size as origCanvas, accumulates blur, exported
       scaleToOrig    — displayCanvas coord × scaleToOrig = origCanvas coord
  ============================================= */

  var MAX_DIM     = 1920;
  var BLUR_FACTOR = 10;   // scale down by 10× then back up → strong pixel-blur

  var imageInput  = document.getElementById('image-input');
  var canvasWrap  = document.getElementById('canvas-wrap');
  var canvas      = document.getElementById('imageCanvas');
  var ctx         = canvas ? canvas.getContext('2d') : null;

  var origCanvas  = null;
  var blurCanvas  = null;
  var isDrawing   = false;
  var scaleToOrig = 1;
  var cursorTimer = null;

  if (canvas) {
    canvas.style.touchAction = 'none'; // prevent iOS scroll interference
  }

  function makeOffscreen(w, h) {
    var c = document.createElement('canvas');
    c.width  = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function getDisplayBrush() {
    var el = document.getElementById('brush-size');
    return parseInt(el ? el.value : 30) || 30;
  }

  /* Render blurCanvas → displayCanvas, optionally draw cursor */
  function renderCanvas(showCursor, cx, cy) {
    if (!ctx || !blurCanvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height);
    if (showCursor && cx !== undefined) {
      var r = getDisplayBrush();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231,84,128,1)';
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(231,84,128,0.15)';
      ctx.fill();
      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(231,84,128,1)';
      ctx.fill();
    }
  }

  /*
    applyBlurAt — circular blur at origCanvas coordinates (ox, oy).
    Uses scale-down/scale-up instead of ctx.filter (iOS Safari safe).
  */
  function applyBlurAt(ox, oy) {
    if (!origCanvas || !blurCanvas) return;

    var r  = Math.max(4, Math.round(getDisplayBrush() * scaleToOrig));
    var pad = r; // padding to avoid hard edge at brush boundary

    // Region to blur in origCanvas coordinates
    var sx = Math.max(0, Math.floor(ox - r - pad));
    var sy = Math.max(0, Math.floor(oy - r - pad));
    var sw = Math.min((r + pad) * 2, origCanvas.width  - sx);
    var sh = Math.min((r + pad) * 2, origCanvas.height - sy);
    if (sw <= 0 || sh <= 0) return;

    // --- Cross-browser blur via scale-down → scale-up ---
    var smallW = Math.max(2, Math.round(sw / BLUR_FACTOR));
    var smallH = Math.max(2, Math.round(sh / BLUR_FACTOR));

    // Step 1: draw patch from origCanvas scaled down
    var small  = makeOffscreen(smallW, smallH);
    var sCtx   = small.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(origCanvas, sx, sy, sw, sh, 0, 0, smallW, smallH);

    // Step 2: scale back up into a full-size temp canvas
    var tmp  = makeOffscreen(sw, sh);
    var tCtx = tmp.getContext('2d');
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(small, 0, 0, sw, sh);

    // Step 3: stamp onto blurCanvas, clipped to brush circle
    var bx   = Math.max(0, Math.floor(ox - r));
    var by   = Math.max(0, Math.floor(oy - r));
    var bw   = Math.min(r * 2, blurCanvas.width  - bx);
    var bh   = Math.min(r * 2, blurCanvas.height - by);

    var bCtx = blurCanvas.getContext('2d');
    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(ox, oy, r, 0, Math.PI * 2);
    bCtx.clip();
    // tmp contains the blurred patch starting at (sx,sy) in orig space
    // we draw the portion that corresponds to (bx..bx+bw, by..by+bh)
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
  }

  /* Touch/mouse → displayCanvas pixel coords */
  function getDisplayPos(e) {
    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY
    };
  }

  function toOrig(p) {
    return { x: p.x * scaleToOrig, y: p.y * scaleToOrig };
  }

  /* ---- Load image with EXIF orientation fix (iPhone portrait photos) ---- */
  function setupCanvas(bmpOrImg, natW, natH) {
    var capS = Math.min(MAX_DIM / natW, MAX_DIM / natH, 1);
    var capW = Math.round(natW * capS);
    var capH = Math.round(natH * capS);

    var maxW  = Math.min(window.innerWidth - 40, 560);
    var scale = Math.min(maxW / capW, 420 / capH, 1);
    var dispW = Math.round(capW * scale);
    var dispH = Math.round(capH * scale);

    canvas.width  = dispW;
    canvas.height = dispH;
    canvas.style.width  = '';
    canvas.style.height = '';
    scaleToOrig = capW / dispW;

    origCanvas = makeOffscreen(capW, capH);
    origCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);

    blurCanvas = makeOffscreen(capW, capH);
    blurCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);

    renderCanvas(false);
    canvasWrap.style.display = 'block';

    if (bmpOrImg && typeof bmpOrImg.close === 'function') bmpOrImg.close();
  }

  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none' })
        .then(function(bmp) { setupCanvas(bmp, bmp.width, bmp.height); })
        .catch(function()   { fallbackLoad(file); });
      } else {
        fallbackLoad(file);
      }
    });
  }

  function fallbackLoad(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() { setupCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---- Mouse ---- */
  if (canvas) {
    canvas.addEventListener('mousedown', function(e) {
      isDrawing = true;
      var p = getDisplayPos(e); var o = toOrig(p);
      applyBlurAt(o.x, o.y); renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mousemove', function(e) {
      var p = getDisplayPos(e); var o = toOrig(p);
      if (isDrawing) applyBlurAt(o.x, o.y);
      renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mouseup',    function() { isDrawing = false; renderCanvas(false); });
    canvas.addEventListener('mouseleave', function() { isDrawing = false; renderCanvas(false); });

    /* ---- Touch ---- */
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (cursorTimer) { clearTimeout(cursorTimer); cursorTimer = null; }
      isDrawing = true;
      var p = getDisplayPos(e); var o = toOrig(p);
      applyBlurAt(o.x, o.y); renderCanvas(true, p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var p = getDisplayPos(e); var o = toOrig(p);
      if (isDrawing) applyBlurAt(o.x, o.y);
      renderCanvas(true, p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      isDrawing = false;
      if (e.changedTouches && e.changedTouches.length) {
        var rect = canvas.getBoundingClientRect();
        var t    = e.changedTouches[0];
        var lx   = (t.clientX - rect.left) * (canvas.width  / rect.width);
        var ly   = (t.clientY - rect.top)  * (canvas.height / rect.height);
        renderCanvas(true, lx, ly);
        cursorTimer = setTimeout(function() { renderCanvas(false); cursorTimer = null; }, 500);
      } else {
        renderCanvas(false);
      }
    });
  }

  /* ---- Reset ---- */
  var btnReset = document.getElementById('btn-reset-canvas');
  if (btnReset && canvas && ctx) {
    btnReset.addEventListener('click', function() {
      if (origCanvas && blurCanvas) {
        var bCtx = blurCanvas.getContext('2d');
        bCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
        bCtx.drawImage(origCanvas, 0, 0);
        renderCanvas(false);
      }
    });
  }

  /* =============================================
     FORM SUBMIT
  ============================================= */
  var form = document.getElementById('recommend-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var alertEl   = document.getElementById('alert-msg');
      showAlert(alertEl, '', '');

      var circumference = document.getElementById('circumference').value;
      var cup           = document.getElementById('cup').value;
      var category      = document.getElementById('category').value;

      if (!circumference || !cup || !category) {
        return showAlert(alertEl, 'error', 'יש למלא את כל שדות החובה (היקף, קאפ, קטגוריה)');
      }

      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled    = true;
      submitBtn.textContent = 'שולחת...';

      var features = [];
      document.querySelectorAll('input[name="features"]:checked').forEach(function(cb) { features.push(cb.value); });

      var payload = {
        circumference: parseInt(circumference),
        cup:      cup,
        category: category,
        link:     document.getElementById('link').value.trim(),
        store:    document.getElementById('store').value.trim(),
        features: features,
        description: document.getElementById('description').value.trim(),
        imageUrl: '',
        isAnonymous: document.getElementById('is-anonymous').checked,
        email:    document.getElementById('email').value.trim()
      };

      function doSubmit(imageUrl) {
        payload.imageUrl = imageUrl;
        fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            showAlert(alertEl, 'success', 'ההמלצה שלך נשלחה בהצלחה! תודה שחלקת עם הקהילה!');
            form.reset();
            canvasWrap.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            showAlert(alertEl, 'error', data.message || 'שגיאה בשליחה, נסי שוב');
          }
        })
        .catch(function() { showAlert(alertEl, 'error', 'שגיאת שרת. נסי שוב מאוחר יותר.'); })
        .finally(function() { submitBtn.disabled = false; submitBtn.textContent = 'שלחי המלצה'; });
      }

      if (blurCanvas && canvasWrap.style.display !== 'none') {
        var base64 = blurCanvas.toDataURL('image/jpeg', 0.92);
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, folder: 'mamlicha/recommendations' })
        })
        .then(function(r) { return r.json(); })
        .then(function(uploadData) {
          if (uploadData.success) { doSubmit(uploadData.url); }
          else {
            showAlert(alertEl, 'error', 'העלאת התמונה נכשלה: ' + (uploadData.message || 'שגיאה'));
            submitBtn.disabled = false; submitBtn.textContent = 'שלחי המלצה';
          }
        })
        .catch(function() {
          showAlert(alertEl, 'error', 'שגיאה בהעלאת התמונה. בדקי חיבור ונסי שוב.');
          submitBtn.disabled = false; submitBtn.textContent = 'שלחי המלצה';
        });
      } else {
        doSubmit('');
      }
    });
  }

  function showAlert(el, type, msg) {
    if (!el) return;
    el.className   = 'alert' + (type ? ' ' + type + ' show' : '');
    el.textContent = msg;
  }

})();
