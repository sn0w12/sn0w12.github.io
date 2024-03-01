let allEvents = []; // This will hold all events after fetching from JSON
let filteredEvents = []; // Holds events after applying filters
let uniqueSubcategories = new Set();
let currentViewData = null;

document.addEventListener('DOMContentLoaded', function() {
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

// This function directly uses the selected value from the dropdown or sessionStorage
function loadSelectedTimeline(selectedTimeline) {
    resetSubFilters();
    uniqueSubcategories.clear();
    if (!selectedTimeline) {
        // If no parameter is passed, use the saved timeline or default to the first option
        selectedTimeline = sessionStorage.getItem('selectedTimeline') || document.getElementById('timelineDropdown').value;
        document.getElementById('timelineDropdown').value = selectedTimeline; // Ensure dropdown shows the current selection
    }

    fetch(selectedTimeline)
        .then(response => response.json())
        .then(data => {
            allEvents = data;
            data.forEach(era => {
                uniqueSubcategories[era.era] = new Set([...(uniqueSubcategories[era.era] || []), ...era.subcategories.map(subcat => subcat.title)]);
            });
            createSubcategoryFilters();
            createTimeline(data);
            populateSidebar(data);
            applyFilters();
            searchEvents();
            addSubEventListeners()
        })
        .catch(error => console.error('Error loading the timeline:', error));

    // Update sessionStorage with the current selection
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
    mainFiltersContainer.innerHTML = ''; // Clear existing filters

    Object.keys(uniqueSubcategories).forEach(era => {
        // Create a div for each era
        const eraDiv = document.createElement('div');
        eraDiv.classList.add('era-filters');
        const eraHeader = document.createElement('h3');
        eraHeader.textContent = era;
        eraDiv.appendChild(eraHeader);

        // Master toggle for the era
        const masterToggleLabel = document.createElement('label');
        const masterToggleCheckbox = document.createElement('input');
        masterToggleCheckbox.type = 'checkbox';
        masterToggleCheckbox.checked = true; // Default to checked
        masterToggleCheckbox.addEventListener('change', () => {
            document.querySelectorAll(`input[data-era='${era}']`).forEach(subCheckbox => {
                subCheckbox.checked = masterToggleCheckbox.checked;
            });
            applyFilters(); // Apply filters based on new checkbox states
        });
        masterToggleLabel.appendChild(masterToggleCheckbox);
        masterToggleLabel.append(' Toggle All');
        eraDiv.appendChild(masterToggleLabel);

        // Add subcategory filters to the era div
        uniqueSubcategories[era].forEach(subcat => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'subCategory';
            checkbox.setAttribute('data-era', era); // Associate with its era
            checkbox.value = subcat;
            checkbox.checked = true;
            checkbox.addEventListener('change', applyFilters);
            label.appendChild(checkbox);
            label.append(` ${subcat}`);
            eraDiv.appendChild(label);
        });

        // Append the era div to the main filters container
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
    d3.select("#chartContainer svg").remove();

    const years = processedEvents.map(d => d.plotYear);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const style = getComputedStyle(document.body);
    const highlightColor = style.getPropertyValue('--highlight');
    const highlightBackgroundColor = style.getPropertyValue('--highlight-background');

    const chartContainer = d3.select("#chartContainer");
    const containerWidth = chartContainer.node().getBoundingClientRect().width;
    const margin = {top: 20, right: 20, bottom: 40, left: 50};
    const width = containerWidth * 0.97 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const kde = kernelDensityEstimator(kernelEpanechnikov(7), d3.range(minYear, maxYear));
    const densityData = kde(years);

    const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, width]);
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

    const y = d3.scaleLinear().domain([0, Math.max(...densityData.map(d => d[1]))]).range([height, 0]);

    svg.append("path")
        .datum(densityData)
        .attr("fill", highlightBackgroundColor)
        .attr("stroke", highlightColor)
        .attr("stroke-width", 1)
        .attr("d", d3.area()
            .curve(d3.curveBasis)
            .x(d => x(d[0]))
            .y0(height)
            .y1(d => y(d[1]))
        );
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
