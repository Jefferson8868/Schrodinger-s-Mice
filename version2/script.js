/**
 * Vector Class Implementation
 */
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector.add = function(a, b) { return new Vector(a.x + b.x, a.y + b.y); };
Vector.sub = function(a, b) { return new Vector(a.x - b.x, a.y - b.y); };
Vector.scale = function(v, s) { return v.clone().scale(s); };
Vector.random = function() { return new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1); };

Vector.prototype = {
    set: function(x, y) {
        if (typeof x === 'object') {
            y = x.y;
            x = x.x;
        }
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },
    add: function(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    },
    sub: function(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    },
    scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
    },
    length: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },
    normalize: function() {
        var len = Math.sqrt(this.x * this.x + this.y * this.y);
        if (len) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    },
    angle: function() {
        return Math.atan2(this.y, this.x);
    },
    clone: function() {
        return new Vector(this.x, this.y);
    }
};

/**
 * Mouse Class Implementation
 */
function Mouse(x, y, radius, mouseId, gender, data) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.mouseId = mouseId;
    this.gender = gender;
    this.data = data;
    this._speed = new Vector();
    this.isTracked = false;
    this.labelAlpha = 0;
    this.justReleased = false;
    this.releaseTime = 0;
}

Mouse.prototype = {
    update: function(timeIndex, bounds, mice) {
        // 确保timeIndex不超过数据长度
        const safeTimeIndex = Math.min(timeIndex, this.data.length - 1);
        const currentData = this.data[safeTimeIndex] || { activity: 0, temp: 36 };
        
        // 如果activity为0，停止移动
        if (currentData.activity === 0) {
            this._speed = new Vector(0, 0);
            return;
        }

        // 基于activity和temperature添加随机移动
        const activityFactor = currentData.activity / 100;
        const tempFactor = (currentData.temp - 36) / 1.5;
        const randomMove = Vector.random().scale(activityFactor * 2 + tempFactor);
        this._speed.add(randomMove);

        // 更新位置
        this.x += this._speed.x;
        this.y += this._speed.y;

        // 边界检查
        if (this.x < bounds.x + this.radius) {
            this.x = bounds.x + this.radius;
            this._speed.x *= -0.5;
        } else if (this.x > bounds.width - this.radius) {
            this.x = bounds.width - this.radius;
            this._speed.x *= -0.5;
        }
        if (this.y < bounds.y + this.radius) {
            this.y = bounds.y + this.radius;
            this._speed.y *= -0.5;
        } else if (this.y > bounds.height - this.radius) {
            this.y = bounds.height - this.radius;
            this._speed.y *= -0.5;
        }

        // 改进的碰撞检测和弹开动画 - 考虑整个老鼠图形（包括耳朵和尾巴）
        mice.forEach(other => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // 增加碰撞检测的有效半径，考虑整个老鼠图形的大小
                // 使用bodySize（2.5倍radius）再加上额外的空间（1.5倍）来确保包括耳朵和尾巴
                const effectiveRadius = this.radius * 4.0; // 2.5(bodySize) * 1.6 = 4.0
                const otherEffectiveRadius = other.radius * 4.0;
                const minDistance = effectiveRadius + otherEffectiveRadius;

                if (distance < minDistance) {
                    // 计算碰撞角度
                    const angle = Math.atan2(dy, dx);
                    
                    // 计算重叠量
                    const overlap = minDistance - distance;
                    
                    // 将老鼠分开
                    const moveX = Math.cos(angle) * overlap * 0.5;
                    const moveY = Math.sin(angle) * overlap * 0.5;
                    
                    this.x -= moveX;
                    this.y -= moveY;
                    other.x += moveX;
                    other.y += moveY;
                    
                    // 计算碰撞后的速度（弹开效果）
                    const thisSpeed = Math.sqrt(this._speed.x * this._speed.x + this._speed.y * this._speed.y);
                    const otherSpeed = Math.sqrt(other._speed.x * other._speed.x + other._speed.y * other._speed.y);
                    
                    // 交换速度方向并添加一些随机性
                    this._speed.x = -Math.cos(angle) * otherSpeed * 0.8 + (Math.random() * 0.4 - 0.2);
                    this._speed.y = -Math.sin(angle) * otherSpeed * 0.8 + (Math.random() * 0.4 - 0.2);
                    other._speed.x = Math.cos(angle) * thisSpeed * 0.8 + (Math.random() * 0.4 - 0.2);
                    other._speed.y = Math.sin(angle) * thisSpeed * 0.8 + (Math.random() * 0.4 - 0.2);
                }
            }
        });

        // 限制速度
        const maxSpeed = 5 * (1 + activityFactor + tempFactor * 0.5);
        if (this._speed.length() > maxSpeed) {
            this._speed.normalize().scale(maxSpeed);
        }

        // 缓慢减速
        this._speed.scale(0.98);

        // 更新标签透明度
        if (this.isTracked) {
            this.labelAlpha = Math.min(this.labelAlpha + 0.1, 1);
        } else {
            this.labelAlpha = Math.max(this.labelAlpha - 0.1, 0);
        }

        // 处理刚释放的动画效果
        if (this.justReleased && Date.now() - this.releaseTime > 500) {
            this.justReleased = false;
        }
    },

    render: function(ctx, currentTime) {
        // 使用当前时间索引获取数据，确保颜色随时间变化
        const timeIndex = Math.min(Math.floor(currentTime), this.data.length - 1);
        const currentData = this.data[timeIndex] || { activity: 0, temp: 36 };
        
        // 实现平滑的颜色渐变，基于温度值
        // 雄性：从蓝色(240)到紫色(300)的渐变
        // 雌性：从橙色(30)到红色(0)的渐变
        let baseHue, targetHue, tempRange;
        if (this.gender === 'male') {
            baseHue = 240; // 低温蓝色
            targetHue = 300; // 高温紫色
            tempRange = [36, 38]; // 温度范围
        } else {
            baseHue = 30; // 低温橙色
            targetHue = 0; // 高温红色
            tempRange = [36, 38]; // 温度范围
        }
        
        // 计算温度在范围内的比例
        const tempRatio = Math.max(0, Math.min(1, (currentData.temp - tempRange[0]) / (tempRange[1] - tempRange[0])));
        
        // 计算当前色相值，实现平滑渐变
        const hue = baseHue + (targetHue - baseHue) * tempRatio;

        ctx.save();
        
        // 增大老鼠身体尺寸
        const bodySize = this.radius * 2.5; // 增大老鼠尺寸
        
        // 绘制老鼠身体
        ctx.beginPath();
        ctx.arc(this.x, this.y, bodySize, 0, Math.PI * 2, false);
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fill();
        
        // 绘制老鼠耳朵
        const earSize = bodySize * 0.5;
        // 左耳
        ctx.beginPath();
        ctx.ellipse(this.x - bodySize * 0.7, this.y - bodySize * 0.7, earSize, earSize * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        // 右耳
        ctx.beginPath();
        ctx.ellipse(this.x + bodySize * 0.7, this.y - bodySize * 0.7, earSize, earSize * 0.6, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制眼睛
        const eyeSize = bodySize * 0.2;
        ctx.fillStyle = '#000';
        // 左眼
        ctx.beginPath();
        ctx.arc(this.x - bodySize * 0.4, this.y - bodySize * 0.1, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        // 右眼
        ctx.beginPath();
        ctx.arc(this.x + bodySize * 0.4, this.y - bodySize * 0.1, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制鼻子
        ctx.beginPath();
        ctx.arc(this.x, this.y + bodySize * 0.2, eyeSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制胡须
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        // 左边胡须
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x - bodySize * 0.2, this.y + bodySize * 0.2);
            ctx.lineTo(this.x - bodySize * 0.9, this.y + (i - 1) * bodySize * 0.2);
            ctx.stroke();
        }
        // 右边胡须
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + bodySize * 0.2, this.y + bodySize * 0.2);
            ctx.lineTo(this.x + bodySize * 0.9, this.y + (i - 1) * bodySize * 0.2);
            ctx.stroke();
        }
        
        // 添加尾巴
        ctx.beginPath();
        ctx.moveTo(this.x - bodySize * 0.5, this.y + bodySize * 0.8);
        ctx.quadraticCurveTo(
            this.x - bodySize * 1.2, 
            this.y + bodySize * 1.2, 
            this.x - bodySize * 1.5, 
            this.y + bodySize * 0.5
        );
        ctx.lineWidth = bodySize * 0.15;
        ctx.stroke();
        
        // 如果被跟踪，添加高亮效果
        if (this.isTracked) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, bodySize * 1.2, 0, Math.PI * 2, false);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 添加ID标签
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.mouseId, this.x, this.y - bodySize * 1.3);
        }
        
        // 如果刚被释放，添加发光效果
        if (this.justReleased) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, bodySize * 1.8, 0, Math.PI * 2, false);
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
            ctx.fill();
        }
        
        ctx.restore();
    }
};

