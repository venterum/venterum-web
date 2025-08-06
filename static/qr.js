document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-qr-btn');
    const qrDataInput = document.getElementById('qr-data');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const downloadBtn = document.getElementById('download-qr-btn');

    function setPlaceholder() {
        const lang = localStorage.getItem('lang') || 'ru';
        const placeholder = lang === 'ru' ? qrDataInput.getAttribute('placeholder-ru') : qrDataInput.getAttribute('placeholder-en');
        qrDataInput.placeholder = placeholder;
    }

    generateBtn.addEventListener('click', () => {
        const data = qrDataInput.value;
        if (data) {
            fetch('/qr/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: data })
            })
            .then(response => response.json())
            .then(result => {
                if (result.qr_code) {
                    qrCodeContainer.innerHTML = `<img src="data:image/png;base64,${result.qr_code}" alt="QR Code">`;
                    downloadBtn.href = `data:image/png;base64,${result.qr_code}`;
                    downloadBtn.download = 'qrcode.png';
                    downloadBtn.style.display = 'inline-block';
                }
            });
        }
    });

    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(setPlaceholder, 0);
        });
    });

    setPlaceholder();
});