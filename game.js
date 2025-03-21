// 游戏基本参数
const GRID_SIZE = 30;
const CELL_SIZE = 20;
const KILLER_SPEED = 0.5; // 杀手移动速度
const ESCAPE_GAP = 5; // 逃生区域数量

// 杀手状态
let killers = [];
let lastTriggerScore = -100; // 上次触发时的分数

// 游戏状态
let snake = [{
    x: 10,
    y: 10
}];
let direction = 'right';
let consecutiveFood = 0; // 连续普通食物计数器
let food = generateFood();
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let isPaused = false; // 暂停状态标志
let specialFoods = []; // 特殊食物数组
let normalFoodCounter = 0; // 清除特殊食物的正常食物计数
let isSpecialPhase = false; // 特殊状态标志

// 初始化Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 键盘控制
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') direction = 'right';
            break;
        case ' ':
            if (!gameLoop) {
                startGame();
                e.preventDefault();
            } else {
                isPaused = !isPaused;
                e.preventDefault();
            }
    }
});

// 游戏主循环
function startGame() {
    score = 0;
    consecutiveFood = 0;
    specialFoods = [];
    isSpecialPhase = false;
    normalFoodCounter = 0;
    updateScore();
    document.getElementById('gameOver').style.display = 'none';
    snake = [{
        x: 10,
        y: 10
    }];
    direction = 'right';
    food = generateFood();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
}

function update() {
    if (isPaused) return;

    // 移动杀手
    killers.forEach(killer => {
        killer.y += KILLER_SPEED;
        if (killer.y >= GRID_SIZE) {
            killers = killers.filter(k => k !== killer);
        }
    });

    // 移动蛇头
    const head = {
        ...snake[0]
    };
    switch (direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }

    // 碰撞检测
    const killerCollision = killers.some(k =>
        Math.floor(k.x) === head.x &&
        Math.floor(k.y) === head.y
    );
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE ||
        snake.some(segment => segment.x === head.x && segment.y === head.y) ||
        killerCollision) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // 吃食物检测
    if (head.x === food.x && head.y === food.y) {
        handleFoodConsumption();
        food = generateFood();
    } else if (checkSpecialFoodCollision(head)) {
        handleSpecialFoodCollision(head);
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画杀手
    killers.forEach(killer => {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(
            Math.floor(killer.x) * CELL_SIZE,
            Math.floor(killer.y) * CELL_SIZE,
            CELL_SIZE - 1,
            CELL_SIZE - 1
        );
    });

    // 画蛇
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4CAF50' : '#2E7D32';
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    });

    // 绘制暂停提示移到最后
    if (isPaused) {
        ctx.fillStyle = 'rgba(201, 32, 32, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 增强文字效果
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeText('游戏暂停', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = '#FFF';
        ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 30);
    }

    // 画普通食物
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // 画特殊食物
    specialFoods.forEach(food => {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
    });
}

function handleFoodConsumption() {
    score += 10;
    consecutiveFood++;
    updateScore();

    if (isSpecialPhase) {
        normalFoodCounter++;
        if (normalFoodCounter >= 2) {
            specialFoods = [];
            isSpecialPhase = false;
            consecutiveFood = 0;
            normalFoodCounter = 0;
        }
    }
}

function checkSpecialFoodCollision(head) {
    return specialFoods.some(food => food.x === head.x && food.y === head.y);
}

function handleSpecialFoodCollision(head) {
    // 移除被吃的特殊食物
    specialFoods = specialFoods.filter(food => food.x !== head.x || food.y !== head.y);

    // 生成两个新特殊食物（带位置校验）
    for (let i = 0; i < 2; i++) {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
                type: 'SPECIAL'
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

        specialFoods.push(newFood);
    }
    normalFoodCounter = 0;
    snake.pop(); // 误食特殊食物不增长
}

function generateKillerWave() {
    // 生成逃生缺口位置
    const escapePositions = [];
    while (escapePositions.length < ESCAPE_GAP) {
        const pos = Math.floor(Math.random() * (GRID_SIZE - 4));
        if (!escapePositions.some(p => Math.abs(p - pos) < 5)) {
            escapePositions.push(pos);
        }
    }

    // 清除所有食物并生成新普通食物
    specialFoods = [];
    consecutiveFood = 0;
    normalFoodCounter = 0;
    isSpecialPhase = false;
    food = generateFood();

    // 生成整排杀手（带逃生缺口）
    for (let x = 0; x < GRID_SIZE; x++) {
        if (!escapePositions.some(p => x >= p && x < p + 4)) {
            killers.push({
                x: x,
                y: -1, // 从顶部开始下落
                speed: KILLER_SPEED
            });
        }
    }
}

function generateFood() {
    // 每生成普通食物时检查是否触发特殊阶段
    if (++consecutiveFood >= 5 && !isSpecialPhase) {
        isSpecialPhase = true;
        specialFoods.push({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: 'SPECIAL'
        });
    }

    while (true) {
        const newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: 'NORMAL'
        };
        if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
            return newFood;
        }
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;

    // 生成杀手障碍物（每100分触发一次）
    if (score > 0 && score % 100 === 0 && score !== lastTriggerScore) {
        lastTriggerScore = score;
        generateKillerWave();
    }
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('high-score').textContent = highScore;
    }
}

function gameOver() {
    clearInterval(gameLoop);
    gameLoop = null;
    document.getElementById('gameOver').style.display = 'block';
}

// 初始化显示最高分
document.getElementById('high-score').textContent = highScore;