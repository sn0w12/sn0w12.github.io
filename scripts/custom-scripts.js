var allMarkers = {};

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
    
    var region = regionMap[id] || "default"; // Determine the region
    var markerIcon = icons[icon]; // Determine the icon based on the icon type
    var popupContent = generatePopupContent(title, category, description, linkEnabled, linkTitle || "");

    // Create and add the marker to the map
    createAndAddMarker(region, coords, markerIcon, title, newId.replace(",", ""), popupContent);

    // Return the string representation
    return `createAndAddMarker("${region}", ${JSON.stringify(coords)}, icons.${icon}, "${title}", "${newId.replace(",", "")}", generatePopupContent("${title}", "${category}", "${description}", ${linkEnabled}${linkTitle || ""}));`;
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

    if (!allMarkers[region]) allMarkers[region] = {};
    allMarkers[region][id] = marker;

    return marker;
}

function checkUrl() {
    const map = getFromUrl('map');
    if (map) {
        openMapFromUrl(map);
    }
      
    const markerId = getFromUrl('markerId');
    if (markerId) {
        openPopupFromUrl(markerId);
    }
}

function getFromUrl(search) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(search);
}

function switchToMarkerMap(markerId) {
    let markerPrefix = markerId.slice(0, 2);
    let markerRegion = regionMap[markerPrefix] || "default";

    let fullRegionName = regionToFull[markerRegion][0];
    let submap = regionToFull[markerRegion][1];

    if (fullRegionName != currentMap.toLowerCase()) {
        let labels = document.querySelectorAll('label span');
        let targetLabel = Array.from(labels).find(span => span.textContent.trim().toLowerCase() === fullRegionName);

        if (targetLabel) {
            // Go up to the parent label element to find the input element (radio button)
            let radioButton = targetLabel.closest('label').querySelector('input[type="radio"].leaflet-control-layers-selector');
            if (radioButton) {
                console.log(`Switching to map of region: ${fullRegionName}`);
                // Click the radio button
                radioButton.click();
            }
        }
    } else {
        console.log("Map is already correct");
    }

    if (submap) {
        const yearSelector =  document.getElementById('YearSelector');

        for (const option of yearSelector.options) {
            if (option.id === submap) {
                option.selected = true;
                yearSelector.dispatchEvent(new Event('change'));
                return true; // Exit the loop as we found our match
            }
        }
    } else {
        return true;
    }
    console.warn("Marker not found in any region:", markerId);
    return false; // Marker not found or could not switch maps
}

function openMapFromUrl(map) {
    const submap = getFromUrl('submap');

    if (map != currentMap.toLowerCase()) {
        let labels = document.querySelectorAll('label span');
        let targetLabel = Array.from(labels).find(span => span.textContent.trim().toLowerCase().replace(' ', '') === map);
    
        if (targetLabel) {
            // Go up to the parent label element to find the input element (radio button)
            let radioButton = targetLabel.closest('label').querySelector('input[type="radio"].leaflet-control-layers-selector');
            if (radioButton) {
                // Click the radio button
                radioButton.click();
            }
        }
    } else {
        console.log("Map is already correct");
    }

    if (submap) {
        const yearSelector =  document.getElementById('YearSelector');

        for (const option of yearSelector.options) {
            const normalizedOptionText = option.text.replace(/[\s.]/g, '');
    
            if (normalizedOptionText === submap) {
                option.selected = true;
                yearSelector.dispatchEvent(new Event('change'));
                break; // Exit the loop as we found our match
            }
        }
    }
}

