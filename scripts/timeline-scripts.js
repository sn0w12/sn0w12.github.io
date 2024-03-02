let allEvents = []; // This will hold all events after fetching from JSON
let filteredEvents = []; // Holds events after applying filters
let uniqueSubcategories = new Map();
let currentViewData = null;

let highlightColor = null;
let highlightBackgroundColor = null;

document.addEventListener('DOMContentLoaded', function() {
    const style = getComputedStyle(document.body);
    highlightColor = style.getPropertyValue('--highlight');
    highlightBackgroundColor = style.getPropertyValue('--highlight-background');
    // Initially load the default timeline
    loadSelectedTimeline();
    const sidebar = document.querySelector('.sidebar');
    // Check if the screen width is less than or equal to 768px
    if (window.innerWidth <= 1520) {
        // Initially close the sidebar on mobile
        sidebar.classList.add('closed');
    } else {
        // Ensure the sidebar is open on desktop
        sidebar.classList.add('open');
    }
    setUpButtons();
});

function loadSelectedTimeline(selectedTimeline) {
    resetSubFilters();
    uniqueSubcategories.clear(); // Correct for clearing a Map

    if (!selectedTimeline) {
        selectedTimeline = sessionStorage.getItem('selectedTimeline') || document.getElementById('timelineDropdown').value;
        document.getElementById('timelineDropdown').value = selectedTimeline;
    }

    fetch(selectedTimeline)
        .then(response => response.json())
        .then(data => {
            allEvents = data;
            data.forEach(era => {
                const currentSubcategories = uniqueSubcategories.get(era.era) || new Set();
                era.subcategories.forEach(subcat => currentSubcategories.add(subcat.title));
                uniqueSubcategories.set(era.era, currentSubcategories); // Use Map's set method
            });
            createSubcategoryFilters();
            createTimeline(data);
            populateSidebar(data);
            applyFilters();
            searchEvents();
            addSubEventListeners();
        })
        .catch(error => console.error('Error loading the timeline:', error));

    sessionStorage.setItem('selectedTimeline', selectedTimeline);
}

function resetSubFilters() {
    try{
        document.querySelector('.filters.sub').innerHTML = "";
    }
    catch {
        console.log("No .filters.sub found.");
    }
}

function createSubcategoryFilters() {
    const mainFiltersContainer = document.querySelector('.filters.sub');
    mainFiltersContainer.innerHTML = '';

    uniqueSubcategories.forEach((subcategories, era) => {
        const eraDiv = document.createElement('div');
        eraDiv.classList.add('era-filters');

        const eraHeader = document.createElement('h3');
        eraHeader.textContent = era;
        eraDiv.appendChild(eraHeader);

        const masterToggleLabel = document.createElement('label');
        const masterToggleCheckbox = document.createElement('input');
        masterToggleCheckbox.type = 'checkbox';
        masterToggleCheckbox.checked = true;
        masterToggleCheckbox.addEventListener('change', () => {
            document.querySelectorAll(`input[data-era='${era}']`).forEach(subCheckbox => {
                subCheckbox.checked = masterToggleCheckbox.checked;
            });
            applyFilters();
        });
        masterToggleLabel.appendChild(masterToggleCheckbox);
        masterToggleLabel.append(' Toggle All');
        eraDiv.appendChild(masterToggleLabel);

        subcategories.forEach(subcat => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'subCategory';
            checkbox.setAttribute('data-era', era);
            checkbox.value = subcat;
            checkbox.checked = true;
            checkbox.addEventListener('change', applyFilters);
            label.appendChild(checkbox);
            label.append(` ${subcat}`);
            eraDiv.appendChild(label);
        });

        mainFiltersContainer.appendChild(eraDiv);
    });
}

