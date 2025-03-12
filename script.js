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

        mice.forEach(other => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const effectiveRadius = this.radius * 4.0;
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

    // 添加获取温度范围的方法
    getTempRange: function() {
        // 默认温度范围（仅在没有数据时使用）
        let minTemp = 36;
        let maxTemp = 38;
        
        // 直接从数据中计算每只老鼠自己的温度范围
        if (this.data && this.data.length > 0) {
            const temps = this.data.map(d => d.temp).filter(t => t !== undefined && t !== null);
            if (temps.length > 0) {
                const dataMinTemp = Math.min(...temps);
                const dataMaxTemp = Math.max(...temps);
                
                // 只有当数据中的温度范围合理时才使用
                if (dataMaxTemp > dataMinTemp) {
                    // 为了让颜色变化更明显，显著扩大范围
                    const range = dataMaxTemp - dataMinTemp;
                    // 大幅扩大范围以增强对比度
                    minTemp = dataMinTemp - range * 0.25; // 显著扩大下限
                    maxTemp = dataMaxTemp + range * 0.25; // 显著扩大上限
                }
            }
        }
        
        return [minTemp, maxTemp];
    },

    render: function(ctx, currentTime) {
        // 使用当前时间索引获取数据，确保颜色随时间变化
        const timeIndex = Math.min(Math.floor(currentTime), this.data.length - 1);
        const currentData = this.data[timeIndex] || { activity: 0, temp: 36 };
        
        // Check for estrus in female mice
        let isEstrus = false;
        if (this.gender === 'female' && currentData.estrus) {
            isEstrus = true;
        }

        let baseHue, targetHue, baseLightness, targetLightness, baseSaturation, targetSaturation;
        if (this.gender === 'male') {
            // 使用index.html中定义的颜色：从hsl(200, 100%, 85%)到hsl(240, 100%, 25%)
            baseHue = 200; // 浅蓝色为低温
            targetHue = 240; // 深蓝色为高温
            baseLightness = 85; // 更亮的低温
            targetLightness = 25; // 更暗的高温
            baseSaturation = 100; // 饱和度保持100%
            targetSaturation = 100; // 饱和度保持100%
        } else {
            // 使用index.html中定义的颜色：从hsl(40, 100%, 80%)到hsl(0, 100%, 25%)
            baseHue = 40; // 黄色为低温
            targetHue = 0; // 红色为高温
            baseLightness = 80; // 更亮的低温
            targetLightness = 25; // 更暗的高温
            baseSaturation = 100; // 饱和度保持100%
            targetSaturation = 100; // 饱和度保持100%
        }
        
        // 获取每只老鼠自己的温度范围
        const tempRange = this.getTempRange();
        
        // 计算温度在范围内的比例
        const tempRatio = Math.max(0, Math.min(1, (currentData.temp - tempRange[0]) / (tempRange[1] - tempRange[0])));
        
        // 使用更强的非线性映射使颜色变化更加明显
        // 指数更小使颜色变化更加剧烈
        const enhancedTempRatio = Math.pow(tempRatio, 0.5); 
        
        // 计算当前色相值、饱和度和亮度值，使用增强的比例
        const hue = baseHue + (targetHue - baseHue) * enhancedTempRatio;
        const saturation = baseSaturation + (targetSaturation - baseSaturation) * enhancedTempRatio;
        
        // 对亮度使用不同的非线性映射，使亮度变化更加明显
        // 使用二次函数使亮度变化更加剧烈
        const enhancedLightnessRatio = tempRatio * tempRatio;
        const lightness = baseLightness + (targetLightness - baseLightness) * enhancedLightnessRatio;
        
        // 保留增强的色相值用于绘制
        const enhancedHue = hue;

        ctx.save();
        
        // 增大老鼠身体尺寸
        const bodySize = this.radius * 2.5; // 增大老鼠尺寸
        
        // 绘制老鼠身体
        ctx.beginPath();
        ctx.arc(this.x, this.y, bodySize, 0, Math.PI * 2, false);
        // 使用增强的HSL值，确保饱和度保持在100%以获得最鲜艳的颜色
        ctx.fillStyle = `hsl(${enhancedHue}, 100%, ${lightness}%)`;
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
        isPaused = false,
        simulationStarted = false; // Add flag to track if simulation has started

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
            <div class="mouse-gender">${gender === 'male' ? 'Male' : 'Female'}</div>
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
                // Start the simulation if this is the first mouse
                if (!simulationStarted && mice.length === 0) {
                    simulationStarted = true;
                    simulationTime = 0; // Reset time when first mouse is selected
                }
                
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
    function update() {
        if (!isPaused && simulationStarted) { // Only update time if simulation has started
            const newTime = simulationTime + timeSpeed * 0.001;
            simulationTime = Math.min(newTime, maxTime - 0.01);
            
            // Pause the simulation when it reaches the maximum time (14 days)
            if (simulationTime >= maxTime - 0.01) {
                isPaused = true;
                const pauseButton = document.getElementById('pauseButton');
                const resetButton = document.getElementById('resetButton');
                if (pauseButton) {
                    pauseButton.textContent = 'Resume';
                }
                // Add pulsing effect to the reset button to draw attention
                if (resetButton && !resetButton.classList.contains('pulse-attention')) {
                    resetButton.classList.add('pulse-attention');
                    // Add tooltip to suggest resetting
                    resetButton.title = "Experiment complete! Click to reset and start a new experiment";
                }
            }
            
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
            if (!simulationStarted) {
                timeDisplay.textContent = 'Day 1, 00:00'; // Default display before simulation starts
            } else {
                const totalHours = Math.floor(simulationTime);
                const days = Math.floor(totalHours / 24) + 1;
                const hours = totalHours % 24;
                const minutes = Math.floor((simulationTime - Math.floor(simulationTime)) * 60);
                
                // Check if it's an estrus day (days 4, 8, 12)
                let timeText = `Day ${days}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                
                // Add estrus indicator for days 4, 8, and 12
                if (days === 4 || days === 8 || days === 12) {
                    timeText += ' ♀️ Estrus Day';
                    
                    // Add special styling to make it stand out
                    timeDisplay.style.color = '#FF69B4'; // Pink color for estrus days
                    timeDisplay.style.fontWeight = 'bold';
                    
                    // Add a subtle animation if it's the start of the day (first hour)
                    if (hours === 0 && minutes < 10) {
                        timeDisplay.style.animation = 'pulse 1s infinite';
                    } else {
                        timeDisplay.style.animation = 'none';
                    }
                } else {
                    // Reset to normal styling for non-estrus days
                    timeDisplay.style.color = '#fff';
                    timeDisplay.style.fontWeight = 'normal';
                    timeDisplay.style.animation = 'none';
                }
                
                timeDisplay.textContent = timeText;
            }
        }
    }

    function render() {
        // Create a smooth transition between day and night
        const hours = Math.floor(simulationTime) % 24;
        const minutes = (simulationTime - Math.floor(simulationTime)) * 60;
        
        // Calculate transition periods (dawn: 5-7am, dusk: 17-19pm)
        let dayProgress = 0;
        
        if (hours >= 7 && hours < 17) {
            // Full daylight
            dayProgress = 1;
        } else if (hours >= 5 && hours < 7) {
            // Dawn transition (5am-7am)
            dayProgress = (hours - 5) / 2 + (minutes / 120);
        } else if (hours >= 17 && hours < 19) {
            // Dusk transition (5pm-7pm)
            dayProgress = 1 - ((hours - 17) / 2 + (minutes / 120));
        } else {
            // Full night
            dayProgress = 0;
        }
        
        // Interpolate between night and day colors
        const nightColor = { r: 10, g: 10, b: 30 }; // Darker blue-black for night
        const dayColor = { r: 255, g: 255, b: 240 }; // Slightly warmer white for day
        
        const r = Math.round(nightColor.r + (dayColor.r - nightColor.r) * dayProgress);
        const g = Math.round(nightColor.g + (dayColor.g - nightColor.g) * dayProgress);
        const b = Math.round(nightColor.b + (dayColor.b - nightColor.b) * dayProgress);
        
        // Set background color based on interpolated value
        context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        context.fillRect(0, 0, screenWidth, screenHeight);
        
        // Position the sun/moon in the middle of the canvas but higher up
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 11; // Moved higher (1/11 from the top)
        
        // Add sun/moon with appropriate opacity based on time of day
        if (dayProgress > 0) {
            // Draw sun with opacity based on dayProgress
            const sunRadius = 25; // Larger size for center display
            
            context.globalAlpha = dayProgress;
            context.beginPath();
            context.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
            context.fillStyle = '#FFDD00'; // Brighter yellow for sun
            context.fill();
            
            // Sun rays with opacity
            context.strokeStyle = '#FFA500'; // Orange rays for more contrast
            context.lineWidth = 3;
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6;
                context.beginPath();
                context.moveTo(centerX + Math.cos(angle) * sunRadius, centerY + Math.sin(angle) * sunRadius);
                context.lineTo(centerX + Math.cos(angle) * (sunRadius + 20), centerY + Math.sin(angle) * (sunRadius + 20));
                context.stroke();
            }
            context.globalAlpha = 1;
        }
        
        if (dayProgress < 1) {
            // Draw moon with opacity based on night progress
            const moonOpacity = 1 - dayProgress;
            const moonRadius = 25; // Larger size for center display
            
            context.globalAlpha = moonOpacity;
            context.beginPath();
            context.arc(centerX, centerY, moonRadius, 0, Math.PI * 2);
            context.fillStyle = '#E6F0FF'; // Slightly bluer white for moon
            context.fill();
            
            // Moon shadow to create crescent effect
            context.beginPath();
            context.arc(centerX - 10, centerY, moonRadius - 5, 0, Math.PI * 2);
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.fill();
            
            context.globalAlpha = 1;
        }
        
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
                this.textContent = isPaused ? 'Resume' : 'Pause/Resume';
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', function() {
                simulationTime = 0;
                simulationStarted = false; // Reset the simulation started flag
                isPaused = false; // Reset the pause state
                mice = [];
                
                // Reset the pause button text
                const pauseButton = document.getElementById('pauseButton');
                if (pauseButton) {
                    pauseButton.textContent = 'Pause/Resume';
                }
                
                // Remove the pulse-attention class if it exists
                if (this.classList.contains('pulse-attention')) {
                    this.classList.remove('pulse-attention');
                    this.title = "Reset Experiment";
                }
                
                document.querySelectorAll('.mouse-card').forEach(card => {
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    card.classList.remove('mouse-release');
                    card.style.boxShadow = '';
                    card.style.border = '';
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

document.addEventListener('DOMContentLoaded', function() {
    // Set initial display states:
    // - Show the cat explanation (with cat.png) 
    // - Hide the mice explanation and simulation UI elements
    document.getElementById('cat-explanation').style.display = 'flex';
    document.getElementById('mice-animation-explanation').style.display = 'none';
    document.getElementById('experiment-container').style.display = 'none';
    document.getElementById('time-display').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('legend').style.display = 'none';

    // First continue button: move from cat explanation to mice explanation
    document.getElementById('continue1').addEventListener('click', function() {
        document.getElementById('cat-explanation').style.display = 'none';
        document.getElementById('mice-animation-explanation').style.display = 'flex';
    });

    // Second continue button: hide the mice explanation and show the main simulation UI
    document.getElementById('continue2').addEventListener('click', function() {
        document.getElementById('mice-animation-explanation').style.display = 'none';
        document.getElementById('experiment-container').style.display = 'flex';
        document.getElementById('time-display').style.display = 'block';
        document.getElementById('controls').style.display = 'block';
        document.getElementById('legend').style.display = 'block';
    });

    // Rewatch Explanation: hide simulation UI and restart the explanation sequence
    document.getElementById('rewatch-explanation-btn').addEventListener('click', function() {
        document.getElementById('experiment-container').style.display = 'none';
        document.getElementById('time-display').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('legend').style.display = 'none';
        document.getElementById('cat-explanation').style.display = 'flex';
        document.getElementById('mice-animation-explanation').style.display = 'none';
    });
});
