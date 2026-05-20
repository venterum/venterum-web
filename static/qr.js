document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-qr-btn');
    const qrDataInput = document.getElementById('qr-data');
    const qrOutputArea = document.getElementById('qr-output-area');
    const qrEmptyState = document.getElementById('qr-empty-state');
    const qrDisplay = document.getElementById('qr-display');
    const qrImage = document.getElementById('qr-image');
    const downloadBtn = document.getElementById('download-qr-btn');
    const copyBtn = document.getElementById('copy-qr-btn');
    const resultActions = document.getElementById('qr-result-actions');
    const qrError = document.getElementById('qr-error');
    const charCounter = document.getElementById('char-counter');
    const inputTypeBadge = document.getElementById('input-type-badge');

    let currentBase64 = null;

    // --- Placeholder management ---
    function setPlaceholder() {
        const lang = localStorage.getItem('lang') || 'ru';
        const placeholder = lang === 'ru'
            ? qrDataInput.getAttribute('placeholder-ru')
            : qrDataInput.getAttribute('placeholder-en');
        if (placeholder) {
            qrDataInput.placeholder = placeholder;
        }
    }

    // --- Input type detection ---
    function detectInputType(text) {
        const trimmed = text.trim();
        if (!trimmed) return null;

        try {
            const url = new URL(trimmed);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                return 'url';
            }
        } catch (_) {}

        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch (_) {}
        }

        return 'text';
    }

    function updateInputTypeBadge() {
        const type = detectInputType(qrDataInput.value);
        const icons = { url: 'fa-link', json: 'fa-code', text: 'fa-font' };
        const labels = {
            url:  { ru: 'Ссылка', en: 'URL' },
            json: { ru: 'JSON',   en: 'JSON' },
            text: { ru: 'Текст',  en: 'Text' }
        };

        if (!type) {
            inputTypeBadge.classList.remove('visible');
            return;
        }

        const icon = inputTypeBadge.querySelector('i');
        const textRu = inputTypeBadge.querySelector('.text-ru');
        const textEn = inputTypeBadge.querySelector('.text-en');

        icon.className = 'fas ' + icons[type];
        textRu.textContent = labels[type].ru;
        textEn.textContent = labels[type].en;

        inputTypeBadge.classList.add('visible');
    }

    // --- Character counter ---
    function updateCharCounter() {
        const len = qrDataInput.value.length;
        const max = parseInt(qrDataInput.getAttribute('maxlength'), 10) || 2048;
        charCounter.textContent = `${len} / ${max}`;

        charCounter.classList.remove('warning', 'danger');
        if (len >= max) {
            charCounter.classList.add('danger');
        } else if (len >= max * 0.85) {
            charCounter.classList.add('warning');
        }
    }

    // --- Button state ---
    function updateGenerateBtn() {
        const hasContent = qrDataInput.value.trim().length > 0;
        generateBtn.disabled = !hasContent;
    }

    // --- State management ---
    function showError(messageRu, messageEn) {
        const errRu = document.getElementById('qr-error-text-ru');
        const errEn = document.getElementById('qr-error-text-en');
        if (messageRu) errRu.textContent = messageRu;
        if (messageEn) errEn.textContent = messageEn;
        qrError.style.display = 'flex';
    }

    function hideError() {
        qrError.style.display = 'none';
    }

    function showLoading() {
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
    }

    function hideLoading() {
        generateBtn.classList.remove('loading');
        updateGenerateBtn();
    }

    function showResult(base64) {
        currentBase64 = base64;

        qrEmptyState.style.display = 'none';
        qrDisplay.style.display = 'block';
        qrImage.src = `data:image/png;base64,${base64}`;
        qrOutputArea.classList.add('has-qr');

        // Re-trigger animation
        const frame = qrDisplay.querySelector('.qr-frame');
        frame.style.animation = 'none';
        frame.offsetHeight; // force reflow
        frame.style.animation = '';

        downloadBtn.href = `data:image/png;base64,${base64}`;
        resultActions.style.display = 'flex';
    }

    function resetResult() {
        currentBase64 = null;
        qrEmptyState.style.display = 'flex';
        qrDisplay.style.display = 'none';
        qrOutputArea.classList.remove('has-qr');
        resultActions.style.display = 'none';
        hideError();
    }

    // --- Generate QR ---
    async function generateQR() {
        const data = qrDataInput.value.trim();
        if (!data) return;

        hideError();
        showLoading();

        try {
            const response = await fetch('/qr/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: data })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                showError(
                    result.error || 'Не удалось сгенерировать QR-код',
                    result.error || 'Failed to generate QR code'
                );
                return;
            }

            if (result.qr_code) {
                showResult(result.qr_code);
            }
        } catch (err) {
            showError(
                'Ошибка сети. Попробуйте ещё раз.',
                'Network error. Please try again.'
            );
        } finally {
            hideLoading();
        }
    }

    // --- Copy to clipboard ---
    async function copyQRToClipboard() {
        if (!currentBase64) return;

        try {
            const byteCharacters = atob(currentBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            showCopiedFeedback();
        } catch (_) {
            try {
                await navigator.clipboard.writeText(
                    `data:image/png;base64,${currentBase64}`
                );
                showCopiedFeedback();
            } catch (__) {}
        }
    }

    function showCopiedFeedback() {
        const lang = localStorage.getItem('lang') || 'ru';
        const labelRu = copyBtn.querySelector('.text-ru');
        const labelEn = copyBtn.querySelector('.text-en');
        const icon = copyBtn.querySelector('i');

        const origRu = labelRu.textContent;
        const origEn = labelEn.textContent;
        const origIcon = icon.className;

        labelRu.textContent = 'Скопировано!';
        labelEn.textContent = 'Copied!';
        icon.className = 'fas fa-check';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            labelRu.textContent = origRu;
            labelEn.textContent = origEn;
            icon.className = origIcon;
            copyBtn.classList.remove('copied');
        }, 1500);
    }

    // --- Event listeners ---
    qrDataInput.addEventListener('input', () => {
        updateCharCounter();
        updateGenerateBtn();
        updateInputTypeBadge();
    });

    generateBtn.addEventListener('click', generateQR);

    qrDataInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!generateBtn.disabled) {
                generateQR();
            }
        }
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', copyQRToClipboard);
    }

    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(() => {
                setPlaceholder();
                updateInputTypeBadge();
            }, 0);
        });
    });

    // --- Initialization ---
    setPlaceholder();
    updateCharCounter();
    updateGenerateBtn();
});