function createTimeline(data) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = ''; // Clear existing timeline content
    data.forEach((era, index) => {
        const eraDiv = document.createElement('div');
        eraDiv.className = 'era';
        eraDiv.id = `era-${index}`;

        // Create a container for the title and the toggle button
        const titleContainer = document.createElement('div');
        titleContainer.className = 'title-container';

        const eraTitle = document.createElement('h1');
        eraTitle.textContent = era.era;
        eraTitle.style.display = 'inline'; // Adjust display for inline behavior

        // Toggle button for description
        const toggleDescriptionBtn = document.createElement('button');
        toggleDescriptionBtn.textContent = 'Show More';
        toggleDescriptionBtn.className = 'toggle-description-btn';
        toggleDescriptionBtn.onclick = () => toggleDescription(`description-${index}`, toggleDescriptionBtn);
        toggleDescriptionBtn.style.marginLeft = '10px'; // Add space between the title and the button

        // Append title and button to the container
        titleContainer.appendChild(eraTitle);
        titleContainer.appendChild(toggleDescriptionBtn);

        const eraDescription = document.createElement('p');
        eraDescription.textContent = era.description;
        eraDescription.className = 'era-description hidden'; // Initially hide the description
        eraDescription.id = `description-${index}`; // Unique ID for toggling

        eraDiv.appendChild(titleContainer);
        eraDiv.appendChild(eraDescription);

        if (era.subcategories) {
            era.subcategories.forEach((subcategory, subcatIndex) => {
                const subcatDiv = document.createElement('div');
                subcatDiv.className = 'subcategory';
                subcatDiv.innerHTML = `<h2>${subcategory.title}</h2>`;
                eraDiv.appendChild(subcatDiv);

                // Iterate through events in subcategory
                subcategory.events.forEach((event, eventIndex) => {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = `event ${event.level.replace(/\s+/g, '-').toLowerCase()}`;
                    eventDiv.id = `event-${index}-${subcatIndex}-${eventIndex}`;
                    eventDiv.innerHTML = `<h3>${event.year}: ${event.title}</h3>`;
                    eventDiv.onclick = () => openModal(event);
                    subcatDiv.appendChild(eventDiv);
                });
            });
        }

        timeline.appendChild(eraDiv);
    });
}

function applyFilters() {
    const levelCheckboxes = document.querySelectorAll('input[name="eventLevel"]:checked');
    let selectedLevels = Array.from(levelCheckboxes).map(cb => cb.value);
    const subcatCheckboxes = document.querySelectorAll('input[name="subCategory"]:checked');
    let selectedSubcats = Array.from(subcatCheckboxes).map(cb => cb.value);

    const filteredEvents = allEvents.map(era => ({
        ...era,
        subcategories: era.subcategories.filter(subcat => selectedSubcats.includes(subcat.title)).map(subcat => ({
            ...subcat,
            events: subcat.events.filter(event => selectedLevels.includes(event.level))
        })).filter(subcat => subcat.events.length > 0)
    })).filter(era => era.subcategories.some(subcat => subcat.events.length > 0));

    updateViewIfNeeded(filteredEvents);
}

function toggleDescription(descriptionId, btn) {
    const description = document.getElementById(descriptionId);
    if (description.classList.contains('hidden')) {
        description.classList.remove('hidden');
        btn.textContent = 'Show Less';
    } else {
        description.classList.add('hidden');
        btn.textContent = 'Show More';
    }
}

function searchEvents() {
    const searchQuery = document.getElementById('searchBox').value.toLowerCase();
    const filteredEvents = allEvents.map(era => ({
        ...era,
        subcategories: era.subcategories.map(subcat => ({
            ...subcat,
            events: subcat.events.filter(event =>
                event.title.toLowerCase().includes(searchQuery) || 
                event.description.toLowerCase().includes(searchQuery) ||
                event.year.toString().toLowerCase().includes(searchQuery)
            )
        })).filter(subcat => subcat.events.length > 0)
    })).filter(era => era.subcategories.some(subcat => subcat.events.length > 0)); // Keep eras with at least one subcategory having matching events

    updateViewIfNeeded(filteredEvents);
}

function openModal(event) {
    const modal = document.getElementById('eventModal');
    const content = document.getElementById('modalContent');
    const img = '<img style="height:3px;width: 75%; display: block; margin-left: auto; margin-right: auto; margin-top: -2px;" src="icons/divider_small.png" alt="map popup divider">';
    const img2 = '<img style="height:3px;width: 50%; display: block; margin-left: auto; margin-right: auto; margin-top: -2px;" src="icons/divider_small.png" alt="map popup divider">';


    content.innerHTML = `<span class="close" onclick="closeModal()">&times;</span><h1>${event.title}</h1>${img}<h2>${event.level}</h2>${img2}<p>${event.description}</p>`;
    modal.style.display = 'block';

    // Add an event listener to close the modal if the user clicks outside of it
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('eventModal');
    if (modal.style.display !== 'none') {
        modal.style.display = 'none';
    }
}

