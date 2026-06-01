/* Wine Library SPA — vanilla JS */

const LS_KEY = 'wine_library_user_additions_v1';
const FLAG = {
  'France': '🇫🇷', 'Italy': '🇮🇹', 'USA': '🇺🇸', 'Spain': '🇪🇸',
  'Chile': '🇨🇱', 'Australia': '🇦🇺', 'New Zealand': '🇳🇿',
  'Germany': '🇩🇪', 'Portugal': '🇵🇹', 'Argentina': '🇦🇷', 'Japan': '🇯🇵',
  'Korea': '🇰🇷', 'South Africa': '🇿🇦', 'Georgia': '🇬🇪', 'Romania': '🇷🇴',
  'Moldova': '🇲🇩', 'Peru': '🇵🇪', 'Austria': '🇦🇹', 'Hungary': '🇭🇺',
  'Greece': '🇬🇷',
};

let ALL = [];          // 전체 와인 (서버 + 사용자 추가)
let FILTERED = [];     // 현재 표시중
let LUNR = null;       // Lunr 검색 인덱스
let STATE = {
  q: '', country: null, vintageMin: null, vintageMax: null,
  rating: null, source: 'all', sortBy: 'date-desc',
};

// ===== INIT =====
(async function init() {
  // 서버 데이터 로드
  const res = await fetch('data/wines.json');
  const data = await res.json();
  const serverWines = data.wines.map(w => ({ ...w, source: 'server' }));

  // 사용자 로컬 추가분 머지
  const userWines = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    .map(w => ({ ...w, source: 'local' }));

  ALL = [...serverWines, ...userWines];

  // Lunr 인덱스 구축
  LUNR = lunr(function () {
    this.ref('id');
    this.field('name', { boost: 10 });
    this.field('producer', { boost: 5 });
    this.field('country');
    this.field('region');
    this.field('subregion');
    this.field('varietal');
    this.field('note');
    this.field('wwgc_notes');
    this.field('wwgc_story');
    this.field('wwgc_theme');
    ALL.forEach((w, i) => {
      w.id = w.id || `local-${i}`;
      this.add(w);
    });
  });

  buildFilterUI();
  bindEvents();
  applyFilters();
})();

// ===== FILTER UI =====
function buildFilterUI() {
  const countries = {};
  ALL.forEach(w => {
    if (w.country && !w.country.startsWith('(')) {
      countries[w.country] = (countries[w.country] || 0) + 1;
    }
  });
  const cBox = document.getElementById('filterCountry');
  const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
  cBox.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = '전체';
  allBtn.dataset.country = '';
  allBtn.classList.add('active');
  cBox.appendChild(allBtn);
  sorted.forEach(([c, n]) => {
    const b = document.createElement('button');
    b.dataset.country = c;
    b.textContent = `${FLAG[c] || ''} ${c} (${n})`;
    cBox.appendChild(b);
  });
}

