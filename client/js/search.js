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
        // Deactivate all, activate "all"
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filters[filterKey] = [];
      } else {
        // Deactivate "all" chip
        const allChip = group.querySelector('[data-value="all"]');
        if (allChip) allChip.classList.remove('active');

        chip.classList.toggle('active');
        const activeVals = [...group.querySelectorAll('.chip.active')].map(c => c.dataset.value);
        filters[filterKey] = activeVals;

        // If nothing active, re-activate "all"
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

  // Search button
  const btnSearch = document.getElementById('btn-search');
  if (btnSearch) btnSearch.addEventListener('click', fetchRecommendations);

  // Also fetch on load
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

    card.innerHTML = `
      <span class="rec-card-tag">${escHtml(rec.category)}</span>
      <div class="rec-card-size">היקף ${rec.circumference} | קאפ ${escHtml(rec.cup)}</div>
      ${rec.imageUrl ? `<img class="rec-card-img" src="${escHtml(rec.imageUrl)}" alt="תמונת פריט" loading="lazy" />` : ''}
      ${rec.store ? `<div class="rec-card-store">🏪 ${escHtml(rec.store)}</div>` : ''}
      ${rec.description ? `<div class="rec-card-desc">${escHtml(rec.description)}</div>` : ''}
      ${rec.features && rec.features.length ? `<div style="font-size:0.82rem;color:var(--color-accent)">✨ ${rec.features.map(escHtml).join(' | ')}</div>` : ''}
      ${rec.link ? `<a class="rec-card-link" href="${escHtml(rec.link)}" target="_blank" rel="noopener">🔗 לצפייה בפריט</a>` : ''}
      <div class="rec-card-footer">${user} • ${date}</div>
    `;
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
