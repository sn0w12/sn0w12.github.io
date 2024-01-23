function generatePopupContent(title, category, description, linkEnabled, linkTitle) {
    // If linkEnabled is true and linkTitle is provided, it uses linkTitle for the hyperlink otherwise it uses the title for the hyperlink.
    // If linkEnabled is false, it just displays the title without a hyperlink.
    const titleLink = linkEnabled 
        ? `<a href="wiki#${encodeURIComponent(linkTitle || title)}" target="_blank"><b><font size="+0.5">${title}</font></b><br /></a>`
        : `<b><font size="+0.5">${title}</font></b><br />`;

    // Image styles
    const img1 = '<img style="height:17.5px;width: 100%;min-width: 175px; display: block; margin-left: auto; margin-right: auto; margin-bottom: -8px; margin-top: -4px;" src="icons/divider.png" alt="map popup divider">';
    const img2 = '<img style="height:3px;width: 75%; display: block; margin-left: auto; margin-right: auto; margin-bottom: -14px; margin-top: -2px;" src="icons/divider_small.png" alt="map popup divider">';

    return `${titleLink}${img1}<i><font size="+0.5">${category}</font></i>${img2}<br />${description}`;
}

function generateMarker(id, title, category, icon, description, linkEnabled, linkTitle, coords, customId) {
    coords = JSON.parse(coords.replace('LatLng', '').replace('(', '[').replace(')', ']'));
    
    var firstTitle = title.split(' ')[0].toLowerCase();
    var newId = `${id}_${customId || firstTitle}`;
    if (linkTitle) linkTitle = ", '" + linkTitle + "'";
    
    var region = regionMap[id] || "mo"; // Determine the region
    var markerIcon = icons[icon]; // Determine the icon based on the icon type
    var popupContent = generatePopupContent(title, category, description, linkEnabled, linkTitle || "");

    // Create and add the marker to the map
    createAndAddMarker(region, coords, markerIcon, title, newId.replace(",", ""), popupContent);

    // Return the string representation (optional, if you still need this)
    return `createAndAddMarker("${region}", ${JSON.stringify(coords)}, icons.${icon}, "${title}", "${newId.replace(",", "")}", generatePopupContent("${title}", "${category}", "${description}", ${linkEnabled}${linkTitle || ""}));`;
}

function createMap(prefix, title, noWrap, minZoom, maxZoom, pane, add) {
    // Create the tile layer
    let tileLayer = L.tileLayer(`maps/${prefix}/${title}/{z}/{x}/{y}.png`, {
        continuousWorld: false,
        noWrap: noWrap,
        minZoom: minZoom,
        maxZoom: maxZoom,
        pane: pane,
    });

    // Conditionally add the tile layer to the map
    if (add) {
        tileLayer.addTo(map);
    }

    return tileLayer;
}

function createIcon(icon, shadow, iconSize, iconAnchor, popupAnchor) {
    return L.icon({
        iconUrl: `icons/${icon}.png`,
        iconRetinaUrl: `icons/${icon}.png`,
        shadowUrl: `icons/${shadow}.png`,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor,
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
        className: icon
    });
}

function markerMaker() {
    // Load saved data
    loadFormData();

    var coords = marker.getLatLng().toString().replace('LatLng', '').replace('(', '').replace(')', '');
    document.getElementById('Coords').value = coords;

    // Add event listeners for each form element
    var formElements = document.querySelectorAll('#Id, #Title, #Category, #Description, #Link, #LinkText, #CustomId');
    formElements.forEach(function(element) {
        element.addEventListener('change', saveFormData);
    });

    document.getElementById('DevButton').addEventListener('click', function() {
        // Get form data
        var formData = getFormData();
        var output = generateMarker(formData.id, formData.title, formData.category, formData.icon, formData.description, formData.linkEnabled, formData.linkTitle, formData.coords, formData.customId);

        // Display the output
        document.getElementById('Output').value = output;

        marker.setLatLng([0, 0]);
    });

    window.onbeforeunload = function() {
        localStorage.removeItem('markerFormData');
    };
}