function openPopupFromUrl(markerId) {
    const markerMap = switchToMarkerMap(markerId);
    if (!markerMap) return; // Exit if the marker does not belong to any map

    for (let region in allMarkers) {
        if (allMarkers[region][markerId]) {
            // Open the popup
            console.log(`Opening popup ${markerId}`);
            const marker = allMarkers[region][markerId];
            const latlng = marker.getLatLng();
            allMarkers[region][markerId].openPopup();
            map.setView(latlng, 4);
            setTimeout(function() {
                map.setView(latlng, 4);
            }, 150); // In case it fails to zoom for some reason, happens on city map
            break;
        }
    }
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

function createLayerGroup(regionCode, layerTypes) {
    let regionLayerGroup = L.layerGroup([]); // Initialize an empty layer group for the region

    // Iterate over each layer type for the current region
    layerTypes.forEach(layerType => {
        // Check if the layer group exists for the current region and layer type
        const layerGroup = regionLayerGroups[regionCode][layerType];
        if (layerGroup) {
        // Add the layer group to the region's layer group
        regionLayerGroup.addLayer(layerGroup);
        }
    });

    // Assign the created layer group to the allLayerGroups object
    layerGroups.push(regionLayerGroup);

    // Optionally, return the single layer group for the specified region if needed
    return regionLayerGroup;
}

function setSelectValueFromCheckedRadioButton(region) {
    // Find the text of the checked radio button's next sibling span
    var checkedRadioSpanText = document.querySelector('input[name="leaflet-base-layers"]:checked + span');
    if (!checkedRadioSpanText) return; // Exit if no checked radio button with a span

    var spanText = checkedRadioSpanText.textContent.trim();

    // Map the text to the select option values
    var select = document.getElementById('Id');
    var options = select.options;

    var found = false;

    if (region) {
        for (var i = 0; i < options.length; i++) {
            if (options[i].text === region) {
                select.value = options[i].value;
                found = true;
                break; // Stop the loop once the matching value is found and set
            }
        }
    } else {
        for (var i = 0; i < options.length; i++) {
            if (options[i].text === spanText) {
                select.value = options[i].value;
                found = true;
                break; // Stop the loop once the matching value is found and set
            }
        }
    }

    if (!found) {
        select.value = mapConfigurations[currentMap].options[selectedOptionId].defaultFormSelect;
    }
}

function parseLatLng(latlngString) {
    // Extract the numbers from the LatLng string
    const match = latlngString.match(/LatLng\(([^,]+),\s*([^)]+)\)/);
    if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null; // Return null if the format doesn't match
}

function isPointInsidePolygon(latlngString, polygon) {
    const point = parseLatLng(latlngString);
    if (!point) {
        console.log("Invalid point format.");
        return false;
    }
    
    const pt = turf.point(point);
    const isInside = turf.booleanPointInPolygon(pt, polygon);
    return isInside;
}

function reversePolygonCoordinates(polygon) {
    if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null; // Return null if the input is not a valid polygon
    }

    const reversedCoordinates = polygon.geometry.coordinates.map(ring => {
        return ring.map(coord => [coord[1], coord[0]]);
    });

    return turf.polygon(reversedCoordinates, polygon.properties);
}

function clearAllVectors() {
    // Clear all existing GeoJSON layers from the map
    map.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
}

function markerMaker(isPolygon = false) {
    marker.bindPopup(mapConfigurations[currentMap].options[selectedOptionId].form).openPopup();
    // Load saved data
    loadFormData();
    var formData = getFormData(marker);

    var coords = marker.getLatLng().toString().replace('LatLng', '').replace('(', '').replace(')', '');
    document.getElementById('Coords').value = coords;
    console.log(coords);

    if (!isPolygon)
        setSelectValueFromCheckedRadioButton()
    else {
        clearAllVectors();
        if (countryPolygons[currentMap][selectedOptionId]) {
            for (const region in countryPolygons[currentMap][selectedOptionId]) {
                const polygon = countryPolygons[currentMap][selectedOptionId][region];
                if (isPointInsidePolygon(formData.coords, polygon)) {
                    console.log(`Point is inside ${region}, ${currentMap}.`);
                    setSelectValueFromCheckedRadioButton(region);
                    displayPolygon(polygon, region);
                }                
            }
        }
    }

    // Add event listeners for each form element
    var formElements = document.querySelectorAll('#Id, #Title, #Category, #Description, #Link, #LinkText, #CustomId');
    formElements.forEach(function(element) {
        element.addEventListener('change', saveFormData);
    });

    document.getElementById('DevButton').addEventListener('click', function() {
        // Get updated form data
        formData = getFormData(marker);
        var output = generateMarker(formData.id, formData.title, formData.category, formData.icon, formData.description, formData.linkEnabled, formData.linkTitle, formData.coords, formData.customId);

        // Display the output
        document.getElementById('Output').value = output;

        marker.setLatLng([0, 0]);
    });

    window.onbeforeunload = function() {
        localStorage.removeItem('markerFormData');
    };
}

