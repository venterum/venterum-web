document.addEventListener('DOMContentLoaded', () => {
    const minimizeBtn = document.getElementById('minimize-btn');
    const terminal = document.querySelector('.terminal');
    const easterEgg = document.querySelector('.easter-egg');
    let isMinimized = false;

    if (minimizeBtn && terminal && easterEgg) {
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
            if (isMinimized && !minimizeBtn.contains(e.target) && !easterEgg.contains(e.target)) {
                isMinimized = false;
                terminal.classList.remove('minimized');
                easterEgg.classList.remove('visible');
            }
        });
    }

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
            
            setTimeout(() => {
                const inputCommand = document.querySelector('.input-line .command');
                updateCursorPosition(inputCommand);
            }, 100);
        });
    });

    const savedTheme = localStorage.getItem('theme') || 'default';
    const savedLang = localStorage.getItem('lang') || 'ru';

    body.className = `theme-${savedTheme}`;
    document.querySelector(`[data-theme="${savedTheme}"]`)?.click();
    document.querySelector(`[data-lang="${savedLang}"]`)?.click();

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
        
        requestAnimationFrame(() => {
            terminal.style.transform = `translate(${currentX}px, ${currentY}px)`;
        });
    }

    if (terminalHeader && terminal) {
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
    }

    if (easterEgg) {
        easterEgg.innerHTML = `
            <div class="frog-window">
                <div class="frog-header">
                    <div class="window-title">frog.jpeg</div>
                    <div class="window-controls">
                        <span class="dot red"></span>
                        <span class="dot yellow"></span>
                        <span class="dot green"></span>
                    </div>
                </div>
                <div class="frog-content">
                    <img src="assets/frog.jpg" alt="Frog" class="frog-image">
                </div>
            </div>
        `;
    
        const frogWindow = easterEgg.querySelector('.frog-window');
        const frogHeader = easterEgg.querySelector('.frog-header');
        let frogIsDragging = false;
        let frogCurrentX;
        let frogCurrentY;
        let frogInitialX;
        let frogInitialY;
        let frogXOffset = 0;
        let frogYOffset = 0;

        function frogDragStart(e) {
            if (e.type === "touchstart") {
                frogInitialX = e.touches[0].clientX - frogXOffset;
                frogInitialY = e.touches[0].clientY - frogYOffset;
            } else {
                frogInitialX = e.clientX - frogXOffset;
                frogInitialY = e.clientY - frogYOffset;
            }

            if (e.target.closest('.frog-header')) {
                frogIsDragging = true;
                frogWindow.classList.add('dragging');
            }
        }

        function frogDrag(e) {
            if (!frogIsDragging) return;

            e.preventDefault();
            
            if (e.type === "touchmove") {
                frogCurrentX = e.touches[0].clientX - frogInitialX;
                frogCurrentY = e.touches[0].clientY - frogInitialY;
            } else {
                frogCurrentX = e.clientX - frogInitialX;
                frogCurrentY = e.clientY - frogInitialY;
            }

            frogXOffset = frogCurrentX;
            frogYOffset = frogCurrentY;
            
            requestAnimationFrame(() => {
                frogWindow.style.transform = `translate(calc(-50% + ${frogCurrentX}px), calc(-50% + ${frogCurrentY}px))`;
            });
        }

        function frogDragEnd() {
            frogIsDragging = false;
            frogWindow.classList.remove('dragging');
        }

        frogHeader.addEventListener('mousedown', frogDragStart);
        document.addEventListener('mousemove', frogDrag);
        document.addEventListener('mouseup', frogDragEnd);
    
        frogHeader.addEventListener('touchstart', frogDragStart);
        document.addEventListener('touchmove', frogDrag);
        document.addEventListener('touchend', frogDragEnd);
    }

    if (document.querySelector('.typing-effect')) {
        animateTerminal();
    }

    const wipMessages = {
        ru: [
            "Этот раздел ещё прихорашивается...",
            "Здесь пока идёт ремонт...",
            "Скоро здесь будет что-то интересное...",
            "Работа кипит, страница в процессе...",
            "Ещё немного терпения..."
        ],
        en: [
            "This section is still getting prettier...",
            "Under construction for now...",
            "Something interesting is coming soon...",
            "Work in progress, page is coming...",
            "Just a little more patience..."
        ]
    };

    const wipButtons = document.querySelectorAll('.wip-button');
    if (wipButtons.length > 0) {
        let toast = document.createElement('div');
        toast.className = 'wip-toast';
        document.body.appendChild(toast);
        let toastTimeout;
    
        wipButtons.forEach(button => {
            button.addEventListener('click', () => {
                const currentLang = localStorage.getItem('lang') || 'ru';
                const messages = wipMessages[currentLang];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                
                toast.textContent = randomMessage;
                toast.classList.add('visible');
                
                clearTimeout(toastTimeout);
                toastTimeout = setTimeout(() => {
                    toast.classList.remove('visible');
                }, 3000);
            });
        });
    }

    const cookieConsent = localStorage.getItem('cookieConsent');
    const cookieNotice = document.querySelector('.cookie-notice');
    
    if (cookieNotice) {
        if (cookieConsent === null) {
            setTimeout(() => {
                cookieNotice.classList.add('visible');
            }, 1000);
        }
        
        document.querySelector('.cookie-accept').addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            cookieNotice.classList.remove('visible');
        });
    }
});

async function animateTerminal() {
    const typingEffectEl = document.querySelector('.typing-effect');
    const commandEl = document.querySelector('.command');
    const responseEl = document.querySelector('.response');
    const asciiArtEl = responseEl.querySelector('.ascii-art');
    const aboutTextEl = responseEl.querySelector('.about-text');

    // Hide elements initially for the animation
    typingEffectEl.style.opacity = '0';
    responseEl.style.opacity = '0';
    asciiArtEl.style.opacity = '0';
    aboutTextEl.style.opacity = '0';
    
    // Wait a moment before starting to ensure styles are applied
    await new Promise(resolve => setTimeout(resolve, 100));

    // 0. Make the prompt visible
    typingEffectEl.style.transition = 'opacity 0.3s ease';
    typingEffectEl.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 100));

    // 1. Type the command
    await typeCommand(commandEl, commandEl.dataset.text, 50);

    // 2. Show response area and fade in ASCII art
    responseEl.style.transition = 'opacity 0.3s ease';
    responseEl.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 200));
    
    asciiArtEl.style.transition = 'opacity 0.5s ease';
    asciiArtEl.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. Fade in the text container and type out the welcome message
    aboutTextEl.style.transition = 'opacity 0.5s ease';
    aboutTextEl.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for fade-in

    const currentLang = localStorage.getItem('lang') || 'ru';
    const targetP = aboutTextEl.querySelector(`.text-${currentLang}`);
    
    const originalText = targetP.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    targetP.innerHTML = ''; // Clear for typing effect
    targetP.style.whiteSpace = 'pre-wrap'; // Respect newlines

    await typeParagraph(targetP, originalText, 25); // Type the paragraph content

    // 4. Show the final prompt
    const finalPrompt = document.getElementById('final-prompt');
    finalPrompt.style.transition = 'opacity 0.5s ease';
    finalPrompt.style.opacity = '1';
}

function typeCommand(element, text, speed) {
    return new Promise(resolve => {
        element.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text[i];
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

function typeParagraph(element, text, speed) {
    return new Promise(resolve => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                // Handle newline characters correctly
                if (text[i] === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.innerHTML += text[i];
                }
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
} 