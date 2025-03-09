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

GravityPoint.prototype = Object.create(Vector.prototype);
GravityPoint.prototype.constructor = GravityPoint;

GravityPoint.RADIUS_LIMIT = 65;
GravityPoint.interferenceToPoint = true;

GravityPoint.prototype.gravity = 0.03;
GravityPoint.prototype.isMouseOver = false;
GravityPoint.prototype.dragging = false;
GravityPoint.prototype.destroyed = false;
GravityPoint.prototype._easeRadius = 0;
GravityPoint.prototype._dragDistance = null;
GravityPoint.prototype._collapsing = false;

GravityPoint.prototype.hitTest = function(p) {
    return this.distanceTo(p) < this.radius;
};

GravityPoint.prototype.startDrag = function(dragStartPoint) {
    this._dragDistance = Vector.sub(dragStartPoint, this);
    this.dragging = true;
};

GravityPoint.prototype.drag = function(dragToPoint) {
    this.x = dragToPoint.x - this._dragDistance.x;
    this.y = dragToPoint.y - this._dragDistance.y;
};

GravityPoint.prototype.endDrag = function() {
    this._dragDistance = null;
    this.dragging = false;
};

GravityPoint.prototype.addSpeed = function(d) {
    this._speed = this._speed.add(d);
};

GravityPoint.prototype.collapse = function() {
    this.currentRadius *= 1.75;
    this._collapsing = true;
};

GravityPoint.prototype.render = function(ctx) {
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
};

GravityPoint.prototype._draw = function(ctx) {
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
};

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
    this.labelAlpha = 0; // For fade animation
    this.targetLabelAlpha = 0; // Target alpha for animation
}