// Get form data
function getFormData() {
    return {
        id: document.getElementById('Id').value,
        title: document.getElementById('Title').value,
        icon: document.getElementById('Category').value,
        category: document.getElementById('Category').options[document.getElementById('Category').selectedIndex].id,
        description: document.getElementById('Description').value,
        linkEnabled: document.getElementById('Link').checked,
        linkTitle: document.getElementById('LinkText').value,
        customId: document.getElementById('CustomId').value,
        coords: marker.getLatLng().toString()
    };
}

// Save form data to localStorage
function saveFormData() {
    var formData = getFormData();
    localStorage.setItem('markerFormData', JSON.stringify(formData));
}

// Load form data from localStorage
function loadFormData() {
    var savedData = localStorage.getItem('markerFormData');
    if (savedData) {
        savedData = JSON.parse(savedData);
        document.getElementById('Id').value = savedData.id;
        document.getElementById('Title').value = savedData.title;
        document.getElementById('Category').value = savedData.icon;
        document.getElementById('Description').value = savedData.description;
        document.getElementById('Link').checked = savedData.linkEnabled;
        document.getElementById('LinkText').value = savedData.linkTitle;
        document.getElementById('CustomId').value = savedData.customId;
    }
}

// Print all console commands
function help() {
    console.log(`
All availible commands:
openAllPopupsInLayerGroup(region, group); Opens all of the popups you want
closeAllPopups(); Closes all open popups
printRegionGroups(); Prints all region Groups
removeMarker("Title"); Removes a marker with a specified title
    `);
}

function removeMarker(title) {
    var allMarkers = getAllMarkersFromGroups(); // Retrieve all markers

    allMarkers.forEach(function(marker) {
        if (marker.options.title === title) {
            // Remove the marker from the map
            marker.remove();
            return;
        }
    });
}

function printRegionGroups() {
    // Iterate over each key in the regionLayerGroups object
    for (const region in regionLayerGroups) {
        // Check if the property is actually part of the object and not inherited
        if (regionLayerGroups.hasOwnProperty(region)) {
            // Get the sub-object for this region
            const group = regionLayerGroups[region];
            // Iterate over each key in the sub-object
            for (const key in group) {
                // Check if the property is actually part of the sub-object and not inherited
                if (group.hasOwnProperty(key)) {
                    // Print the region and key in the desired format
                    console.log(`${region}, ${key}`);
                }
            }
        }
    }
}

// Run from the console, openAllPopupsInLayerGroup(ar, cityBig);
function openAllPopupsInLayerGroup(region, group) {
    if (regionLayerGroups[region] && regionLayerGroups[region][group]) {
        var layerGroup = regionLayerGroups[region][group];

        layerGroup.eachLayer(function(layer) {
            if (layer instanceof L.Marker && layer.getPopup()) {
                // Create a non-closable popup and bind it to the marker
                var nonClosablePopup = L.popup({ autoClose: false, closeOnClick: false }).setContent(layer.getPopup().getContent());
                layer.bindPopup(nonClosablePopup);

                // Open the popup
                layer.openPopup();
            }
        });
    } else {
        console.log("Invalid region or group");
    }
}

// Run from the console
function closeAllPopups() {
    // Iterate through each region in the regionLayerGroups
    for (var region in regionLayerGroups) {
        if (regionLayerGroups.hasOwnProperty(region)) {
            // Iterate through each group in the region
            for (var group in regionLayerGroups[region]) {
                if (regionLayerGroups[region].hasOwnProperty(group)) {
                    var layerGroup = regionLayerGroups[region][group];

                    // Close popup of each layer in the group
                    layerGroup.eachLayer(function(layer) {
                        if (layer instanceof L.Marker) {
                            layer.closePopup();
                        }
                    });
                }
            }
        }
    }
}

function getAllMarkersFromGroups() {
    var allMarkers = [];

    groups.forEach(function(group) {
        extractMarkersFromLayer(group, allMarkers);
    });

    return allMarkers;
}

function extractMarkersFromLayer(layer, allMarkers) {
    if (layer instanceof L.Marker) {
        allMarkers.push(layer);
    } else if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup) {
        layer.eachLayer(function(innerLayer) {
            extractMarkersFromLayer(innerLayer, allMarkers);
        });
    }
}