// 渲染标签（带碰撞检测和动画）
function renderLabels(mice, ctx, currentSimulationTime) {
    const labels = [];

    function isOverlapping(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                 rect2.x + rect2.width < rect1.x ||
                 rect1.y + rect1.height < rect2.y ||
                 rect2.y + rect2.height < rect1.y);
    }

    function getLabelDimensions(text, x, y, ctx) {
        const padding = 10;
        const lineHeight = 15;
        const lines = text.split('\n');
        const width = Math.max(...lines.map(line => ctx.measureText(line).width)) + 2 * padding;
        const height = lines.length * lineHeight + 2 * padding;
        return { x: x - width / 2, y: y - height - 10, width, height };
    }

    mice.forEach((p) => {
        if (!p.isTracked || !p.data || p.data.length === 0) return;

        const timeIndex = Math.floor(currentSimulationTime) % p.data.length;
        const data = p.data[timeIndex] || { activity: 0, temp: 36 };
        const text = `Mouse ${p.mouseId}\nActivity: ${data.activity.toFixed(2)}\nTemp: ${data.temp.toFixed(2)}°C`;
        let x = p.x + 15;
        let y = p.y;

        let labelRect = getLabelDimensions(text, x, y, ctx);
        let overlap = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (overlap && attempts < maxAttempts) {
            overlap = false;
            for (let i = 0; i < labels.length; i++) {
                if (isOverlapping(labelRect, labels[i])) {
                    overlap = true;
                    y += 15;
                    labelRect = getLabelDimensions(text, x, y, ctx);
                    break;
                }
            }
            attempts++;
        }

        if (overlap) {
            x += 50;
            labelRect = getLabelDimensions(text, x, y, ctx);
        }

        ctx.save();
        ctx.globalAlpha = p.labelAlpha;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(labelRect.x, labelRect.y, labelRect.width, labelRect.height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, labelRect.x + 5, labelRect.y + 15 + i * 15);
        });
        ctx.restore();

        labels.push(labelRect);
    });
}

