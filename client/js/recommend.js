/* =============================================
   recommend.js — Submit recommendation + face blur
   ============================================= */

(function () {
  // Populate circumference dropdown (60–150 in steps of 5)
  var circumferenceSel = document.getElementById('circumference');
  if (circumferenceSel) {
    for (var v = 60; v <= 150; v += 5) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v + ' ס"מ';
      circumferenceSel.appendChild(opt);
    }
  }

  // ============ CANVAS BLUR TOOL ============
  // Strategy for quality preservation:
  //   displayCanvas — small, fits screen, used only for showing to user
  //   origCanvas    — full original resolution, never modified
  //   blurCanvas    — full original resolution, accumulates blur, exported on submit
  // Coordinates from touch/mouse are in displayCanvas space and are scaled up
  // to origCanvas/blurCanvas space before applying blur.

  var imageInput  = document.getElementById('image-input');
  var canvasWrap  = document.getElementById('canvas-wrap');
  var canvas      = document.getElementById('imageCanvas');  // display canvas
  var ctx         = canvas ? canvas.getContext('2d') : null;

  var origCanvas  = null;
  var blurCanvas  = null;
  var isDrawing   = false;
  var scaleToOrig = 1; // displayCanvas coords * scaleToOrig = origCanvas coords

  function makeOffscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function getBrushSize() {
    // Brush size is in display pixels; scale up to orig pixels for actual blur
    var el = document.getElementById('brush-size');
    var displayR = parseInt(el ? el.value : 30) || 30;
    return displayR * scaleToOrig;
  }

  // Copy blurCanvas (scaled down) to displayCanvas, optionally draw brush cursor
  function renderCanvas(showCursor, cx, cy) {
    if (!ctx || !blurCanvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height);
    if (showCursor) {
      var r = parseInt(document.getElementById('brush-size') ? document.getElementById('brush-size').value : 30) || 30;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231,84,128,0.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(231,84,128,0.08)';
      ctx.fill();
    }
  }

  // Blur a circular region on blurCanvas (full resolution), reading from origCanvas.
  // x, y are in ORIG canvas coordinates.
  function applyBlurAt(origX, origY) {
    if (!origCanvas || !blurCanvas) return;
    var r      = getBrushSize();
    var blurPx = Math.round(14 * scaleToOrig);
    var pad    = blurPx * 3;

    var bx = Math.max(0, Math.floor(origX - r));
    var by = Math.max(0, Math.floor(origY - r));
    var bw = Math.min(r * 2, blurCanvas.width - bx);
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
    bCtx.arc(origX, origY, r, 0, Math.PI * 2);
    bCtx.clip();
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
  }

  // Returns touch/mouse position in DISPLAY canvas pixel coordinates
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

  // Convert display coords to origCanvas coords
  function toOrig(p) {
    return { x: p.x * scaleToOrig, y: p.y * scaleToOrig };
  }

  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var origW = img.naturalWidth  || img.width;
          var origH = img.naturalHeight || img.height;

          // Display canvas: scaled to fit screen
          var maxW  = Math.min(window.innerWidth - 60, 560);
          var scale = Math.min(maxW / origW, 400 / origH, 1);
          var dispW = Math.round(origW * scale);
          var dispH = Math.round(origH * scale);

          canvas.width  = dispW;
          canvas.height = dispH;
          canvas.style.width  = '';
          canvas.style.height = '';

          // scaleToOrig: multiply display coords by this to get orig coords
          scaleToOrig = origW / dispW;

          // Full-resolution offscreen canvases
          origCanvas = makeOffscreen(origW, origH);
          origCanvas.getContext('2d').drawImage(img, 0, 0, origW, origH);

          blurCanvas = makeOffscreen(origW, origH);
          blurCanvas.getContext('2d').drawImage(img, 0, 0, origW, origH);

          renderCanvas(false);
          canvasWrap.style.display = 'block';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

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
    canvas.addEventListener('mouseup', function() { isDrawing = false; renderCanvas(false); });
    canvas.addEventListener('mouseleave', function() { isDrawing = false; renderCanvas(false); });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
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
    canvas.addEventListener('touchend', function() { isDrawing = false; renderCanvas(false); });
  }

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

  // ============ FORM SUBMIT ============
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
      submitBtn.disabled = true;
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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

      // Export from blurCanvas (full original resolution)
      if (blurCanvas && canvasWrap.style.display !== 'none') {
        var base64 = blurCanvas.toDataURL('image/jpeg', 0.92);
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, folder: 'mamlicha/recommendations' })
        })
        .then(function(res) { return res.json(); })
        .then(function(uploadData) {
          if (uploadData.success) {
            doSubmit(uploadData.url);
          } else {
            showAlert(alertEl, 'error', 'העלאת התמונה נכשלה: ' + (uploadData.message || 'שגיאה') + ' — ניתן לשלוח ללא תמונה.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'שלחי המלצה';
          }
        })
        .catch(function() {
          showAlert(alertEl, 'error', 'שגיאה בהעלאת התמונה. בדקי חיבור ונסי שוב.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'שלחי המלצה';
        });
      } else {
        doSubmit('');
      }
    });
  }

  function showAlert(el, type, msg) {
    if (!el) return;
    el.className = 'alert' + (type ? ' ' + type + ' show' : '');
    el.textContent = msg;
  }
})();