function exportMarkersToJson() {
    var markersData = [];
    var allMarkers = getAllMarkersFromGroups();
    console.log(allMarkers);

    allMarkers.forEach(function(marker) {
        var id = marker.options.id || "";
        if (id === "markerMaker") {
            return; // Skip this marker
        }
        var idPrefix = id.substring(0, 2).toLowerCase();
        var region = regionMap[idPrefix] || "mo";

        var coords = [marker.getLatLng().lat, marker.getLatLng().lng];
        var icon = marker.options.icon.options.className;
        var title = marker.options.title;
        var popupContent = marker._popup._content;

        if (popupContent){
            var popupData = parsePopupContent(popupContent);
        }

        markersData.push({
            region: region,
            coordinates: coords,
            icon: icon,
            title: title,
            id: id,
            popuptitle: popupData.popuptitle,
            category: popupData.category,
            description: popupData.description,
            link: popupData.link,
            customlink: popupData.customlink
        });
    });

    downloadJson(markersData);
}

function parsePopupContent(popupContent) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(popupContent, 'text/html');

    var popuptitle = doc.querySelector('b font')?.textContent || "";
    var category = doc.querySelector('i font')?.textContent || "";
    var description = getDescription(doc);

    var linkElement = doc.querySelector('a');
    var link = !!linkElement; // Boolean: true if a link exists, false otherwise

    var customlink = null;
    if (linkElement) {
        var href = linkElement.getAttribute('href');
        var linkText = href.split('#').pop(); // Extracting text after '#'
        linkText = decodeURIComponent(linkText); // Decoding to plain text

        customlink = (linkText !== popuptitle) ? linkText : null;
    }

    return {
        popuptitle: popuptitle,
        category: category,
        description: description,
        link: link,
        customlink: customlink
    };
}

function getDescription(doc) {
    var foundCategory = false;
    var foundBrTag = false;

    var description = "";
    var childNodes = doc.body.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
        var node = childNodes[i];

        // Check if we found the category and are at the <br /> tag
        if (foundCategory && node.nodeName === "BR") {
            foundBrTag = true;
            continue;
        }

        // After finding the <br /> tag, the next text node is the description
        if (foundBrTag && node.nodeType === Node.TEXT_NODE) {
            description = node.textContent.trim();
            break;
        }

        // Set foundCategory to true once we pass the category
        if (node.querySelector && node.querySelector('i font')) {
            foundCategory = true;
        }
    }

    return description;
}

// Function to trigger the download of JSON file
function downloadJson(data) {
    var jsonStr = JSON.stringify(data, null, 2);
    var blob = new Blob([jsonStr], {type: "application/json"});
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = "markers.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function createAndAddMarker(region, coords, icon, title, id, popupContent) {
    if (!icon || !icon.options) {
        console.error("Invalid icon:", icon);
        return; // Stop execution if the icon is invalid
    }

    var marker = L.marker(coords, { icon: icon, title: title, id: id }).bindPopup(popupContent);
    
    if (regionLayerGroups[region] && regionLayerGroups[region][icon.options.className]) {
        regionLayerGroups[region][icon.options.className].addLayer(marker);
    }

    return marker;
}

function updateMapStyles(map, backgroundColor, addControl) {
    map.getContainer().style.backgroundColor = backgroundColor;
    allSearch.forEach(function(control) {
        map.removeControl(control);
    });    
    map.addControl(addControl);
}

function isValidLayer(layer) {
    return layer !== undefined && layer != null;
}

function updateLayers(map, addLayers, removeLayers) {
    // Remove all specified layers first, regardless of their current state
    let allLayersToRemove = new Set([...removeLayers, ...addLayers]);

    // Remove all specified layers
    allLayersToRemove.forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });

    // Then re-add all layers in the addLayers array
    addLayers.forEach(layer => {
        map.addLayer(layer);
    });
}

function updateCheckbox(selectorIndex, checked) {
    var checkbox = document.querySelectorAll('.leaflet-control-layers-group-selector')[selectorIndex];
    checkbox.checked = checked;
}

