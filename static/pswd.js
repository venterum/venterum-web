document.addEventListener("DOMContentLoaded", () => {
  const CHARSETS = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    digits: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~`",
  };

  /* ── DOM refs ─────────────────────────────── */
  const lengthSlider = document.getElementById("pswd-length-slider");
  const lengthValue = document.getElementById("pswd-length-value");
  const generateBtn = document.getElementById("generate-pswd-btn");
  const pswdText = document.getElementById("pswd-text");
  const pswdCursor = document.getElementById("pswd-cursor");
  const pswdDisplay = document.getElementById("pswd-display");
  const pswdEmptyState = document.getElementById("pswd-empty-state");
  const pswdStrengthSection = document.getElementById("pswd-strength-section");
  const pswdStrengthLabel = document.getElementById("pswd-strength-label");
  const pswdStrengthFill = document.getElementById("pswd-strength-fill");
  const pswdEntropy = document.getElementById("pswd-entropy");
  const pswdResultActions = document.getElementById("pswd-result-actions");
  const copyBtn = document.getElementById("copy-pswd-btn");
  const regenerateBtn = document.getElementById("regenerate-pswd-btn");
  const pswdToast = document.getElementById("pswd-toast");
  const pswdField = document.getElementById("pswd-field");
  const pswdFieldWrapper = document.querySelector(".pswd-field-wrapper");
  const noAmbiguousOption = document.getElementById("option-no-ambiguous");
  const requireEachOption = document.getElementById("option-require-each");

  const AMBIGUOUS_CHARS = new Set(["0", "O", "o", "1", "I", "l"]);

  let currentPassword = "";
  let isTyping = false;

  /* ── Language helper ──────────────────────── */
  function getLang() {
    return localStorage.getItem("lang") || "ru";
  }

  /* ── Slider fill update ───────────────────── */
  function updateSliderFill() {
    const min = Number(lengthSlider.min);
    const max = Number(lengthSlider.max);
    const val = Number(lengthSlider.value);
    const pct = ((val - min) / (max - min)) * 100;
    lengthSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
  }

  lengthSlider.addEventListener("input", () => {
    lengthValue.textContent = lengthSlider.value;
    updateSliderFill();

    /* Bump animation on the number */
    lengthValue.classList.remove("bump");
    void lengthValue.offsetWidth; // reflow
    lengthValue.classList.add("bump");
  });

  /* Init slider fill */
  updateSliderFill();

  /* ── Charset helpers ──────────────────────── */
  function getActiveCharsetParts() {
    const parts = [];
    if (document.getElementById("charset-upper").checked)
      parts.push(CHARSETS.upper);
    if (document.getElementById("charset-lower").checked)
      parts.push(CHARSETS.lower);
    if (document.getElementById("charset-digits").checked)
      parts.push(CHARSETS.digits);
    if (document.getElementById("charset-symbols").checked)
      parts.push(CHARSETS.symbols);

    if (!noAmbiguousOption?.checked) return parts;

    return parts
      .map((part) =>
        Array.from(part)
          .filter((char) => !AMBIGUOUS_CHARS.has(char))
          .join(""),
      )
      .filter(Boolean);
  }

  function getActiveCharset() {
    return getActiveCharsetParts().join("");
  }

  /* At least one checkbox must stay on */
  const charsetCheckboxes = document.querySelectorAll(".pswd-checkbox input");
  charsetCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const anyChecked = Array.from(charsetCheckboxes).some((c) => c.checked);
      if (!anyChecked) cb.checked = true;
    });
  });

  /* ── Password generation ──────────────────── */
  function randomChar(charset) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
  }

  function shuffleSecure(chars) {
    const array = new Uint32Array(chars.length);
    crypto.getRandomValues(array);

    for (let i = chars.length - 1; i > 0; i--) {
      const j = array[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars;
  }

  function generatePassword(length, charset, parts) {
    const requiredChars =
      requireEachOption?.checked && length >= parts.length
        ? parts.map((part) => randomChar(part))
        : [];
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    const chars = [...requiredChars];
    for (let i = chars.length; i < length; i++) {
      chars.push(charset[array[i] % charset.length]);
    }

    return shuffleSecure(chars).join("");
  }

  function calculateEntropy(length, charsetSize) {
    return length * Math.log2(charsetSize);
  }

  function getStrengthInfo(entropy) {
    if (entropy < 40) return { cls: "weak", ru: "Слабая", en: "Weak" };
    if (entropy < 60) return { cls: "fair", ru: "Средняя", en: "Fair" };
    if (entropy < 80) return { cls: "good", ru: "Хорошая", en: "Good" };
    if (entropy < 100) return { cls: "strong", ru: "Высокая", en: "Strong" };
    return { cls: "very-strong", ru: "Отличная", en: "Very Strong" };
  }

  function updateStrengthUI(entropy) {
    const info = getStrengthInfo(entropy);
    const lang = getLang();

    pswdStrengthLabel.textContent = info[lang];
    pswdStrengthLabel.className = "pswd-strength-label " + info.cls;
    pswdStrengthFill.className = "pswd-strength-fill " + info.cls;

    pswdEntropy.textContent =
      lang === "ru"
        ? `Энтропия: ${entropy.toFixed(1)} бит`
        : `Entropy: ${entropy.toFixed(1)} bits`;
  }

  function updateFieldShape() {
    const lineHeight = parseFloat(getComputedStyle(pswdField).lineHeight);
    const isSingleLine = pswdField.offsetHeight <= lineHeight * 1.45;
    pswdFieldWrapper.classList.toggle("single-line", isSingleLine);
    pswdFieldWrapper.classList.toggle("multi-line", !isSingleLine);
  }

  /* ── Typing animation ─────────────────────── */
  async function typePassword(password) {
    if (isTyping) return;
    isTyping = true;

    pswdText.textContent = "";
    pswdCursor.classList.remove("done");
    pswdDisplay.classList.add("visible");
    pswdEmptyState.classList.add("hidden");

    for (let i = 0; i < password.length; i++) {
      pswdText.textContent += password[i];
      updateFieldShape();
      await new Promise((r) => setTimeout(r, 12 + Math.random() * 20));
    }

    updateFieldShape();
    pswdCursor.classList.add("done");
    isTyping = false;
  }

  /* ── Main generate flow ───────────────────── */
  async function generateAndDisplay() {
    const parts = getActiveCharsetParts();
    const charset = parts.join("");

    if (!charset) {
      showToast(
        getLang() === "ru"
          ? "Выберите хотя бы один набор символов"
          : "Select at least one charset",
      );
      generateBtn.classList.add("shake");
      generateBtn.addEventListener(
        "animationend",
        () => {
          generateBtn.classList.remove("shake");
        },
        { once: true },
      );
      return;
    }

    const length = parseInt(lengthSlider.value);
    currentPassword = generatePassword(length, charset, parts);

    pswdStrengthSection.classList.add("visible");
    pswdResultActions.classList.add("visible");

    const entropy = calculateEntropy(length, charset.length);
    updateStrengthUI(entropy);

    await typePassword(currentPassword);
  }

  /* ── Toast ────────────────────────────────── */
  let toastTimer = null;

  function showToast(message) {
    /* Use the bilingual spans if message is auto-selected, otherwise just set both */
    const ruSpan = document.getElementById("pswd-toast-text-ru");
    const enSpan = document.getElementById("pswd-toast-text-en");
    if (ruSpan) ruSpan.textContent = message;
    if (enSpan) enSpan.textContent = message;

    pswdToast.classList.add("visible");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => pswdToast.classList.remove("visible"), 2200);
  }

  /* ── Copy ─────────────────────────────────── */
  async function copyPassword() {
    if (!currentPassword) return;

    try {
      await navigator.clipboard.writeText(currentPassword);

      const originalHTML = copyBtn.innerHTML;
      copyBtn.classList.add("copied");
      copyBtn.innerHTML =
        '<i class="fas fa-check"></i>' +
        '<span class="text-ru">Скопировано!</span>' +
        '<span class="text-en">Copied!</span>';

      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = originalHTML;
      }, 1600);
    } catch {
      showToast(
        getLang() === "ru" ? "Не удалось скопировать" : "Failed to copy",
      );
    }
  }

  /* ── Event listeners ──────────────────────── */
  generateBtn.addEventListener("click", generateAndDisplay);
  regenerateBtn.addEventListener("click", generateAndDisplay);
  copyBtn.addEventListener("click", copyPassword);
  noAmbiguousOption?.addEventListener("change", generateAndDisplay);
  requireEachOption?.addEventListener("change", generateAndDisplay);
  window.addEventListener("resize", updateFieldShape);

  /* Click field → copy */
  pswdFieldWrapper.addEventListener("click", () => {
    if (!currentPassword) return;
    copyPassword();
  });

  /* Ctrl+Enter shortcut */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      generateAndDisplay();
    }
  });

  /* ── Re-update strength label on lang change ─
       The site's script.js fires a custom event or
       updates localStorage. We listen for storage
       changes to keep the strength label in sync.  */
  window.addEventListener("storage", (e) => {
    if (e.key === "lang" && currentPassword) {
      const charset = getActiveCharset();
      const length = parseInt(lengthSlider.value);
      const entropy = calculateEntropy(length, charset.length);
      updateStrengthUI(entropy);
    }
  });

  /* Also re-run on lang-btn clicks (in-page changes
       don't fire the storage event in same tab).     */
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentPassword) {
        const charset = getActiveCharset();
        const length = parseInt(lengthSlider.value);
        const entropy = calculateEntropy(length, charset.length);
        /* Let the main script.js finish first */
        requestAnimationFrame(() => updateStrengthUI(entropy));
      }
    });
  });

  /* ── Auto-generate on load ────────────────── */
  generateAndDisplay();
});
