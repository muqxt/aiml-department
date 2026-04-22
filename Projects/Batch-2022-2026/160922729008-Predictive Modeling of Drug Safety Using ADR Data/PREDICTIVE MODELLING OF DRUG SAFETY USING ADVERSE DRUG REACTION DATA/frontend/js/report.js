const API_BASE = 'http://localhost:8000';

const form = document.getElementById('report-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const formError = document.getElementById('form-error');
const toast = document.getElementById('toast');

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
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

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden', 'toast-hide');
  toast.classList.add('toast-show');

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    toast.addEventListener('animationend', () => {
      toast.classList.add('hidden');
      toast.classList.remove('toast-hide');
    }, { once: true });
  }, 3000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const drug = document.getElementById('drug').value.trim();
  const reaction = document.getElementById('reaction').value.trim();
  const severity = document.getElementById('severity').value;

  if (!drug) { showError('Please enter a drug name.'); return; }
  if (!reaction) { showError('Please describe the adverse reaction.'); return; }
  if (!severity) { showError('Please select a severity level.'); return; }

  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug, reaction, severity }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail || err.error || `Server error (${res.status})`;
      showError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      return;
    }

    const data = await res.json();
    form.reset();
    showToast(data.message || 'Report submitted successfully.');

  } catch (err) {
    showError('Could not reach the Pulsefy API. Make sure the backend is running on http://localhost:8000.');
  } finally {
    setLoading(false);
  }
});