function getTrimmedText(node) {
    return node.nextSibling.textContent.trim();
}

function hideCheckBoxes(groupNumber) {
    var elementId = 'leaflet-control-layers-group-' + groupNumber;
    document.getElementById(elementId).hidden = true;
}

function unHideCheckBoxes(groupNumber) {
    var elementId = 'leaflet-control-layers-group-' + groupNumber;
    document.getElementById(elementId).hidden = false;
}

function updateMapConfiguration(currentMap, selectedOptionId) {
    var mapStyle = mapConfigurations[currentMap];

    if (!mapStyle) {
        console.error('No configuration found for currentMap:', currentMap);
        return; // Exit if no configuration is found for the currentMap
    }

    var optionConfig = mapStyle.options[selectedOptionId];
    if (!optionConfig) {
        console.error('No configuration found for selectedOptionId:', selectedOptionId);
        return; // Exit if no configuration is found for the selectedOptionId
    }
    console.log("Updated map styles");
    updateMapStyles(map, mapStyle.color, mapConfigurations[currentMap].options[selectedOptionId].search.controlSearch1);
}

function getConvertedOptionId(selectedOptionId) {
    // Direct conversion
    if (optionIdConversions[selectedOptionId])
        return optionIdConversions[selectedOptionId];

    // Check for reverse conversion
    const reverseConversion = Object.keys(optionIdConversions).find(key => optionIdConversions[key] === selectedOptionId);
    return reverseConversion || selectedOptionId;
}

function changeAllIcons(suffix) {
    layerGroups.forEach(group => {
        const layers = group.getLayers();
        layers.forEach(layer => {
            var newIconName = layer.options.icon.options.className.replace(oldSuffix, '') + suffix;

            if (icons[newIconName]) {
                layer.options.icon = icons[newIconName];
            } else {
                console.error('Icon not found:', newIconName);
            }
        });
    });

    oldSuffix = suffix;
}

function updateCheckbox(selectorIndex, checked) {
    var checkbox = document.querySelectorAll('.leaflet-control-layers-group-selector')[selectorIndex];
    checkbox.checked = checked;
}

function updateIcons(currentMap, iconChecked) {
    var suffix = radioButtonsInfo.find(item => item.checkedIndex === iconChecked)?.suffix || '';
    changeAllIcons(suffix);

    // Common update map styles and layers
    updateLayers(map, mapConfigurations[currentMap].show, mapConfigurations[currentMap].hide);
    updateCheckbox(mapConfigurations[currentMap].checkboxIndex, mapConfigurations[currentMap].checkboxState);
    hideCheckBoxes(mapConfigurations[currentMap].hideCheckBox);
    addRadioButtons(iconChecked);

    // Remove current layer if it's not the selected map
    if (currentSelectedMap && map.hasLayer(currentSelectedMap)){
        if (currentSelectedMap != mapConfigurations[currentMap].current) {
            map.removeLayer(currentSelectedMap);
        }
    }

    updateMapConfiguration(currentMap, selectedOptionId);

    // Add year select dropdown
    addYearSelect();
    document.getElementById('YearSelector').addEventListener('change', updateSelectedOptionId);
    setYearSelectorToLastDropdown();
    updateSelectedOptionId();
}

function createSelect(year, optionId, dropdown) {
    var option = document.createElement('option');
    option.id = optionId; // Use the optionId parameter
    option.textContent = year;
    dropdown.appendChild(option);
}

function createControlButton(href, title, initialIconSrc, hoverIconSrc, onClick) {
    const button = document.createElement('a');
    button.className = 'leaflet-control-custom';
    button.href = href;
    button.title = title;
    button.role = 'button';
    button.style.cssText = 'display: flex; justify-content: center; align-items: center;';

    const img = document.createElement('img');
    img.src = initialIconSrc;
    img.style.cssText = 'max-width: auto; max-height: 16px;';

    function toggleIcon(src) {
        img.src = src;
    }

    button.addEventListener('mouseenter', () => toggleIcon(hoverIconSrc));
    button.addEventListener('mouseleave', () => toggleIcon(initialIconSrc));
    button.appendChild(img);

    button.addEventListener('click', (event) => {
        onClick(event);
        button.blur();
    });

    return button;
}