// ===== EVENTS =====
function bindEvents() {
  document.getElementById('search').addEventListener('input', debounce(e => {
    STATE.q = e.target.value.trim();
    applyFilters();
  }, 200));

  document.getElementById('filterBtn').addEventListener('click', () => {
    document.getElementById('filterPanel').classList.toggle('hidden');
  });

  document.getElementById('filterCountry').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#filterCountry button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    STATE.country = e.target.dataset.country || null;
    applyFilters();
  });

  document.getElementById('filterRating').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#filterRating button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    STATE.rating = e.target.dataset.r ? parseInt(e.target.dataset.r) : null;
    applyFilters();
  });

  document.querySelectorAll('[data-source]').forEach(b => {
    b.addEventListener('click', e => {
      document.querySelectorAll('[data-source]').forEach(x => x.classList.remove('active'));
      e.target.classList.add('active');
      STATE.source = e.target.dataset.source;
      applyFilters();
    });
  });

  document.getElementById('vintageMin').addEventListener('change', e => {
    STATE.vintageMin = e.target.value ? parseInt(e.target.value) : null;
    applyFilters();
  });
  document.getElementById('vintageMax').addEventListener('change', e => {
    STATE.vintageMax = e.target.value ? parseInt(e.target.value) : null;
    applyFilters();
  });

  document.getElementById('sortBy').addEventListener('change', e => {
    STATE.sortBy = e.target.value;
    applyFilters();
  });

  document.getElementById('resetFilters').addEventListener('click', () => {
    STATE = { q: '', country: null, vintageMin: null, vintageMax: null, rating: null, source: 'all', sortBy: 'date-desc' };
    document.getElementById('search').value = '';
    document.getElementById('vintageMin').value = '';
    document.getElementById('vintageMax').value = '';
    document.getElementById('sortBy').value = 'date-desc';
    buildFilterUI();
    document.querySelectorAll('#filterRating button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('[data-source]').forEach(b => b.classList.toggle('active', b.dataset.source === 'all'));
    applyFilters();
  });

  // 모달
  document.querySelectorAll('.modal .close').forEach(b => {
    b.addEventListener('click', e => e.target.closest('.modal').classList.add('hidden'));
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });

  // 추가 모달
  document.getElementById('addBtn').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('addForm').reset();
    document.getElementById('photoPreview').classList.add('hidden');
    document.querySelectorAll('.star-input button').forEach(b => b.classList.remove('on'));
  });

  // 사진 미리보기 + EXIF
  document.querySelector('input[name=photo]').addEventListener('change', handlePhotoChange);

  // 별점
  document.querySelectorAll('.star-input button').forEach(b => {
    b.addEventListener('click', e => {
      const v = parseInt(e.target.dataset.v);
      const stars = e.target.parentElement.querySelectorAll('button');
      stars.forEach((s, i) => s.classList.toggle('on', i < v));
      e.target.parentElement.querySelector('input').value = v;
    });
  });

  document.getElementById('addForm').addEventListener('submit', handleAddSubmit);
  document.getElementById('downloadJsonBtn').addEventListener('click', downloadUserJson);
}

// ===== FILTER + SORT + RENDER =====
function applyFilters() {
  let list = ALL.slice();

  // 검색
  if (STATE.q) {
    try {
      const ids = new Set(LUNR.search(STATE.q + '*').map(r => r.ref));
      list = list.filter(w => ids.has(w.id));
    } catch (e) {
      // Lunr 파싱 에러 시 단순 substring fallback
      const q = STATE.q.toLowerCase();
      list = list.filter(w =>
        (w.name + w.producer + w.region + w.subregion + w.varietal + w.note).toLowerCase().includes(q)
      );
    }
  }

  // 국가
  if (STATE.country) list = list.filter(w => w.country === STATE.country);

  // 빈티지
  if (STATE.vintageMin) list = list.filter(w => parseInt(w.vintage) >= STATE.vintageMin);
  if (STATE.vintageMax) list = list.filter(w => parseInt(w.vintage) <= STATE.vintageMax);

  // 평점
  if (STATE.rating !== null) list = list.filter(w => parseInt(w.rating) >= STATE.rating);

  // 출처
  if (STATE.source === 'wwgc') list = list.filter(w => w.wwgc_date);
  if (STATE.source === 'photo') list = list.filter(w => w.thumb);

  // 정렬
  const sorters = {
    'date-desc': (a, b) => (b.date || '').localeCompare(a.date || ''),
    'date-asc': (a, b) => (a.date || '').localeCompare(b.date || ''),
    'name-asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
    'vintage-desc': (a, b) => (parseInt(b.vintage) || 0) - (parseInt(a.vintage) || 0),
    'vintage-asc': (a, b) => (parseInt(a.vintage) || 9999) - (parseInt(b.vintage) || 9999),
    'country-asc': (a, b) => (a.country || '').localeCompare(b.country || ''),
  };
  list.sort(sorters[STATE.sortBy]);

  FILTERED = list;
  render();
}

