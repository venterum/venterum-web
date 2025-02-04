document.addEventListener('DOMContentLoaded', () => {
    // Общие функции из основного script.js
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

    function animate404Terminal() {
        const sections = document.querySelectorAll('.typing-effect');
        const responses = document.querySelectorAll('.response');
        let currentIndex = 0;

        // Создаем и добавляем курсор
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

                // Анимируем элементы внутри ответа последовательно
                const items = response.querySelectorAll('.suggestion, .error-log p, .error-log ul');
                if (items.length) {
                    response.style.opacity = '1';
                    response.style.transform = 'translateY(0)';
                    
                    let itemIndex = 0;
                    function animateNextItem() {
                        if (itemIndex >= items.length) {
                            resolve();
                            return;
                        }
                        
                        const item = items[itemIndex];
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                        itemIndex++;
                        setTimeout(animateNextItem, 100);
                    }
                    
                    animateNextItem();
                } else {
                    response.style.opacity = '1';
                    response.style.transform = 'translateY(0)';
                    setTimeout(resolve, 300);
                }
            });
        }

        async function animateNext() {
            if (currentIndex >= sections.length) {
                // В конце анимации позиционируем курсор после последней команды
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
            setTimeout(animateNext, 300);
        }

        // Скрываем все секции и ответы изначально
        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transition = 'opacity 0.3s ease';
        });

        responses.forEach(response => {
            response.style.opacity = '0';
            response.style.transform = 'translateY(-10px)';
            response.style.transition = 'all 0.3s ease';
            
            // Скрываем все элементы изначально
            const items = response.querySelectorAll('.suggestion, .error-log p, .error-log ul');
            items.forEach(item => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(-10px)';
                item.style.transition = 'all 0.3s ease';
            });
        });

        // Удаляем старые курсоры
        document.querySelectorAll('.command').forEach(cmd => {
            cmd.style.animation = 'none';
        });

        // Начинаем анимацию
        setTimeout(animateNext, 500);
    }

    // Добавляем обработчик для красной кнопки
    const closeBtn = document.querySelector('.dot.red');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const terminal = document.querySelector('.terminal');
        terminal.classList.add('shake');
        setTimeout(() => {
            terminal.classList.remove('shake');
        }, 400);
    });

    // Запускаем анимацию
    animate404Terminal();
}); 