function processImportedData(jsonData) {
    // Check if jsonData is an array and not empty
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        alert("Invalid or empty data: jsonData is not a valid array");
        return; // Exit the function early
    }

    // Validate each item in the jsonData array
    for (let markerData of jsonData) {
        if (!isValidMarkerData(markerData)) {
            alert("Invalid marker data: " + JSON.stringify(markerData));
            return; // Exit if any marker data is invalid
        }
    }

    // Store all existing markers
    var oldMarkers = getAllMarkersFromGroups();

    jsonData.forEach(markerData => {
        var iconType = icons[markerData.icon]; // Check if this returns a valid Leaflet icon
        if (!iconType) {
            console.warn("Icon not found for:", markerData.icon, "Using default icon.");
            iconType = icons.defaultIcon;
        }

        var popupContent = generatePopupContent(
            markerData.popuptitle, 
            markerData.category, 
            markerData.description, 
            markerData.link, 
            markerData.customlink
        );

        createAndAddMarker(
            markerData.region, 
            markerData.coordinates, 
            iconType, 
            markerData.title, 
            markerData.id, 
            popupContent
        );
    });

    // Remove old markers after new data has been processed
    oldMarkers.forEach(marker => marker.remove());
}

function isValidMarkerData(markerData) {
    const requiredKeys = ["region", "coordinates", "icon", "title", "id", "popuptitle", "category", "description", "link", "customlink"];
    const hasAllKeys = requiredKeys.every(key => key in markerData);

    const coordinatesValid = Array.isArray(markerData.coordinates) && 
        markerData.coordinates.length === 2 &&
        markerData.coordinates.every(coord => typeof coord === 'number');

    const linkValid = typeof markerData.link === 'boolean';

    // Check for additional validation as needed

    return hasAllKeys && coordinatesValid && linkValid;
}

function getCheckedIndex(iconType) {
    for (var i = 0; i < radioButtonsInfo.length; i++) {
        if (radioButtonsInfo[i].label === iconType) {
            return radioButtonsInfo[i].checkedIndex;
        }
    }
    return null;
}

function adjustSettings(defaultSettings, adjustments) {
    return {
        size: adjustments.size ? [defaultSettings.size[0] + adjustments.size[0], defaultSettings.size[1] + adjustments.size[1]] : defaultSettings.size,
        anchor: adjustments.anchor ? [defaultSettings.anchor[0] + adjustments.anchor[0], defaultSettings.anchor[1] + adjustments.anchor[1]] : defaultSettings.anchor,
        popupAnchor: adjustments.popupAnchor ? [defaultSettings.popupAnchor[0] + adjustments.popupAnchor[0], defaultSettings.popupAnchor[1] + adjustments.popupAnchor[1]] : defaultSettings.popupAnchor
    };
}

document.addEventListener('change', function (event) {
    var radioButton = event.target;

    if (radioButton.classList.contains('leaflet-control-layers-selector')) {
        currentMap = getTrimmedText(radioButton);
        // Common update map styles and layers
        updateLayers(map, mapConfigurations[currentMap].show, mapConfigurations[currentMap].hide);
        updateCheckbox(mapConfigurations[currentMap].checkboxIndex, mapConfigurations[currentMap].checkboxState);
        hideCheckBoxes(mapConfigurations[currentMap].hideCheckBox);
        addRadioButtons(iconChecked);

        // Remove current layer if it's not the selected map
        if (currentSelectedMap && map.hasLayer(currentSelectedMap)){
            if (currentSelectedMap != mapConfigurations[currentMap].current) {
                map.removeLayer(currentSelectedMap);
            }
        }

        selectedOptionId = getConvertedOptionId(selectedOptionId) || mapConfigurations[currentMap].defaultOptionId;

        updateMapConfiguration(currentMap, selectedOptionId);

        // Add year select dropdown
        addYearSelect();
        document.getElementById('YearSelector').addEventListener('change', updateSelectedOptionId);
        setYearSelectorToLastDropdown();
        updateSelectedOptionId();
    } else if (radioButton.classList.contains('custom-radio-class')) {
        var iconType = getTrimmedText(radioButton);
        if (iconType) {
            if (iconChecked !== null) {
                console.log(getCheckedIndex(iconType));
                iconChecked = getCheckedIndex(iconType);
                updateIcons(currentMap, iconChecked);
            }
        }
    }
});