// 初始化和动画
(function() {
    var BACKGROUND_COLOR = '#121212',
        PARTICLE_RADIUS = 5,
        G_POINT_RADIUS = 10,
        G_POINT_RADIUS_LIMITS = 65;

    var canvas, context,
        screenWidth, screenHeight,
        mouse = new Vector(),
        mice = [],
        dataset = [],
        simulationTime = 0,
        timeSpeed = 30,
        maxTime = 336, // 14天*24小时
        isPaused = false;

    // 创建老鼠卡片
    function createMouseCard(mouseId, gender) {
        const container = gender === 'male' ? document.getElementById('male-mice') : document.getElementById('female-mice');
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'mouse-card';
        card.setAttribute('data-mouse-id', mouseId);

        const avatar = document.createElement('div');
        avatar.className = `mouse-avatar ${gender}`;

        const info = document.createElement('div');
        info.className = 'mouse-info';
        info.innerHTML = `
            <div class="mouse-id">Mouse ${mouseId}</div>
            <div class="mouse-gender">${gender === 'male' ? '雄性' : '雌性'}</div>
        `;

        card.appendChild(avatar);
        card.appendChild(info);

        // 添加点击事件
        card.addEventListener('click', function() {
            const mouseInExperiment = mice.find(m => m.mouseId === mouseId);
            
            if (mouseInExperiment) {
                // 如果老鼠已经在实验中，切换跟踪状态
                mouseInExperiment.isTracked = !mouseInExperiment.isTracked;
                
                // 更新卡片样式以显示跟踪状态
                if (mouseInExperiment.isTracked) {
                    this.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)';
                    this.style.border = '2px solid #fff';
                } else {
                    this.style.boxShadow = '';
                    this.style.border = '';
                }
            } else {
                // 如果老鼠不在实验中，释放它并设置为跟踪状态
                releaseMouse(mouseId, gender);
                this.style.opacity = '0.5';
                
                // 设置新释放的老鼠为跟踪状态
                setTimeout(() => {
                    const newMouse = mice.find(m => m.mouseId === mouseId);
                    if (newMouse) {
                        newMouse.isTracked = true;
                        this.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)';
                        this.style.border = '2px solid #fff';
                    }
                }, 100);
            }
        });

        container.appendChild(card);
    }

    // 放出老鼠
    function releaseMouse(mouseId, gender) {
        const mouseData = dataset.filter(d => d.mouseId === mouseId);
        if (mouseData.length === 0) return;

        const mainBox = document.getElementById('main-box');
        const rect = mainBox.getBoundingClientRect();

        // 修改初始位置，使老鼠从左侧（黑箱方向）出现
        const newMouse = new Mouse(
            PARTICLE_RADIUS * 3, // 从左侧边缘出现
            Math.random() * (rect.height - PARTICLE_RADIUS * 4) + PARTICLE_RADIUS * 2,
            PARTICLE_RADIUS * 1.2, // 增大老鼠尺寸
            mouseId,
            gender,
            mouseData
        );

        // 给老鼠一个向右的初始速度
        newMouse._speed.x = 3 + Math.random() * 2;
        newMouse._speed.y = Math.random() * 2 - 1;

        newMouse.justReleased = true;
        newMouse.releaseTime = Date.now();
        mice.push(newMouse);

        // 播放开盒子动画
        const card = document.querySelector(`[data-mouse-id="${mouseId}"]`);
        if (card) {
            card.classList.add('mouse-release');
        }
    }

    // 初始化老鼠列表
    function initMouseList() {
        const maleMice = dataset.filter(d => d.gender === 'male');
        const femaleMice = dataset.filter(d => d.gender === 'female');

        const uniqueMaleMice = [...new Set(maleMice.map(d => d.mouseId))];
        const uniqueFemaleMice = [...new Set(femaleMice.map(d => d.mouseId))];

        uniqueMaleMice.forEach(mouseId => createMouseCard(mouseId, 'male'));
        uniqueFemaleMice.forEach(mouseId => createMouseCard(mouseId, 'female'));
    }

    // 调整大小
    function resize() {
        const mainBox = document.getElementById('main-box');
        const rect = mainBox.getBoundingClientRect();
        screenWidth = rect.width;
        screenHeight = rect.height;

        canvas.width = screenWidth;
        canvas.height = screenHeight;
    }

    // 更新和渲染
    // 在update函数中修改时间流速和活动范围
    function update() {
        if (!isPaused) {
            const newTime = simulationTime + timeSpeed * 0.001; // 降低时间流速
            simulationTime = Math.min(newTime, maxTime - 0.01); // 保留一点余量避免越界
            
            mice.forEach(mouse => {
                mouse.update(Math.floor(simulationTime), {
                    x: 0,
                    y: 0,
                    width: screenWidth,
                    height: screenHeight
                }, mice);
            });
        }

        // 更新时间显示
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const totalHours = Math.floor(simulationTime);
            const days = Math.floor(totalHours / 24) + 1;
            const hours = totalHours % 24;
            const minutes = Math.floor((simulationTime - Math.floor(simulationTime)) * 60);
            timeDisplay.textContent = `Day ${days}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    function render() {
        context.fillStyle = BACKGROUND_COLOR;
        context.fillRect(0, 0, screenWidth, screenHeight);
        mice.forEach(mouse => mouse.render(context, simulationTime));
        renderLabels(mice, context, simulationTime);
    }

    function animate() {
        update();
        render();
        requestAnimationFrame(animate);
    }

    // 设置控制按钮事件监听器
    function setupControlListeners() {
        const speedControl = document.getElementById('speedControl');
        const pauseButton = document.getElementById('pauseButton');
        const resetButton = document.getElementById('resetButton');

        if (speedControl) {
            speedControl.addEventListener('change', function() {
                if (!isPaused) {
                    timeSpeed = parseFloat(this.value) * 30;
                }
            });
        }

        if (pauseButton) {
            pauseButton.addEventListener('click', function() {
                isPaused = !isPaused;
                this.textContent = isPaused ? '继续' : '暂停/继续';
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', function() {
                simulationTime = 0;
                mice = [];
                document.querySelectorAll('.mouse-card').forEach(card => {
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    card.classList.remove('mouse-release');
                });
            });
        }
    }

    // 初始化
    async function init() {
        canvas = document.getElementById('c');
        if (!canvas) return;
        context = canvas.getContext('2d');

        try {
            const response = await fetch('processed_data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            dataset = await response.json();
            dataset = dataset.map(d => ({
                ...d,
                mouseId: d.mouseId || d.MouseID || d.mouse_id,
                gender: d.gender || d.Gender,
                activity: typeof d.activity === 'string' ? parseFloat(d.activity) : d.activity,
                temp: typeof d.temp === 'string' ? parseFloat(d.temp) : d.temp,
                Time: d.Time || d.time
            }));

            window.addEventListener('resize', resize);
            resize();
            initMouseList();
            setupControlListeners();
            animate();

        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    init();
})();