function render() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('resultCount');

  count.textContent = `${FILTERED.length}병 / ${ALL.length}병 중`;
  grid.innerHTML = '';
  empty.classList.toggle('hidden', FILTERED.length > 0);

  const frag = document.createDocumentFragment();
  FILTERED.slice(0, 200).forEach(w => frag.appendChild(renderCard(w)));  // 200개 우선
  grid.appendChild(frag);

  // 스크롤 시 추가 로드 (간단 페이지네이션 대용)
  if (FILTERED.length > 200) {
    const more = document.createElement('button');
    more.textContent = `+ ${FILTERED.length - 200}개 더 보기`;
    more.className = 'btn-ghost full';
    more.style.gridColumn = '1 / -1';
    more.style.margin = '1rem 0';
    more.addEventListener('click', () => {
      const next = FILTERED.slice(200);
      next.forEach(w => more.parentElement.insertBefore(renderCard(w), more));
      more.remove();
    });
    grid.appendChild(more);
  }
}

function renderCard(w) {
  const el = document.createElement('div');
  el.className = 'card';
  el.addEventListener('click', () => openDetail(w));

  const flag = FLAG[w.country] || '';
  const thumbHTML = w.thumb
    ? `<div class="card-thumb" style="background-image:url('${escapeAttr(w.thumb)}')">` +
        (w.wwgc_date ? `<span class="badge-wwgc">WWGC</span>` : '') +
        (w.vintage ? `<span class="badge-vintage">${escapeHTML(w.vintage)}</span>` : '') +
      `</div>`
    : `<div class="card-thumb no-photo">🍷` +
        (w.wwgc_date ? `<span class="badge-wwgc">WWGC</span>` : '') +
        (w.vintage ? `<span class="badge-vintage">${escapeHTML(w.vintage)}</span>` : '') +
      `</div>`;
  const stars = w.rating ? '★'.repeat(parseInt(w.rating)) : '';

  el.innerHTML = thumbHTML + `
    <div class="card-body">
      <div class="card-name">${escapeHTML(w.name)}</div>
      <div class="card-producer">${escapeHTML(w.producer || '')}</div>
      <div class="card-region"><span class="flag">${flag}</span>${escapeHTML(w.region || w.country || '')}</div>
      ${stars ? `<div class="card-rating">${stars}</div>` : ''}
      <div class="card-date">${escapeHTML(w.date || '')}</div>
    </div>
  `;
  return el;
}

function openDetail(w) {
  const m = document.getElementById('detailModal');
  const body = document.getElementById('detailBody');
  const flag = FLAG[w.country] || '';
  const photoHTML = w.thumb
    ? `<img class="detail-photo" src="${escapeAttr(w.thumb)}" alt="${escapeAttr(w.name)}" />`
    : '';

  // 핵심 정보 (있을 때만 표시 — 와인 식별 메타)
  const corePairs = [
    ['빈티지', w.vintage],
    ['생산자', w.producer],
    ['국가', w.country && `${flag} ${w.country}`],
    ['지방', w.region],
    ['세부산지', w.subregion],
    ['품종', w.varietal],
  ].filter(([k, v]) => v);

  // 경험 정보 (항상 표시 — 비어있어도 '—' 로 자리 유지)
  const experiencePairs = [
    ['마신 날짜', w.date || '—'],
    ['마신 장소', w.venue || '—'],
    ['동반자', w.companion || '—'],
    ['평점', w.rating ? '★'.repeat(parseInt(w.rating)) : '—'],
    ['가격대', w.price || '—'],
  ];

  const metaHTML = `<dl class="detail-meta">` +
    corePairs.map(([k, v]) => `<dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd>`).join('') +
    `</dl>` +
    `<dl class="detail-meta detail-experience">` +
    experiencePairs.map(([k, v]) =>
      `<dt>${escapeHTML(k)}</dt><dd${v === '—' ? ' class="empty"' : ''}>${escapeHTML(v)}</dd>`).join('') +
    `</dl>`;

  const noteHTML = w.note ? `<div class="detail-section"><h3>한줄 메모</h3><p>${escapeHTML(w.note)}</p></div>` : '';

  let wwgcHTML = '';
  if (w.wwgc_date || w.wwgc_notes || w.wwgc_story) {
    wwgcHTML = `<div class="detail-section">
      <h3>WWGC <span class="wwgc-badge">${escapeHTML(w.wwgc_date || '')}</span></h3>
      ${w.wwgc_theme ? `<p><strong>${escapeHTML(w.wwgc_theme)}</strong></p>` : ''}
      ${w.wwgc_scores ? `<p>${escapeHTML(w.wwgc_scores)}</p>` : ''}
      ${w.wwgc_notes ? `<p><em>Tasting Notes:</em> ${escapeHTML(w.wwgc_notes)}</p>` : ''}
      ${w.wwgc_story ? `<p><em>Winery:</em> ${escapeHTML(w.wwgc_story)}</p>` : ''}
    </div>`;
  }

  let wcHTML = '';
  if (w.wc_journal) {
    wcHTML = `<div class="detail-section">
      <h3>📓 Weekly Compass 일지 (${escapeHTML(w.date)})</h3>
      <p>${escapeHTML(w.wc_journal)}</p>
    </div>`;
  }

  body.innerHTML = `
    ${photoHTML}
    <h2 class="detail-name">${escapeHTML(w.name)}</h2>
    <div class="detail-producer">${escapeHTML(w.producer || '')}</div>
    ${metaHTML}
    ${noteHTML}
    ${wwgcHTML}
    ${wcHTML}
  `;
  m.classList.remove('hidden');
}

