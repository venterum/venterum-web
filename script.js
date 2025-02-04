document.addEventListener('DOMContentLoaded', () => {
    const minimizeBtn = document.getElementById('minimize-btn');
    const terminal = document.querySelector('.terminal');
    const easterEgg = document.querySelector('.easter-egg');
    let isMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        
        if (isMinimized) {
            terminal.classList.add('minimized');
            setTimeout(() => {
                easterEgg.classList.add('visible');
            }, 300);
        } else {
            terminal.classList.remove('minimized');
            easterEgg.classList.remove('visible');
        }
    });

    document.addEventListener('click', (e) => {
        if (isMinimized && !minimizeBtn.contains(e.target)) {
            isMinimized = false;
            terminal.classList.remove('minimized');
            easterEgg.classList.remove('visible');
        }
    });

    const themeToggle = document.querySelector('.theme-toggle');
    const themeList = document.querySelector('.theme-list');
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentThemeIcon = document.querySelector('.current-theme');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        themeList.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!themeToggle.contains(e.target)) {
            themeList.classList.remove('active');
        }
    });

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            const icon = option.querySelector('.theme-icon').textContent;
            
            body.className = `theme-${theme}`;
            currentThemeIcon.textContent = icon;
            
            localStorage.setItem('theme', theme);
            themeList.classList.remove('active');
        });
    });

    const langButtons = document.querySelectorAll('.lang-btn');
    const textRu = document.querySelectorAll('.text-ru');
    const textEn = document.querySelectorAll('.text-en');

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (lang === 'en') {
                textRu.forEach(el => el.style.display = 'none');
                textEn.forEach(el => el.style.display = 'block');
            } else {
                textRu.forEach(el => el.style.display = 'block');
                textEn.forEach(el => el.style.display = 'none');
            }
            
            localStorage.setItem('lang', lang);
        });
    });

    const savedTheme = localStorage.getItem('theme') || 'default';
    const savedLang = localStorage.getItem('lang') || 'ru';

    // Apply saved theme
    body.className = `theme-${savedTheme}`;
    document.querySelector(`[data-theme="${savedTheme}"]`)?.click();

    // Apply saved language
    document.querySelector(`[data-lang="${savedLang}"]`)?.click();

    // Typing animation
    const commands = document.querySelectorAll('.command');
    commands.forEach(cmd => {
        const text = cmd.dataset.text;
        cmd.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                cmd.textContent += text[i];
                i++;
            } else {
                clearInterval(interval);
            }
        }, 100);
    });

    const terminalHeader = document.querySelector('.terminal-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    function setTranslate(xPos, yPos) {
        terminal.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === terminalHeader) {
            isDragging = true;
            terminal.classList.add('dragging');
        }
    }

    function dragEnd() {
        if (!isDragging) return;
        
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        terminal.classList.remove('dragging');
    }

    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();

        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY);
    }

    terminalHeader.addEventListener('touchstart', dragStart, false);
    document.addEventListener('touchend', dragEnd, false);
    document.addEventListener('touchmove', drag, false);

    terminalHeader.addEventListener('mousedown', dragStart, false);
    document.addEventListener('mouseup', dragEnd, false);
    document.addEventListener('mousemove', drag, false);

    terminalHeader.addEventListener('selectstart', (e) => e.preventDefault());

    terminalHeader.addEventListener('dblclick', () => {
        xOffset = 0;
        yOffset = 0;
        terminal.style.transform = 'translate(0px, 0px)';
    });

    const closeBtn = document.querySelector('.dot.red');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        terminal.classList.add('shake');
        setTimeout(() => {
            terminal.classList.remove('shake');
        }, 400);
    });

    easterEgg.innerHTML = `
        <div class="rickroll">
            <div class="rickroll-text">Never gonna give you up</div>
            <a class="rickroll-link">🎵</a>
        </div>
    `;

    animateTerminal();
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

function animateTerminal() {
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
        cursor.style.left = `${rect.left - terminalRect.left + element.offsetWidth + 10}px`;
    }

    function animateResponse(response) {
        return new Promise(resolve => {
            if (!response) {
                resolve();
                return;
            }

            const cards = response.querySelectorAll('.project-card, .skill-category');
            const socialLinks = response.querySelectorAll('.social-link');
            
            if (cards.length || socialLinks.length) {
                response.style.opacity = '1';
                response.style.transform = 'translateY(0)';
                
                let cardIndex = 0;
                function animateNextCard() {
                    if (cardIndex >= cards.length) {
                        if (socialLinks.length) {
                            let socialIndex = 0;
                            function animateNextSocial() {
                                if (socialIndex >= socialLinks.length) {
                                    setTimeout(resolve, 300);
                                    return;
                                }
                                
                                const link = socialLinks[socialIndex];
                                link.style.opacity = '1';
                                link.style.transform = 'translateY(0)';
                                socialIndex++;
                                setTimeout(animateNextSocial, 100);
                            }
                            setTimeout(animateNextSocial, 500);
                        } else {
                            setTimeout(resolve, 300);
                        }
                        return;
                    }
                    
                    const card = cards[cardIndex];
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    cardIndex++;
                    setTimeout(animateNextCard, 150);
                }
                
                setTimeout(animateNextCard, 400);
            } else {
                response.style.opacity = '1';
                response.style.transform = 'translateY(0)';
                setTimeout(resolve, 500);
            }
        });
    }

    async function animateNext() {
        if (currentIndex >= sections.length) {
            const lastCommand = document.querySelector('.typing-effect:last-child .command');
            updateCursorPosition(lastCommand);
            return;
        }

        const section = sections[currentIndex];
        const response = responses[currentIndex];
        const command = section.querySelector('.command');

        section.style.opacity = '1';
        updateCursorPosition(command);
        
        await new Promise(resolve => {
            typeCommand(command, command.dataset.text, resolve);
        });

        await animateResponse(response);
        
        currentIndex++;
        setTimeout(animateNext, 500);
    }

    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transition = 'opacity 0.3s ease';
    });

    responses.forEach(response => {
        response.style.opacity = '0';
        response.style.transform = 'translateY(-10px)';
        response.style.transition = 'all 0.3s ease';
        
        const cards = response.querySelectorAll('.project-card, .skill-category, .social-link');
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-10px)';
            card.style.transition = 'all 0.3s ease';
        });
    });

    document.querySelectorAll('.command').forEach(cmd => {
        cmd.style.animation = 'none';
    });

    setTimeout(animateNext, 500);
} 