function populateSidebar(data) {
    const sidebarContent = document.getElementById('sidebarContent');
    sidebarContent.innerHTML = ''; // Clear existing sidebar content

    data.forEach((era, eraIndex) => {
        // Create and append era title to sidebar
        const eraTitle = document.createElement('button');
        eraTitle.className = 'sidebar-era';
        eraTitle.textContent = era.era;
        eraTitle.onclick = function() {
            this.classList.toggle('active');
            const nextElement = this.nextElementSibling;
            if (nextElement.style.display === "none") {
                nextElement.style.display = "block";
            } else {
                nextElement.style.display = "none";
            }
        };
        sidebarContent.appendChild(eraTitle);

        // Initially hidden container for era subcategories and events
        const subcategoriesContainer = document.createElement('div');
        subcategoriesContainer.className = 'sidebar-subcategories-container';
        subcategoriesContainer.style.display = "none";

        // Iterate through subcategories for sidebar links
        if (era.subcategories) {
            era.subcategories.forEach((subcategory, subcatIndex) => {
                const subcatDiv = document.createElement('div');
                const subcatTitle = document.createElement('button');
                subcatTitle.className = 'sidebar-subcat-title';
                subcatTitle.textContent = subcategory.title;
                subcatDiv.appendChild(subcatTitle);

                const eventsContainer = document.createElement('div');
                eventsContainer.className = 'sidebar-events-container';
                eventsContainer.style.display = "none"; // Initially hide events

                subcatTitle.onclick = function() {
                    this.classList.toggle('active');
                    eventsContainer.style.display = eventsContainer.style.display === "none" ? "block" : "none";
                };

                subcategory.events.forEach((event, eventIndex) => {
                    const eventLink = document.createElement('a');
                    eventLink.href = `#event-${eraIndex}-${subcatIndex}-${eventIndex}`;
                    eventLink.textContent = event.title;
                    eventLink.className = `sidebar-event-link ${event.level.replace(/\s+/g, '-').toLowerCase()}`;
                    eventLink.onclick = function(e) {
                        e.preventDefault();
                        const targetId = `event-${eraIndex}-${subcatIndex}-${eventIndex}`;
                        document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
                    };
                    eventsContainer.appendChild(eventLink);
                });

                subcatDiv.appendChild(eventsContainer);
                subcategoriesContainer.appendChild(subcatDiv);
            });
        }

        sidebarContent.appendChild(subcategoriesContainer);
    });
}

function setUpButtons() {
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            sidebar.classList.add('closed');
        } else {
            sidebar.classList.remove('closed');
            sidebar.classList.add('open');
        }
    });
    
    document.querySelectorAll('input[name="eventLevel"]').forEach(function(input) {
        input.addEventListener('change', function() {
            applyFilters();
        });
    }); 

    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

function addSubEventListeners() {
    document.querySelectorAll('input[name="subCategory"]').forEach(input => {
        input.addEventListener('change', function() {
            applyFilters();
        });
    });  
}

function updateVisualization(data) {
    const processedEvents = [];
    for (const era of data) {
        for (const subcategory of era.subcategories) {
            for (const event of subcategory.events) {
                const match = event.year.match(/(\d+)\s(B\.R|B\.A)/);
                if (match) {
                    processedEvents.push({ ...event, plotYear: parseInt(match[1], 10) * (match[2] === 'B.R' ? -1 : 1) });
                }
            }
        }
    }

    generateDensityPlot(processedEvents);
}

