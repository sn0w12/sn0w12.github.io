let allEvents = []; // This will hold all events after fetching from JSON
let filteredEvents = []; // Holds events after applying filters

document.addEventListener('DOMContentLoaded', function() {
    fetch('data/timeline.json')
    .then(response => response.json())
    .then(data => {
        allEvents = data; // Store all events
        filteredEvents = data;
        createTimeline(data); // Initial timeline creation
        populateSidebar(data);
    });
});

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

        era.events.forEach((event, eventIndex) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = `event ${event.level.replace(/\s+/g, '-').toLowerCase()}`;
            eventDiv.id = `event-${index}-${eventIndex}`;
            eventDiv.innerHTML = `<h2>${event.year}: ${event.title}</h2>`;
            eventDiv.onclick = () => openModal(event);
            eraDiv.appendChild(eventDiv);
        });
        timeline.appendChild(eraDiv);
    });
}

function applyFilters() {
    const checkboxes = document.querySelectorAll('input[name="eventLevel"]:checked');
    let selectedLevels = Array.from(checkboxes).map(cb => cb.value);

    filteredEvents = allEvents.map(era => ({
        ...era,
        events: era.events.filter(event => selectedLevels.includes(event.level))
    })).filter(era => era.events.length > 0);

    createTimeline(filteredEvents);
    populateSidebar(filteredEvents);
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
        events: era.events.filter(event => 
            event.title.toLowerCase().includes(searchQuery) || 
            event.description.toLowerCase().includes(searchQuery) ||
            event.year.toString().toLowerCase().includes(searchQuery)
        )
    })).filter(era => era.events.length > 0); // Filter out eras with no matching events

    createTimeline(filteredEvents); // Recreate the timeline with filtered events
    populateSidebar(filteredEvents);
}


function openModal(event) {
    const modal = document.getElementById('eventModal');
    const content = document.getElementById('modalContent');
    const img = '<img style="height:3px;width: 75%; display: block; margin-left: auto; margin-right: auto; margin-top: -2px;" src="icons/divider_small.png" alt="map popup divider">';
    const img2 = '<img style="height:3px;width: 50%; display: block; margin-left: auto; margin-right: auto; margin-top: -2px;" src="icons/divider_small.png" alt="map popup divider">';


    content.innerHTML = `<h1>${event.title}</h1>${img}<h2>${event.level}</h2>${img2}<p>${event.description}</p>`;
    modal.style.display = 'block';

    // Add an event listener to close the modal if the user clicks outside of it
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeModal();
    }
});

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
            this.nextElementSibling.classList.toggle('active');
        };
        sidebarContent.appendChild(eraTitle);

        // Create a container for era events, initially hidden
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'sidebar-events-container';

        era.events.forEach((event, eventIndex) => {
            const eventLink = document.createElement('a');
            eventLink.href = `#event-${eraIndex}-${eventIndex}`;
            eventLink.textContent = event.title;
            eventLink.className = `sidebar-event-link ${event.level.replace(/\s+/g, '-').toLowerCase()}`;
            eventLink.onclick = function(e) {
                e.preventDefault();
                const targetId = `event-${eraIndex}-${eventIndex}`;
                document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
            };
            eventsContainer.appendChild(eventLink);
        });

        sidebarContent.appendChild(eventsContainer);
    });
}
