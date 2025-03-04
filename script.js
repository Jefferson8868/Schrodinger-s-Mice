/**
 * requestAnimationFrame polyfill
 */
window.requestAnimationFrame = (function() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame ||
           function(callback) {
               window.setTimeout(callback, 1000 / 60);
           };
})();

/**
 * Vector Class
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
        if (typeof x === 'object') { y = x.y; x = x.x; }
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },
    add: function(v) { this.x += v.x; this.y += v.y; return this; },
    sub: function(v) { this.x -= v.x; this.y -= v.y; return this; },
    scale: function(s) { this.x *= s; this.y *= s; return this; },
    length: function() { return Math.sqrt(this.x * this.x + this.y * this.y); },
    lengthSq: function() { return this.x * this.x + this.y * this.y; },
    normalize: function() {
        var m = Math.sqrt(this.x * this.x + this.y * this.y);
        if (m) { this.x /= m; this.y /= m; }
        return this;
    },
    angle: function() { return Math.atan2(this.y, this.x); },
    angleTo: function(v) { var dx = v.x - this.x, dy = v.y - this.y; return Math.atan2(dy, dx); },
    distanceTo: function(v) { var dx = v.x - this.x, dy = v.y - this.y; return Math.sqrt(dx * dx + dy * dy); },
    distanceToSq: function(v) { var dx = v.x - this.x, dy = v.y - this.y; return dx * dx + dy * dy; },
    lerp: function(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; },
    clone: function() { return new Vector(this.x, this.y); },
    toString: function() { return '(x:' + this.x + ', y:' + this.y + ')'; }
};

/**
 * GravityPoint Class
 */
function GravityPoint(x, y, radius, targets) {
    Vector.call(this, x, y);
    this.radius = radius;
    this.currentRadius = radius * 0.5;
    this._targets = { particles: targets.particles || [], gravities: targets.gravities || [] };
    this._speed = new Vector();
}

GravityPoint.RADIUS_LIMIT = 65;
GravityPoint.interferenceToPoint = true;

GravityPoint.prototype = (function(o) {
    var s = new Vector(0, 0), p;
    for (p in o) s[p] = o[p];
    return s;
})({
    gravity: 0.03,
    isMouseOver: false,
    dragging: false,
    destroyed: false,
    _easeRadius: 0,
    _dragDistance: null,
    _collapsing: false,
    hitTest: function(p) { return this.distanceTo(p) < this.radius; },
    startDrag: function(dragStartPoint) {
        this._dragDistance = Vector.sub(dragStartPoint, this);
        this.dragging = true;
    },
    drag: function(dragToPoint) {
        this.x = dragToPoint.x - this._dragDistance.x;
        this.y = dragToPoint.y - this._dragDistance.y;
    },
    endDrag: function() { this._dragDistance = null; this.dragging = false; },
    addSpeed: function(d) { this._speed = this._speed.add(d); },
    collapse: function() { this.currentRadius *= 1.75; this._collapsing = true; },
    render: function(ctx) {
        if (this.destroyed) return;
        var particles = this._targets.particles, i, len;
        for (i = 0, len = particles.length; i < len; i++) {
            particles[i].addSpeed(Vector.sub(this, particles[i]).normalize().scale(this.gravity));
        }
        this._easeRadius = (this._easeRadius + (this.radius - this.currentRadius) * 0.07) * 0.95;
        this.currentRadius += this._easeRadius;
        if (this.currentRadius < 0) this.currentRadius = 0;
        if (this._collapsing) {
            this.radius *= 0.75;
            if (this.currentRadius < 1) this.destroyed = true;
            this._draw(ctx);
            return;
        }
        var gravities = this._targets.gravities, g, absorp, area = this.radius * this.radius * Math.PI, garea;
        for (i = 0, len = gravities.length; i < len; i++) {
            g = gravities[i];
            if (g === this || g.destroyed) continue;
            if ((this.currentRadius >= g.radius || this.dragging) && this.distanceTo(g) < (this.currentRadius + g.radius) * 0.85) {
                g.destroyed = true;
                this.gravity += g.gravity;
                absorp = Vector.sub(g, this).scale(g.radius / this.radius * 0.5);
                this.addSpeed(absorp);
                garea = g.radius * g.radius * Math.PI;
                this.currentRadius = Math.sqrt((area + garea * 3) / Math.PI);
                this.radius = Math.sqrt((area + garea) / Math.PI);
            }
            g.addSpeed(Vector.sub(this, g).normalize().scale(this.gravity));
        }
        if (GravityPoint.interferenceToPoint && !this.dragging) this.add(this._speed);
        this._speed = new Vector();
        if (this.currentRadius > GravityPoint.RADIUS_LIMIT) this.collapse();
        this._draw(ctx);
    },
    _draw: function(ctx) {
        var grd, r;
        ctx.save();
        grd = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, this.radius * 5);
        grd.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 5, 0, Math.PI * 2, false);
        ctx.fillStyle = grd;
        ctx.fill();
        r = Math.random() * this.currentRadius * 0.7 + this.currentRadius * 0.3;
        grd = ctx.createRadialGradient(this.x, this.y, r, this.x, this.y, this.currentRadius);
        grd.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grd.addColorStop(1, Math.random() < 0.2 ? 'rgba(255, 196, 0, 0.15)' : 'rgba(103, 181, 191, 0.75)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2, false);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
    }
});

