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
        <div class="ascii-animation">
            <pre class="ascii-frame">
               __,--‚__
              /     /  '-,_
           ,--,            '-,_
          /              _,--' )
         /(o)         _        |
        (      (o) -   \\       |
       _\\   ' ,         ) _____)
      /  _  /       _,  __   _/
     )  ( '-,____,-'   (  )_/
    <_ _>    '-,____,-\\    )
      V                |  /
                      <  >
                       VV</pre>
        </div>
    `;

    animateTerminal();
});

async function animateTerminal() {
    const sections = document.querySelectorAll('.typing-effect');
    const responses = document.querySelectorAll('.response');
    const socialLinks = document.querySelector('.social-links-container');
    let currentIndex = 0;

    if (socialLinks) {
        socialLinks.style.opacity = '0';
        socialLinks.style.transform = 'translateY(-10px)';
    }

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
            
            if (i === sections.length - 2 && socialLinks) {
                socialLinks.style.transition = 'all 0.5s ease';
                socialLinks.style.opacity = '1';
                socialLinks.style.transform = 'translateY(0)';
            }
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
}

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