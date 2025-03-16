let currentGender = 'female';
let currentMetric = 'activity';
let dataset = [];

const timeParser = d3.timeParse('%Y-%m-%dT%H:%M:%S');
const width = 800;
const height = 800;
const radius = 300;

let zoom = d3.zoom().scaleExtent([1, 2.5]).on('zoom', zoomed);

// Instead of d3.schemeCategory10:
const colorScale = d3.scaleOrdinal([
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b',
  '#e377c2','#7f7f7f','#bcbd22','#17becf','#393b79','#5254a3',
  '#6b6ecf','#9c9ede','#637939','#8ca252','#b5cf6b','#cedb9c',
  '#8c6d31','#bd9e39','#e7ba52','#e7cb94','#843c39','#ad494a',
  '#d6616b','#e7969c','#7b4173','#a55194','#ce6dbd','#de9ed6'
]);

function showOverlayLoader() {
  // 1) Show the overlay
  const overlay = document.getElementById('overlay-loader');
  overlay.style.display = 'flex';

  // 2) Disable body scrolling
  document.body.style.overflow = 'hidden';
}

function hideOverlayLoader() {
  const overlay = document.getElementById('overlay-loader');
  overlay.style.display = 'none';

  // Re-enable scrolling
  document.body.style.overflow = '';
}


async function init() {
  showOverlayLoader();
  try {
    const response = await fetch('https://ziyaozzz.github.io/dsc106-project3/processed_data_min.json.gz');
    const arrayBuffer = await response.arrayBuffer();

    // Decompress using pako
    const text = new TextDecoder("utf-8").decode(pako.inflate(arrayBuffer));

    // Parse JSON
    dataset = JSON.parse(text);
    dataset.forEach(d => {
        d.time = timeParser(d.time);
        d.activity = +d.activity;
        d.temp = +d.temp;
        d.minute = +d.minute;
    });
    hideOverlayLoader();
    console.log("✅ Dataset loaded, attaching search event listener");

    // Attach search event listener only AFTER dataset loads
    const searchInput = document.getElementById('mouseSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        console.log("🔍 Searching for:", this.value);
        handleSearch();
      });
    }

    renderClockChart();
  } catch (error) {
    console.error("Error fetching JSON:", error);
    document.getElementById('overlay-loader').textContent = "Error loading data";
  }
}



