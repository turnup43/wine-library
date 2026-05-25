/* Wine Library — 분석/시각화 (Chart.js) */

const COLORS = {
  burgundy: '#722F37',
  gold: '#C9A961',
  cream: '#FBF7F2',
  ink: '#2A2A2A',
  muted: '#6B6B6B',
};
// 국가별 컬러 팔레트
const COUNTRY_PALETTE = [
  '#722F37', '#C9A961', '#4A6B8A', '#8B5A3C', '#5C8A3A',
  '#A23B3B', '#D4943A', '#6B8B6B', '#8E6B8E', '#3D5A6C',
  '#B36B5E', '#7A8B5C', '#5C6B8B', '#9C7C5C', '#6C5C7A',
  '#8B5C3D', '#5C7A8B',
];

const STATS_CHARTS = {};

document.getElementById('statsBtn').addEventListener('click', openStats);
document.querySelector('#statsModal .close').addEventListener('click', () => {
  document.getElementById('statsModal').classList.add('hidden');
});
document.getElementById('statsModal').addEventListener('click', e => {
  if (e.target.id === 'statsModal') e.target.classList.add('hidden');
});

function openStats() {
  document.getElementById('statsModal').classList.remove('hidden');
  // ALL은 app.js에서 정의됨
  if (typeof ALL === 'undefined' || !ALL.length) {
    setTimeout(openStats, 300);  // 데이터 로드 대기
    return;
  }
  // 기존 차트 정리
  Object.values(STATS_CHARTS).forEach(c => c.destroy());

  renderKPIs();
  renderCountryChart();
  renderYearChart();
  renderVintageChart();
  renderProducerChart();
  renderWwgcTimeline();
}

function renderKPIs() {
  const total = ALL.length;
  const withPhoto = ALL.filter(w => w.thumb).length;
  const wwgc = ALL.filter(w => w.wwgc_date).length;
  const countries = new Set(ALL.map(w => w.country).filter(c => c && !c.startsWith('('))).size;
  const producers = new Set(ALL.map(w => w.producer).filter(p => p && !p.startsWith('('))).size;
  const vintages = ALL.map(w => parseInt(w.vintage)).filter(v => v >= 1900 && v <= 2030);
  const oldest = vintages.length ? Math.min(...vintages) : '—';
  const dates = ALL.map(w => w.date).filter(Boolean).sort();
  const earliest = dates[0] || '—';

  const kpis = [
    ['총 와인', total],
    ['사진 보유', withPhoto],
    ['WWGC 매칭', wwgc],
    ['국가 수', countries],
    ['생산자 수', producers],
    ['최고령 빈티지', oldest],
    ['첫 기록', earliest.slice(0, 10)],
  ];
  document.getElementById('statsKpis').innerHTML = kpis.map(([l, v]) =>
    `<div class="kpi"><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div>`
  ).join('');
}

function renderCountryChart() {
  const counts = {};
  ALL.forEach(w => {
    if (w.country && !w.country.startsWith('(')) {
      counts[w.country] = (counts[w.country] || 0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([c]) => (FLAG[c] || '') + ' ' + c);
  const data = sorted.map(([, n]) => n);
  STATS_CHARTS.country = new Chart(document.getElementById('chartCountry'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data, backgroundColor: COUNTRY_PALETTE.slice(0, sorted.length),
        borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderYearChart() {
  const counts = {};
  ALL.forEach(w => {
    if (w.date) {
      const y = w.date.slice(0, 4);
      if (/^\d{4}$/.test(y)) counts[y] = (counts[y] || 0) + 1;
    }
  });
  const years = Object.keys(counts).sort();
  STATS_CHARTS.year = new Chart(document.getElementById('chartYear'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        label: '마신 와인 수',
        data: years.map(y => counts[y]),
        backgroundColor: COLORS.burgundy,
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderVintageChart() {
  const counts = {};
  ALL.forEach(w => {
    const v = parseInt(w.vintage);
    if (v >= 1900 && v <= 2030) counts[v] = (counts[v] || 0) + 1;
  });
  // 5년 단위 버킷
  const buckets = {};
  Object.entries(counts).forEach(([v, n]) => {
    const bucket = Math.floor(v / 5) * 5;
    buckets[bucket] = (buckets[bucket] || 0) + n;
  });
  const sortedBuckets = Object.keys(buckets).sort((a, b) => a - b);
  STATS_CHARTS.vintage = new Chart(document.getElementById('chartVintage'), {
    type: 'bar',
    data: {
      labels: sortedBuckets.map(b => `${b}–${parseInt(b) + 4}`),
      datasets: [{
        label: '와인 수',
        data: sortedBuckets.map(b => buckets[b]),
        backgroundColor: COLORS.gold,
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderProducerChart() {
  const counts = {};
  ALL.forEach(w => {
    if (w.producer && !w.producer.startsWith('(') && w.producer !== '(복수)') {
      // 첫 단어/주요 토큰 정규화
      let p = w.producer.split('(')[0].trim();
      if (p.length > 38) p = p.slice(0, 35) + '…';
      counts[p] = (counts[p] || 0) + 1;
    }
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  STATS_CHARTS.producer = new Chart(document.getElementById('chartProducer'), {
    type: 'bar',
    data: {
      labels: top.map(([p]) => p),
      datasets: [{
        data: top.map(([, n]) => n),
        backgroundColor: COLORS.burgundy,
        borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderWwgcTimeline() {
  // WWGC 행사일별 와인 수
  const counts = {};
  ALL.forEach(w => {
    if (w.wwgc_date) counts[w.wwgc_date] = (counts[w.wwgc_date] || 0) + 1;
  });
  const dates = Object.keys(counts).sort();
  STATS_CHARTS.wwgc = new Chart(document.getElementById('chartWwgc'), {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: '행사별 와인 수',
        data: dates.map(d => counts[d]),
        backgroundColor: COLORS.gold,
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxRotation: 90, minRotation: 60, font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}
