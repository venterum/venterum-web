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
    
    const gameArea = document.getElementById('game-area');
    const character = document.getElementById('character');
    const obstacle = document.getElementById('obstacle');
    const scoreElement = document.getElementById('score');
    const gameContainer = document.querySelector('.game-container');
    
    let score = 0;
    let gameActive = false;
    let gameSpeed = 5;
    let obstacleInterval;
    
    function jump() {
        if (character.classList.contains('jumping')) return;
        character.classList.add('jumping');
        
        setTimeout(() => {
            character.classList.remove('jumping');
        }, 500);
    }
    
    function checkCollision() {
        const characterRect = character.getBoundingClientRect();
        const obstacleRect = obstacle.getBoundingClientRect();
        
        return !(
            characterRect.bottom < obstacleRect.top || 
            characterRect.top > obstacleRect.bottom || 
            characterRect.right < obstacleRect.left || 
            characterRect.left > obstacleRect.right
        );
    }
    
    function scrollToGame() {
        gameContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
    
    function gameOver() {
        gameActive = false;
        clearInterval(obstacleInterval);
        
        const gameOverMessage = document.createElement('div');
        gameOverMessage.className = 'game-over-message';
        gameOverMessage.textContent = `Игра окончена! Счёт: ${score}`;
        
        gameArea.appendChild(gameOverMessage);
        
        setTimeout(() => {
            gameOverMessage.remove();
            startGame();
        }, 30000);
    }
    
    function startGame() {
        if (gameActive) return;
        
        gameActive = true;
        score = 0;
        scoreElement.textContent = '0';
        gameSpeed = 5;
        
        const gameOverMessage = gameArea.querySelector('.game-over-message');
        if (gameOverMessage) {
            gameOverMessage.remove();
        }
        
        character.style.bottom = '0';
        obstacle.style.right = '-20px';
        
        obstacleInterval = setInterval(() => {
            if (!gameActive) return;
            
            let obstacleRight = parseInt(window.getComputedStyle(obstacle).getPropertyValue('right'));
            obstacle.style.right = (obstacleRight + gameSpeed) + 'px';
            
            if (obstacleRight > gameArea.offsetWidth) {
                obstacle.style.right = '-20px';
                score++;
                scoreElement.textContent = score;

                if (score % 5 === 0) {
                    gameSpeed += 1;
                }
            }
            
            if (checkCollision()) {
                gameOver();
            }
        }, 20);
    }
    
    document.addEventListener('keydown', event => {
        if (event.code === 'Space') {
            event.preventDefault();
            
            if (!gameActive) {
                startGame();
                scrollToGame();
            } else {

                jump();
            }
        }
    });
    
    gameArea.addEventListener('click', () => {
        if (!gameActive) {
            startGame();
        } else {
            jump();
        }
    });

    gameArea.setAttribute('tabindex', '0');
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