function generateDensityPlot(processedEvents) {
    if (processedEvents) {
        console.time("Total generateDensityPlot");
    
        let minYear = processedEvents[0].plotYear, maxYear = processedEvents[0].plotYear;
        processedEvents.forEach(event => {
            if (event.plotYear < minYear) minYear = event.plotYear;
            if (event.plotYear > maxYear) maxYear = event.plotYear;
        });
    
        const chartContainer = document.getElementById("chartContainer");
        let canvas = chartContainer.querySelector("canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            chartContainer.appendChild(canvas);
        }
        const containerWidth = chartContainer.getBoundingClientRect().width;
        const margin = {top: 20, right: 20, bottom: 40, left: 50};
        const width = containerWidth * 0.97 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
    
        canvas.width = width + margin.left + margin.right;
        canvas.height = height + margin.top + margin.bottom;
    
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save(); // Save the clean state of the canvas
        ctx.translate(margin.left, margin.top); // Adjust coordinate system for margin
    
        console.time("Compute density data");
        const plotYears = processedEvents.map(d => d.plotYear);
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), d3.range(minYear, maxYear + 1));
        const densityData = kde(plotYears);
        console.timeEnd("Compute density data");
    
        console.time("Rendering to Canvas");
    
        // Calculate tick interval based on the span of years
        const yearSpan = maxYear - minYear;
        console.log(yearSpan);
        let tickInterval;
        if(yearSpan > 50000) {
            tickInterval = 3000;
        } else if(yearSpan > 10000) {
            tickInterval = 1000;
        } else if(yearSpan > 1000) {
            tickInterval = 100; // For spans over a millennium, use century ticks
        } else if(yearSpan > 100) {
            tickInterval = 25; // For spans over a century, use decade ticks
        } else if(yearSpan > 10) {
            tickInterval = 2; // For spans over a decade, use 5-year ticks
        } else {
            tickInterval = 1; // For spans of 10 years or less, use annual ticks
        }
    
        // Directly calculate scales in canvas context
        const x = d => (d - minYear) / (maxYear - minYear) * width;
        const yMax = Math.max(...densityData.map(d => d[1]));
        const y = d => height - (d / yMax) * height; // Flip y coordinate for canvas drawing
    
        // Drawing density plot path
        ctx.beginPath();
        ctx.moveTo(x(densityData[0][0]), y(densityData[0][1]));
        densityData.forEach(([year, value]) => {
            ctx.lineTo(x(year), y(value));
        });
    
        // Closing the path to fill under the curve
        ctx.lineTo(x(densityData[densityData.length - 1][0]), height);
        ctx.lineTo(x(densityData[0][0]), height);
        ctx.closePath();
    
        // Fill the path
        ctx.fillStyle = highlightBackgroundColor; // Assume these are pre-calculated or globally accessible
        ctx.fill();
    
        // Optionally redraw the path outline
        ctx.beginPath();
        ctx.moveTo(x(densityData[0][0]), y(densityData[0][1]));
        densityData.forEach(([year, value]) => {
            ctx.lineTo(x(year), y(value));
        });
        ctx.strokeStyle = highlightColor; // Assume these are pre-calculated or globally accessible
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.save();
        drawDynamicTicks(ctx, minYear, maxYear, tickInterval, x, height, width);
        ctx.restore(); // Restore to the clean state to remove any applied transformations
    
        console.timeEnd("Rendering to Canvas");
        console.timeEnd("Total generateDensityPlot");
    }
    
    function drawDynamicTicks(ctx, minYear, maxYear, interval, scaleX, chartHeight, chartWidth) {
        const tickLength = 5; // Length of the ticks in pixels
        const fontSize = 10; // Font size for the tick labels
        ctx.font = `${fontSize}px Arial`; // Set font for tick labels
    
        // Draw the x-axis line
        ctx.beginPath();
        ctx.moveTo(0, chartHeight);
        ctx.lineTo(chartWidth, chartHeight);
        ctx.stroke();
    
        // Draw ticks and labels
        for (let year = minYear; year <= maxYear; year += interval) {
            const x = scaleX(year);
            ctx.beginPath();
            ctx.moveTo(x, chartHeight);
            ctx.lineTo(x, chartHeight + tickLength);
            ctx.stroke();
    
            // Draw tick label, adjusting for label width to center it
            const label = year.toString();
            const textWidth = ctx.measureText(label).width;
            ctx.fillText(label, x - textWidth / 2, chartHeight + tickLength + fontSize);
        }
    }
}

function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        v /= k;
        return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

function updateViewIfNeeded(filteredEvents) {
    // Convert to a comparable format (e.g., JSON string) to check if data has changed
    const newViewData = JSON.stringify(filteredEvents);
    if (newViewData === currentViewData) {
        return; // Skip update if the data hasn't changed
    }
    currentViewData = newViewData;

    // Update the UI as needed
    createTimeline(filteredEvents);
    populateSidebar(filteredEvents);
    updateVisualization(filteredEvents);
}
