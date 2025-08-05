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

            localStorage.setItem('lang', lang);
            
            updateLanguage(lang);
        });
    });

    function updateLanguage(lang) {
        const textRu = document.querySelectorAll('.text-ru');
        const textEn = document.querySelectorAll('.text-en');

        if (lang === 'en') {
            textRu.forEach(el => el.style.display = 'none');
            textEn.forEach(el => el.style.display = 'block');
        } else {
            textRu.forEach(el => el.style.display = 'block');
            textEn.forEach(el => el.style.display = 'none');
        }

        if (document.querySelector('.typing-effect')) {
            animateTerminal();
        }
    }

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
        easterEgg.innerHTML = `<a href="/kernel_panic" class="easter-egg-link">тык</a>`;
    }

    if (document.querySelector('.typing-effect')) {
        updateLanguage(savedLang);
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

let isAnimating = false;
async function animateTerminal() {
    if (isAnimating) return;
    isAnimating = true;
    const typingEffectEl = document.querySelector('.typing-effect');
    const commandEl = document.querySelector('.command');
    const responseEl = document.querySelector('.response');
    const aboutTextEl = document.querySelector('.about-text');
    const finalPrompt = document.getElementById('final-prompt');

    typingEffectEl.style.opacity = '0';
    responseEl.style.opacity = '0';
    finalPrompt.style.opacity = '0';
    aboutTextEl.style.opacity = '0';

    const lines = aboutTextEl.querySelectorAll(".terminal-line");
    lines.forEach(line => line.classList.add('hidden-line'));

    await new Promise(resolve => setTimeout(resolve, 100));

    typingEffectEl.style.transition = 'opacity 0.3s ease';
    typingEffectEl.style.opacity = '1';
    await typeCommand(commandEl, commandEl.dataset.text, 50);
    await new Promise(resolve => setTimeout(resolve, 200));

    responseEl.style.transition = 'opacity 0.5s ease';
    responseEl.style.opacity = '1';
    aboutTextEl.classList.remove('hidden');
    aboutTextEl.style.transition = 'opacity 0.5s ease';
    aboutTextEl.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 300));

    const currentLang = localStorage.getItem('lang') || 'ru';
    const visibleLines = aboutTextEl.querySelectorAll(`.terminal-line.text-${currentLang}`);
    
    for (const line of visibleLines) {
        line.classList.remove('hidden-line');
        const prompt = line.querySelector('.prompt').outerHTML;
        const content = line.innerHTML.replace(prompt, '');
        line.innerHTML = prompt; 
        await typeContent(line, content, 10); 
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    finalPrompt.style.transition = 'opacity 0.5s ease';
    finalPrompt.style.opacity = '1';
    isAnimating = false;
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

function typeContent(element, htmlContent, speed) {
    return new Promise(resolve => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.textContent || '';
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text[i];
                i++;
            } else {
                element.innerHTML = element.querySelector('.prompt').outerHTML + htmlContent;
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
} 