document.addEventListener('DOMContentLoaded', () => {
    const ipAddressEl = document.getElementById('ip-address');
    const toggleIpEl = document.getElementById('toggle-ip');
    const realIp = ipAddressEl.dataset.ip;
    
    const maskedIp = realIp.split('').map(char => (char === '.' ? '.' : '*')).join('');
    let isIpRevealed = false;

    ipAddressEl.textContent = maskedIp;

    const chars = '!@#$%^&*()_+-=[]{};:,.<>?';

    const animateText = (targetText) => {
        let iterations = 0;
        const interval = setInterval(() => {
            ipAddressEl.textContent = ipAddressEl.textContent.split('')
                .map((char, index) => {
                    if (realIp[index] === '.') {
                        return '.';
                    }
                    if (index < iterations) {
                        return targetText[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join('');

            if (iterations >= targetText.length) {
                clearInterval(interval);
                ipAddressEl.textContent = targetText;
            }
            iterations += 1 / 3;
        }, 40);
    };

    const toggleIp = () => {
        isIpRevealed = !isIpRevealed;

        if (isIpRevealed) {
            toggleIpEl.classList.remove('fa-eye');
            toggleIpEl.classList.add('fa-eye-slash');
            animateText(realIp);
        } else {
            toggleIpEl.classList.remove('fa-eye-slash');
            toggleIpEl.classList.add('fa-eye');
            animateText(maskedIp);
        }
    };

    if (toggleIpEl) {
        toggleIpEl.addEventListener('click', toggleIp);
    }
});
