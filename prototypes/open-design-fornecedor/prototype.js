const screenButtons = document.querySelectorAll('[data-screen]');
const screens = document.querySelectorAll('.screen');
const navButtons = document.querySelectorAll('.topbar nav [data-screen]');

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle('active', screen.id === id));
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.screen === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

screenButtons.forEach((button) => button.addEventListener('click', (event) => {
  event.preventDefault();
  showScreen(button.dataset.screen);
}));

document.querySelector('#hide-note').addEventListener('click', () => {
  document.querySelector('.prototype-note').classList.add('hidden');
});

const form = document.querySelector('#registration-form');
const continueButton = form.querySelector('.continue');
const backButton = form.querySelector('.back');
const message = form.querySelector('.form-message');
let step = 1;

function renderStep() {
  form.querySelectorAll('.form-step').forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
  form.querySelectorAll('.steps span').forEach((item, index) => item.classList.toggle('active', index + 1 <= step));
  backButton.hidden = step === 1;
  continueButton.innerHTML = step === 1 ? 'Continuar <span>→</span>' : 'Enviar para análise <span>→</span>';
  message.textContent = '';
  message.className = 'form-message';
}

continueButton.addEventListener('click', () => {
  const panel = form.querySelector(`.form-step[data-step="${step}"]`);
  const invalid = [...panel.querySelectorAll('[required]')].find((field) => !field.checkValidity());
  if (invalid) {
    message.textContent = invalid.type === 'checkbox' ? 'Confirme os termos para continuar.' : 'Preencha os campos essenciais para continuar.';
    invalid.focus();
    return;
  }
  if (step === 1) {
    step = 2;
    renderStep();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  message.textContent = 'Demonstração concluída. Nenhum dado foi enviado ou salvo.';
  message.className = 'form-message success';
});

backButton.addEventListener('click', () => {
  step = 1;
  renderStep();
});

const requested = window.location.hash.replace('#', '');
if (['cockpit', 'cadastro', 'perfil'].includes(requested)) showScreen(requested);
