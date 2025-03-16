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

  const maxValue = currentMetric === 'activity' ? 34 : 19.5;
  const minValue = currentMetric === 'activity' ? 0 : 18;
  const valueScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([50, radius]);

  const axisCircles = [0.25, 0.5, 0.75, 1];
  axisCircles.forEach(percentage => {
      const r = radius * percentage;
      
      g.append('circle')
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', '#ddd')
          .attr('stroke-dasharray', '2,2');

      const value = valueScale.invert(r);
      g.append('text')
          .attr('x', 5)
          .attr('y', -r)
          .attr('fill', '#666')
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
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
      
      g.append('text')
          .attr('class', 'time-label')
          .attr('x', Math.cos(angle) * labelRadius)
          .attr('y', Math.sin(angle) * labelRadius)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .text(`${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`);

      g.append('line')
          .attr('class', 'hour-marker')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', Math.cos(angle) * radius)
          .attr('y2', Math.sin(angle) * radius);
  });

  const radialLine = d3.lineRadial()
      .angle(d => ((d[0] * 15) - 90) * (Math.PI / 180))
      .radius(d => valueScale(d[1] || 0))
      .curve(d3.curveCardinalClosed);

  hourlyData.forEach(([mouseId, hourMap]) => {
      const lineData = Array.from({length: 24}, (_, hour) => {
          const value = hourMap.get(hour) || 0;
          return [hour, value];
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
        const hour = (Math.floor(((angle * 180 / Math.PI + 90 + 360) % 360) / 15)) % 24;
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
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');

    // const value = data[hour][1];

    tooltip.html(`
        <strong>Mouse ID:</strong> ${mouseId}<br>
        <strong>Time:</strong> ${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}<br>
        <strong>${currentMetric === 'activity' ? 'Activity' : 'Temperature'}:</strong> 
        ${currentMetric === 'activity' ? 
            `${value.toFixed(0)} counts` : 
            `${value.toFixed(2)}°C`}
    `);
}


function hideTooltip() {
  d3.selectAll('.tooltip').remove();
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
    d3.selectAll('.mouse-line-hit')
      .style('pointer-events', 'none');
    d3.select(`#mouse-hit-${mouseId}`)
      .style('pointer-events', 'stroke');
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

