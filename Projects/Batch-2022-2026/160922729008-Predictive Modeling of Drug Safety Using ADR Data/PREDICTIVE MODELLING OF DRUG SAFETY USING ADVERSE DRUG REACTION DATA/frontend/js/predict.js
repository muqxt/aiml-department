const API_BASE = 'http://localhost:8000';

const form = document.getElementById('predict-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const formError = document.getElementById('form-error');
const resultsSection = document.getElementById('results-section');

const drugInput = document.getElementById('drug-input');
const addDrugBtn = document.getElementById('add-drug-btn');
const drugsList = document.getElementById('drugs-list');
const drugsHidden = document.getElementById('drugs-hidden');
let drugs = [];

const riskClasses = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-red-100 text-red-800',
};

function addDrug() {
  const drugName = drugInput.value.trim();
  
  if (!drugName) {
    showError('Please enter a drug name.');
    return;
  }
  
  if (drugs.some(d => d.toLowerCase() === drugName.toLowerCase())) {
    showError('This drug has already been added.');
    return;
  }
  
  drugs.push(drugName);
  drugInput.value = '';
  clearError();
  renderDrugsList();
}

function removeDrug(index) {
  drugs.splice(index, 1);
  renderDrugsList();
}

function renderDrugsList() {
  if (drugs.length === 0) {
    drugsList.innerHTML = '<p class="text-gray-400 text-sm italic">No drugs added yet</p>';
    drugsHidden.value = '';
    return;
  }
  
  const badges = drugs.map((drug, index) => `
    <span class="inline-flex items-center gap-2 bg-[#018790] text-white text-sm font-medium px-3 py-1.5 rounded-lg">
      ${escapeHtml(drug)}
      <button
        type="button"
        onclick="removeDrug(${index})"
        class="hover:bg-[#005461] rounded-full p-0.5 transition-colors"
        title="Remove drug"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </span>
  `).join('');
  
  drugsList.innerHTML = badges;
  drugsHidden.value = JSON.stringify(drugs);
}

addDrugBtn.addEventListener('click', addDrug);

drugInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addDrug();
  }
});

window.removeDrug = removeDrug;

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Analysing…' : 'Run Safety Prediction';
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

function renderRiskBadge(riskLevel) {
  const classes = riskClasses[riskLevel] || 'bg-gray-100 text-gray-800';
  return `<span class="px-3 py-1 rounded-full text-sm font-bold ${classes}">${escapeHtml(riskLevel)}</span>`;
}

function renderSeverityBadge(severity) {
  const isSerious = severity === 'Serious';
  const classes = isSerious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  return `<span class="px-3 py-1 rounded-full text-sm font-bold ${classes}">${escapeHtml(severity)}</span>`;
}

function renderConfidenceBadge(confidence) {
  return `<span class="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">${escapeHtml(confidence)}</span>`;
}

function renderExplanation(explanationArray) {
  const items = explanationArray.map(item => 
    `<li class="text-gray-700">${escapeHtml(item)}</li>`
  ).join('');
  return `<ul class="list-disc list-inside text-gray-700 text-sm leading-relaxed space-y-1">${items}</ul>`;
}

function renderCommonReactions(reactions) {
  if (!reactions || reactions.length === 0) return '';
  
  const badges = reactions.map(r =>
    `<span class="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">${escapeHtml(r)}</span>`
  ).join('');
  return badges;
}

function renderDrugPredictions(predictions) {
  const container = document.getElementById('drug-predictions-container');
  
  const cards = predictions.map((pred, index) => {
    const reactionsHtml = pred.common_reactions && pred.common_reactions.length > 0
      ? `<div class="mb-4">
           <h3 class="text-sm font-semibold text-gray-700 mb-2">Common Reactions:</h3>
           <div class="flex flex-wrap gap-2">${renderCommonReactions(pred.common_reactions)}</div>
         </div>`
      : '';
    
    return `
      <div class="bg-white rounded-xl shadow-md p-6 slide-up" style="animation-delay: ${index * 0.1}s">
        <h2 class="text-xl font-bold text-[#005461] mb-4">
          <span class="inline-block bg-[#018790] text-white px-3 py-1 rounded-lg text-base mr-2">${escapeHtml(pred.drug_name)}</span>
          Prediction Results
        </h2>
        
        <div class="flex flex-wrap gap-3 mb-4">
          <span class="text-sm font-semibold text-gray-500 self-center">Risk Level:</span>
          ${renderRiskBadge(pred.risk_level)}
          
          <span class="text-sm font-semibold text-gray-500 self-center ml-2">Severity:</span>
          ${renderSeverityBadge(pred.severity)}
          
          <span class="text-sm font-semibold text-gray-500 self-center ml-2">Confidence:</span>
          ${renderConfidenceBadge(pred.confidence)}
        </div>
        
        <div class="mb-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Analysis:</h3>
          ${renderExplanation(pred.explanation || [])}
        </div>
        
        ${reactionsHtml}
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p class="text-sm font-semibold text-blue-900 mb-1">Recommendation:</p>
          <p class="text-sm text-blue-800">${escapeHtml(pred.recommendation)}</p>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = cards;
}

function renderInteractions(interactions) {
  const container = document.getElementById('interactions-content');

  if (!interactions || interactions.length === 0) {
    container.innerHTML = `
      <div class="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm font-medium">
        No known drug interactions found.
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
}

function renderAlerts(alerts) {
  const container = document.getElementById('alerts-content');

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">No community alerts for the submitted drugs.</p>`;
    return;
  }

  const items = alerts.map(a => {
    const reactions = (a.top_reactions || []).map(r =>
      `<span class="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">${escapeHtml(r)}</span>`
    ).join(' ');

    return `
      <div class="flex flex-col gap-1 py-3 border-b border-gray-100 last:border-0">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-gray-800 text-sm">${escapeHtml(a.drug)}</span>
          <span class="bg-[#018790] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ${a.report_count} report${a.report_count !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="flex flex-wrap gap-1">${reactions}</div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="flex flex-col">${items}</div>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const age = document.getElementById('age').value.trim();
  const gender = document.getElementById('gender').value;
  const disease = document.getElementById('disease').value.trim();

  if (drugs.length === 0) { 
    showError('Please add at least one drug name.'); 
    return; 
  }
  if (!age) { showError('Please enter the patient age.'); return; }
  if (!gender) { showError('Please select a gender.'); return; }
  if (!disease) { showError('Please enter a disease or condition.'); return; }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
    showError('Age must be a number between 0 and 120.');
    return;
  }

  setLoading(true);
  resultsSection.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugs, age: ageNum, gender, disease }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail || err.error || `Server error (${res.status})`;
      showError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      return;
    }

    const data = await res.json();

    renderDrugPredictions(data.predictions || []);
    renderInteractions(data.interactions);
    renderAlerts(data.alerts);

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    showError('Could not reach the Pulsefy API. Make sure the backend is running on http://localhost:8000.');
  } finally {
    setLoading(false);
  }
});
