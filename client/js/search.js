/* =============================================
   search.js — Home page: filters & recommendations
   ============================================= */

(function () {
  // Build circumference chips (60–150 step 5)
  const circumferenceGroup = document.getElementById('filter-circumference');
  if (circumferenceGroup) {
    for (let v = 60; v <= 150; v += 5) {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.value = v;
      btn.textContent = v;
      circumferenceGroup.appendChild(btn);
    }
  }

  // ============ LIGHTBOX ============
  const lightbox = document.createElement('div');
  lightbox.id = 'img-lightbox';
  lightbox.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
    z-index:9999; align-items:center; justify-content:center; cursor:zoom-out;
  `;
  lightbox.innerHTML = `<img id="img-lightbox-img" style="max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);" />`;
  document.body.appendChild(lightbox);
  lightbox.addEventListener('click', () => { lightbox.style.display = 'none'; });

  function openLightbox(src) {
    document.getElementById('img-lightbox-img').src = src;
    lightbox.style.display = 'flex';
  }

  // Active filters state
  const filters = {
    circumference: [],
    cup: [],
    category: [],
    features: []
  };

  // Chip toggle logic
  function setupChipGroup(groupId, filterKey) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const val = chip.dataset.value;

      if (val === 'all') {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filters[filterKey] = [];
      } else {
        const allChip = group.querySelector('[data-value="all"]');
        if (allChip) allChip.classList.remove('active');

        chip.classList.toggle('active');
        const activeVals = [...group.querySelectorAll('.chip.active')].map(c => c.dataset.value);
        filters[filterKey] = activeVals;

        if (filters[filterKey].length === 0 && allChip) {
          allChip.classList.add('active');
        }
      }
    });
  }

  setupChipGroup('filter-circumference', 'circumference');
  setupChipGroup('filter-cup', 'cup');
  setupChipGroup('filter-category', 'category');
  setupChipGroup('filter-features', 'features');

  const btnSearch = document.getElementById('btn-search');
  if (btnSearch) btnSearch.addEventListener('click', fetchRecommendations);
  fetchRecommendations();

  async function fetchRecommendations() {
    const grid = document.getElementById('results-grid');
    const loading = document.getElementById('results-loading');
    const empty = document.getElementById('results-empty');
    if (!grid) return;

    loading.style.display = 'block';
    grid.innerHTML = '';
    empty.style.display = 'none';

    const params = new URLSearchParams();
    if (filters.circumference.length) params.set('circumference', filters.circumference.join(','));
    if (filters.cup.length) params.set('cup', filters.cup.join(','));
    if (filters.category.length) params.set('category', filters.category.join(','));
    if (filters.features.length) params.set('features', filters.features.join(','));
    const q = document.getElementById('search-q')?.value?.trim();
    if (q) params.set('q', q);

    try {
      const res = await fetch('/api/recommendations?' + params.toString());
      const data = await res.json();
      loading.style.display = 'none';

      if (!data.success || !data.data.length) {
        empty.style.display = 'block';
        return;
      }

      data.data.forEach(rec => grid.appendChild(buildCard(rec)));
    } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      console.error(err);
    }
  }

  function buildCard(rec) {
    const card = document.createElement('article');
    card.className = 'rec-card';

    const date = new Date(rec.createdAt).toLocaleDateString('he-IL');
    const user = rec.isAnonymous ? 'משתמשת אנונימית' : 'חברת הקהילה';

    // Image shown only via lightbox button — no thumbnail
    const imageBtn = rec.imageUrl
      ? `<button class="rec-card-img-btn" data-img="${escHtml(rec.imageUrl)}">📷 לצפייה בתמונה</button>`
      : '';

    card.innerHTML = `
      <span class="rec-card-tag">${escHtml(rec.category)}</span>
      <div class="rec-card-size">היקף ${rec.circumference} | קאפ ${escHtml(rec.cup)}</div>
      ${rec.store ? `<div class="rec-card-store">🏪 ${escHtml(rec.store)}</div>` : ''}
      ${rec.description ? `<div class="rec-card-desc">${escHtml(rec.description)}</div>` : ''}
      ${rec.features && rec.features.length ? `<div style="font-size:0.82rem;color:var(--color-accent)">✨ ${rec.features.map(escHtml).join(' | ')}</div>` : ''}
      ${imageBtn}
      ${rec.link ? `<a class="rec-card-link" href="${escHtml(rec.link)}" target="_blank" rel="noopener">🔗 לצפייה בפריט</a>` : ''}
      <div class="rec-card-footer">${user} • ${date}</div>
    `;

    // Wire up lightbox click on the image button
    if (rec.imageUrl) {
      card.querySelector('.rec-card-img-btn').addEventListener('click', () => {
        openLightbox(rec.imageUrl);
      });
    }

    return card;
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