function renderClockChart() {
  d3.select(".clock-chart").html('');

  const svg = d3.select(".clock-chart")
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .call(zoom);

  const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);

  svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width/2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(
        `${currentMetric === 'activity' ? 
          'Activity Count' : 
          'Temperature (°C)'
        } Over 24 Hours - ${
          currentGender.charAt(0).toUpperCase() + currentGender.slice(1)
        } Mice`
      );

  const validData = dataset.filter(d =>
      d.gender === currentGender && 
      d[currentMetric] !== null && 
      !isNaN(d[currentMetric]) &&
      d.minute !== null &&
      !isNaN(d.minute)
  );

  const hourlyData = d3.groups(validData, 
      d => d.mouseId,
      d => Math.floor(d.minute / 60)
  ).map(([mouseId, hourGroups]) => {
      const hourMap = new Map();
      hourGroups.forEach(([hour, values]) => {
          const mean = d3.mean(values, dd => Number(dd[currentMetric]));
          if (!isNaN(mean)) {
              hourMap.set(hour, mean);
          }
      });
      return [mouseId, hourMap];
  });

  // 设置更合理的数据范围，确保图表和tooltip显示一致
  // 对于activity数据，最大值应该能够容纳所有可能的数据点
  const maxValue = currentMetric === 'activity' ? 50 : 19.5; // 增大activity的最大值以适应更高的数据点
  const minValue = currentMetric === 'activity' ? 0 : 18;
  const valueScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([50, radius]);

  const axisCircles = [0.25, 0.5, 0.75, 1];
  axisCircles.forEach(percentage => {
      const r = radius * percentage;
      
      // 增强同心圆的可见性
      g.append('circle')
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', '#aaa')
          .attr('stroke-width', percentage === 1 ? 1.5 : 1)
          .attr('stroke-dasharray', '3,3');

      const value = valueScale.invert(r);
      
      // 创建背景以增强文本可见性
      g.append('rect')
          .attr('x', 0)
          .attr('y', -r - 10)
          .attr('width', 70)
          .attr('height', 20)
          .attr('fill', 'rgba(0, 0, 0, 0.6)')
          .attr('rx', 4)
          .attr('ry', 4);
      
      // 增强坐标值文本
      g.append('text')
          .attr('class', 'axis-value')
          .attr('x', 5)
          .attr('y', -r)
          .attr('fill', '#fff')
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('font-weight', percentage === 1 ? 'bold' : 'normal')
          .text(
            currentMetric === 'activity' ? 
              `${Math.round(value)} counts` : 
              `${value.toFixed(2)}°C`
          );
  });

  const hours = d3.range(0, 24);
  hours.forEach(hour => {
      const angle = (hour * 15 - 90) * (Math.PI / 180);
      const labelRadius = radius + 20;
      
      // 增强时间标记线
      g.append('line')
          .attr('class', 'hour-marker')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', Math.cos(angle) * radius)
          .attr('y2', Math.sin(angle) * radius)
          .attr('stroke', hour % 3 === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)')
          .attr('stroke-width', hour % 3 === 0 ? 1.5 : 1);
      
      // 为主要时间点（3小时间隔）添加背景
      if (hour % 3 === 0) {
        g.append('circle')
          .attr('cx', Math.cos(angle) * labelRadius)
          .attr('cy', Math.sin(angle) * labelRadius)
          .attr('r', 16)
          .attr('fill', 'rgba(74, 144, 226, 0.3)');
      }
      
      // 增强时间标签
      g.append('text')
          .attr('class', 'time-label')
          .attr('x', Math.cos(angle) * labelRadius)
          .attr('y', Math.sin(angle) * labelRadius)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', hour % 3 === 0 ? '#fff' : '#aaa')
          .style('font-size', hour % 3 === 0 ? '14px' : '12px')
          .style('font-weight', hour % 3 === 0 ? 'bold' : 'normal')
          .text(`${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`);
  });

  const radialLine = d3.lineRadial()
      .angle(d => ((d[0] * 15) - 90) * (Math.PI / 180))
      .radius(d => valueScale(d[1] || 0))
      .curve(d3.curveCardinalClosed);

  hourlyData.forEach(([mouseId, hourMap]) => {
      // 确保lineData中的值与原始数据一致，不进行任何隐式转换
      const lineData = Array.from({length: 24}, (_, hour) => {
          // 获取原始值，如果不存在则为0
          const value = hourMap.get(hour);
          // 确保返回的是原始值，不进行任何转换
          return [hour, value !== undefined ? value : 0];
      });
  
      // 1) The FILL path (area only) with pointer-events turned off
      g.append('path')
      .datum(lineData)
      .attr('class', 'mouse-area')
      .attr('id', `mouse-area-${mouseId}`)
      .attr('d', radialLine)
      .attr('fill', colorScale(mouseId))
      .attr('fill-opacity', 0.2)
      .attr('stroke', 'none')
      .style('pointer-events', 'none');  // important: no mouse events
      
      // 2) The VISIBLE stroke path (thin, no pointer events)
      const visibleLine = g.append('path')
        .datum(lineData)
        .attr('class', 'mouse-line')
        .attr('id', `mouse-${mouseId}`)
        .attr('d', radialLine)
        .attr('fill', 'none')
        .attr('stroke', colorScale(mouseId))
        .attr('stroke-width', 2)
        .style('pointer-events', 'none'); // ignore pointer events on the thin line

  
    const hitArea = g.append('path')
      .datum(lineData)
      .attr('class', 'mouse-line-hit')
      .attr('id', `mouse-hit-${mouseId}`)
      .attr('d', radialLine)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')  
      .attr('stroke-width', 10)      
      .style('pointer-events', 'stroke')
      .on('mouseover', function() {
        const anySelected = d3.selectAll('.mouse-line.selected').size() > 0;
        const isThisSelected = visibleLine.classed('selected');
        if (!anySelected && !isThisSelected) {
          d3.selectAll('.mouse-line').classed('dimmed', true);
          visibleLine.classed('dimmed', false).attr('stroke-width', 6);
        }
      })
      .on('mousemove', (event) => {
        const [sx, sy] = d3.pointer(event, g.node());
        const angle = Math.atan2(sy, sx);
        // 修正角度计算逻辑，确保与时间标签显示一致
        // 将角度转换为小时，确保与图表外圈的时间标签完全对应
        const hour = (Math.floor(((angle * 180 / Math.PI + 90 + 360) % 360) / 15)) % 24;
        
        // 在鼠标位置显示一个小点，标记当前选中的时间点
        d3.select('.time-indicator').remove();
        const r = valueScale(lineData[hour][1] || 0);
        const hourAngle = (hour * 15 - 90) * (Math.PI / 180);
        
        // 添加时间指示线，从中心到外圈
        g.append('line')
          .attr('class', 'time-indicator')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', Math.cos(hourAngle) * (radius + 10))
          .attr('y2', Math.sin(hourAngle) * (radius + 10))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
        
        // 添加时间点指示器
        g.append('circle')
          .attr('class', 'time-indicator')
          .attr('cx', Math.cos(hourAngle) * r)
          .attr('cy', Math.sin(hourAngle) * r)
          .attr('r', 6)
          .attr('fill', colorScale(mouseId))
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        
        showTooltip(event, mouseId, lineData, hour);
      })
      .on('mouseout', function() {
        const anySelected = d3.selectAll('.mouse-line.selected').size() > 0;
        const isThisSelected = visibleLine.classed('selected');
        if (!isThisSelected) {
          hideTooltip();
          if (!anySelected) {
            d3.selectAll('.mouse-line').classed('dimmed', false)
              .attr('stroke-width', 2); 
          }
          visibleLine.attr('stroke-width', 2);
        }
      })
      .on('click', (event) => {
        event.stopPropagation();
        toggleMouseSelection(mouseId);
      });

    });
  svg.on('click', () => {
      clearAllSelections();
  });

  const legend = d3.select('.legend').html('');