// ===== ADD WINE =====
function handlePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('photoPreview');
  const reader = new FileReader();
  reader.onload = ev => {
    preview.innerHTML = `<img src="${ev.target.result}" alt="preview" />`;
    preview.classList.remove('hidden');
    preview.dataset.dataurl = ev.target.result;
  };
  reader.readAsDataURL(file);

  // EXIF 파싱
  EXIF.getData(file, function () {
    const dt = EXIF.getTag(this, 'DateTimeOriginal');
    if (dt) {
      const [d] = dt.split(' ');  // "2024:05:21" → "2024-05-21"
      const iso = d.replace(/:/g, '-');
      document.querySelector('input[name=date]').value = iso;
    }
  });
}

function handleAddSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f);
  const wine = {
    id: `local-${Date.now()}`,
    source: 'local',
    date: fd.get('date') || '',
    vintage: fd.get('vintage') || '',
    name: fd.get('name'),
    producer: fd.get('producer') || '',
    country: fd.get('country') || '',
    region: fd.get('region') || '',
    subregion: fd.get('subregion') || '',
    varietal: fd.get('varietal') || '',
    price: fd.get('price') || '',
    venue: fd.get('venue') || '',
    companion: fd.get('companion') || '',
    rating: fd.get('rating') || '',
    note: fd.get('note') || '',
    thumb: document.getElementById('photoPreview').dataset.dataurl || null,
    wwgc_date: '', wwgc_theme: '', wwgc_scores: '', wwgc_notes: '', wwgc_story: '',
  };
  const userWines = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  userWines.push(wine);
  localStorage.setItem(LS_KEY, JSON.stringify(userWines));
  ALL.push(wine);
  // Lunr 재구축
  LUNR = lunr(function () {
    this.ref('id');
    this.field('name', { boost: 10 });
    this.field('producer', { boost: 5 });
    this.field('country');
    this.field('region');
    this.field('subregion');
    this.field('varietal');
    this.field('note');
    ALL.forEach(w => this.add(w));
  });
  document.getElementById('addModal').classList.add('hidden');
  applyFilters();
  alert(`✅ "${wine.name}" 추가됨!\n(브라우저에 저장 — 영구화하려면 "JSON 내보내기")`);
}

function downloadUserJson() {
  const userWines = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  if (!userWines.length) { alert('로컬에 저장된 사용자 와인이 없습니다.'); return; }
  const blob = new Blob([JSON.stringify({ wines: userWines, count: userWines.length }, null, 2)],
                       { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `user_wines_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// ===== UTILS =====
function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHTML(s); }
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
