document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.typing-effect');
    const responses = document.querySelectorAll('.response');
    let currentIndex = 0;

    const cursor = document.createElement('div');
    cursor.className = 'terminal-cursor';
    document.querySelector('.terminal-content').appendChild(cursor);

    function updateCursorPosition(element) {
        const rect = element.getBoundingClientRect();
        const terminalRect = document.querySelector('.terminal').getBoundingClientRect();
        cursor.style.top = `${rect.bottom - terminalRect.top - 20}px`;
        cursor.style.left = `${rect.left - terminalRect.left + element.offsetWidth}px`;
    }

    async function animateSection(section, response) {
        section.style.opacity = '1';
        const command = section.querySelector('.command');
        updateCursorPosition(command);

        await new Promise(resolve => {
            typeCommand(command, command.dataset.text, resolve);
        });

        if (response) {
            response.style.opacity = '1';
            response.style.transform = 'translateY(0)';

            const elements = response.children;
            for (let element of elements) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async function animate() {
        for (let i = 0; i < sections.length; i++) {
            await animateSection(sections[i], responses[i]);
        }

        const inputLine = document.querySelector('.input-line');
        if (inputLine) {
            updateCursorPosition(inputLine.querySelector('.command'));
            setTimeout(() => {
                cursor.style.opacity = '0';
                setTimeout(() => {
                    cursor.remove();
                }, 300);
            }, 1000);
        }
    }

    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transition = 'opacity 0.3s ease';
    });

    responses.forEach(response => {
        response.style.opacity = '0';
        response.style.transform = 'translateY(-10px)';
        response.style.transition = 'all 0.3s ease';
        
        Array.from(response.children).forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-10px)';
            element.style.transition = 'all 0.3s ease';
        });
    });

    animate();
});

function typeCommand(element, text, onComplete) {
    element.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text[i];
            i++;
        } else {
            clearInterval(interval);
            if (onComplete) onComplete();
        }
    }, 50);
} 