//   legend.append('div')
//       .style('text-align', 'center')
//       .style('margin-bottom', '10px')
//       .style('font-weight', 'bold')
//       .text(`Mouse ID Legend (Click to highlight, hover to focus)`);

  hourlyData.forEach(([mouseId]) => {
      const item = legend.append('div')
          .attr('class', 'legend-item')
          .on('mouseover', () => {
              if (!d3.select(`#mouse-${mouseId}`).classed('selected')) {
                  d3.selectAll('.mouse-line').classed('dimmed', true);
                  d3.select(`#mouse-${mouseId}`).classed('dimmed', false);
              }
          })
          .on('mouseout', () => {
              if (!d3.selectAll('.mouse-line.selected').nodes().length) {
                  d3.selectAll('.mouse-line').classed('dimmed', false);
              }
          })
          .on('click', (event) => {
              event.stopPropagation();
              toggleMouseSelection(mouseId);
          });

      item.append('div')
          .attr('class', 'legend-color')
          .style('background-color', colorScale(mouseId));
      item.append('span').text(`Mouse ${mouseId}`);
  });
}

function zoomed(event) {
  const { transform } = event;
  d3.select('.clock-chart g')
    .attr('transform', `translate(${width/2},${height/2}) scale(${transform.k})`);
}

function showTooltip(event, mouseId, data, hour) {
    hideTooltip();

    // If data[hour] is missing, skip the tooltip
    if (!data[hour]) {
      console.log('No data for hour:', hour, data);
      return;
    }
    const value = data[hour][1];
    if (value == null) {
      console.log('No valid value for hour:', hour);
      return;
    }
    
    // 获取当前使用的valueScale，确保tooltip和图表使用相同的数据映射
    const maxValue = currentMetric === 'activity' ? 34 : 19.5;
    const minValue = currentMetric === 'activity' ? 0 : 18;
    
    // 计算该值在图表上的实际显示位置（相对于valueScale）
    // 确保tooltip显示的值与图表上显示的位置一致
    const displayValue = value;
    
    // 创建一个更加醒目的tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip enhanced-tooltip')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px');

    // 使用更加清晰的格式显示数据
    // 确保AM/PM显示逻辑与图表外圈的时间标签完全一致
    // 图表外圈的时间标签是按照24小时制计算的，0-11是AM，12-23是PM
    tooltip.html(`
        <div class="tooltip-header">
            <span class="tooltip-time">${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}</span>
            <span class="tooltip-id">Mouse ${mouseId}</span>
        </div>
        <div class="tooltip-value">
            <strong>${currentMetric === 'activity' ? 'Activity' : 'Temperature'}:</strong> 
            <span class="value-highlight">${currentMetric === 'activity' ? 
                `${displayValue.toFixed(0)} counts` : 
                `${displayValue.toFixed(2)}°C`}</span>
        </div>
    `);
}