var pointsArray = [];
var firstPolygonPoint = null;
var polylineLayers = [];

function addPolylineToMap(lineString, color) {
    var polyline = L.geoJSON(lineString, {color: color}).addTo(map);
    polylineLayers.push(polyline); // Store the reference for later removal
}

function removeAllPolylines() {
    polylineLayers.forEach(function(polyline) {
        map.removeLayer(polyline);
    });
    polylineLayers = []; // Clear the array after removing all polylines
}

function polygonMaker(isDropped = false) {
    formData = getFormData(polygonMarker);

    var latLng = polygonMarker.getLatLng();
    var coords = [latLng.lat, latLng.lng];
    document.getElementById('Coords').value = latLng.toString().replace('LatLng', '').replace('(', '').replace(')', '');

    function updateMapDisplay(color) {
        clearAllVectors();
        removeAllPolylines();

        if (pointsArray.length > 1 && pointsArray.length < 4) {
            addPolylineToMap(createLineStringFromPoints(pointsArray), color);
        } else if (pointsArray.length > 3) {
            displayPolygon(convertArrayToTurfPolygon(pointsArray), "", false, color);
        }
    }

    function drawTemporaryLine() {
        if (pointsArray.length > 0) {
            var tempPointsArray = [pointsArray[pointsArray.length - 1], coords];
            addPolylineToMap(createLineStringFromPoints(tempPointsArray), 'blue');
        }
        if (pointsArray.length > 3) {
            clearAllVectors();
            var tempPointsArray = pointsArray.slice(); // Clone the pointsArray
            tempPointsArray.push(coords); // Add the new point to the temporary array
            var tempTurfPolygon = convertArrayToTurfPolygon(tempPointsArray);
            displayPolygon(tempTurfPolygon, "", false, "blue");
        }
    }

    if (isDropped) {
        updateMapDisplay('#CCCCCC');
        drawTemporaryLine();
    }

    document.getElementById('DevButton').addEventListener('click', function() {
        var lastPoint = pointsArray[pointsArray.length - 1];
    
        // Check if the new point is different from the last point
        if (!lastPoint || coords[0] !== lastPoint[0] || coords[1] !== lastPoint[1]) {
            pointsArray.push(coords);
            updateMapDisplay('#CCCCCC');
        } else {
            console.log("New point is the same as the last point. Not adding to array.");
        }
    });    

    document.getElementById('DevButton2').addEventListener('click', function() {
        if (pointsArray.length > 0) {
            // Clone the pointsArray and add the first point to the end
            let pointsWithFirstPointRepeated = [...pointsArray, pointsArray[0]];
            
            // Convert each point to a string and join them, including the repeated first point
            console.log(pointsWithFirstPointRepeated.map(point => `[${point[0]}, ${point[1]}]`).join(",\n"));
        } else {
            console.warn("The points array is empty.");
        }
        updateMapDisplay('green');
        pointsArray = [];
        firstPolygonPoint = null;
        polylineLayers = [];
    });

    document.getElementById('DevButton3').addEventListener('click', function() {
        pointsArray.pop();
        updateMapDisplay();
    });
}

function createLineStringFromPoints(pointsArray) {
    var lineCoordinates = pointsArray.map(point => [point[1], point[0]]); // Convert to [lng, lat] for GeoJSON
    return turf.lineString(lineCoordinates);
}

function convertArrayToTurfPolygon(points) {
    // Clone the points array to avoid modifying the original array
    let closedPoints = points.slice();

    // Check if the last point is the same as the first point
    if (points.length > 1 && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) {
        // Add the first point to the end to close the polygon
        closedPoints.push(points[0]);
    }

    let turfPoints = closedPoints.map(p => [p[0], p[1]]);
    return turf.polygon([turfPoints]);
}

