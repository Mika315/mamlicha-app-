/* =============================================
   recommend.js — Submit recommendation + face blur
   iPhone-optimised canvas blur tool
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
     CANVAS BLUR TOOL
     Architecture:
       displayCanvas  — small, fits screen (CSS pixels), shown to user
       origCanvas     — capped-resolution copy (max 1920px), never modified
       blurCanvas     — same size as origCanvas, accumulates blur strokes, exported
       scaleToOrig    — multiply displayCanvas coords → origCanvas coords
     iPhone fixes:
       • createImageBitmap({imageOrientation:'from-image'}) fixes EXIF rotation
       • Max 1920px prevents memory crash on 12-MP photos
       • touch-action:none stops iOS scroll stealing events
       • Cursor drawn as thick filled+stroked circle — visible on touch
  ============================================= */

  var MAX_DIM  = 1920;   // max exported image dimension (px)

  var imageInput  = document.getElementById('image-input');
  var canvasWrap  = document.getElementById('canvas-wrap');
  var canvas      = document.getElementById('imageCanvas');
  var ctx         = canvas ? canvas.getContext('2d') : null;

  var origCanvas  = null;
  var blurCanvas  = null;
  var isDrawing   = false;
  var scaleToOrig = 1;      // displayCanvas → origCanvas coordinate factor
  var cursorTimer = null;   // used to keep cursor visible briefly after touchend

  if (canvas) {
    // Prevent iOS from stealing touch events for scrolling
    canvas.style.touchAction = 'none';
  }

  function makeOffscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* Display brush radius (CSS pixels) */
  function getDisplayBrush() {
    var el = document.getElementById('brush-size');
    return parseInt(el ? el.value : 30) || 30;
  }

  /* Render blurCanvas (scaled) onto displayCanvas; optionally draw cursor */
  function renderCanvas(showCursor, cx, cy) {
    if (!ctx || !blurCanvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height);
    if (showCursor && cx !== undefined) {
      var r = getDisplayBrush();
      /* Outer ring */
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231,84,128,0.95)';
      ctx.lineWidth   = 3;
      ctx.setLineDash([]);
      ctx.stroke();
      /* Inner fill */
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(231,84,128,0.18)';
      ctx.fill();
      /* Centre dot — easy to spot on touch */
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(231,84,128,1)';
      ctx.fill();
    }
  }

  /* Apply circular blur at origCanvas coordinates (ox, oy) */
  function applyBlurAt(ox, oy) {
    if (!origCanvas || !blurCanvas) return;
    var r      = Math.round(getDisplayBrush() * scaleToOrig);
    var blurPx = Math.max(10, Math.round(14 * Math.min(scaleToOrig, 3)));
    var pad    = blurPx * 3;

    var bx = Math.max(0, Math.floor(ox - r));
    var by = Math.max(0, Math.floor(oy - r));
    var bw = Math.min(r * 2, blurCanvas.width  - bx);
    var bh = Math.min(r * 2, blurCanvas.height - by);
    if (bw <= 0 || bh <= 0) return;

    var sx = Math.max(0, bx - pad);
    var sy = Math.max(0, by - pad);
    var sw = Math.min(bw + pad * 2, origCanvas.width  - sx);
    var sh = Math.min(bh + pad * 2, origCanvas.height - sy);

    var tmp  = makeOffscreen(sw, sh);
    var tCtx = tmp.getContext('2d');
    tCtx.filter = 'blur(' + blurPx + 'px)';
    tCtx.drawImage(origCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    tCtx.filter = 'none';

    var bCtx = blurCanvas.getContext('2d');
    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(ox, oy, r, 0, Math.PI * 2);
    bCtx.clip();
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
  }

  /* Touch/mouse position in displayCanvas CSS-pixel coordinates */
  function getDisplayPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY
    };
  }

  /* Convert displayCanvas coords → origCanvas coords */
  function toOrig(p) {
    return { x: p.x * scaleToOrig, y: p.y * scaleToOrig };
  }

  /* ---- Load image, fixing EXIF orientation (critical for iPhone) ---- */
  function setupCanvasFromBitmap(bmpOrImg, naturalW, naturalH) {
    /* Cap resolution to avoid memory crash on 12-MP iPhone photos */
    var capScale = Math.min(MAX_DIM / naturalW, MAX_DIM / naturalH, 1);
    var capW     = Math.round(naturalW * capScale);
    var capH     = Math.round(naturalH * capScale);

    /* Display canvas: fit in viewport */
    var maxW   = Math.min(window.innerWidth - 40, 560);
    var scale  = Math.min(maxW / capW, 420 / capH, 1);
    var dispW  = Math.round(capW * scale);
    var dispH  = Math.round(capH * scale);

    canvas.width  = dispW;
    canvas.height = dispH;
    canvas.style.width  = '';
    canvas.style.height = '';

    scaleToOrig = capW / dispW;   // typically ~3–6× on iPhone portrait

    /* Full-res (capped) offscreen canvases */
    origCanvas = makeOffscreen(capW, capH);
    origCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);

    blurCanvas = makeOffscreen(capW, capH);
    blurCanvas.getContext('2d').drawImage(bmpOrImg, 0, 0, capW, capH);

    renderCanvas(false);
    canvasWrap.style.display = 'block';

    /* Close the ImageBitmap to free GPU memory */
    if (bmpOrImg && typeof bmpOrImg.close === 'function') bmpOrImg.close();
  }

  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;

      /* createImageBitmap with imageOrientation:'from-image' handles iPhone EXIF rotation.
         Falls back to FileReader + <img> for older browsers. */
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none' })
        .then(function(bmp) {
          setupCanvasFromBitmap(bmp, bmp.width, bmp.height);
        })
        .catch(function() { fallbackLoad(file); });
      } else {
        fallbackLoad(file);
      }
    });
  }

  function fallbackLoad(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        setupCanvasFromBitmap(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---- Mouse events ---- */
  if (canvas) {
    canvas.addEventListener('mousedown', function(e) {
      isDrawing = true;
      var p = getDisplayPos(e);
      applyBlurAt(toOrig(p).x, toOrig(p).y);
      renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mousemove', function(e) {
      var p = getDisplayPos(e);
      if (isDrawing) applyBlurAt(toOrig(p).x, toOrig(p).y);
      renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mouseup',    function() { isDrawing = false; renderCanvas(false); });
    canvas.addEventListener('mouseleave', function() { isDrawing = false; renderCanvas(false); });

    /* ---- Touch events (iPhone / Android) ---- */
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (cursorTimer) { clearTimeout(cursorTimer); cursorTimer = null; }
      isDrawing = true;
      var p = getDisplayPos(e);
      applyBlurAt(toOrig(p).x, toOrig(p).y);
      renderCanvas(true, p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var p = getDisplayPos(e);
      if (isDrawing) applyBlurAt(toOrig(p).x, toOrig(p).y);
      renderCanvas(true, p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      isDrawing = false;
      /* Keep cursor visible for 600ms after lifting finger */
      if (e.changedTouches && e.changedTouches.length) {
        var rect = canvas.getBoundingClientRect();
        var t    = e.changedTouches[0];
        var sx   = canvas.width  / rect.width;
        var sy   = canvas.height / rect.height;
        var lx   = (t.clientX - rect.left) * sx;
        var ly   = (t.clientY - rect.top)  * sy;
        renderCanvas(true, lx, ly);
        cursorTimer = setTimeout(function() { renderCanvas(false); cursorTimer = null; }, 600);
      } else {
        renderCanvas(false);
      }
    });
  }

  /* ---- Reset button ---- */
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
      var alertEl = document.getElementById('alert-msg');
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
      document.querySelectorAll('input[name="features"]:checked').forEach(function(cb) {
        features.push(cb.value);
      });

      var payload = {
        circumference: parseInt(circumference),
        cup:           cup,
        category:      category,
        link:          document.getElementById('link').value.trim(),
        store:         document.getElementById('store').value.trim(),
        features:      features,
        description:   document.getElementById('description').value.trim(),
        imageUrl:      '',
        isAnonymous:   document.getElementById('is-anonymous').checked,
        email:         document.getElementById('email').value.trim()
      };

      function doSubmit(imageUrl) {
        payload.imageUrl = imageUrl;
        fetch('/api/recommendations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
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

      /* Export from full-res blurCanvas (max 1920px, JPEG 92%) */
      if (blurCanvas && canvasWrap.style.display !== 'none') {
        var base64 = blurCanvas.toDataURL('image/jpeg', 0.92);
        fetch('/api/upload', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ image: base64, folder: 'mamlicha/recommendations' })
        })
        .then(function(res) { return res.json(); })
        .then(function(uploadData) {
          if (uploadData.success) {
            doSubmit(uploadData.url);
          } else {
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
