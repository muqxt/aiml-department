const API_BASE = 'http://localhost:8000';

const form = document.getElementById('ddi-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const formError = document.getElementById('form-error');
const resultsSection = document.getElementById('results-section');

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Checking…' : 'Check Interactions';
  btnSpinner.classList.toggle('hidden', !loading);
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function clearError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resetAnimation(el) {
  el.classList.remove('slide-up');
  void el.offsetWidth;
  el.classList.add('slide-up');
}

function renderInteractions(interactions) {
  const container = document.getElementById('interactions-content');

  if (!interactions || interactions.length === 0) {
    container.innerHTML = `
      <div class="flex items-center gap-3 bg-green-50 border border-green-300 rounded-lg px-4 py-4">
        <span class="text-2xl">✅</span>
        <p class="text-green-800 text-sm font-medium">No known drug interactions found.</p>
      </div>`;
    return;
  }

  const rows = interactions.map(i => `
    <tr class="border-b border-gray-100 last:border-0">
      <td class="py-2 pr-4 text-sm font-medium text-gray-800">${escapeHtml(i.drug1)}</td>
      <td class="py-2 pr-4 text-sm font-medium text-gray-800">${escapeHtml(i.drug2)}</td>
      <td class="py-2 pr-4 text-sm">
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          ${escapeHtml(i.severity)}
        </span>
      </td>
      <td class="py-2 text-sm text-gray-600">${escapeHtml(i.description)}</td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200">
      <span class="text-xl">⚠️</span>
      <h4 class="font-bold text-[#018790]">Interactions Found</h4>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b-2 border-gray-200">
            <th class="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">Drug 1</th>
            <th class="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">Drug 2</th>
            <th class="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">Severity</th>
            <th class="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const card = document.getElementById('result-interactions');
  card.classList.add('border-2', 'border-amber-400', 'bg-amber-50');
  card.classList.remove('bg-white');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const drug1 = document.getElementById('drug1').value.trim();
  const drug2 = document.getElementById('drug2').value.trim();

  if (!drug1) { showError('Please enter Drug 1.'); return; }
  if (!drug2) { showError('Please enter Drug 2.'); return; }

  setLoading(true);
  resultsSection.classList.add('hidden');

  const card = document.getElementById('result-interactions');
  card.classList.remove('border-2', 'border-amber-400', 'bg-amber-50');
  card.classList.add('bg-white');

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugs: [drug1, drug2], age: 30, gender: 'other', disease: 'ddi-check' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail || err.error || `Server error (${res.status})`;
      showError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      return;
    }

    const data = await res.json();

    renderInteractions(data.interactions);
    resetAnimation(card);
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    showError('Could not reach the Pulsefy API. Make sure the backend is running on http://localhost:8000.');
  } finally {
    setLoading(false);
  }
});
