const slider = document.querySelector("#delay-slider");
const value = document.querySelector("#delay-value");
const presetButtons = document.querySelectorAll("[data-delay]");
const stepButtons = document.querySelectorAll("[data-step]");

function clampDelay(delay) {
  return Math.min(1000, Math.max(0, delay));
}

function setDelay(delay) {
  const nextDelay = clampDelay(delay);
  slider.value = String(nextDelay);
  value.textContent = String(nextDelay);

  presetButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.delay === String(nextDelay));
  });
}

slider.addEventListener("input", () => {
  setDelay(Number(slider.value));
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDelay(Number(button.dataset.delay));
  });
});

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDelay(Number(slider.value) + Number(button.dataset.step));
  });
});