Particle.prototype = (function(o) {
    var s = new Vector(0, 0), p;
    for (p in o) s[p] = o[p];
    return s;
})({
    addSpeed: function(d) { this._speed.add(d); },
    update: function(timeIndex) {
        try {
            if (!this.data || this.data.length === 0) {
                var activity = 0;
                var temp = 36;
                var speedLimit = 12 * 0.8;
                if (this._speed.length() > speedLimit) {
                    this._speed.normalize().scale(speedLimit);
                }
                this._latest.set(this);
                this.add(this._speed);
                this.color = this.getColor(temp, activity);
                return;
            }
            
            var safeIndex = timeIndex % this.data.length;
            var dataPoint = this.data[safeIndex] || {};
            
            var activity = typeof dataPoint.activity === 'number' ? dataPoint.activity : 0;
            var temp = typeof dataPoint.temp === 'number' ? dataPoint.temp : 36;
            
            var speedLimit = 12 * (0.8 + (activity * 0.5) + ((temp - 36) * 0.3));
            if (this._speed.length() > speedLimit) {
                this._speed.normalize().scale(speedLimit);
            }
            
            this._latest.set(this);
            this.add(this._speed);
            
            this.color = this.getColor(temp, activity);
            this.updateTrail(activity);

            // Update label alpha for animation
            this.targetLabelAlpha = this.isTracked ? 1 : 0;
            this.labelAlpha += (this.targetLabelAlpha - this.labelAlpha) * 0.1;
        } catch (error) {
            console.error('Error updating particle:', error);
            this._latest.set(this);
            this.add(this._speed);
        }
    },
    getColor: function(temp, activity) {
        var tempFactor = (temp - 36) / 1.5;
        var activityFactor = Math.min(1, activity / 100);
        tempFactor = Math.max(0, Math.min(1, tempFactor));
        if (this.gender === 'male') {
            var hue = 240 + 60 * tempFactor + 20 * activityFactor;
            return `hsl(${hue}, 100%, ${50 + 20 * activityFactor}%)`;
        } else {
            var hue = 30 - 30 * tempFactor;
            var saturation = 100;
            var lightness = 50 + 20 * activityFactor;
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
    },
    updateTrail: function(activity) {
        if (Math.random() < 0.2) {
            this.trail.push(this.clone());
            var trailLength = Math.min(5, Math.floor(activity / 20));
            while (this.trail.length > trailLength) {
                this.trail.shift();
            }
        }
    },
    render: function(ctx) {
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
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
        // Label rendering is now handled by renderLabels
    },
    renderTrackingInfo: function(ctx) {
        // This function is no longer used as renderLabels handles all label rendering
    }
});

/**
 * Render Labels with Collision Detection and Animation
 */
function renderLabels(particles, ctx) {
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

    particles.forEach((p) => {
        if (!p.isTracked || !p.data || p.data.length === 0) return;

        const timeIndex = Math.floor(simulationTime) % dataset.length;
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
            console.warn(`Unable to position label for Mouse ${p.mouseId} without overlap; adjusting horizontally.`);
            x += 50;
            labelRect = getLabelDimensions(text, x, y, ctx);
        }

        ctx.save();
        ctx.globalAlpha = p.labelAlpha; // Apply fade animation
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

/**
 * Initialization and Animation
 */
(function() {
    var BACKGROUND_DAY = '#B4D7E9',
        BACKGROUND_NIGHT = '#0A0A20',
        BACKGROUND_SUNSET = '#D35400',
        BACKGROUND_SUNRISE = '#FFD700',
        PARTICLE_RADIUS = 5,
        G_POINT_RADIUS = 10,
        G_POINT_RADIUS_LIMITS = 65;

    var canvas, context, bufferCvs, bufferCtx, screenWidth, screenHeight,
        mouse = new Vector(), gravities = [], particles = [], grad,
        dataset = [], simulationTime = 0, timeSpeed = 30,
        selectedMouseIds = [], selectedGender = 'all', centerGravityPoint,
        showLabels = true, hourlyCache = {}, lastUpdateTime = -1;

    async function loadData() {
        try {
            const response = await fetch('processed_data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            dataset = data.map(d => ({
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
            try {
                console.log("Attempting fallback data loading method...");
                const response = await fetch('processed_data_min.json.gz');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const compressedData = await response.arrayBuffer();
                const decompressedData = await new Response(compressedData).blob();
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        dataset = JSON.parse(event.target.result);
                        dataset = dataset.map(d => ({
                            ...d,
                            mouseId: d.mouseId || d.MouseID || d.mouse_id,
                            gender: d.gender || d.Gender,
                            activity: typeof d.activity === 'string' ? parseFloat(d.activity) : d.activity,
                            temp: typeof d.temp === 'string' ? parseFloat(d.temp) : d.temp,
                            Time: d.Time || d.time
                        }));
                        console.log("Loaded dataset (fallback):", dataset);
                        console.log("Dataset length (fallback):", dataset.length);
                        initParticles();
                        createCenterGravityPoint();
                        createMouseCheckboxes();
                    } catch (parseError) {
                        console.error("Error parsing JSON data:", parseError);
                    }
                };
                reader.onerror = function() {
                    console.error("Error reading file:", reader.error);
                };
                reader.readAsText(decompressedData);
            } catch (fallbackError) {
                console.error("All data loading methods failed:", fallbackError);
            }
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
        const newSelectedMouseIds = Array.from(checkboxes).map(cb => cb.value);
        const newSelectedGender = genderSelect.value;
        
        if (JSON.stringify(selectedMouseIds) === JSON.stringify(newSelectedMouseIds) && 
            selectedGender === newSelectedGender) {
            return;
        }
        
        selectedMouseIds = newSelectedMouseIds;
        selectedGender = newSelectedGender;
        
        requestAnimationFrame(() => {
            initParticles();
            if (centerGravityPoint) {
                const index = gravities.indexOf(centerGravityPoint);
                if (index > -1) gravities.splice(index, 1);
            }
            createCenterGravityPoint();
        });
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
        try {
            if (Math.floor(simulationTime * 60) % 60 !== 0) return;
            const rankingList = document.getElementById('ranking-list');
            if (!rankingList) return;
            if (!dataset || dataset.length === 0 || !particles || particles.length === 0) return;
            const timeIndex = Math.floor(simulationTime) % dataset.length;
            const currentHourlyActivities = particles
                .filter(p => p && p.mouseId)
                .map(p => ({
                    mouseId: p.mouseId,
                    avgActivity: calculateHourlyAverage(p.mouseId, timeIndex)
                }))
                .filter(item => !isNaN(item.avgActivity));
            if (currentHourlyActivities.length === 0) return;
            const top3 = currentHourlyActivities.sort((a, b) => b.avgActivity - a.avgActivity).slice(0, 3);
            rankingList.innerHTML = '';
            top3.forEach((mouse, index) => {
                try {
                    const li = document.createElement('li');
                    const mouseImg = document.createElement('img');
                    mouseImg.src = `https://api.dicebear.com/6.x/miniavs/svg?seed=${mouse.mouseId}`;
                    mouseImg.style.width = '20px';
                    mouseImg.style.height = '20px';
                    mouseImg.style.marginRight = '10px';
                    li.appendChild(mouseImg);
                    li.innerHTML += `${index + 1}. Mouse ${mouse.mouseId} - Avg Activity: <span style="color: #FF1493; font-weight: bold;">${mouse.avgActivity.toFixed(2)}</span>`;
                    li.style.animation = `bounce 0.5s ease-in-out ${index * 0.1}s`;
                    rankingList.appendChild(li);
                } catch (itemError) {
                    console.error('Error creating ranking item:', itemError);
                }
            });
        } catch (error) {
            console.error('Error updating ranking:', error);
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
        if (!trackButton) return;
        const isTracking = trackButton.getAttribute('data-tracking') === 'true';
        const newTrackingState = !isTracking;
        trackButton.setAttribute('data-tracking', newTrackingState);
        trackButton.textContent = isTracking ? 'Track Selected Mouse' : 'Stop Tracking';
        if (particles.length === 0 || selectedMouseIds.length === 0) {
            console.warn("No particles or mice selected. Please filter first or select mice.");
            trackButton.setAttribute('data-tracking', 'false');
            trackButton.textContent = 'Track Selected Mouse';
            return;
        }
        requestAnimationFrame(() => {
            particles.forEach(p => {
                p.isTracked = newTrackingState && selectedMouseIds.includes(p.mouseId);
            });
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
            try {
                simulationTime += timeSpeed / 60;
                if (!dataset || dataset.length === 0) {
                    console.warn("Dataset is empty or undefined");
                    requestAnimationFrame(loop);
                    return;
                }
                var timeIndex = Math.floor(simulationTime) % dataset.length;
                var dayCycle = timeIndex % 1440;
                var dayProgress = dayCycle / 1440;

                var backgroundColor;
                if (dayCycle < 240) {
                    backgroundColor = BACKGROUND_NIGHT;
                } else if (dayCycle < 480) {
                    backgroundColor = interpolateColor(BACKGROUND_NIGHT, BACKGROUND_DAY, (dayCycle - 240) / 240);
                } else if (dayCycle < 720) {
                    backgroundColor = BACKGROUND_DAY;
                } else if (dayCycle < 960) {
                    backgroundColor = BACKGROUND_DAY;
                } else if (dayCycle < 1100) {
                    backgroundColor = interpolateColor(BACKGROUND_DAY, BACKGROUND_SUNSET, (dayCycle - 960) / 240);
                } else {
                    backgroundColor = interpolateColor(BACKGROUND_SUNSET, BACKGROUND_NIGHT, (dayCycle - 1100) / 240);
                }

                if (!context) {
                    console.error("Canvas context is not available");
                    requestAnimationFrame(loop);
                    return;
                }

                context.fillStyle = backgroundColor;
                context.fillRect(0, 0, screenWidth, screenHeight);
                context.fillStyle = grad;
                context.fillRect(0, 0, screenWidth, screenHeight);

                try {
                    for (var i = 0, len = gravities.length; i < len; i++) {
                        var g = gravities[i];
                        if (!g) continue;
                        if (g.dragging) g.drag(mouse);
                        g.render(context);
                        if (g.destroyed) { gravities.splice(i, 1); len--; i--; }
                    }
                } catch (gravityError) {
                    console.error("Error processing gravity points:", gravityError);
                }

                if (!bufferCtx) {
                    console.error("Buffer context is not available");
                    requestAnimationFrame(loop);
                    return;
                }

                bufferCtx.save();
                bufferCtx.globalCompositeOperation = 'destination-out';
                bufferCtx.globalAlpha = 0.25;
                bufferCtx.fillRect(0, 0, screenWidth, screenHeight);
                bufferCtx.restore();

                try {
                    bufferCtx.save();
                    for (var i = 0, len = particles.length; i < len; i++) {
                        var p = particles[i];
                        if (!p) continue;
                        if (p.x > -50 && p.x < screenWidth + 50 && p.y > -50 && p.y < screenHeight + 50) {
                            try {
                                p.update(timeIndex);
                                p.render(bufferCtx);
                            } catch (particleError) {
                                console.error("Error updating/rendering particle:", particleError);
                            }
                        } else {
                            try {
                                p.update(timeIndex);
                            } catch (particleError) {
                                console.error("Error updating particle:", particleError);
                            }
                        }
                    }
                    bufferCtx.restore();
                } catch (particlesError) {
                    console.error("Error processing particles:", particlesError);
                }

                context.drawImage(bufferCvs, 0, 0);

                try {
                    context.save();
                    context.fillStyle = '#fff';
                    context.font = 'bold 24px Montserrat';
                    context.textAlign = 'center';
                    context.fillText('Mouse Activity & Temp Visualization', screenWidth / 2, 50);
                    const totalMinutes = Math.floor(simulationTime);
                    const timeStr = formatTime(totalMinutes);
                    context.font = '16px Montserrat';
                    context.textAlign = 'right';
                    context.fillText(timeStr, screenWidth - 20, 70);
                    context.textAlign = 'left';
                    try {
                        renderLabels(particles, context); // Replaced drawSelectedMouseData
                    } catch (dataError) {
                        console.error("Error rendering labels:", dataError);
                    }
                    try {
                        updateLegend();
                    } catch (legendError) {
                        console.error("Error updating legend:", legendError);
                    }
                    context.restore();
                } catch (uiError) {
                    console.error("Error rendering UI elements:", uiError);
                }

                try {
                    updateRanking();
                } catch (rankingError) {
                    console.error("Error updating ranking:", rankingError);
                }
            } catch (error) {
                console.error("Critical error in animation loop:", error);
            }
            requestAnimationFrame(loop);
        };
        loop();
    }).catch(error => {
        console.error("Error loading data:", error);
        var loop = function() {
            console.warn("Running in limited mode due to data loading failure");
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

function updateLegend() {
    try {
        const legendElement = document.getElementById('legend');
        if (!legendElement) return;
        if (typeof dataset === 'undefined' || !Array.isArray(dataset) || dataset.length === 0) return;
        if (!Array.isArray(particles) || particles.length === 0) return;
        const timeIndex = Math.floor(simulationTime) % dataset.length;
        const currentData = dataset.filter(d => d.Time === dataset[timeIndex].Time);
        if (currentData.length > 0) {
            const maleData = currentData.filter(d => d.gender === 'male');
            const femaleData = currentData.filter(d => d.gender === 'female');
            const maleTempRange = maleData.reduce((range, d) => {
                if (d.temp) {
                    range.min = Math.min(range.min, d.temp);
                    range.max = Math.max(range.max, d.temp);
                }
                return range;
            }, { min: Infinity, max: -Infinity });
            const femaleTempRange = femaleData.reduce((range, d) => {
                if (d.temp) {
                    range.min = Math.min(range.min, d.temp);
                    range.max = Math.max(range.max, d.temp);
                }
                return range;
            }, { min: Infinity, max: -Infinity });
            const maleLowElement = legendElement.querySelector('div:nth-child(2)');
            const maleHighElement = legendElement.querySelector('div:nth-child(3)');
            const femaleLowElement = legendElement.querySelector('div:nth-child(4)');
            const femaleHighElement = legendElement.querySelector('div:nth-child(5)');
            const minMaleTemp = maleTempRange.min !== Infinity ? maleTempRange.min.toFixed(2) : '36.00';
            const maxMaleTemp = maleTempRange.max !== -Infinity ? maleTempRange.max.toFixed(2) : '37.50';
            const minFemaleTemp = femaleTempRange.min !== Infinity ? femaleTempRange.min.toFixed(2) : '36.00';
            const maxFemaleTemp = femaleTempRange.max !== -Infinity ? femaleTempRange.max.toFixed(2) : '37.50';
            const maleLowTempHue = 240;
            const maleHighTempHue = 300;
            const femaleLowTempHue = 30;
            const femaleHighTempHue = 0;
            if (maleLowElement) {
                maleLowElement.innerHTML = 
                    `<div class="color-box" style="background: hsl(${maleLowTempHue}, 100%, 50%)"></div>Male (${minMaleTemp}°C)`;
            }
            if (maleHighElement) {
                maleHighElement.innerHTML = 
                    `<div class="color-box" style="background: hsl(${maleHighTempHue}, 100%, 50%)"></div>Male (${maxMaleTemp}°C)`;
            }
            if (femaleLowElement) {
                femaleLowElement.innerHTML = 
                    `<div class="color-box" style="background: hsl(${femaleLowTempHue}, 100%, 50%)"></div>Female (${minFemaleTemp}°C)`;
            }
            if (femaleHighElement) {
                femaleHighElement.innerHTML = 
                    `<div class="color-box" style="background: hsl(${femaleHighTempHue}, 100%, 50%)"></div>Female (${maxFemaleTemp}°C)`;
            }
        }
    } catch (error) {
        console.error("Error updating legend:", error);
    }
}