document.addEventListener('DOMContentLoaded', () => {
    const minimizeBtn = document.getElementById('minimize-btn');
    const terminal = document.querySelector('.terminal');
    let isMinimized = false;

    if (minimizeBtn && terminal) {
        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            terminal.classList.toggle('minimized', isMinimized);
        });

        document.addEventListener('click', (e) => {
            if (isMinimized && !minimizeBtn.contains(e.target)) {
                isMinimized = false;
                terminal.classList.remove('minimized');
            }
        });
    }

    const themeToggle = document.querySelector('.theme-toggle');
    const themeDropdown = document.querySelector('.theme-dropdown');
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentThemeIcon = document.querySelector('.current-theme');
    const body = document.body;

    themeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!themeDropdown.contains(e.target)) {
            themeDropdown.classList.remove('active');
        }
    });

    /* ── Tools dropdown toggle ──────────────── */
    const toolsDropdown = document.querySelector('.tools-dropdown');
    const toolsToggle = document.querySelector('.tools-toggle');

    if (toolsDropdown && toolsToggle) {
        toolsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toolsDropdown.classList.toggle('active');
            themeDropdown.classList.remove('active');
        });

        document.addEventListener('click', (e) => {
            if (!toolsDropdown.contains(e.target)) {
                toolsDropdown.classList.remove('active');
            }
        });
    }

    /* Close tools dropdown when theme opens */
    themeToggle.addEventListener('click', () => {
        if (toolsDropdown) toolsDropdown.classList.remove('active');
    });

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            const icon = option.querySelector('.theme-icon').textContent;
            
            body.className = `theme-${theme}`;
            currentThemeIcon.textContent = icon;
            themeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');

            localStorage.setItem('theme', theme);
            themeDropdown.classList.remove('active');
        });
    });

    const langButtons = document.querySelectorAll('.lang-btn');
    const langConfirm = document.getElementById('lang-confirm');
    const langConfirmOk = langConfirm?.querySelector('[data-lang-confirm-ok]');
    const langConfirmCancel = langConfirm?.querySelector('button[data-lang-confirm-cancel]');
    let pendingLang = null;
    let langTrigger = null;

    function applyLanguage(lang, persist) {
        langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));

        localStorage.setItem('lang', lang);
        if (persist) localStorage.setItem('langChoice', lang);

        updateLanguage(lang);

        if (typeof updateClock === 'function') {
            updateClock();
        }
    }

    const hasTerminalInput = () => {
        const log = document.getElementById('terminal-log');
        const input = document.getElementById('terminal-command');
        return Boolean((log && log.children.length > 0) || (input && input.value.trim()));
    };

    const closeLangConfirm = (restoreFocus = true) => {
        if (!langConfirm || langConfirm.hidden) return;
        langConfirm.hidden = true;
        document.body.classList.remove('confirm-open');
        pendingLang = null;
        if (restoreFocus) langTrigger?.focus();
        langTrigger = null;
    };

    const requestLanguage = (lang, trigger) => {
        if (lang === document.documentElement.dataset.lang) return;

        if (hasTerminalInput() && langConfirm) {
            pendingLang = lang;
            langTrigger = trigger;
            langConfirm.hidden = false;
            document.body.classList.add('confirm-open');
            langConfirmCancel?.focus();
            return;
        }

        applyLanguage(lang, true);
    };

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => requestLanguage(btn.dataset.lang, btn));
    });

    langConfirmOk?.addEventListener('click', () => {
        const lang = pendingLang;

        document.dispatchEvent(new CustomEvent('terminal:clear'));
        closeLangConfirm();
        if (lang) applyLanguage(lang, true);
    });

    langConfirm?.querySelectorAll('[data-lang-confirm-cancel]').forEach(el => {
        el.addEventListener('click', () => closeLangConfirm());
    });

    langConfirm?.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab' || !langConfirmOk || !langConfirmCancel) return;
        if (event.shiftKey && document.activeElement === langConfirmCancel) {
            event.preventDefault();
            langConfirmOk.focus();
        } else if (!event.shiftKey && document.activeElement === langConfirmOk) {
            event.preventDefault();
            langConfirmCancel.focus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && langConfirm && !langConfirm.hidden) {
            closeLangConfirm();
        }
    });

    function updateLanguage(lang) {
        document.documentElement.dataset.lang = lang;

        const content = document.getElementById('terminal-log')?.closest('.terminal-content');
        if (content) content.scrollTop = 0;

        if (document.querySelector('.typing-effect')) {
            animateTerminal();
        }
    }

    const savedTheme = localStorage.getItem('theme') || 'default';
    const browserLang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
    const savedLang = localStorage.getItem('langChoice') || browserLang;

    body.className = `theme-${savedTheme}`;
    document.querySelector(`[data-theme="${savedTheme}"]`)?.click();
    applyLanguage(savedLang, false);

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

    // Clock pill functionality
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    let clockInterval = null;

    if (clockTime && clockDate) {
        function updateClock() {
            const now = new Date();
            const currentLang = localStorage.getItem('lang') || 'ru';

            let hours = now.getHours();
            let timeString;

            if (currentLang === 'en') {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const timeStr = String(hours).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                timeString = `${timeStr} ${ampm}`;
            } else {
                timeString = String(hours).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            }

            clockTime.textContent = timeString;

            let dayName, monthName, dayNum;

            if (currentLang === 'en') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dayName = days[now.getDay()];
                monthName = months[now.getMonth()];
                dayNum = now.getDate();
                clockDate.textContent = `${dayName}, ${monthName} ${dayNum}`;
            } else {
                const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
                dayName = days[now.getDay()];
                monthName = months[now.getMonth()];
                dayNum = now.getDate();
                clockDate.textContent = `${dayName}, ${dayNum} ${monthName}`;
            }
        }

        window.updateClock = updateClock;

        updateClock();
        clockInterval = setInterval(updateClock, 1000);
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

    const blogGrid = document.getElementById('blog-grid');
    if (blogGrid) {
        const moreBtn = document.getElementById('blog-more');
        const pageSize = 8;
        let posts = [];
        let shown = 0;
        const cardOrder = [];

        const arrangeBlogCards = () => {
            if (cardOrder.length === 0) return;
            blogGrid.innerHTML = '';

            if (window.matchMedia('(max-width: 600px)').matches) {
                cardOrder.forEach((card) => blogGrid.appendChild(card));
                return;
            }

            const leftColumn = document.createElement('div');
            leftColumn.className = 'blog-column';
            const rightColumn = document.createElement('div');
            rightColumn.className = 'blog-column';

            cardOrder.forEach((card, index) => {
                (index % 2 === 0 ? leftColumn : rightColumn).appendChild(card);
            });

            blogGrid.appendChild(leftColumn);
            blogGrid.appendChild(rightColumn);
        };

        let blogResizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(blogResizeTimeout);
            blogResizeTimeout = setTimeout(arrangeBlogCards, 120);
        });

        const timeAgo = (iso, lang) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return '';
            const days = Math.floor((Date.now() - date.getTime()) / 86400000);
            if (days <= 0) return lang === 'ru' ? 'сегодня' : 'today';
            if (days === 1) return lang === 'ru' ? 'вчера' : 'yesterday';
            if (days < 7) return lang === 'ru' ? `${days} дн. назад` : `${days}d ago`;
            if (days < 30) {
                const weeks = Math.floor(days / 7);
                return lang === 'ru' ? `${weeks} нед. назад` : `${weeks}w ago`;
            }
            return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        const absoluteDate = (iso) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return '';
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        const buildCard = (item) => {
            const card = document.createElement('article');
            card.className = 'blog-card';

            const header = document.createElement('div');
            header.className = 'blog-card-header';

            const channel = document.createElement('div');
            channel.className = 'blog-channel';

            if (item.channel && item.channel.avatar_url) {
                const avatar = document.createElement('img');
                avatar.className = 'blog-avatar';
                avatar.src = item.channel.avatar_url;
                avatar.alt = item.channel.name || 'Telegram*';
                avatar.loading = 'lazy';
                avatar.decoding = 'async';
                channel.appendChild(avatar);
            }

            const channelText = document.createElement('div');
            channelText.className = 'blog-channel-text';

            const channelName = document.createElement('div');
            channelName.className = 'blog-channel-name';
            channelName.textContent = (item.channel && item.channel.name) ? item.channel.name : 'Telegram*';

            const dateRow = document.createElement('div');
            dateRow.className = 'blog-date';
            dateRow.title = absoluteDate(item.datetime);

            const dateRu = document.createElement('span');
            dateRu.className = 'text-ru';
            dateRu.textContent = timeAgo(item.datetime, 'ru');

            const dateEn = document.createElement('span');
            dateEn.className = 'text-en';
            dateEn.textContent = timeAgo(item.datetime, 'en');

            dateRow.appendChild(dateRu);
            dateRow.appendChild(dateEn);

            const age = Date.now() - new Date(item.datetime).getTime();
            if (age >= 0 && age < 7 * 86400000) {
                const badge = document.createElement('span');
                badge.className = 'blog-new';
                badge.innerHTML = '<span class="text-ru">новое</span><span class="text-en">new</span>';
                dateRow.appendChild(badge);
            }

            channelText.appendChild(channelName);
            channelText.appendChild(dateRow);
            channel.appendChild(channelText);
            header.appendChild(channel);

            if (item.url) {
                const openLink = document.createElement('a');
                openLink.className = 'blog-open-btn';
                openLink.href = item.url;
                openLink.target = '_blank';
                openLink.rel = 'noopener';

                const openLinkRu = document.createElement('span');
                openLinkRu.className = 'text-ru';
                openLinkRu.textContent = 'Открыть';

                const openLinkEn = document.createElement('span');
                openLinkEn.className = 'text-en';
                openLinkEn.textContent = 'Open';

                openLink.appendChild(openLinkRu);
                openLink.appendChild(openLinkEn);
                header.appendChild(openLink);
            }

            card.appendChild(header);

            if (item.image_url) {
                const image = document.createElement('img');
                image.className = 'blog-image';
                image.src = item.image_url;
                image.alt = '';
                image.loading = 'lazy';
                image.decoding = 'async';
                card.appendChild(image);
            }

            if (item.content) {
                const content = document.createElement('div');
                content.className = 'blog-content';
                content.innerHTML = item.content;

                const contentText = (content.textContent || '').trim();
                if (contentText.length > 0) {
                    content.querySelectorAll('a').forEach(link => {
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer nofollow';
                    });
                    card.appendChild(content);
                }
            }

            return card;
        };

        const renderNext = () => {
            const slice = posts.slice(shown, shown + pageSize);
            slice.forEach((item) => cardOrder.push(buildCard(item)));
            shown += slice.length;
            arrangeBlogCards();
            if (moreBtn) moreBtn.hidden = shown >= posts.length;
        };

        const showError = () => {
            blogGrid.innerHTML = `
                <div class="blog-error">
                    <span class="text-ru">Не удалось загрузить ленту. <a href="https://t.me/vntrum_public" target="_blank" rel="noopener">Открыть в Telegram ↗</a></span>
                    <span class="text-en">Couldn't load the feed. <a href="https://t.me/vntrum_public" target="_blank" rel="noopener">Open in Telegram ↗</a></span>
                </div>`;
            if (moreBtn) moreBtn.hidden = true;
        };

        if (moreBtn) {
            moreBtn.addEventListener('click', renderNext);
        }

        fetch('/get_news')
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('empty feed');
                }
                posts = data;
                shown = 0;
                blogGrid.innerHTML = '';
                renderNext();
            })
            .catch(showError);
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
    const terminalContent = typingEffectEl.closest('.terminal-content');
    const setTerminalReady = (ready) => {
        terminalContent?.classList.toggle('terminal-ready', ready);
        if (ready && window.matchMedia('(min-width: 769px)').matches && document.activeElement === document.body) {
            document.getElementById('terminal-command')?.focus({ preventScroll: true });
        }
    };

    setTerminalReady(false);

    const is404 = !responseEl && !aboutTextEl && !finalPrompt;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        typingEffectEl.style.opacity = '1';
        commandEl.textContent = commandEl.dataset.text || '';
        if (responseEl) {
            responseEl.style.opacity = '1';
            responseEl.style.transform = 'none';
        }
        if (aboutTextEl) {
            aboutTextEl.classList.remove('hidden');
            aboutTextEl.style.opacity = '1';
            aboutTextEl.querySelectorAll('.terminal-line').forEach(line => line.classList.remove('hidden-line'));
        }
        if (finalPrompt) {
            finalPrompt.style.opacity = '1';
            finalPrompt.style.transform = 'none';
        }
        setTerminalReady(true);
        isAnimating = false;
        return;
    }

    typingEffectEl.style.opacity = '0';
    typingEffectEl.style.transform = 'translateY(8px)';
    if (responseEl) {
        responseEl.style.opacity = '0';
        responseEl.style.transform = 'translateY(14px) scale(0.98)';
    }
    if (finalPrompt) {
        finalPrompt.style.opacity = '0';
        finalPrompt.style.transform = 'translateY(8px)';
    }
    if (aboutTextEl) {
        aboutTextEl.style.opacity = '0';
        const lines = aboutTextEl.querySelectorAll(".terminal-line");
        lines.forEach(line => line.classList.add('hidden-line'));
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    typingEffectEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    typingEffectEl.style.opacity = '1';
    typingEffectEl.style.transform = 'translateY(0)';
    await typeCommand(commandEl, commandEl.dataset.text, 50);
    await new Promise(resolve => setTimeout(resolve, 200));

    if (is404) {
        setTerminalReady(true);
        isAnimating = false;
        return;
    }

    responseEl.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    responseEl.style.opacity = '1';
    responseEl.style.transform = 'translateY(0) scale(1)';
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

    setTerminalReady(true);
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

/* ── Theme color, back-to-top, tap tooltips ── */
document.addEventListener('DOMContentLoaded', () => {
    const updateThemeColor = () => {
        const bg = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        if (bg) meta.content = bg;
    };

    updateThemeColor();
    new MutationObserver(updateThemeColor).observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
    });

    const toTop = document.getElementById('to-top');
    if (toTop) {
        const onScroll = () => toTop.classList.toggle('visible', window.scrollY > 600);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        toTop.addEventListener('click', () => {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        });
    }

    const closeTooltips = () => {
        document.querySelectorAll('.info-icon-wrapper.tooltip-open').forEach((wrapper) => {
            wrapper.classList.remove('tooltip-open');
            wrapper.setAttribute('aria-expanded', 'false');
        });
    };

    document.querySelectorAll('.info-icon-wrapper').forEach((wrapper) => {
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('aria-expanded', 'false');

        const toggle = (event) => {
            event.stopPropagation();
            const open = wrapper.classList.toggle('tooltip-open');
            wrapper.setAttribute('aria-expanded', String(open));
        };

        wrapper.addEventListener('click', toggle);
        wrapper.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(event);
            }
        });
    });

    document.addEventListener('click', closeTooltips);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeTooltips();
    });
});

