/**
 * Activity and Temperature Chart Implementation
 * This file implements a chart to track mouse activity and temperature over time
 */

let activityChart = null;
let temperatureChart = null;
let chartData = {
    labels: [],
    activity: [],
    temperature: []
};

// Initialize the charts when a mouse is selected
function initCharts() {
    // Create container for charts if it doesn't exist
    if (!document.getElementById('chart-container')) {
        createChartContainer();
    }
    
    // Clear any existing charts
    if (activityChart) {
        activityChart.destroy();
    }
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    // Reset chart data
    chartData = {
        labels: [],
        activity: [],
        temperature: []
    };
    
    // Create activity chart
    const activityCtx = document.getElementById('activity-chart').getContext('2d');
    activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Activity',
                data: chartData.activity,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Activity Count'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#eee'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#eee',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#eee'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
    
    // Create temperature chart
    const temperatureCtx = document.getElementById('temperature-chart').getContext('2d');
    temperatureChart = new Chart(temperatureCtx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Temperature',
                data: chartData.temperature,
                borderColor: '#FF69B4',
                backgroundColor: 'rgba(255, 105, 180, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#eee'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#eee',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#eee'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Create the container for the charts
function createChartContainer() {
    const container = document.createElement('div');
    container.id = 'chart-container';
    container.className = 'chart-container';
    container.innerHTML = `
        <div class="chart-header">
            <h3>Mouse Activity & Temperature Tracking</h3>
            <div class="chart-controls">
                <button id="toggle-chart-btn">Hide Charts</button>
            </div>
        </div>
        <div class="charts">
            <div class="chart-wrapper">
                <canvas id="activity-chart"></canvas>
            </div>
            <div class="chart-wrapper">
                <canvas id="temperature-chart"></canvas>
            </div>
        </div>
        <div id="previous-visualization-btn" class="view-previous-btn">
            <button>View Previous Project Visualization</button>
        </div>
    `;
    
    document.getElementById('black-box').appendChild(container);
    
    // Add event listener for toggle button
    document.getElementById('toggle-chart-btn').addEventListener('click', function() {
        const chartsDiv = document.querySelector('.charts');
        if (chartsDiv.style.display === 'none') {
            chartsDiv.style.display = 'flex';
            this.textContent = 'Hide Charts';
        } else {
            chartsDiv.style.display = 'none';
            this.textContent = 'Show Charts';
        }
    });
    
    // Add event listener for previous visualization button
    document.getElementById('previous-visualization-btn').addEventListener('click', function() {
        showPreviousVisualization();
    });
}

// Update charts with new data
function updateCharts(mouseId, timeIndex) {
    if (!activityChart || !temperatureChart) return;
    
    // Find the selected mouse
    const selectedMouse = mice.find(m => m.mouseId === mouseId && m.isTracked);
    if (!selectedMouse || !selectedMouse.data) return;
    
    // Get current data point
    const currentData = selectedMouse.data[timeIndex] || { activity: 0, temp: 36 };
    
    // Format time label
    const totalHours = Math.floor(simulationTime);
    const days = Math.floor(totalHours / 24) + 1;
    const hours = totalHours % 24;
    const timeLabel = `Day ${days}, ${hours.toString().padStart(2, '0')}:00`;
    
    // Check if we already have this time point
    const existingIndex = chartData.labels.indexOf(timeLabel);
    if (existingIndex >= 0) {
        // Update existing data point
        chartData.activity[existingIndex] = currentData.activity;
        chartData.temperature[existingIndex] = currentData.temp;
    } else {
        // Add new data point
        chartData.labels.push(timeLabel);
        chartData.activity.push(currentData.activity);
        chartData.temperature.push(currentData.temp);
        
        // Keep only the last 24 data points for better visualization
        if (chartData.labels.length > 24) {
            chartData.labels.shift();
            chartData.activity.shift();
            chartData.temperature.shift();
        }
    }
    
    // Update charts
    activityChart.data.labels = chartData.labels;
    activityChart.data.datasets[0].data = chartData.activity;
    temperatureChart.data.labels = chartData.labels;
    temperatureChart.data.datasets[0].data = chartData.temperature;
    
    activityChart.update();
    temperatureChart.update();
}

// Show the previous project visualization in a modal or navigate to data analysis section
function showPreviousVisualization() {
    // If we have the data analysis section, navigate to it instead of showing modal
    if (document.getElementById('data-analysis')) {
        navigateToStep('data-analysis');
        return;
    }
    
    // Otherwise, use the modal approach (fallback for backward compatibility)
    // Create modal container if it doesn't exist
    if (!document.getElementById('previous-viz-modal')) {
        const modal = document.createElement('div');
        modal.id = 'previous-viz-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Mouse Circadian Rhythm Analysis</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="explanation">
                        This visualization from our previous project shows the circadian rhythm patterns of mice over a 24-hour period.
                        The radial chart displays how activity levels or temperature fluctuate throughout the day, with each line representing a different mouse.
                        This helps us understand the relationship between time of day and mouse behavior/physiology.
                    </p>
                    <div class="explanation-box">
                        <h3>Understanding Mouse Movement Measurement</h3>
                        <p>
                            In our experiments, mouse movement is measured using infrared beam breaks that are converted to activity counts.
                            Higher activity counts indicate more movement, which correlates with the speed and frequency of mouse movement in their cage.
                            This data helps us understand patterns of rest and activity in relation to circadian rhythms and environmental factors.
                        </p>
                        <p>
                            <strong>Tips:</strong> Data has been processed with interpolation, resulting in a smoothed curve.
                        </p>
                    </div>
                    <div class="controls">
                        <button id="genderButton">Gender: Female</button>
                        <button id="metricButton">Metric: Activity</button>
                    </div>
                    <div class="legend"></div>
                    <div class="clock-chart"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listener to close button
        document.querySelector('.close-modal').addEventListener('click', function() {
            document.getElementById('previous-viz-modal').style.display = 'none';
        });
        
        // Load D3.js and pako if not already loaded
        if (!window.d3) {
            loadScript('https://d3js.org/d3.v7.min.js', function() {
                if (!window.pako) {
                    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.4/pako.min.js', function() {
                        loadPreviousVisualization();
                    });
                } else {
                    loadPreviousVisualization();
                }
            });
        } else if (!window.pako) {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.4/pako.min.js', function() {
                loadPreviousVisualization();
            });
        } else {
            loadPreviousVisualization();
        }
    } else {
        document.getElementById('previous-viz-modal').style.display = 'block';
    }
}

// Helper function to load scripts dynamically
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Load the previous visualization code
function loadPreviousVisualization() {
    // Create a link to the previous project's CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'previous_prject.css';
    document.head.appendChild(cssLink);
    
    // Load the previous project's JavaScript
    const script = document.createElement('script');
    script.src = 'previous_project.js';
    document.head.appendChild(script);
    
    // Initialize the visualization after a short delay to ensure script is loaded
    setTimeout(() => {
        if (typeof init === 'function') {
            init();
        }
    }, 500);
}