function hideTooltip() {
  d3.selectAll('.tooltip').remove();
  d3.select('.time-indicator').remove();
}

function toggleMouseSelection(mouseId) {
  const line = d3.select(`#mouse-${mouseId}`);
  const fillArea = d3.select(`#mouse-area-${mouseId}`);
  fillArea.raise();
  line.raise();
  const legendItem = d3.selectAll('.legend-item')
    .filter((_, i, nodes) => {
      const text = nodes[i].textContent.trim();
      return text === `Mouse ${mouseId}`; // exact match, not includes()
    });

  
  const wasSelected = line.classed('selected');
  clearAllSelections();

  if (!wasSelected) {
    line.classed('selected', true);
    // line.classed('selected', true).attr('stroke-width', 4);
    legendItem.classed('selected', true);
    
    // 禁用所有老鼠的鼠标交互
    d3.selectAll('.mouse-line-hit')
      .style('pointer-events', 'none');
      
    // 只启用选中老鼠的鼠标交互
    d3.select(`#mouse-hit-${mouseId}`)
      .style('pointer-events', 'stroke');
      
    // 添加全局鼠标移动事件，用于在整个图表上显示选中老鼠的数据
    const svg = d3.select('.clock-chart svg');
    const g = svg.select('g');
    const valueScale = d3.scaleLinear()
      .domain([currentMetric === 'activity' ? 0 : 18, currentMetric === 'activity' ? 34 : 19.5])
      .range([50, radius]);
      
    // 获取选中老鼠的数据
    const mouseData = d3.select(`#mouse-hit-${mouseId}`).datum();
    
    // 移除之前可能存在的全局鼠标事件
    svg.on('.global-mouse', null);
    
    // 添加新的全局鼠标事件
    svg.on('mousemove.global-mouse', function(event) {
      const [sx, sy] = d3.pointer(event, g.node());
      const angle = Math.atan2(sy, sx);
      const hour = (Math.floor(((angle * 180 / Math.PI + 90 + 360) % 360) / 15)) % 24;
      
      // 移除之前的时间指示器
      d3.select('.time-indicator').remove();
      
      // 获取当前小时的数据值
      const value = mouseData[hour][1] || 0;
      const r = valueScale(value);
      const hourAngle = (hour * 15 - 90) * (Math.PI / 180);
      
      // 添加时间指示线，从中心到外圈
      g.append('line')
        .attr('class', 'time-indicator')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', Math.cos(hourAngle) * (radius + 10))
        .attr('y2', Math.sin(hourAngle) * (radius + 10))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
      
      // 添加时间点指示器
      g.append('circle')
        .attr('class', 'time-indicator')
        .attr('cx', Math.cos(hourAngle) * r)
        .attr('cy', Math.sin(hourAngle) * r)
        .attr('r', 6)
        .attr('fill', colorScale(mouseId))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
      
      // 显示tooltip
      showTooltip(event, mouseId, mouseData, hour);
    });
    
    // 添加鼠标离开事件
    svg.on('mouseout.global-mouse', function() {
      hideTooltip();
    });
    
    // 将其他老鼠线条变暗
    d3.selectAll('.mouse-line').classed('dimmed', function() {
      return !d3.select(this).classed('selected');
    });
  }
}

