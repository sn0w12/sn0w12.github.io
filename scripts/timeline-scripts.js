let allEvents = []; // This will hold all events after fetching from JSON
let filteredEvents = []; // Holds events after applying filters
let eventsChartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initially load the default timeline
    loadSelectedTimeline();
    const sidebar = document.querySelector('.sidebar');
    // Check if the screen width is less than or equal to 768px
    if (window.innerWidth <= 1520) {
        // Initially close the sidebar on mobile
        sidebar.classList.add('close');
    } else {
        // Ensure the sidebar is open on desktop
        sidebar.classList.add('open');
    }
    setUpButtons();
});

// This function directly uses the selected value from the dropdown or sessionStorage
function loadSelectedTimeline(selectedTimeline) {
    if (!selectedTimeline) {
        // If no parameter is passed, use the saved timeline or default to the first option
        selectedTimeline = sessionStorage.getItem('selectedTimeline') || document.getElementById('timelineDropdown').value;
        document.getElementById('timelineDropdown').value = selectedTimeline; // Ensure dropdown shows the current selection
    }

    fetch(selectedTimeline)
    .then(response => response.json())
    .then(data => {
        allEvents = data;
        createTimeline(data);
        populateSidebar(data);
        updateVisualization(data);
        applyFilters();
        searchEvents();
    })
    .catch(error => console.error('Error loading the timeline:', error));

    // Update sessionStorage with the current selection
    sessionStorage.setItem('selectedTimeline', selectedTimeline);
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
    const checkboxes = document.querySelectorAll('input[name="eventLevel"]:checked');
    let selectedLevels = Array.from(checkboxes).map(cb => cb.value);

    const filteredEvents = allEvents.map(era => ({
        ...era,
        subcategories: era.subcategories.map(subcat => ({
            ...subcat,
            events: subcat.events.filter(event => selectedLevels.includes(event.level))
        })).filter(subcat => subcat.events.length > 0)
    })).filter(era => era.subcategories.some(subcat => subcat.events.length > 0)); // Keep eras with at least one subcategory having matching events

    createTimeline(filteredEvents); // Recreate the timeline with filtered events
    populateSidebar(filteredEvents); // Repopulate sidebar to reflect filters
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

    createTimeline(filteredEvents); // Recreate the timeline with filtered events
    populateSidebar(filteredEvents); // Repopulate sidebar to reflect search results
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
            sidebar.classList.add('close');
        } else {
            sidebar.classList.remove('close');
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

function updateVisualization(data) {
    // Aggregate events from all eras and subcategories into a flat array
    let processedEvents = [];
    data.forEach(era => {
        era.subcategories.forEach(subcategory => {
            subcategory.events.forEach(event => {
                const match = event.year.match(/(\d+)\s(B\.R|B\.A)/);
                if (match) {
                    const yearValue = parseInt(match[1], 10) * (match[2] === 'B.R' ? -1 : 1);
                    processedEvents.push({ ...event, plotYear: yearValue });
                }
            });
        });
    });

    generateDensityPlot(processedEvents);
}

function generateDensityPlot(processedEvents) {
    // Remove existing SVG to prevent duplicates
    d3.select("#chartContainer svg").remove();

    // Extract just the plotYear values from processedEvents
    const years = processedEvents.map(d => d.plotYear);

    // Find the minimum and maximum years in the dataset
    const minYear = d3.min(years);
    const maxYear = d3.max(years);

    // Access CSS custom properties
    const style = getComputedStyle(document.body);
    const backgroundColor = style.getPropertyValue('--background');
    const foregroundColor = style.getPropertyValue('--foreground');
    const highlightColor = style.getPropertyValue('--highlight');
    const highlight2Color = style.getPropertyValue('--highlight2');
    const highlightBackgroundColor = style.getPropertyValue('--highlight-background');

    // Select the chart container and determine its width
    const chartContainer = d3.select("#chartContainer");
    const containerWidth = chartContainer.node().getBoundingClientRect().width;

    widthChange = containerWidth * 0.03;

    // Set up SVG dimensions dynamically
    const margin = {top: 20, right: 20, bottom: 40, left: 50},
        width = containerWidth - widthChange - margin.left - margin.right, // Use container width
        height = 300 - margin.top - margin.bottom; // Adjust height as needed

    var svg = d3.select("#chartContainer")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Step 2: Define the kernel density estimation function
    // This is a simplified example; you might need a more specific implementation
    function kernelDensityEstimator(kernel, X) {
        return function(V) {
            return X.map(function(x) {
                return [x, d3.mean(V, function(v) { return kernel(x - v); })];
            });
        };
    }

    function kernelEpanechnikov(k) {
        return function(v) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    // Step 3: Prepare the data for KDE
    var kde = kernelDensityEstimator(kernelEpanechnikov(7), d3.range(minYear, maxYear, 1)); // Adjust range and bandwidth as needed
    var densityData = kde(processedEvents.map(d => d.plotYear));

    // Step 4: Create the density plot
    // X scale
    var x = d3.scaleLinear()
        .domain([minYear, maxYear]) // Adjust based on your data range
        .range([0, width]);

    // Add X axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Y scale
    var y = d3.scaleLinear()
        .domain([0, d3.max(densityData, function(d) { return d[1]; })])
        .range([height, 0]);

    // Add the density curve
    svg.append("path")
        .datum(densityData)
        .attr("fill", highlightBackgroundColor) // Use the fill for the area under the curve
        .attr("stroke", highlightColor) // Stroke color for the line itself
        .attr("stroke-width", 1)
        .attr("d", d3.area() // Use d3.area instead of d3.line for filling the area
            .curve(d3.curveBasis) // Smooth the line
            .x(function(d) { return x(d[0]); })
            .y0(height) // Start fill from the bottom of the SVG (y-axis baseline)
            .y1(function(d) { return y(d[1]); }) // Fill to the y-value of the data point
        );
}
