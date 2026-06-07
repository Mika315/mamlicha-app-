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

  // Two offscreen canvases:
  //  origCanvas  — the untouched original image, never modified
  //  blurCanvas  — accumulates blur strokes; source of truth for export
  let origCanvas = null;
  let blurCanvas = null;
  let isDrawing = false;

  function makeOffscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function getBrushSize() {
    return parseInt(document.getElementById('brush-size')?.value || 30);
  }

  // Draw blurCanvas → visible canvas, plus optional brush-circle cursor
  function renderCanvas(showCursor, cx, cy) {
    if (!ctx || !blurCanvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(blurCanvas, 0, 0);
    if (showCursor) {
      const r = getBrushSize();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231,84,128,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Blur a circular patch on blurCanvas reading pixels from origCanvas,
  // so (a) only the stroked area blurs and (b) there is no self-referential bleed.
  function applyBlurAt(x, y) {
    if (!origCanvas || !blurCanvas) return;
    const r = getBrushSize();
    const blurPx = 14;
    const pad = blurPx * 3; // extra padding so the blur kernel doesn't bleed at the edges

    const bx = Math.max(0, Math.floor(x - r));
    const by = Math.max(0, Math.floor(y - r));
    const bw = Math.min(r * 2, blurCanvas.width - bx);
    const bh = Math.min(r * 2, blurCanvas.height - by);
    if (bw <= 0 || bh <= 0) return;

    // Source region (with padding) from original image
    const sx = Math.max(0, bx - pad);
    const sy = Math.max(0, by - pad);
    const sw = Math.min(bw + pad * 2, origCanvas.width - sx);
    const sh = Math.min(bh + pad * 2, origCanvas.height - sy);

    // Render blurred source into a temp canvas
    const tmp = makeOffscreen(sw, sh);
    const tCtx = tmp.getContext('2d');
    tCtx.filter = `blur(${blurPx}px)`;
    tCtx.drawImage(origCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    tCtx.filter = 'none';

    // Clip the blurred result to the circular brush shape, then stamp onto blurCanvas
    const bCtx = blurCanvas.getContext('2d');
    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.clip();
    bCtx.drawImage(tmp, bx - sx, by - sy, bw, bh, bx, by, bw, bh);
    bCtx.restore();
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

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxW = Math.min(window.innerWidth - 60, 560);
          const scale = Math.min(maxW / img.width, 400 / img.height, 1);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          canvas.width = w; canvas.height = h;

          origCanvas = makeOffscreen(w, h);
          origCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

          blurCanvas = makeOffscreen(w, h);
          blurCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

          renderCanvas(false);
          canvasWrap.style.display = 'block';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const p = getPos(e);
      applyBlurAt(p.x, p.y);
      renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mousemove', (e) => {
      const p = getPos(e);
      if (isDrawing) applyBlurAt(p.x, p.y);
      renderCanvas(true, p.x, p.y);
    });
    canvas.addEventListener('mouseup', () => { isDrawing = false; renderCanvas(false); });
    canvas.addEventListener('mouseleave', () => { isDrawing = false; renderCanvas(false); });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDrawing = true;
      const p = getPos(e);
      applyBlurAt(p.x, p.y);
      renderCanvas(true, p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const p = getPos(e);
      if (isDrawing) applyBlurAt(p.x, p.y);
      renderCanvas(true, p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDrawing = false; renderCanvas(false); });
  }

  const btnReset = document.getElementById('btn-reset-canvas');
  if (btnReset && canvas && ctx) {
    btnReset.addEventListener('click', () => {
      if (origCanvas && blurCanvas) {
        blurCanvas.getContext('2d').clearRect(0, 0, blurCanvas.width, blurCanvas.height);
        blurCanvas.getContext('2d').drawImage(origCanvas, 0, 0);
        renderCanvas(false);
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
        if (blurCanvas && canvasWrap.style.display !== 'none') {
          try {
            // Export from blurCanvas (no cursor artifact)
            const base64 = blurCanvas.toDataURL('image/jpeg', 0.85);
            const uploadRes = a