/**
 * Particle Class (Mice)
 */
function Particle(x, y, radius, mouseId, gender, data) {
    Vector.call(this, x, y);
    this.radius = radius;
    this.mouseId = mouseId;
    this.gender = gender;
    this.data = data;
    this._latest = new Vector();
    this._speed = new Vector();
    this.trail = []; // For trail effect
    this.isTracked = false; // Track if this particle should show real-time data
}

Particle.prototype = (function(o) {
    var s = new Vector(0, 0), p;
    for (p in o) s[p] = o[p];
    return s;
})({
    addSpeed: function(d) { this._speed.add(d); },
    update: function(timeIndex) {
        var dataPoint = this.data[timeIndex % this.data.length];
        var activity = typeof dataPoint.activity === 'number' ? dataPoint.activity : 0;
        var temp = typeof dataPoint.temp === 'number' ? dataPoint.temp : 36;
        var speedLimit = 12 * (0.8 + (activity * 0.5) + ((temp - 36) * 0.3));
        if (this._speed.length() > speedLimit) {
            this._speed.normalize().scale(speedLimit);
        }
        this._latest.set(this);
        this.add(this._speed);
        this.color = this.getColor(temp, activity); // Enhanced color based on temp and activity
        this.updateTrail(activity);
    },
    getColor: function(temp, activity) {
        var tempFactor = (temp - 36) / 1.5; // Normalize temperature between 36 and 37.5°C
        var activityFactor = Math.min(1, activity / 100); // Normalize activity between 0 and 1
        tempFactor = Math.max(0, Math.min(1, tempFactor));
        if (this.gender === 'male') {
            var hue = 240 + 60 * tempFactor + 20 * activityFactor; // Blue to Cyan, brighter with activity
            return `hsl(${hue}, 100%, ${50 + 20 * activityFactor}%)`; // Increase lightness with activity
        } else {
            var hue = 30 * tempFactor; // Red to Orange, brighter with activity
            return `hsl(${hue}, 100%, ${50 + 20 * activityFactor}%)`;
        }
    },
    updateTrail: function(activity) {
        if (Math.random() < 0.2) { // 20% chance per frame to reduce frequency
            this.trail.push(this.clone());
            var trailLength = Math.min(5, Math.floor(activity / 20)); // Reduced max length and density
            while (this.trail.length > trailLength) {
                this.trail.shift();
            }
        }
    },
    render: function(ctx) {
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1; // Reduced line width for less GPU load
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (var i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
        if (this.isTracked) {
            this.renderTrackingInfo(ctx);
        }
    },
    renderTrackingInfo: function(ctx) {
        const timeIndex = Math.floor(simulationTime) % this.data.length;
        const data = this.data[timeIndex];
        if (data) {
            const activity = data.activity || 0;
            const temp = data.temp || 36;
            const boxWidth = 150;
            const boxHeight = 60;
            const padding = 10;
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(this.x + padding, this.y - boxHeight - padding, boxWidth, boxHeight);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(`Mouse ${this.mouseId}`, this.x + padding + 5, this.y - boxHeight + 5);
            ctx.fillText(`Activity: ${activity.toFixed(2)}`, this.x + padding + 5, this.y - boxHeight + 20);
            ctx.fillText(`Temp: ${temp.toFixed(2)}°C`, this.x + padding + 5, this.y - boxHeight + 35);
            ctx.restore();
        }
    }
});

/**
 * Initialization and Animation
 */
(function() {
    var BACKGROUND_DAY = '#B4D7E9', // Light blue (day)
        BACKGROUND_NIGHT = '#1A1A3A', // Deep purple (night)
        BACKGROUND_SUNSET = '#FF4500', // Orange-red (sunset)
        BACKGROUND_SUNRISE = '#FFD700', // Golden yellow (sunrise)
        PARTICLE_RADIUS = 5,
        G_POINT_RADIUS = 10,
        G_POINT_RADIUS_LIMITS = 65;

    var canvas, context, bufferCvs, bufferCtx, screenWidth, screenHeight,
        mouse = new Vector(), gravities = [], particles = [], grad,
        dataset = [], simulationTime = 0, timeSpeed = 15,
        selectedMouseIds = [], selectedGender = 'all', centerGravityPoint,
        showLabels = true, hourlyCache = {}, lastUpdateTime = -1;

    async function loadData() {
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
            console.log("Loaded dataset:", dataset);
            console.log("Dataset length:", dataset.length);
            initParticles();
            createCenterGravityPoint();
            createMouseCheckboxes();
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    function createCenterGravityPoint() {
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        centerGravityPoint = new GravityPoint(centerX, centerY, G_POINT_RADIUS * 2, {
            particles: particles,
            gravities: gravities
        });
        centerGravityPoint.gravity = 0.02;
        gravities.push(centerGravityPoint);
    }

    function drawSelectedMouseData(ctx) {
        if (!showLabels || selectedMouseIds.length === 0) return;
        selectedMouseIds.forEach(mouseId => {
            const particle = particles.find(p => p.mouseId === mouseId);
            if (particle && particle.data) {
                const timeIndex = Math.floor(simulationTime) % dataset.length;
                const data = particle.data[timeIndex];
                if (data) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(particle.x + 15, particle.y - 40, 150, 60);
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px Arial';
                    ctx.fillText(`Mouse ${mouseId}`, particle.x + 20, particle.y - 25);
                    ctx.fillText(`Activity: ${data.activity ? data.activity.toFixed(2) : '0'}`, particle.x + 20, particle.y - 10);
                    ctx.fillText(`Temp: ${data.temp ? data.temp.toFixed(2) : '0'}°C`, particle.x + 20, particle.y + 5);
                    ctx.restore();
                }
            }
        });
    }

    function initParticles() {
        const uniqueMice = [...new Set(dataset.map(d => d.mouseId))];
        particles = uniqueMice
            .filter(mouseId => {
                const mouseData = dataset.find(d => d.mouseId === mouseId);
                const genderMatch = selectedGender === 'all' || mouseData.gender === selectedGender;
                const idMatch = selectedMouseIds.length === 0 || selectedMouseIds.includes(mouseId);
                return genderMatch && idMatch;
            })
            .map(mouseId => {
                const mouseData = dataset.filter(d => d.mouseId === mouseId);
                const gender = mouseData[0].gender;
                return new Particle(
                    Math.random() * (screenWidth - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
                    Math.random() * (screenHeight - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
                    PARTICLE_RADIUS,
                    mouseId,
                    gender,
                    mouseData
                );
            });
        console.log("Particles created:", particles.length);
    }

    function createMouseCheckboxes() {
        const controls = document.getElementById('controls');
        const checkboxContainer = document.createElement('div');
        checkboxContainer.id = 'mouseCheckboxes';
        const uniqueMice = [...new Set(dataset.map(d => d.mouseId))];
        uniqueMice.forEach(mouseId => {
            const mouseData = dataset.find(d => d.mouseId === mouseId);
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.color = '#fff';
            label.style.marginBottom = '5px';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = mouseId;
            checkbox.id = `mouse-${mouseId}`;
            checkbox.style.marginRight = '5px';
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`Mouse ${mouseId} (${mouseData.gender})`));
            checkboxContainer.appendChild(label);
        });
        controls.appendChild(checkboxContainer);
    }

    function filterMice() {
        const checkboxes = document.querySelectorAll('#mouseCheckboxes input[type="checkbox"]:checked');
        const genderSelect = document.getElementById('genderFilter');
        selectedMouseIds = Array.from(checkboxes).map(cb => cb.value);
        selectedGender = genderSelect.value;
        initParticles();
        if (centerGravityPoint) {
            const index = gravities.indexOf(centerGravityPoint);
            if (index > -1) gravities.splice(index, 1);
        }
        createCenterGravityPoint();
    }

    function calculateHourlyAverage(mouseId, currentTimeIndex) {
        if (lastUpdateTime !== Math.floor(simulationTime / 60)) {
            hourlyCache = {};
            lastUpdateTime = Math.floor(simulationTime / 60);
        }
        if (!hourlyCache[mouseId]) {
            const mouseData = dataset.filter(d => d.mouseId === mouseId);
            const startIndex = Math.max(0, currentTimeIndex - 60);
            const hourlyData = mouseData.slice(startIndex, currentTimeIndex + 1);
            const totalActivity = hourlyData.reduce((sum, d) => sum + (d.activity || 0), 0);
            hourlyCache[mouseId] = hourlyData.length ? totalActivity / hourlyData.length : 0;
        }
        return hourlyCache[mouseId];
    }

    function updateRanking() {
        if (Math.floor(simulationTime * 60) % 60 !== 0) return; // Update every second
        const timeIndex = Math.floor(simulationTime) % dataset.length;
        const currentHourlyActivities = particles.map(p => ({
            mouseId: p.mouseId,
            avgActivity: calculateHourlyAverage(p.mouseId, timeIndex)
        }));
        const top3 = currentHourlyActivities.sort((a, b) => b.avgActivity - a.avgActivity).slice(0, 3);
        const rankingList = document.getElementById('ranking-list');
        if (rankingList) {
            rankingList.innerHTML = '';
            top3.forEach((mouse, index) => {
                const li = document.createElement('li');
                const mouseImg = document.createElement('img');
                mouseImg.src = `https://api.dicebear.com/6.x/miniavs/svg?seed=${mouse.mouseId}`; // Cute avatar for each mouse
                mouseImg.style.width = '20px';
                mouseImg.style.height = '20px';
                mouseImg.style.marginRight = '10px';
                li.appendChild(mouseImg);
                li.innerHTML += `${index + 1}. Mouse ${mouse.mouseId} - Avg Activity: <span style="color: #FFC107; font-weight: bold;">${mouse.avgActivity.toFixed(2)}</span>`;
                li.style.animation = `bounce 0.5s ease-in-out ${index * 0.1}s`;
                rankingList.appendChild(li);
            });
        }
    }

    function formatTime(minutes) {
        const days = Math.floor(minutes / 1440) + 1;
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;
        return `Day ${days}, ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    function toggleTracking() {
        const trackButton = document.getElementById('trackButton');
        if (!trackButton) return; // Prevent errors if button not found
        const isTracking = trackButton.getAttribute('data-tracking') === 'true';
        trackButton.setAttribute('data-tracking', !isTracking);
        trackButton.textContent = isTracking ? 'Track Selected Mouse' : 'Stop Tracking';
        // Ensure particles are initialized and selected before tracking
        if (particles.length === 0 || selectedMouseIds.length === 0) {
            console.warn("No particles or mice selected. Please filter first or select mice.");
            trackButton.setAttribute('data-tracking', 'false');
            trackButton.textContent = 'Track Selected Mouse';
            return;
        }
        particles.forEach(p => {
            p.isTracked = !isTracking && selectedMouseIds.includes(p.mouseId);
        });
    }

    function resize() {
        screenWidth = canvas.width = window.innerWidth;
        screenHeight = canvas.height = window.innerHeight;
        bufferCvs.width = screenWidth;
        bufferCvs.height = screenHeight;
        context = canvas.getContext('2d');
        bufferCtx = bufferCvs.getContext('2d');
        var cx = canvas.width * 0.5, cy = canvas.height * 0.5;
        grad = context.createRadialGradient(cx, cy, 0, cx, cy, Math.sqrt(cx * cx + cy * cy));
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    }

    function mouseMove(e) {
        mouse.set(e.clientX, e.clientY);
        var i, g, hit = false;
        for (i = gravities.length - 1; i >= 0; i--) {
            g = gravities[i];
            if ((!hit && g.hitTest(mouse)) || g.dragging) g.isMouseOver = hit = true;
            else g.isMouseOver = false;
        }
        canvas.style.cursor = hit ? 'pointer' : 'default';
    }

    function mouseDown(e) {
        e.preventDefault();
        for (var i = gravities.length - 1; i >= 0; i--) {
            if (gravities[i].isMouseOver) {
                gravities[i].startDrag(mouse);
                return;
            }
        }
        gravities.push(new GravityPoint(e.clientX, e.clientY, G_POINT_RADIUS, { particles: particles, gravities: gravities }));
    }

    function mouseUp(e) {
        for (var i = 0, len = gravities.length; i < len; i++) {
            if (gravities[i].dragging) {
                gravities[i].endDrag();
                break;
            }
        }
    }

    function doubleClick(e) {
        for (var i = gravities.length - 1; i >= 0; i--) {
            if (gravities[i].isMouseOver) {
                gravities[i].collapse();
                break;
            }
        }
    }

    canvas = document.getElementById('c');
    bufferCvs = document.createElement('canvas');

    window.addEventListener('resize', resize, false);
    resize();

    canvas.addEventListener('mousemove', mouseMove, false);
    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('mouseup', mouseUp, false);
    canvas.addEventListener('dblclick', doubleClick, false);

    document.getElementById('filterButton')?.addEventListener('click', filterMice);
    document.getElementById('trackButton')?.addEventListener('click', toggleTracking);

    loadData().then(() => {
        if (particles.length === 0) console.warn("No particles initialized. Check dataset or filter conditions.");
        var loop = function() {
            simulationTime += timeSpeed / 60;
            var timeIndex = Math.floor(simulationTime) % dataset.length;
            var dayCycle = timeIndex % 1440; // Minutes in a day (0-1439)
            var dayProgress = dayCycle / 1440; // 0 to 1 over 24 hours

            // Define time-based background colors for a day cycle
            var backgroundColor;
            if (dayCycle < 240) { // 0-4 AM: 深夜
                backgroundColor = BACKGROUND_NIGHT;
            } else if (dayCycle < 480) { // 4-8 AM: 黎明到清晨
                backgroundColor = interpolateColor(BACKGROUND_NIGHT, BACKGROUND_DAY, (dayCycle - 240) / 240);
            } else if (dayCycle < 720) { // 8-12 PM: 清晨到正午
                backgroundColor = BACKGROUND_DAY;
            } else if (dayCycle < 960) { // 12-4 PM: 正午到下午
                backgroundColor = BACKGROUND_DAY;
            } else if (dayCycle < 1100) { // 4-8 PM: 下午到黄昏
                backgroundColor = interpolateColor(BACKGROUND_DAY, BACKGROUND_SUNSET, (dayCycle - 960) / 240);
            } else { // 8 PM-12 AM: 黄昏到深夜
                backgroundColor = interpolateColor(BACKGROUND_SUNSET, BACKGROUND_NIGHT, (dayCycle - 1100) / 240);
            }

            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, screenWidth, screenHeight);
            context.fillStyle = grad;
            context.fillRect(0, 0, screenWidth, screenHeight);

            for (var i = 0, len = gravities.length; i < len; i++) {
                var g = gravities[i];
                if (g.dragging) g.drag(mouse);
                g.render(context);
                if (g.destroyed) { gravities.splice(i, 1); len--; i--; }
            }

            bufferCtx.save();
            bufferCtx.globalCompositeOperation = 'destination-out';
            bufferCtx.globalAlpha = 0.35;
            bufferCtx.fillRect(0, 0, screenWidth, screenHeight);
            bufferCtx.restore();

            bufferCtx.save();
            for (var i = 0, len = particles.length; i < len; i++) {
                var p = particles[i];
                p.update(timeIndex);
                p.render(bufferCtx);
            }
            bufferCtx.restore();

            context.drawImage(bufferCvs, 0, 0);

            context.save();
            context.fillStyle = '#fff';
            context.font = 'bold 24px Montserrat';
            context.textAlign = 'center';
            context.fillText('Mouse Activity & Temp Visualization', screenWidth / 2, 50);
            const totalMinutes = Math.floor(simulationTime);
            const timeStr = formatTime(totalMinutes);
            context.font = '16px Montserrat';
            context.textAlign = 'right';
            context.fillText(timeStr, screenWidth - 20, 70); // Adjusted position to avoid legend overlap
            context.textAlign = 'left';
            drawSelectedMouseData(context);
            context.restore();

            updateRanking();

            requestAnimationFrame(loop);
        };
        loop();
    });
})();

function interpolateColor(color1, color2, factor) {
    var r1 = parseInt(color1.substr(1, 2), 16);
    var g1 = parseInt(color1.substr(3, 2), 16);
    var b1 = parseInt(color1.substr(5, 2), 16);
    var r2 = parseInt(color2.substr(1, 2), 16);
    var g2 = parseInt(color2.substr(3, 2), 16);
    var b2 = parseInt(color2.substr(5, 2), 16);
    var r = Math.round(r1 + (r2 - r1) * factor);
    var g = Math.round(g1 + (g2 - g1) * factor);
    var b = Math.round(b1 + (b2 - b1) * factor);
    return `rgb(${r}, ${g}, ${b})`;
}