/* ── Interactive terminal ─────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('terminal-command');
    const log = document.getElementById('terminal-log');
    if (!input || !log) return;

    const content = log.closest('.terminal-content');

    const commands = ['help', 'whoami', 'ls', 'cd', 'theme', 'contact', 'date', 'clear', 'sudo'];
    const pages = {
        blog: '/#blog',
        projects: '/#projects',
        about: '/about',
        ip: '/ip',
        qr: '/qr',
        pswd: '/pswd',
        cidr: '/cidr',
        rss: '/rss.xml',
        github: 'https://github.com/venterum',
        telegram: 'https://t.me/vntrum_public',
    };
    const themes = ['default', 'light', 'mint', 'tokyo', 'coral', 'sage', 'azure', 'gruvbox'];
    const history = [];
    let historyIndex = 0;

    const lang = () => document.documentElement.dataset.lang || 'ru';
    const t = (ru, en) => (lang() === 'ru' ? ru : en);
    const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));

    const append = (html, className = '') => {
        const line = document.createElement('div');
        line.className = `terminal-log-line ${className}`.trim();
        line.innerHTML = html;
        log.appendChild(line);
        if (content) content.scrollTop = content.scrollHeight;
    };

    const renderFastfetch = () => {
        const theme = (document.body.className.match(/theme-([\w-]+)/) || [])[1] || 'default';
        const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);
        const uptime = Math.floor(performance.now() / 1000);
        const uptimeText = uptime < 60 ? `${uptime}s` : `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
        const rows = [
            ['OS', navigator.platform || navigator.userAgentData?.platform || 'unknown'],
            ['Kernel', '2.4.1-webterm'],
            ['Uptime', uptimeText],
            ['Theme', themeName],
            ['CPU', `${navigator.hardwareConcurrency || '?'}x vCPU`],
            ['Memory', navigator.deviceMemory ? `${navigator.deviceMemory} GiB` : 'unknown'],
        ];
        const logo = [
            '      __',
            '      / /        ',
            '     / /________ ',
            '    / (  _____  )',
            ' _ / /| |_/ \\_| |',
            '(_)_/  \\___^___/ ',
        ].join('\n');

        return `<div class="neofetch">
            <pre class="distro-art" aria-hidden="true">${logo}</pre>
            <div class="system-info">
                <div class="info-label">venterum@web</div>
                <div class="separator">────────────────</div>
                ${rows.map(([key, value]) => `<div class="info-item"><span class="info-key">${key}</span>: ${escapeHtml(String(value))}</div>`).join('')}
                <div class="info-colors" aria-hidden="true">${'<span></span>'.repeat(8)}</div>
            </div>
        </div>`;
    };

    const fileContents = {
        '.plan': () => t(
            '<span class="prompt">&gt;</span> дописать ruthenia<br><span class="prompt">&gt;</span> переписать whatsip на Rust<br><span class="prompt">&gt;</span> не уронить прод<br><span class="prompt">&gt;</span> найти core',
            '<span class="prompt">&gt;</span> finish ruthenia<br><span class="prompt">&gt;</span> rewrite whatsip in Rust<br><span class="prompt">&gt;</span> don&#39;t break prod<br><span class="prompt">&gt;</span> find the core'
        ),
        '.profile': () => `export EDITOR=vim<br>alias ll='ls -la'<br>alias ff='fastfetch'<br><br># TODO: rewrite this site in Rust`,
        'now.txt': () => t(
            'Фокус: стабилизация Ruthenia Store, изучение сетевой подсистемы Rust, университетские курсы по криптографии.',
            'Focus: refining Ruthenia Store, learning Rust networking, university coursework in cryptography.'
        ),
        '.secret': () => t(
            '[ ДОСТУП РАЗРЕШЁН ]<br>Торт — ложь.<br>Core — это дверь: <a href="/kernel_panic">/kernel_panic</a>',
            '[ ACCESS GRANTED ]<br>The cake is a lie.<br>The core is a door: <a href="/kernel_panic">/kernel_panic</a>'
        ),
        'welcome.sh': () => '#!/usr/bin/env bash<br>echo "venterum@web"<br>echo "there is no place like ~"',
        'core': () => t(
            'Segmentation fault (core dumped)<br>core — не файл. Это дверь: <a href="/kernel_panic">/kernel_panic</a>',
            'Segmentation fault (core dumped)<br>core is not a file. It is a door: <a href="/kernel_panic">/kernel_panic</a>'
        ),
    };

    const hiddenListing = `<pre class="terminal-file">${[
        'total 42',
        'drwxr-xr-x  ./',
        'drwxr-xr-x  ../',
        '-rw-r--r--  .plan',
        '-rw-------  .secret',
        '-rw-r--r--  .profile',
        '-rwxr-xr-x  welcome.sh',
        '-rw-r--r--  now.txt',
        '-rw-r--r--  core',
    ].join('\n')}</pre>`;

    const run = (raw) => {
        const value = raw.trim();
        if (!value) {
            append('<span class="prompt">venterum@web:~$</span>');
            return;
        }
        const [command, ...rest] = value.split(/\s+/);
        const arg = rest.join(' ');
        append(`<span class="prompt">venterum@web:~$</span> ${escapeHtml(value)}`);

        if (command === 'help') {
            append(t(
                'help — команды<br>whoami — кто я<br>ls — разделы<br>cd &lt;раздел&gt; — перейти<br>theme &lt;тема&gt; — сменить тему<br>contact — контакты<br>date — время<br>clear — очистить',
                'help — commands<br>whoami — who I am<br>ls — sections<br>cd &lt;section&gt; — go to<br>theme &lt;theme&gt; — switch theme<br>contact — contacts<br>date — time<br>clear — clear'
            ));
        } else if (command === 'fastfetch' || command === 'neofetch' || command === 'ff') {
            append(renderFastfetch());
        } else if (command === 'whoami') {
            append(t(
                'Евгений · Санкт-Петербург · инфокоммуникации / сети / Linux / Android / Rust',
                'Evgenij · Saint Petersburg · secure telecom / networks / Linux / Android / Rust'
            ));
        } else if (command === 'ls' || command === 'll') {
            const showHidden = command === 'll' || arg.split(/\s+/).some((flag) => flag === '--all' || /^-[a-z]*a/.test(flag));
            append(showHidden ? hiddenListing : 'about/&nbsp; blog/&nbsp; projects/&nbsp; ip/&nbsp; qr/&nbsp; pswd/&nbsp; cidr/&nbsp; rss<br>core');
        } else if (command === 'cat') {
            const target = arg.replace(/^~\/?/, '').replace(/^\.\//, '');
            if (!target) {
                append(t('cat: укажи файл. Например: cat .plan', 'cat: specify a file. For example: cat .plan'), 'is-error');
            } else if (Object.hasOwn(fileContents, target)) {
                append(fileContents[target](), target === 'core' ? 'is-error' : '');
                if (target === 'core') {
                    const terminalEl = content?.closest('.terminal');
                    terminalEl?.classList.remove('shake');
                    void terminalEl?.offsetWidth;
                    terminalEl?.classList.add('shake');
                    setTimeout(() => terminalEl?.classList.remove('shake'), 450);
                }
            } else {
                append(t(`cat: ${escapeHtml(target)}: нет такого файла`, `cat: ${escapeHtml(target)}: No such file or directory`), 'is-error');
            }
        } else if (command === 'contact') {
            append('github&nbsp;&nbsp; <a href="https://github.com/venterum" target="_blank" rel="noopener">github.com/venterum</a><br>telegram&nbsp; <a href="https://t.me/vntrum_public" target="_blank" rel="noopener">@vntrum_public</a>');
        } else if (command === 'date') {
            append(new Date().toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US'));
        } else if (command === 'now') {
            append(fileContents['now.txt']());
        } else if (command === 'clear') {
            log.innerHTML = '';
            if (content) content.scrollTop = 0;
        } else if (command === 'sudo') {
            append(t('Евгений не входит в группу sudo. И это к лучшему.', 'Evgenij is not in the sudoers file. This is for the best.'), 'is-error');
        } else if (command === 'theme') {
            if (!arg) {
                append(themes.join(' · '));
            } else if (!themes.includes(arg)) {
                append(t(`Нет темы «${escapeHtml(arg)}». Доступно: ${themes.join(', ')}`, `No theme "${escapeHtml(arg)}". Available: ${themes.join(', ')}`), 'is-error');
            } else {
                document.querySelector(`.theme-option[data-theme="${arg}"]`)?.click();
                append(t(`Тема: ${arg}`, `Theme: ${arg}`));
            }
        } else if (command === 'cd' || command === 'open') {
            const target = arg.replace(/^~\//, '');
            if (!target) {
                append(t('cd: укажи раздел. Например: cd blog', 'cd: specify a section. For example: cd blog'), 'is-error');
            } else if (pages[target]) {
                const destination = pages[target];
                if (target === 'blog' || target === 'projects') {
                    const el = document.getElementById(target);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        append(t(`Открываю ${target}...`, `Opening ${target}...`));
                    } else {
                        window.location.href = destination;
                    }
                } else {
                    window.location.href = destination;
                }
            } else {
                append(t(`cd: нет раздела «${escapeHtml(target)}». Попробуй ls.`, `cd: no section "${escapeHtml(target)}". Try ls.`), 'is-error');
            }
        } else if (pages[command]) {
            window.location.href = pages[command];
        } else {
            append(t(`command not found: ${escapeHtml(command)}. Набери help.`, `command not found: ${escapeHtml(command)}. Type help.`), 'is-error');
        }
    };

    const complete = () => {
        const value = input.value;
        if (value.startsWith('cd ')) {
            const part = value.slice(3);
            const matches = Object.keys(pages).filter((name) => name.startsWith(part));
            if (matches.length === 1) input.value = `cd ${matches[0]}`;
        } else {
            const matches = commands.filter((name) => name.startsWith(value));
            if (matches.length === 1) input.value = matches[0];
        }
    };

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const value = input.value.trim();
            input.value = '';
            if (value) {
                history.push(value);
            }
            historyIndex = history.length;
            run(value);
        } else if (event.key === 'Tab') {
            event.preventDefault();
            complete();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (historyIndex > 0) {
                historyIndex -= 1;
                input.value = history[historyIndex];
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex += 1;
                input.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                input.value = '';
            }
        }
    });

    document.addEventListener('terminal:clear', () => {
        log.innerHTML = '';
        input.value = '';
        history.length = 0;
        historyIndex = 0;
        if (content) content.scrollTop = 0;
    });
});

/* ── Command palette ──────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const palette = document.getElementById('palette');
    const paletteInput = document.getElementById('palette-input');
    const paletteList = document.getElementById('palette-list');
    const paletteToggle = document.querySelector('.palette-toggle');
    if (!palette || !paletteInput || !paletteList) return;

    const items = [
        { ru: 'Главная', en: 'Home', href: '/', icon: 'fa-terminal', keys: 'home index main' },
        { ru: 'Обо мне', en: 'About me', href: '/about', icon: 'fa-user', keys: 'about bio me' },
        { ru: 'Блог', en: 'Blog', href: '/#blog', icon: 'fa-newspaper', keys: 'blog feed posts telegram' },
        { ru: 'Проекты', en: 'Projects', href: '/#projects', icon: 'fa-code', keys: 'projects work portfolio' },
        { ru: 'IP-lookup', en: 'IP-lookup', href: '/ip', icon: 'fa-location-arrow', keys: 'ip address lookup' },
        { ru: 'QR-генератор', en: 'QR generator', href: '/qr', icon: 'fa-qrcode', keys: 'qr code text' },
        { ru: 'Генератор паролей', en: 'Password generator', href: '/pswd', icon: 'fa-key', keys: 'password pswd generator' },
        { ru: 'CIDR-калькулятор', en: 'CIDR calculator', href: '/cidr', icon: 'fa-network-wired', keys: 'cidr subnet network' },
        { ru: 'RSS-лента', en: 'RSS feed', href: '/rss.xml', icon: 'fa-rss', keys: 'rss feed' },
        { ru: 'GitHub', en: 'GitHub', href: 'https://github.com/venterum', icon: 'fa-github', keys: 'github code repos' },
        { ru: 'Telegram', en: 'Telegram', href: 'https://t.me/vntrum_public', icon: 'fa-paper-plane', keys: 'telegram channel' },
    ];

    let selected = 0;
    let filtered = items.slice();

    const render = () => {
        const query = paletteInput.value.trim().toLowerCase();
        filtered = items.filter((item) => {
            const text = `${item.ru} ${item.en} ${item.keys} ${item.href}`.toLowerCase();
            return !query || text.includes(query);
        });
        selected = Math.min(selected, Math.max(filtered.length - 1, 0));

        if (filtered.length === 0) {
            paletteList.innerHTML = '<div class="palette-empty">Ничего не найдено / Nothing found</div>';
            return;
        }

        paletteList.innerHTML = filtered.map((item, index) => `
            <a class="palette-item${index === selected ? ' selected' : ''}" href="${item.href}" data-index="${index}"${item.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>
                <i class="fas ${item.icon}" aria-hidden="true"></i>
                <span><span class="text-ru">${item.ru}</span><span class="text-en">${item.en}</span></span>
                <small>${item.href.replace('https://', '')}</small>
            </a>`).join('');

        paletteList.querySelectorAll('.palette-item').forEach((link) => {
            link.addEventListener('click', close);
        });
    };

    const open = () => {
        palette.hidden = false;
        document.body.classList.add('palette-open');
        paletteInput.value = '';
        selected = 0;
        render();
        setTimeout(() => paletteInput.focus(), 0);
    };

    const close = () => {
        palette.hidden = true;
        document.body.classList.remove('palette-open');
    };

    paletteToggle?.addEventListener('click', open);
    palette.querySelector('[data-palette-close]')?.addEventListener('click', close);
    paletteInput.addEventListener('input', () => {
        selected = 0;
        render();
    });

    paletteInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            close();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            selected = Math.min(selected + 1, filtered.length - 1);
            render();
            paletteList.querySelector('.palette-item.selected')?.scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selected = Math.max(selected - 1, 0);
            render();
            paletteList.querySelector('.palette-item.selected')?.scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'Enter') {
            const item = filtered[selected];
            if (item) window.location.href = item.href;
        }
    });

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            palette.hidden ? open() : close();
        } else if (event.key === 'Escape' && !palette.hidden) {
            close();
        }
    });
});