function performActions(mapLayer, addLayers, removeLayers, checkboxIndex, checkboxState, hideCheckboxCount) {
    let mapToRemove = true; // Assume the map needs to be removed

    // Loop through each configuration to find if the currentSelectedMap is still needed
    Object.keys(mapConfigurations).forEach(configKey => {
        let config = mapConfigurations[configKey];
        if (config.current === currentSelectedMap) {
            mapToRemove = false; // Found the map in the configuration, no need to remove
        }
    });

    // Remove the currentSelectedMap if it's not found in any current configuration
    if (mapToRemove && currentSelectedMap && map.hasLayer(currentSelectedMap)) {
        map.removeLayer(currentSelectedMap);
    }

    // The rest of your function to add the new mapLayer and update UI components
    mapLayer.addTo(map);
    currentSelectedMap = mapLayer;

    // Assuming these are functions you have defined elsewhere to update the UI and map state
    updateMapConfiguration(currentMap, selectedOptionId);
    updateLayers(map, addLayers, removeLayers);
    updateCheckbox(checkboxIndex, checkboxState);
    hideCheckBoxes(hideCheckboxCount);
    addRadioButtons(iconChecked);

    addYearSelect();
    document.getElementById('YearSelector').addEventListener('change', updateSelectedOptionId);
    setYearSelectorToLastDropdown();
}

function changeMapToSelected() {
    var dropdown = document.getElementById('YearSelector');
    var selectedOption = dropdown.options[dropdown.selectedIndex].id;

    console.log(mapConfigurations[currentMap].options[selectedOption].show);

    performActions(mapConfigurations[currentMap].options[selectedOption].mapLayer, mapConfigurations[currentMap].options[selectedOption].show, mapConfigurations[currentMap].options[selectedOption].hide, mapConfigurations[currentMap].options[selectedOption].checkboxIndex, mapConfigurations[currentMap].options[selectedOption].checkboxState, mapConfigurations[currentMap].options[selectedOption].hideCheckboxCount)
}

// Function to update the variable with the selected option's ID
function updateSelectedOptionId() {
    var dropdown = document.getElementById('YearSelector');
    selectedOptionId = dropdown.options[dropdown.selectedIndex].id;
    console.log("Selected Option ID:", selectedOptionId); // For demonstration
    
    changeMapToSelected();
}

function setYearSelectorToLastDropdown() {
    var dropdown = document.getElementById('YearSelector');

    // Check if the dropdown has options
    if (dropdown.options.length > 0) {
        // Find the option that matches the selectedOptionId
        var matchingOptionExists = Array.from(dropdown.options).some(option => option.id === selectedOptionId);

        if (matchingOptionExists) {
            // Set the dropdown's value to the matching option's value
            for (var i = 0; i < dropdown.options.length; i++) {
                if (dropdown.options[i].id === selectedOptionId) {
                    dropdown.selectedIndex = i;
                    console.log("Dropdown set to option with ID:", selectedOptionId);
                    break;
                }
            }
        } else {
            console.log('Matching option not found in the dropdown.');
            let mapToRemove = true; // Assume the map needs to be removed

            // Loop through each configuration to find if the currentSelectedMap is still needed
            Object.keys(mapConfigurations).forEach(configKey => {
                let config = mapConfigurations[configKey];
                if (config.current === currentSelectedMap) {
                    mapToRemove = false; // Found the map in the configuration, no need to remove
                }
            });

            // Remove the currentSelectedMap if it's not found in any current configuration
            if (mapToRemove && currentSelectedMap && map.hasLayer(currentSelectedMap)) {
                map.removeLayer(currentSelectedMap);
            }
            selectedOptionId = '';
        }
    } else {
        console.log('The dropdown has no options.');
    }
}