// Get form data
function getFormData(currentMarker) {
    let formData = {};

    // Helper function to safely add data if it exists
    function addIfValid(key, value) {
        if (value !== null && value !== undefined) {
            formData[key] = value;
        }
    }

    addIfValid('id', document.getElementById('Id')?.value);
    addIfValid('title', document.getElementById('Title')?.value);
    addIfValid('icon', document.getElementById('Category')?.value);
    
    const categoryElement = document.getElementById('Category');
    if (categoryElement && categoryElement.options.length > 0) {
        const selectedIndex = categoryElement.selectedIndex;
        addIfValid('category', categoryElement.options[selectedIndex]?.id);
    }

    addIfValid('description', document.getElementById('Description')?.value);
    addIfValid('linkEnabled', document.getElementById('Link')?.checked);
    addIfValid('linkTitle', document.getElementById('LinkText')?.value);
    addIfValid('customId', document.getElementById('CustomId')?.value);

    if (typeof currentMarker !== 'undefined' && currentMarker.getLatLng) {
        addIfValid('coords', currentMarker.getLatLng().toString());
    }

    return formData;
}

// Save form data to localStorage
function saveFormData() {
    var formData = getFormData(marker);
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

function calculateCorrectionFactor(latitude) {
    // Normalize latitude to range [0, 1]
    const normalizedLatitude = (Math.abs(latitude) / maxLatitude);
    
    // Calculate correction factor using a sine function
    let correctionFactor;
    if (latitude >= 0) { // Northern Hemisphere
        correctionFactor = 1 + (northPoleCorrection - 1) * Math.sin(normalizedLatitude * Math.PI / 2);
    } else { // Southern Hemisphere
        correctionFactor = 1 + (southPoleCorrection - 1) * Math.sin(normalizedLatitude * Math.PI / 2);
    }
    
    return correctionFactor;
}

function displayPolygon(polygon, region, displayArea = false, color = null) {
    // Get the hex color for the current country from the mapping
    var countryColor = countryColors[region] || '#CCCCCC'; // Default to gray if no color defined
    if (color != null) {
        countryColor = color;
    }
    polygon = reversePolygonCoordinates(polygon);

    // Create a GeoJSON layer with the specified hex color
    const geoJsonLayer = L.geoJSON(polygon, {
        style: {
            fillColor: countryColor,
            fillOpacity: 0.4,
            color: 'black',
            weight: 1
        }
    }).addTo(map);

    if (displayArea) {
        areaInSquareKilometers = getPolygonArea(polygon);
        areaOfWorld = (areaInSquareKilometers/worldSize) * 100;
        areaOfLand = (areaInSquareKilometers/getTotalArea(false) * 100);

        const formattedArea = areaInSquareKilometers.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        geoJsonLayer.bindPopup(`Area: ${formattedArea} square kilometers
        <br />% of world: ${areaOfWorld.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}%
        <br />% of land: ${areaOfLand.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}%`);
    }
}

function getPolygonArea(polygon) {
    const areaInSquareMeters = turf.area(polygon);
    const centroid = turf.centroid(polygon);
    const latitude = centroid.geometry.coordinates[1];
    const correctionFactor = calculateCorrectionFactor(latitude);

    // Adjust area calculation for fantasy world scale, distortion, and specific map boundaries
    const correctedAreaInSquareMeters = areaInSquareMeters * polygonScale * correctionFactor;
    const areaInSquareKilometers = correctedAreaInSquareMeters / 1e6;
    return areaInSquareKilometers;
}

// Print all console commands
function help() {
    console.log(`
All availible commands:
openAllPopupsInLayerGroup("region", "group"); Opens all of the popups you want
openAllPopupsInCountry("country prefix"); Opens all markers in a country
closeAllPopups(); Closes all open popups
printRegionGroups(); Prints all region Groups
removeMarker("Title"); Removes a marker with a specified title
displayAllPolygons(); Displays all polygons on the current map
isolateCountryMarkers(["country prefix"]); Removed all markers exept the cpuntries listed
countCountryMarkers(); Count all markers on the map
getTotalArea(); Get total area of all polygons
    `);
}

function countCountryMarkers() {
    // Assuming getAllMarkersFromGroups() and formHTML are defined elsewhere
    var allMarkers = getAllMarkersFromGroups();
    var counts = {};

    // Create idToLabelMap once and reuse if formHTML doesn't change frequently
    const select = new DOMParser().parseFromString(formHTML, 'text/html').getElementById('Id');
    const idToLabelMap = Array.from(select.options).reduce((map, option) => {
        map[option.value] = option.textContent;
        return map;
    }, {});

    allMarkers.forEach(marker => {
        var id = marker.options.id;
        if (id === "markerMaker") return; // Skip markerMaker markers
        
        var idPrefix = id.substring(0, 2).toLowerCase();
        counts[idPrefix] = (counts[idPrefix] || 0) + 1;
    });

    // Convert counts to array, sort, and map to labels in one go
    var combinedCounts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
        .map(([id, count]) => `${idToLabelMap[id] || id}: ${count}`); // Map to label: count
    
    console.log(combinedCounts);
}

function displayAllPolygons() {
    if (countryPolygons[currentMap]) {
        for (const region in countryPolygons[currentMap][selectedOptionId]) {
            const polygon = countryPolygons[currentMap][selectedOptionId][region];
            displayPolygon(polygon, region, true);
        }
    }
}

function getTotalArea(log = true) {
    var totalArea = 0;
    var countryAreas = {};
    if (countryPolygons[currentMap][selectedOptionId]) {
        for (const region in countryPolygons[currentMap][selectedOptionId]) {
            const polygon = countryPolygons[currentMap][selectedOptionId][region];
            polygonArea = getPolygonArea(reversePolygonCoordinates(polygon));
            countryAreas[region] = polygonArea;
            totalArea += polygonArea;
        }
    }
    
    if (log == true) {
        const formattedArea = totalArea.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const formattedWorldSize = worldSize.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
        var combinedCountryAreas = Object.entries(countryAreas)
            .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
            .map(([region, area]) => `${region}: ${area.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + "Km^2"}`);
        
        console.log(combinedCountryAreas);
        console.log("Land size: " + formattedArea + " Square Kilometers");
        console.log("World size: " + formattedWorldSize + " Square Kilometers");
        console.log("% land: " + ((totalArea/worldSize) * 100) + "%");
    } else {
        return totalArea;
    }
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

// Run from the console, openAllPopupsInCountry(an);
function openAllPopupsInCountry(prefix) {
    var markers = getAllMarkersFromGroups();
    // Loop through all markers
    for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        var markerId = marker.options.id;

        // Check if the first two letters of the marker's ID match the specified prefix
        if (markerId && markerId.substring(0, 2) === prefix) {
            // Create a non-closable popup and bind it to the marker
            var nonClosablePopup = L.popup({ autoClose: false, closeOnClick: false }).setContent(marker.getPopup().getContent());
            marker.bindPopup(nonClosablePopup);

            // Open the popup
            marker.openPopup();
        }
    }
}

function isolateCountryMarkers(prefixArray) {
    var markers = getAllMarkersFromGroups();
    // Loop through all markers
    for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        var markerId = marker.options.id;

        // Check if the first two letters of the marker's ID match the specified prefix
        if (markerId && !prefixArray.some(prefix => markerId.substring(0, 2) === prefix)) {
            map.removeLayer(marker)
        }
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

    layerGroups.forEach(function(group) {
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

function updateLayers(map, addLayers) {
    // Initialize a Set to hold all layers that should be removed
    let allLayersToRemove = new Set();

    if (layerGroups) {
        // Add layer groups to the Set
        layerGroups.forEach(layerGroup => {
            if (map.hasLayer(layerGroup)) { // Check if the layer group currently exists on the map
                allLayersToRemove.add(layerGroup);
            }
        });
    }

    if (typeof backgrounds !== 'undefined' && Array.isArray(backgrounds)) {
        // Add backgrounds to the Set only if they exist
        backgrounds.forEach(background => {
            if (map.hasLayer(background)) { // Check if the background layer currently exists on the map
                allLayersToRemove.add(background);
            }
        });
    }

    // Remove all specified layers
    allLayersToRemove.forEach(layer => map.removeLayer(layer));

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

function hideCheckBoxes(groupNumbers) {
    groupNumbers.forEach(function(groupNumber) {
        var elementId = 'leaflet-control-layers-group-' + groupNumber;
        var element = document.getElementById(elementId);
        if (element) {
            element.hidden = true;
        }
    });
}

function updateMapConfiguration(currentMap, selectedOptionId) {
    var mapStyle = mapConfigurations[currentMap];

    if (!mapStyle) {
        console.error('No configuration found for currentMap:', currentMap);
        return; // Exit if no configuration is found for the currentMap
    }

    var optionConfig = mapStyle.options[selectedOptionId];
    if (!optionConfig) {
        console.warn('No configuration found for selectedOptionId:', selectedOptionId);
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
            const subLayers = layer.getLayers();
            subLayers.forEach(subLayer => {
                var newIconName = subLayer.options.icon.options.className.replace(oldSuffix, '') + suffix;

                if (icons[newIconName]) {
                    subLayer.options.icon = icons[newIconName];
                } else {
                    console.error('Icon not found:', newIconName);
                }
            });
        });
    });

    oldSuffix = suffix;
}

function updateIcons(currentMap, iconChecked) {
    var suffix = radioButtonsInfo.find(item => item.checkedIndex === iconChecked)?.suffix || '';
    changeAllIcons(suffix);

    // Common update map styles and layers
    updateLayers(map, mapConfigurations[currentMap].options[selectedOptionId].show);
    updateCheckbox(mapConfigurations[currentMap].options[selectedOptionId].checkboxIndex, mapConfigurations[currentMap].options[selectedOptionId].checkboxState);
    hideCheckBoxes(mapConfigurations[currentMap].options[selectedOptionId].hideCheckboxes);
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
    return new Promise((resolve, reject) => {
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
        resolve();
    });
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
        if (neededMaps.some(map => map.name === getTrimmedText(radioButton).toLowerCase())) {
            currentMap = getTrimmedText(radioButton);
            // Common update map styles and layers
            selectedOptionId =  mapConfigurations[currentMap].defaultOptionId;
            console.log(selectedOptionId);
            updateLayers(map, mapConfigurations[currentMap].options[selectedOptionId].show);
            updateCheckbox(mapConfigurations[currentMap].options[selectedOptionId].checkboxIndex, mapConfigurations[currentMap].options[selectedOptionId].checkboxState);
            hideCheckBoxes(mapConfigurations[currentMap].options[selectedOptionId].hideCheckboxes);
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
            clearAllVectors();
        }
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

function performActions(mapLayer, addLayers, checkboxIndex, checkboxState, hideCheckboxes) {
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
    updateLayers(map, addLayers);
    updateCheckbox(checkboxIndex, checkboxState);
    hideCheckBoxes(hideCheckboxes);
    addRadioButtons(iconChecked);

    addYearSelect();
    document.getElementById('YearSelector').addEventListener('change', updateSelectedOptionId);
    setYearSelectorToLastDropdown();
}

function changeMapToSelected() {
    var dropdown = document.getElementById('YearSelector');
    var selectedOption = dropdown.options[dropdown.selectedIndex].id;

    console.log(mapConfigurations[currentMap].options[selectedOption].show);

    performActions(mapConfigurations[currentMap].options[selectedOption].mapLayer, mapConfigurations[currentMap].options[selectedOption].show, mapConfigurations[currentMap].options[selectedOption].checkboxIndex, mapConfigurations[currentMap].options[selectedOption].checkboxState, mapConfigurations[currentMap].options[selectedOption].hideCheckboxes)
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