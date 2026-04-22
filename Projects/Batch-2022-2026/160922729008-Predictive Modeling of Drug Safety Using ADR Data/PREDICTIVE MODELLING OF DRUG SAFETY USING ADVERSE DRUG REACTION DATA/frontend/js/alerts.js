const API_BASE = 'http://localhost:8000';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAlertCard(alert, index) {
  const reactions = (alert.top_reactions || [])
    .map(r => `<li class="text-gray-600 text-sm">${escapeHtml(r)}</li>`)
    .join('');

  const reactionsBlock = reactions
    ? `<ul class="list-disc list-inside flex flex-col gap-1">${reactions}</ul>`
    : `<p class="text-gray-400 text-sm italic">No reactions recorded</p>`;

  const delay = Math.min(index * 0.05, 0.5);

  return `
    <div class="bg-white rounded-xl shadow-md p-6 flex flex-col gap-4 fade-in hover:shadow-lg transition-shadow"
         style="animation-delay: ${delay}s">
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-lg font-bold text-[#005461] capitalize">${escapeHtml(alert.drug)}</h3>
        <span class="shrink-0 bg-[#00B7B5] text-white text-xs font-bold px-3 py-1 rounded-full">
          ${alert.report_count} report${alert.report_count !== 1 ? 's' : ''}
        </span>
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top Reactions</p>
        ${reactionsBlock}
      </div>
    </div>`;
}

async function loadAlerts() {
  const loadingEl = document.getElementById('loading-state');
  const errorEl = document.getElementById('error-state');
  const emptyEl = document.getElementById('empty-state');
  const gridEl = document.getElementById('alerts-grid');

  try {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);

    const data = await res.json();
    const alerts = data.alerts || [];

    loadingEl.classList.add('hidden');

    if (alerts.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    gridEl.innerHTML = alerts.map((alert, i) => renderAlertCard(alert, i)).join('');
    gridEl.classList.remove('hidden');

  } catch {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

loadAlerts();