function clearAllSelections() {
  d3.selectAll('.mouse-line')
    .classed('selected', false)
    .classed('dimmed', false);
  d3.selectAll('.legend-item')
    .classed('selected', false);
  hideTooltip();

  // 移除全局鼠标事件
  d3.select('.clock-chart svg').on('.global-mouse', null);
  
  // 恢复所有老鼠的鼠标交互
  d3.selectAll('.mouse-line-hit')
    .style('pointer-events', 'stroke');
}

function toggleGender() {
  currentGender = currentGender === 'female' ? 'male' : 'female';

  // Select button explicitly using ID
  const genderButton = document.getElementById("genderButton");
  if (genderButton) {
    genderButton.textContent = `Gender: ${currentGender.charAt(0).toUpperCase() + currentGender.slice(1)}`;
  } else {
    console.error("❌ Gender button not found!");
  }

  renderClockChart(); // Re-render chart with updated data
}

function toggleMetric() {
  currentMetric = currentMetric === 'activity' ? 'temp' : 'activity';

  // Select button explicitly using ID
  const metricButton = document.getElementById("metricButton");
  if (metricButton) {
    metricButton.textContent = `Metric: ${currentMetric === 'activity' ? 'Activity' : 'Temperature'}`;
  } else {
    console.error("❌ Metric button not found!");
  }

  renderClockChart(); // Re-render chart with updated data
}


function handleSearch() {
  if (!dataset || dataset.length === 0) {
    console.warn("⚠️ Dataset not loaded yet! Skipping search...");
    return;
  }

  const searchInput = document.getElementById('mouseSearch');
  const searchValue = searchInput.value.trim().toLowerCase();

  if (!searchValue) {
    d3.selectAll('.mouse-line').style('display', 'block');
    clearAllSelections();
    return;
  }

  const availableMouseIds = [...new Set(dataset.map(d => d.mouseId.toLowerCase()))];

  const searchId = searchValue.startsWith('m') || searchValue.startsWith('f')
    ? searchValue
    : `${currentGender.charAt(0)}${searchValue}`;

  const matchedId = availableMouseIds.find(id => id === searchId.toLowerCase());

  if (matchedId) {
    console.log(`✅ Mouse ${matchedId} found and highlighted`);

    d3.selectAll('.mouse-line').style('display', 'none');
    d3.select(`#mouse-${matchedId}`).style('display', 'block');

    toggleMouseSelection(matchedId);
  } else {
    console.warn(`❌ Mouse ID "${searchValue}" not found!`);
    d3.selectAll('.mouse-line').style('display', 'block');
    clearAllSelections();
  }
}

function resetSearch() {
  const searchInput = document.getElementById('mouseSearch');
  searchInput.value = ''; // Clear search input

  d3.selectAll('.mouse-line').style('display', 'block');
  d3.selectAll('.legend-item').classed('selected', false).classed('dimmed', false);

  clearAllSelections();
}

/**
 * previous_project.js
 * Option 1: No DOMContentLoaded wrapper
 */

// 1) Immediately call `init()` to fetch your dataset and render the chart
init();  
console.log("🔵 Running previous_project.js immediately (no DOMContentLoaded).");

// 2) Now attach the button listeners directly
const genderButton = document.getElementById('genderButton');
console.log("Gender Button Found:", genderButton);
if (genderButton) {
  genderButton.addEventListener('click', function() {
    console.log("🟢 Gender button clicked");
    toggleGender();
  });
} else {
  console.error("❌ Gender button not found!");
}

const metricButton = document.getElementById('metricButton');
console.log("Metric Button Found:", metricButton);
if (metricButton) {
  metricButton.addEventListener('click', function() {
    console.log("🟢 Metric button clicked");
    toggleMetric();
  });
} else {
  console.error("❌ Metric button not found!");
}

// 3) Attach the search & reset as before
const searchInput = document.getElementById('mouseSearch');
if (searchInput) {
  console.log("✅ Search input found, attaching event listener");
  searchInput.addEventListener('input', function() {
    console.log("🔍 Searching for:", this.value);
    handleSearch();
  });
    
  const resetButton = document.querySelector('.search-container button');
  if (resetButton) {
    resetButton.addEventListener('click', resetSearch);
  }
} else {
  console.error("❌ Search input not found!");
}

window.handleSearch = handleSearch;

