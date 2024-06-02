let allMarkers = {};
let isDragging = false;
let openPopupsSet = new Set();
let showingPolygon = false;
let devMode = false;
let markerDataPath;
let startPosition;
let currentZoom = Math.round(map._zoom);

let customVectors = [];
let lineDecorators = [];

const safeContextBtns = new Set([
  "centerBtn",
  "resetBtn",
  "zoomIn",
  "zoomOut",
  "measureDistance",
  "measureDistanceDivider",
]);

let pointsArray = [];
let polylineLayers = [];

let firstPoint = null;
let tempLine = null;
let tempLineUpdate = function (e) {
  if (firstPoint && tempLine) {
    tempLine.setLatLngs([firstPoint, e.latlng]);
  }
};

leafletPolycolor(L);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function generatePopupContent(
  title,
  category,
  description,
  linkEnabled,
  linkTitle,
  region,
  customImage = null
) {
  const fontIncrease = 1.5;

  // If linkEnabled is true and linkTitle is provided, it uses linkTitle for the hyperlink otherwise it uses the title for the hyperlink.
  // If linkEnabled is false, it just displays the title without a hyperlink.
  const titleLink = linkEnabled
    ? `<a href="wiki/${(linkTitle || title).replace(" ", "_")}" target="_blank"><b><font size="+${fontIncrease}">${title}</font></b></a>`
    : `<b><font size="+${fontIncrease}">${title}</font></b>`;

  // Image styles
  const img1 =
    '<img style="height:17.5px;width: 100%;min-width: 175px; display: block; margin-left: auto; margin-right: auto; margin-bottom: -8px; margin-top: -4px;" src="images/divider.png" alt="map popup divider">';
  const img2 =
    '<img style="height:3px;width: 75%; display: block; margin-left: auto; margin-right: auto; margin-bottom: -14px; margin-top: -2px;" src="images/divider_small.png" alt="map popup divider">';

  const customImg = customImage ? 
    `<img style="height: ${fontIncrease - 0.25}em; width: auto;" src="${customImage.url}" alt="${customImage.alt}" onerror="this.style.display='none';">` :
    (region && regionMap[region] && regionMap[region]["titleImg"] ? 
      `<img style="height: ${fontIncrease - 0.25}em; width: auto;" src="${regionMap[region]["titleImg"].url}" alt="${regionMap[region]["titleImg"].alt}" onerror="this.style.display='none';">` : 
      '');

  return `
    <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
      <div style="flex: none; display: flex; align-items: center; gap: 5px;">
        ${titleLink}
        ${customImg}
      </div>
    </div>
    ${img1}
    <i><font size="+0.5">${category}</font></i>
    ${img2}<br />
    ${description}
    `;
}

function generateMarker(
  id,
  title,
  category,
  icon,
  description,
  linkEnabled,
  linkTitle,
  coords,
  customId
) {
  coords = JSON.parse(
    coords.replace("LatLng", "").replace("(", "[").replace(")", "]")
  );

  let firstTitle = title.split(" ")[0].toLowerCase();
  let newId = `${id}_${customId || firstTitle}`;
  if (linkTitle) linkTitle = ", '" + linkTitle + "'";

  let region = regionMap[id]["region"] || "default"; // Determine the region
  let markerIcon = icons[icon]; // Determine the icon based on the icon type
  let popupContent = generatePopupContent(
    title,
    category,
    description,
    linkEnabled,
    id,
    linkTitle || ""
  );

  // Create and add the marker to the map
  createAndAddMarker(
    region,
    coords,
    markerIcon,
    title,
    newId.replace(",", ""),
    popupContent
  );

  // Return the string representation
  return `createAndAddMarker("${region}", ${JSON.stringify(
    coords
  )}, icons.${icon}, "${title}", "${newId.replace(
    ",",
    ""
  )}", generatePopupContent("${title}", "${category}", "${description}", ${linkEnabled}${linkTitle || ""
    }));`;
}

function createAndAddMarker(region, coords, icon, title, id, popupContent) {
  if (!icon || !icon.options) {
    console.error("Invalid icon:", icon);
    return; // Stop execution if the icon is invalid
  }

  let marker = L.marker(coords, { icon: icon, title: title, id: id }).bindPopup(
    popupContent
  );

  if (
    regionLayerGroups[region] &&
    regionLayerGroups[region][icon.options.className]
  ) {
    regionLayerGroups[region][icon.options.className].addLayer(marker);
  }

  if (!allMarkers[region]) allMarkers[region] = {};
  allMarkers[region][id] = marker;

  marker.on("contextmenu", function (e) {
    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();

    function customizeContextMenuForMarker() {
      let openMarkerBtn = document.getElementById("openMarker");
      let closeMarkerBtn = document.getElementById("closeMarker");
      let openMarkerDivider = document.getElementById("openMarkerDivider");

      if (openPopupsSet.has(marker)) {
        closeMarkerBtn.style.display = "block";
      } else {
        openMarkerBtn.style.display = "block";
        openMarkerBtn.onclick = function () {
          openPopupFromUrl(marker.options.id);
        };
        closeMarkerBtn.style.display = "none";
      }
      openMarkerDivider.style.display = "block";

      const href = extractHrefFromPopupContent(popupContent);
      if (href != null) {
        // Show the "Open in new tab" button and set its onclick event
        let openInNewTabBtn = document.getElementById("openWikiInNewTab");
        openInNewTabBtn.style.display = "block";
        openInNewTabBtn.onclick = function () {
          window.open(href, "_blank");
        };

        let openBtn = document.getElementById("openWiki");
        openBtn.style.display = "block";
        openBtn.onclick = function () {
          window.open(href, "_self");
        };

        document.getElementById("openWikiDivider").style.display = "block";
      }
    }

    // Display the customized context menu for the marker
    displayContextMenu(e, customizeContextMenuForMarker);
  });

  return marker;
}

function extractHrefFromPopupContent(popupContent) {
  // Use DOMParser to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(popupContent, "text/html");

  // Query the document for the first <a> element and extract its href
  const link = doc.querySelector("a");
  return link ? link.href : null;
}

function checkUrl() {
  const map = getFromUrl("map");
  if (map) {
    openMapFromUrl(map);
  }

  const markerId = getFromUrl("markerid");
  if (markerId) {
    openPopupFromUrl(markerId);
  }

  const categories = getFromUrl("categories");
  if (categories) {
    updateCategorySelection(categories.split("-"));
  }

  const country = getFromUrl("country");
  if (country) {
    showCountry(country);
  }
}

function fitPolygonOnScreen(polygon, map) {
  polygon = reversePolygonCoordinates(polygon);
  const tempGeoJsonLayer = L.geoJSON(polygon);
  const bounds = tempGeoJsonLayer.getBounds();
  map.fitBounds(bounds);
}

function showCountry(selectedCountry) {
  if (countryPolygons[currentMap]) {
    selectedCountry = capitalizeFirstLetter(selectedCountry);
    const polygon = countryPolygons[currentMap][selectedOptionId][selectedCountry];
    fitPolygonOnScreen(polygon, map);
  }
}

function getFromUrl(search) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(search);
}

function switchToMarkerMap(markerId) {
  let markerPrefix = markerId.slice(0, 2);
  let markerRegion = regionMap[markerPrefix]["region"] || "default";

  let fullRegionName = regionToFull[markerRegion][0];
  let submap = regionToFull[markerRegion][1];

  if (fullRegionName != currentMap.toLowerCase()) {
    let labels = document.querySelectorAll("label span");
    let targetLabel = Array.from(labels).find(
      (span) => span.textContent.trim().toLowerCase() === fullRegionName
    );

    if (targetLabel) {
      // Go up to the parent label element to find the input element (radio button)
      let radioButton = targetLabel
        .closest("label")
        .querySelector('input[type="radio"].leaflet-control-layers-selector');
      if (radioButton) {
        // Click the radio button
        radioButton.click();
      }
    }
  }

  if (submap) {
    const yearSelector = document.getElementById("YearSelector");

    for (const option of yearSelector.options) {
      if (option.id === submap) {
        option.selected = true;
        yearSelector.dispatchEvent(new Event("change"));
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
  const submap = getFromUrl("submap");

  openMap(map, submap);
}

function openMap(map, submap) {
  map = map.toLowerCase();
  if (map != currentMap.toLowerCase()) {
    let labels = document.querySelectorAll("label span");
    let targetLabel = Array.from(labels).find(
      (span) => span.textContent.trim().toLowerCase().replace(" ", "") === map
    );

    if (targetLabel) {
      // Go up to the parent label element to find the input element (radio button)
      let radioButton = targetLabel
        .closest("label")
        .querySelector('input[type="radio"].leaflet-control-layers-selector');
      if (radioButton) {
        // Click the radio button
        radioButton.click();
      }
    }
  }

  if (submap) {
    submap = submap.toLowerCase();
    const yearSelector = document.getElementById("YearSelector");

    for (const option of yearSelector.options) {
      const normalizedOptionText = option.text.replace(/[\s.]/g, "");

      if (normalizedOptionText.toLowerCase() === submap) {
        option.selected = true;
        yearSelector.dispatchEvent(new Event("change"));
        break; // Exit the loop as we found our match
      } else if (option.id === submap) {
        option.selected = true;
        yearSelector.dispatchEvent(new Event("change"));
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
      const marker = allMarkers[region][markerId];
      const latlng = marker.getLatLng();
      allMarkers[region][markerId].openPopup();
      map.setView(latlng, 4);
      break;
    }
  }
}

function updateCategorySelection(categories = []) {
  const categorySet = new Set(
    categories.map((category) => category.trim().toLowerCase().replace(" ", ""))
  );

  // Get all checkboxes (excluding radio buttons) within the control layers
  const selectors = document.querySelectorAll(
    '.leaflet-control-layers-selector[type="checkbox"]'
  );
  const groupSelectors = document.querySelectorAll(
    '.leaflet-control-layers-group-selector[type="checkbox"]'
  );

  // Iterate over the checkboxes to simulate a click event where needed
  selectors.forEach((selector) => {
    // Get the closest parent .leaflet-control-layers-group of the checkbox
    const group = selector.closest(".leaflet-control-layers-group");

    // Proceed only if the group is not hidden
    if (group && !group.hasAttribute("hidden")) {
      if (
        selector.nextElementSibling &&
        selector.nextElementSibling.tagName === "SPAN"
      ) {
        const categoryName = selector.nextElementSibling.textContent
          .trim()
          .toLowerCase()
          .replace(" ", "");
        const shouldBeChecked = categorySet.has(categoryName);

        // Check if we need to change the state of the checkbox
        if (selector.checked !== shouldBeChecked) {
          selector.click();
        }
      }
    }
  });

  categories = categories.filter((category) => category.trim() !== "");
  if (categories.length == 0) {
    groupSelectors.forEach((selector) => {
      if (!selector.hasAttribute("hidden")) {
        // Check if we need to change the state of the checkbox
        if (selector.checked) {
          selector.click();
        }
      }
    });
  }

  if (currentMap.slice(-5).toLowerCase() != "clean") {
    currentSelectedCategories = categories.join("-");
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
    preferCanvas: true,
  });

  // Conditionally add the tile layer to the map
  if (add) {
    tileLayer.addTo(map);
  }

  return tileLayer;
}

function createIcon(icon, shadow, iconSize, iconAnchor, popupAnchor) {
  return L.icon({
    iconUrl: `images/${icon}.png`,
    iconRetinaUrl: `images/${icon}.png`,
    shadowUrl: `images/${shadow}.png`,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor,
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    className: icon,
  });
}

function createLayerGroup(regionCode, layerTypes) {
  let regionLayerGroup = L.layerGroup([]); // Initialize an empty layer group for the region

  // Iterate over each layer type for the current region
  layerTypes.forEach((layerType) => {
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
  let checkedRadioSpanText = document.querySelector(
    'input[name="leaflet-base-layers"]:checked + span'
  );
  if (!checkedRadioSpanText) return; // Exit if no checked radio button with a span

  let spanText = checkedRadioSpanText.textContent.trim();

  // Map the text to the select option values
  let select = document.getElementById("Id");
  let options = select.options;

  let found = false;

  if (region) {
    for (let i = 0; i < options.length; i++) {
      if (options[i].text === region) {
        select.value = options[i].value;
        found = true;
        break; // Stop the loop once the matching value is found and set
      }
    }
  } else {
    for (let i = 0; i < options.length; i++) {
      if (options[i].text === spanText) {
        select.value = options[i].value;
        found = true;
        break; // Stop the loop once the matching value is found and set
      }
    }
  }

  if (!found) {
    select.value =
      mapConfigurations[currentMap].options[selectedOptionId].defaultFormSelect;
  }
}

function parseLatLng(latlngInput) {
  // Check if input is an object with lat and lng properties
  if (
    typeof latlngInput === "object" &&
    latlngInput !== null &&
    "lat" in latlngInput &&
    "lng" in latlngInput
  ) {
    const lat = parseFloat(latlngInput.lat);
    const lng = parseFloat(latlngInput.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]; // Return the coordinates as an array
    }
  }

  // If input is a string, check for various string formats
  if (typeof latlngInput === "string") {
    // Attempt to extract numbers from a LatLng string format
    const match = latlngInput.match(/LatLng\(([^,]+),\s*([^)]+)\)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }

    // Attempt to parse a string that directly represents coordinates
    const parts = latlngInput.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
  }

  // Check if input is already in the expected array format
  if (
    Array.isArray(latlngInput) &&
    latlngInput.length === 2 &&
    !isNaN(latlngInput[0]) &&
    !isNaN(latlngInput[1])
  ) {
    return latlngInput; // Already in the correct format, return it directly
  }

  // If none of the above, log a warning and return null
  console.warn("parseLatLng expects input in a recognizable format.");
  return null;
}

function isPointInsidePolygon(latlngString, polygon) {
  const point = parseLatLng(latlngString);
  if (!point) {
    console.warn("Invalid point format or not parseable.");
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

  const reversedCoordinates = polygon.geometry.coordinates.map((ring) => {
    return ring.map((coord) => [coord[1], coord[0]]);
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
  showingPolygon = false;
}

function clearAllCustomVectors() {
  // Clear all existing GeoJSON layers from the map
  customVectors.forEach(function (layer) {
    map.removeLayer(layer);
  })
  lineDecorators.forEach(function (layer) {
    map.removeLayer(layer);
  })
  lineDecorators = []
  customVectors = [];
}

function resetAndOpenPopup() {
  marker.unbindPopup(); // Unbind any existing popup
  marker.bindPopup(
    mapConfigurations[currentMap].options[selectedOptionId].form
  ); // Bind a new popup with potentially updated content
  marker.openPopup();
}

function markerMaker(isPolygon = false) {
  // Load saved data
  loadFormData();
  let formData = getFormData(marker);

  let coords = marker
    .getLatLng()
    .toString()
    .replace("LatLng", "")
    .replace("(", "")
    .replace(")", "");
  document.getElementById("Coords").value = coords;

  if (!isPolygon) setSelectValueFromCheckedRadioButton();
  else {
    clearAllVectors();
    if (countryPolygons[currentMap][selectedOptionId]) {
      for (const region in countryPolygons[currentMap][selectedOptionId]) {
        const polygon = countryPolygons[currentMap][selectedOptionId][region];
        if (isPointInsidePolygon(formData.coords, polygon)) {
          setSelectValueFromCheckedRadioButton(region);
          displayPolygon(polygon, region);
        }
      }
    }
  }

  // Add event listeners for each form element
  let formElements = document.querySelectorAll(
    "#Id, #Title, #Category, #Description, #Link, #LinkText, #CustomId"
  );
  formElements.forEach(function (element) {
    element.addEventListener("change", saveFormData);
  });

  document.getElementById("DevButton").addEventListener("click", function () {
    // Get updated form data
    formData = getFormData(marker);
    let output = generateMarker(
      formData.id,
      formData.title,
      formData.category,
      formData.icon,
      formData.description,
      formData.linkEnabled,
      formData.linkTitle,
      formData.coords,
      formData.customId
    );

    // Display the output
    document.getElementById("Output").value = output;

    marker.setLatLng([0, 0]);
  });

  window.onbeforeunload = function () {
    localStorage.removeItem("markerFormData");
  };
}

function addPolylineToMap(lineString, color) {
  let polyline = L.geoJSON(lineString, { color: color }).addTo(map);
  polylineLayers.push(polyline); // Store the reference for later removal
}

function removeAllPolylines() {
  polylineLayers.forEach(function (polyline) {
    map.removeLayer(polyline);
  });
  polylineLayers = []; // Clear the array after removing all polylines
}

function polygonMaker(isDropped = false) {
  formData = getFormData(polygonMarker);

  let latLng = polygonMarker.getLatLng();
  let coords = [latLng.lat, latLng.lng];
  document.getElementById("Coords").value = latLng
    .toString()
    .replace("LatLng", "")
    .replace("(", "")
    .replace(")", "");

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
      let tempPointsArray = [pointsArray[pointsArray.length - 1], coords];
      addPolylineToMap(createLineStringFromPoints(tempPointsArray), "blue");
    }
    if (pointsArray.length > 3) {
      clearAllVectors();
      let tempPointsArray = pointsArray.slice(); // Clone the pointsArray
      tempPointsArray.push(coords); // Add the new point to the temporary array
      let tempTurfPolygon = convertArrayToTurfPolygon(tempPointsArray);
      displayPolygon(tempTurfPolygon, "", false, "blue");
    }
  }

  if (isDropped) {
    updateMapDisplay("#CCCCCC");
    drawTemporaryLine();
  }

  document.getElementById("DevButton").addEventListener("click", function () {
    let lastPoint = pointsArray[pointsArray.length - 1];

    // Check if the new point is different from the last point
    if (
      !lastPoint ||
      coords[0] !== lastPoint[0] ||
      coords[1] !== lastPoint[1]
    ) {
      pointsArray.push(coords);
      updateMapDisplay("#CCCCCC");
    } else {
      console.log(
        "New point is the same as the last point. Not adding to array."
      );
    }
  });

  document.getElementById("DevButton2").addEventListener("click", function () {
    if (pointsArray.length > 0) {
      // Clone the pointsArray and add the first point to the end
      let pointsWithFirstPointRepeated = [...pointsArray, pointsArray[0]];

      // Convert each point to a string and join them, including the repeated first point
      console.log(
        pointsWithFirstPointRepeated
          .map((point) => `[${point[0]}, ${point[1]}]`)
          .join(",\n")
      );
    } else {
      console.warn("The points array is empty.");
    }
    updateMapDisplay("green");
    pointsArray = [];
    firstPolygonPoint = null;
    polylineLayers = [];
  });

  document.getElementById("DevButton3").addEventListener("click", function () {
    pointsArray.pop();
    updateMapDisplay();
  });
}

function createLineStringFromPoints(pointsArray) {
  let lineCoordinates = pointsArray.map((point) => [point[1], point[0]]); // Convert to [lng, lat] for GeoJSON
  return turf.lineString(lineCoordinates);
}

function convertArrayToTurfPolygon(points) {
  // Clone the points array to avoid modifying the original array
  let closedPoints = points.slice();

  // Check if the last point is the same as the first point
  if (
    points.length > 1 &&
    (points[0][0] !== points[points.length - 1][0] ||
      points[0][1] !== points[points.length - 1][1])
  ) {
    // Add the first point to the end to close the polygon
    closedPoints.push(points[0]);
  }

  let turfPoints = closedPoints.map((p) => [p[0], p[1]]);
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

  addIfValid("id", document.getElementById("Id")?.value);
  addIfValid("title", document.getElementById("Title")?.value);
  addIfValid("icon", document.getElementById("Category")?.value);

  const categoryElement = document.getElementById("Category");
  if (categoryElement && categoryElement.options.length > 0) {
    const selectedIndex = categoryElement.selectedIndex;
    addIfValid("category", categoryElement.options[selectedIndex]?.id);
  }

  addIfValid("description", document.getElementById("Description")?.value);
  addIfValid("linkEnabled", document.getElementById("Link")?.checked);
  addIfValid("linkTitle", document.getElementById("LinkText")?.value);
  addIfValid("customId", document.getElementById("CustomId")?.value);

  if (typeof currentMarker !== "undefined" && currentMarker.getLatLng) {
    addIfValid("coords", currentMarker.getLatLng().toString());
  }

  return formData;
}

// Save form data to localStorage
function saveFormData() {
  let formData = getFormData(marker);
  localStorage.setItem("markerFormData", JSON.stringify(formData));
}

// Load form data from localStorage
function loadFormData() {
  let savedData = localStorage.getItem("markerFormData");
  if (savedData) {
    savedData = JSON.parse(savedData);
    document.getElementById("Title").value = savedData.title;
    document.getElementById("Category").value = savedData.icon;
    document.getElementById("Description").value = savedData.description;
    document.getElementById("Link").checked = savedData.linkEnabled;
    document.getElementById("LinkText").value = savedData.linkTitle;
    document.getElementById("CustomId").value = savedData.customId;
  }
}

function calculateCorrectionFactor(latitude) {
  northPoleCorrection = mapConfigurations[currentMap].northPoleCorrection;
  southPoleCorrection = mapConfigurations[currentMap].southPoleCorrection;
  if (typeof northPoleCorrection != "undefined") {
    const equatorCorrection = 0.5; // Baseline correction at the equator
    const maxLatitude = 70; // The latitude at which the maximum correction is applied

    // Normalized latitude varies between 0 (equator) and 1 (maxLatitude or -maxLatitude)
    const normalizedLatitude = Math.min(Math.abs(latitude) / maxLatitude, 1);

    // Exponential growth factor - controls how quickly correction factor increases.
    const growthFactor = 0.5;

    // Calculate correction increase using an exponential function for a more pronounced effect towards the poles
    const correctionIncrease = Math.pow(normalizedLatitude, growthFactor);

    let correctionFactor;
    if (latitude >= 0) {
      // Northern Hemisphere
      correctionFactor =
        equatorCorrection +
        (northPoleCorrection - equatorCorrection) * correctionIncrease;
    } else {
      // Southern Hemisphere
      correctionFactor =
        equatorCorrection +
        (southPoleCorrection - equatorCorrection) * correctionIncrease;
    }

    return correctionFactor;
  } else {
    return 1;
  }
}

function onMouseMove(e) {
  // Calculate the distance moved
  const currentPos = { x: e.clientX, y: e.clientY };
  const dx = currentPos.x - startPosition.x;
  const dy = currentPos.y - startPosition.y;

  // Set isDragging to true if the mouse has moved more than a threshold (e.g., 10 pixels)
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    isDragging = true;
    // Once dragging is detected, no need to listen for mousemove anymore
    document.removeEventListener('mousemove', onMouseMove);
  }
}

function displayPolygon(
  polygon,
  region,
  displayArea = false,
  color = null,
  opacity = 0.4,
  outline = 1,
  url = null,
  toolTipTitle = null,
  pane = "addPane"
) {
  // Get the hex color for the current region from the mapping
  let regionColor = countryColors[region] || "#CCCCCC"; // Default to gray if no color defined
  if (color != null) {
    regionColor = color;
  }
  polygon = reversePolygonCoordinates(polygon);

  const highlightStyle = {
    fillColor: regionColor,
    fillOpacity: 0.4, // Increase opacity on hover
    color: "black",
    weight: 1,
  };

  const normalStyle = {
    fillColor: regionColor,
    fillOpacity: opacity, // Normal opacity
    color: "black",
    weight: outline,
  };

  // Create a GeoJSON layer
  const geoJsonLayer = L.geoJSON(polygon, {
    style: normalStyle,
    pane: pane,
    onEachFeature: function (feature, layer) {
      // Adjusted tooltip options
      if (toolTipTitle != null) {
        layer.bindTooltip(toolTipTitle, {
          direction: 'auto',
          permanent: true,
          sticky: true,
          offset: [5, 0],
          opacity: 0,
          className: `custom-context-menu tooltip ${toolTipTitle}`
        });
      }
    }
  }).addTo(map);
  
  if (url) {
    // Change the style on hover to indicate interactivity
    geoJsonLayer.on("mouseover", function () {
      this.setStyle(highlightStyle);
    });

    geoJsonLayer.on("mouseout", function () {
      this.setStyle(normalStyle);
    });

    geoJsonLayer.on("click", function (e) {
      if (!isDragging) {
        if (e.originalEvent.button === 0) {
          if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            window.open(url, "_blank");
          } else {
            window.location.href = url;
          }
        }
      }
    });

    geoJsonLayer.on("mousedown", function (e) {
      // Reset dragging flag and store the starting position of the mouse
      isDragging = false;
      startPosition = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };
    
      // Listen for mousemove on the document to detect dragging
      document.addEventListener('mousemove', onMouseMove);
    });

    geoJsonLayer.on("mouseup", function (e) {
      // Remove the mousemove listener in case the mouse didn't move enough to be considered dragging
      document.removeEventListener('mousemove', onMouseMove);
    
      if (!isDragging && e.originalEvent.button === 1) { // Middle mouse button
        map.dragging.disable();
    
        // Event listener to re-enable dragging once the window regains focus
        const enableDraggingOnFocus = () => {
          map.dragging.enable();
          window.removeEventListener('focus', enableDraggingOnFocus);
        };
    
        window.addEventListener('focus', enableDraggingOnFocus);
    
        window.open(url, "_blank");
      }
    
      // Reset startPosition for the next mousedown event
      startPosition = null;
    });   

    geoJsonLayer.on("contextmenu", function (e) {
      e.originalEvent.stopPropagation();

      function customizeContextMenuForGeo() {
        clearContextMenu();

        // Show the "Open in new tab" button and set its onclick event
        let openInNewTabBtn = document.getElementById("openInNewTab");
        openInNewTabBtn.style.display = "block";
        openInNewTabBtn.onclick = function () {
          window.open(url, "_blank");
        };

        let openBtn = document.getElementById("openLink");
        openBtn.style.display = "block";
        openBtn.onclick = function () {
          window.open(url, "_self");
        };

        let openInNewTabDivider = document.getElementById(
          "openInNewTabDivider"
        );
        openInNewTabDivider.style.display = "block";
      }

      displayContextMenu(e, customizeContextMenuForGeo);
    });
  } 
  
  if (toolTipTitle != null) {
    geoJsonLayer.on("mouseover", function () {
      let tooltipElement = document.querySelector(`.leaflet-tooltip.custom-context-menu.tooltip.${toolTipTitle}`);
      if (tooltipElement) {
        tooltipElement.style.opacity = '1';
      }
    });

    geoJsonLayer.on("mouseout", function () {
      let tooltipElement = document.querySelector(`.leaflet-tooltip.custom-context-menu.tooltip.${toolTipTitle}`);
      if (tooltipElement) {
        tooltipElement.style.opacity = '0';
      }
    });
  }

  // Calculate and display area if required
  if (displayArea) {
    areaInSquareKilometers = getPolygonArea(polygon);
    areaOfWorld = (areaInSquareKilometers / worldSize) * 100;
    areaOfLand = (areaInSquareKilometers / getTotalArea(false)) * 100;

    const formattedArea = areaInSquareKilometers
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    geoJsonLayer.bindPopup(`Area: ${formattedArea} square kilometers
        <br />% of world: ${areaOfWorld
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}%
        <br />% of land: ${areaOfLand
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}%`);
  }

  return geoJsonLayer;
}

function getPolygonArea(polygon) {
  const areaInSquareMeters = turf.area(polygon);
  const centroid = turf.centroid(polygon);
  const latitude = centroid.geometry.coordinates[1];
  const correctionFactor = calculateCorrectionFactor(latitude);

  // Adjust area calculation for fantasy world scale, distortion, and specific map boundaries
  const correctedAreaInSquareMeters =
    areaInSquareMeters * polygonScale * correctionFactor;
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
  let counts = {};

  // Create idToLabelMap once and reuse if formHTML doesn't change frequently
  const select = new DOMParser()
    .parseFromString(formHTML, "text/html")
    .getElementById("Id");
  const idToLabelMap = Array.from(select.options).reduce((map, option) => {
    map[option.value] = option.textContent;
    return map;
  }, {});

  Object.keys(allMarkers).forEach((groupKey) => {
    const group = allMarkers[groupKey];
    Object.keys(group).forEach((markerKey) => {
      const marker = group[markerKey];
      let id = marker.options.id;
      if (id === "markerMaker") return; // Skip markerMaker markers

      let idPrefix = id.substring(0, 2).toLowerCase();
      counts[idPrefix] = (counts[idPrefix] || 0) + 1;
    });
  });

  // Convert counts to array, sort, and map to labels in one go
  let combinedCounts = Object.entries(counts)
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
  let totalArea = 0;
  let countryAreas = {};
  if (countryPolygons[currentMap][selectedOptionId]) {
    for (const region in countryPolygons[currentMap][selectedOptionId]) {
      const polygon = countryPolygons[currentMap][selectedOptionId][region];
      polygonArea = getPolygonArea(reversePolygonCoordinates(polygon));
      countryAreas[region] = polygonArea;
      totalArea += polygonArea;
    }
  }

  if (log == true) {
    const formattedArea = totalArea
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formattedWorldSize = worldSize
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    let combinedCountryAreas = Object.entries(countryAreas)
      .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
      .map(
        ([region, area]) =>
          `${region}: ${area.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "Km^2"
          }`
      );

    console.log(combinedCountryAreas);
    console.log("Land size: " + formattedArea + " Square Kilometers");
    console.log("World size: " + formattedWorldSize + " Square Kilometers");
    console.log("% land: " + (totalArea / worldSize) * 100 + "%");
  } else {
    return totalArea;
  }
}

function removeMarker(title) {
  // Iterate over each group in allMarkers by its keys to potentially modify the object
  Object.keys(allMarkers).forEach((groupKey) => {
    const group = allMarkers[groupKey];
    // Now, iterate over each marker in the group by its keys
    Object.keys(group).forEach((markerKey) => {
      const marker = group[markerKey];
      // Check if this marker has the matching title
      if (
        marker.options &&
        marker.options.title.toLowerCase() === title.toLowerCase()
      ) {
        // Remove the marker from the map
        marker.remove();
        // Remove the marker from the allMarkers object
        delete allMarkers[groupKey][markerKey];
      }
    });

    // After removing markers from a group, check if the group is now empty and consider removing it too
    if (Object.keys(allMarkers[groupKey]).length === 0) {
      delete allMarkers[groupKey];
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
    let layerGroup = regionLayerGroups[region][group];

    layerGroup.eachLayer(function (layer) {
      if (layer instanceof L.Marker && layer.getPopup()) {
        // Create a non-closable popup and bind it to the marker
        let nonClosablePopup = L.popup({
          autoClose: false,
          closeOnClick: false,
        }).setContent(layer.getPopup().getContent());
        layer.bindPopup(nonClosablePopup);

        // Open the popup
        layer.openPopup();
      }
    });
  } else {
    console.warn("Invalid region or group");
  }
}

// Run from the console, openAllPopupsInCountry(an);
function openAllPopupsInCountry(prefix) {
  // Iterate over each group in the allMarkers object
  Object.values(allMarkers).forEach((group) => {
    // Now, iterate over each marker in the group
    Object.values(group).forEach((marker) => {
      // Ensure the marker has an 'options' object and an 'id' within it
      if (marker.options && marker.options.id) {
        let markerId = marker.options.id;

        // Check if the first two letters of the marker's ID match the specified prefix
        if (markerId.substring(0, 2) === prefix) {
          let nonClosablePopup = L.popup({
            autoClose: false,
            closeOnClick: false,
          }).setContent(marker.getPopup().getContent());
          marker.bindPopup(nonClosablePopup);

          // Open the popup
          marker.openPopup();
        }
      }
    });
  });
}

function isolateCountryMarkers(prefixArray) {
  // Iterate over each group in the allMarkers object
  Object.values(allMarkers).forEach((group) => {
    // Now, iterate over each marker in the group
    Object.values(group).forEach((marker) => {
      // Ensure the marker has an 'options' object and an 'id' within it
      if (marker.options && marker.options.id) {
        let markerId = marker.options.id;

        // Check if the first two letters of the marker's ID match the specified prefix
        if (
          markerId &&
          !prefixArray.some((prefix) => markerId.substring(0, 2) === prefix)
        ) {
          map.removeLayer(marker);
        }
      }
    });
  });
}

// Run from the console
function closeAllPopups() {
  // Iterate through each region in the regionLayerGroups
  for (let region in regionLayerGroups) {
    if (regionLayerGroups.hasOwnProperty(region)) {
      // Iterate through each group in the region
      for (let group in regionLayerGroups[region]) {
        if (regionLayerGroups[region].hasOwnProperty(group)) {
          let layerGroup = regionLayerGroups[region][group];

          // Close popup of each layer in the group
          layerGroup.eachLayer(function (layer) {
            if (layer instanceof L.Marker) {
              layer.closePopup();
            }
          });
        }
      }
    }
  }
  Object.values(polylineLayers).forEach((layer) => {
    layer.closePopup();
  });
}

function exportMarkersToJson() {
  let markersData = [];

  // Iterate over each group in the allMarkers object
  Object.values(allMarkers).forEach((group) => {
    // Now, iterate over each marker in the group
    Object.values(group).forEach((marker) => {
      let id = marker.options.id || "";
      if (id === "markerMaker") {
        return; // Skip this marker
      }
      let idPrefix = id.substring(0, 2).toLowerCase();
      let region = regionMap[idPrefix]["region"] || "mo";

      let coords = [marker.getLatLng().lat, marker.getLatLng().lng];
      let icon = marker.options.icon.options.className;
      let title = marker.options.title || "";
      let popupContent = marker.getPopup()
        ? marker.getPopup().getContent()
        : "";

      let popupData = popupContent ? parsePopupContent(popupContent) : {};

      markersData.push({
        region: region,
        coordinates: coords,
        icon: icon,
        title: title,
        id: id,
        // Using optional chaining to safely access popupData properties
        popuptitle: popupData.popuptitle,
        category: popupData.category,
        description: popupData.description,
        link: popupData.link,
        customlink: popupData.customlink,
      });
    });
  });

  downloadJson(markersData);
}

function parsePopupContent(popupContent) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(popupContent, "text/html");

  let popuptitle = doc.querySelector("b font")?.textContent || "";
  let category = doc.querySelector("i font")?.textContent || "";
  let description = getDescription(doc);

  let linkElement = doc.querySelector("a");
  let link = !!linkElement; // Boolean: true if a link exists, false otherwise

  let customlink = null;
  if (linkElement) {
    let href = linkElement.getAttribute("href");
    let linkText = href.split("#").pop(); // Extracting text after '#'
    linkText = decodeURIComponent(linkText); // Decoding to plain text

    customlink = linkText !== popuptitle ? linkText : null;
  }

  return {
    popuptitle: popuptitle,
    category: category,
    description: description,
    link: link,
    customlink: customlink,
  };
}

function getDescription(doc) {
  let foundCategory = false;
  let foundBrTag = false;

  let description = "";
  let childNodes = doc.body.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    let node = childNodes[i];

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
    if (node.querySelector && node.querySelector("i font")) {
      foundCategory = true;
    }
  }

  return description;
}

// Function to trigger the download of JSON file
function downloadJson(data) {
  let jsonStr = JSON.stringify(data, null, 2);
  let blob = new Blob([jsonStr], { type: "application/json" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "markers.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateMapStyles(map, backgroundColor, addControl) {
  map.getContainer().style.backgroundColor = backgroundColor;
  allSearch.forEach(function (control) {
    map.removeControl(control);
  });
  map.addControl(addControl);
}

function updateLayers(map, addLayers) {
  // Initialize a Set to hold all layers that should be removed
  let allLayersToRemove = new Set();

  if (layerGroups) {
    // Add layer groups to the Set
    layerGroups.forEach((layerGroup) => {
      if (map.hasLayer(layerGroup)) {
        // Check if the layer group currently exists on the map
        allLayersToRemove.add(layerGroup);
      }
    });
  }

  if (typeof backgrounds !== "undefined" && Array.isArray(backgrounds)) {
    // Add backgrounds to the Set only if they exist
    backgrounds.forEach((background) => {
      if (map.hasLayer(background)) {
        // Check if the background layer currently exists on the map
        allLayersToRemove.add(background);
      }
    });
  }

  // Remove all specified layers
  allLayersToRemove.forEach((layer) => map.removeLayer(layer));

  // Then re-add all layers in the addLayers array
  addLayers.forEach((layer) => {
    map.addLayer(layer);
  });
}

function updateCheckbox(selectorIndex, checked) {
  let checkbox = document.querySelectorAll(
    ".leaflet-control-layers-group-selector"
  )[selectorIndex];
  checkbox.checked = checked;
}

function getTrimmedText(node) {
  return node.nextSibling.textContent.trim();
}

function hideCheckBoxes(groupNumbers) {
  groupNumbers.forEach(function (groupNumber) {
    let elementId = "leaflet-control-layers-group-" + groupNumber;
    let element = document.getElementById(elementId);
    if (element) {
      element.hidden = true;
    }
  });
}

function updateMapConfiguration(currentMap, selectedOptionId) {
  let mapStyle = mapConfigurations[currentMap];

  if (!mapStyle) {
    console.error("No configuration found for currentMap:", currentMap);
    return; // Exit if no configuration is found for the currentMap
  }

  let optionConfig = mapStyle.options[selectedOptionId];
  if (!optionConfig) {
    console.warn(
      "No configuration found for selectedOptionId:",
      selectedOptionId
    );
    return; // Exit if no configuration is found for the selectedOptionId
  }
  updateMapStyles(
    map,
    mapStyle.color,
    mapConfigurations[currentMap].options[selectedOptionId].search
      .controlSearch1
  );
}

function getConvertedOptionId(selectedOptionId) {
  // Direct conversion
  if (optionIdConversions[selectedOptionId]) {
    if (
      mapConfigurations[currentMap].options[
      optionIdConversions[selectedOptionId]
      ]
    ) {
      return optionIdConversions[selectedOptionId];
    }
  }

  // Check for reverse conversion
  const reverseConversion = Object.keys(optionIdConversions).find(
    (key) => optionIdConversions[key] === selectedOptionId
  );
  if (reverseConversion) {
    if (mapConfigurations[currentMap].options[reverseConversion]) {
      return reverseConversion;
    }
  }

  return mapConfigurations[currentMap].defaultOptionId;
}

function changeAllIcons(suffix) {
  layerGroups.forEach((group) => {
    const layers = group.getLayers();
    layers.forEach((layer) => {
      const subLayers = layer.getLayers();
      subLayers.forEach((subLayer) => {
        let newIconName =
          subLayer.options.icon.options.className.replace(oldSuffix, "") +
          suffix;

        if (icons[newIconName]) {
          subLayer.options.icon = icons[newIconName];
        } else {
          console.error("Icon not found:", newIconName);
        }
      });
    });
  });

  oldSuffix = suffix;
}

function refreshAllMarkers(suffix) {
  // Use Object.keys() to iterate over properties since the array is used like an object
  Object.keys(allMarkers).forEach((groupKey) => {
    const group = allMarkers[groupKey];

    Object.keys(group).forEach((markerKey) => {
      const marker = group[markerKey];

      if (
        marker &&
        marker.options &&
        marker.options.icon &&
        marker.options.icon.options.className
      ) {
        const oldIconClassName = marker.options.icon.options.className;
        const baseIconName = oldIconClassName.replace(oldSuffix, ""); // Ensure oldSuffix is defined
        const newIconName = `${baseIconName}${suffix}`;

        // Check and set the new icon
        if (icons[newIconName]) {
          const newIcon = icons[newIconName];
          marker.setIcon(newIcon);
        } else {
          console.error("Icon not found:", newIconName);
        }
      }
    });
  });

  oldSuffix = suffix; // Update oldSuffix globally or within the scope as necessary
}

function updateIcons(currentMap, iconChecked) {
  let suffix =
    radioButtonsInfo.find((item) => item.checkedIndex === iconChecked)
      ?.suffix || "";
  refreshAllMarkers(suffix);
}

function createSelect(year, optionId, dropdown) {
  let option = document.createElement("option");
  option.id = optionId; // Use the optionId parameter
  option.textContent = year;
  dropdown.appendChild(option);
}

function createControlButton(
  href,
  title,
  initialIconSrc,
  hoverIconSrc,
  onClick
) {
  const button = document.createElement("a");
  button.className = "leaflet-control-custom";
  button.href = href;
  button.title = title;
  button.role = "button";
  button.style.cssText =
    "display: flex; justify-content: center; align-items: center;";

  const img = document.createElement("img");
  img.src = initialIconSrc;
  img.style.cssText = "max-width: auto; max-height: 16px;";

  function toggleIcon(src) {
    img.src = src;
  }

  button.addEventListener("mouseenter", () => toggleIcon(hoverIconSrc));
  button.addEventListener("mouseleave", () => toggleIcon(initialIconSrc));
  button.appendChild(img);

  button.addEventListener("click", (event) => {
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

    // Iterate over each group in allMarkers by its keys to potentially modify the object
    Object.keys(allMarkers).forEach((groupKey) => {
      const group = allMarkers[groupKey];
      // Now, iterate over each marker in the group by its keys
      Object.keys(group).forEach((markerKey) => {
        const marker = group[markerKey];
        // Remove the marker from the map
        marker.remove();
        map.removeLayer(marker);
        // Remove the marker from the allMarkers object
        delete allMarkers[groupKey][markerKey];
      });

      // After removing markers from a group, check if the group is now empty and consider removing it too
      if (Object.keys(allMarkers[groupKey]).length === 0) {
        delete allMarkers[groupKey];
      }
    });

    jsonData.forEach((markerData) => {
      let iconType = icons[markerData.icon]; // Check if this returns a valid Leaflet icon
      if (!iconType) {
        console.warn(
          "Icon not found for:",
          markerData.icon,
          "Using default icon."
        );
        iconType = icons.defaultIcon;
      }

      let popupContent = generatePopupContent(
        markerData.popuptitle,
        markerData.category,
        markerData.description,
        markerData.link,
        markerData.customlink,
        markerData.id.slice(0, 2),
        markerData.customimage ? {
          url: markerData.customimage.url,
          alt: markerData.customimage.alt
        } : null
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
    performActions(
      mapConfigurations[currentMap].options[selectedOptionId].mapLayer,
      mapConfigurations[currentMap].options[selectedOptionId].show,
      mapConfigurations[currentMap].options[selectedOptionId].checkboxIndex,
      mapConfigurations[currentMap].options[selectedOptionId].checkboxState,
      mapConfigurations[currentMap].options[selectedOptionId].hideCheckboxes
    );
    resolve();
  });
}

function isValidMarkerData(markerData) {
  const requiredKeys = [
    "region",
    "coordinates",
    "icon",
    "title",
    "id",
    "popuptitle",
    "category",
    "description",
    "link",
    "customlink",
  ];
  const hasAllKeys = requiredKeys.every((key) => key in markerData);

  const coordinatesValid =
    Array.isArray(markerData.coordinates) &&
    markerData.coordinates.length === 2 &&
    markerData.coordinates.every((coord) => typeof coord === "number");

  const linkValid = typeof markerData.link === "boolean";

  // Check for additional validation as needed

  return hasAllKeys && coordinatesValid && linkValid;
}

function getCheckedIndex(iconType) {
  for (let i = 0; i < radioButtonsInfo.length; i++) {
    if (radioButtonsInfo[i].label === iconType) {
      return radioButtonsInfo[i].checkedIndex;
    }
  }
  return null;
}

function adjustSettings(defaultSettings, adjustments) {
  return {
    size: adjustments.size
      ? [
        defaultSettings.size[0] + adjustments.size[0],
        defaultSettings.size[1] + adjustments.size[1],
      ]
      : defaultSettings.size,
    anchor: adjustments.anchor
      ? [
        defaultSettings.anchor[0] + adjustments.anchor[0],
        defaultSettings.anchor[1] + adjustments.anchor[1],
      ]
      : defaultSettings.anchor,
    popupAnchor: adjustments.popupAnchor
      ? [
        defaultSettings.popupAnchor[0] + adjustments.popupAnchor[0],
        defaultSettings.popupAnchor[1] + adjustments.popupAnchor[1],
      ]
      : defaultSettings.popupAnchor,
  };
}

document.addEventListener("change", function (event) {
  let radioButton = event.target;

  if (radioButton.classList.contains("leaflet-control-layers-selector")) {
    if (
      neededMaps.some(
        (map) => map.name === getTrimmedText(radioButton).toLowerCase()
      )
    ) {
      currentMap = getTrimmedText(radioButton);
      selectedOptionId = getConvertedOptionId(selectedOptionId);
      performActions(
        mapConfigurations[currentMap].options[selectedOptionId].mapLayer,
        mapConfigurations[currentMap].options[selectedOptionId].show,
        mapConfigurations[currentMap].options[selectedOptionId].checkboxIndex,
        mapConfigurations[currentMap].options[selectedOptionId].checkboxState,
        mapConfigurations[currentMap].options[selectedOptionId].hideCheckboxes
      );
    }
  } else if (radioButton.name == "layerSelector") {
    let iconType = getTrimmedText(radioButton);
    if (iconType) {
      if (iconChecked !== null) {
        iconChecked = getCheckedIndex(iconType);
        updateIcons(currentMap, iconChecked);
      }
    }
  } else if (radioButton.name == "displayOptions") {
    switch(radioButton.value) {
      case "displayOption1":
        clearAllCustomVectors();
        addReligionPolygons();
        break
      case "displayOption2":
        clearAllCustomVectors();
        drawFrontLines();
        break
    }
  }
});

document.addEventListener("radioDeselected", function (event) {
  clearAllCustomVectors();
});

function performActions(
  mapLayer,
  addLayers,
  checkboxIndex,
  checkboxState,
  hideCheckboxes
) {
  let mapToRemove = true; // Assume the map needs to be removed

  // Loop through each configuration to find if the currentSelectedMap is still needed
  Object.keys(mapConfigurations).forEach((configKey) => {
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

  updateMapConfiguration(currentMap, selectedOptionId);
  updateLayers(map, addLayers);
  updateCheckbox(checkboxIndex, checkboxState);
  hideCheckBoxes(hideCheckboxes);
  addRadioButtons(iconChecked);
  if (currentMap.slice(-5).toLowerCase() == "clean") {
    updateCategorySelection();
    attachEventListenersToCheckboxes();
  } else {
    updateCategorySelection(currentSelectedCategories.split("-"));
    attachEventListenersToCheckboxes();
  }

  addYearSelect();
  document
    .getElementById("YearSelector")
    .addEventListener("change", updateSelectedOptionId);
  setYearSelectorToLastDropdown();
  addCityPolygons();
  clearAllCustomVectors();
}

function changeMapToSelected() {
  let dropdown = document.getElementById("YearSelector");
  let selectedOption = dropdown.options[dropdown.selectedIndex].id;

  performActions(
    mapConfigurations[currentMap].options[selectedOption].mapLayer,
    mapConfigurations[currentMap].options[selectedOption].show,
    mapConfigurations[currentMap].options[selectedOption].checkboxIndex,
    mapConfigurations[currentMap].options[selectedOption].checkboxState,
    mapConfigurations[currentMap].options[selectedOption].hideCheckboxes
  );
}

// Function to update the variable with the selected option's ID
function updateSelectedOptionId() {
  let dropdown = document.getElementById("YearSelector");
  selectedOptionId = dropdown.options[dropdown.selectedIndex].id;

  changeMapToSelected();
}

function setYearSelectorToLastDropdown() {
  let dropdown = document.getElementById("YearSelector");

  // Check if the dropdown has options
  if (dropdown.options.length > 0) {
    // Find the option that matches the selectedOptionId
    let matchingOptionExists = Array.from(dropdown.options).some(
      (option) => option.id === selectedOptionId
    );

    if (matchingOptionExists) {
      // Set the dropdown's value to the matching option's value
      for (let i = 0; i < dropdown.options.length; i++) {
        if (dropdown.options[i].id === selectedOptionId) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    } else {
      let mapToRemove = true; // Assume the map needs to be removed

      // Loop through each configuration to find if the currentSelectedMap is still needed
      Object.keys(mapConfigurations).forEach((configKey) => {
        let config = mapConfigurations[configKey];
        if (config.current === currentSelectedMap) {
          mapToRemove = false; // Found the map in the configuration, no need to remove
        }
      });

      // Remove the currentSelectedMap if it's not found in any current configuration
      if (
        mapToRemove &&
        currentSelectedMap &&
        map.hasLayer(currentSelectedMap)
      ) {
        map.removeLayer(currentSelectedMap);
      }
      selectedOptionId = "";
    }
  } else {
    console.log("The dropdown has no options.");
  }
}

function enableDevMode() {
  for (let region in allMarkers) {
    // Iterate over each region in allMarkers
    let markers = allMarkers[region]; // Get the markers for the current region
    for (let markerId in markers) {
      // Iterate over each marker in the region
      let marker = markers[markerId]; // Get the marker object
      let title = marker.options.title || "No Title"; // Fallback to 'No Title' if undefined

      // Create a button in the popup content with an onclick event to call removeMarkerById
      let buttonHTML = `<button onclick="removeMarker('${title}')">Remove Marker</button>`;
      let newContent = `${title}<br>${markerId}<br>${buttonHTML}`; // Combine title, ID, and button with newlines

      if (marker.getPopup()) {
        marker.getPopup().setContent(newContent); // Set the popup content to the new content
      } else {
        marker.bindPopup(newContent).openPopup();
      }
    }
  }
  devMode = true;
}

function updateSelectedCategoriesString() {
  // Find all checkbox inputs within the .leaflet-control-layers-group elements that are not hidden
  const selectors = document.querySelectorAll(
    '.leaflet-control-layers-group:not([hidden]) .leaflet-control-layers-selector[type="checkbox"]'
  );

  // Filter out the checked selectors and map their sibling span's textContent to an array
  const selectedCategories = Array.from(selectors)
    .filter((selector) => selector.checked)
    .map((selector) =>
      selector.nextElementSibling.textContent
        .trim()
        .toLowerCase()
        .replace(" ", "")
    );

  // Join the selected categories with a dash
  currentSelectedCategories = selectedCategories.join("-");
}

function attachEventListenersToCheckboxes() {
  const selectors = document.querySelectorAll(
    '.leaflet-control-layers-selector[type="checkbox"]'
  );
  const groupSelectors = document.querySelectorAll(
    '.leaflet-control-layers-group-selector[type="checkbox"]'
  );

  // Iterate over all selectors to attach the change event listener
  selectors.forEach((selector) => {
    selector.addEventListener("change", updateSelectedCategoriesString);
  });

  groupSelectors.forEach((selector) => {
    selector.addEventListener("change", updateSelectedCategoriesString);
  });

  map.on("mousedown", function (e) {
    // Reset the dragging flag on mouse down
    isDragging = false;
  });

  map.on("mousemove", function (e) {
    // Set the dragging flag if the mouse moves (map is being dragged)
    isDragging = true;
  });
}

function addCityPolygons() {
  clearAllVectors();
  if (typeof cityPolygons != "undefined") {
    // Access the relevant polygons for the current map and selected option
    if (
      cityPolygons[currentMap] &&
      typeof cityPolygons[currentMap][selectedOptionId] != "undefined"
    ) {
      const options = cityPolygons[currentMap][selectedOptionId];

      // Iterate through the options object to get each city's details
      for (const country in options) {
        const countryDetails = options[country];
        for (const city in countryDetails) {
          const cityDetails = countryDetails[city];

          // Extract the polygon and URL for the current city
          const polygon = cityDetails.points;
          const url = cityDetails.url;

          displayPolygon(polygon, country, false, null, 0, 0, url, city, 'overlayPane');
        }
      }
    } else {
      console.warn("No config found for:", currentMap, selectedOptionId);
    }
  }
}

function addReligionPolygons() {
  if (typeof religionPolygons != "undefined") {
    // Access the relevant polygons for the current map and selected option
    if (
      religionPolygons[currentMap] &&
      typeof religionPolygons[currentMap][selectedOptionId] != "undefined"
    ) {
      const options = religionPolygons[currentMap][selectedOptionId];
      
      // Iterate through the options object to get each city's details
      for (const religion in options) {
        const religionDetails = options[religion];

        // Extract the polygon and URL for the current city
        const polygon = religionDetails.points;
        const region = religionDetails.region;
        const url = religionDetails.url;

        const religionPolygon = displayPolygon(polygon, region, false, null, 0.2, 1, url, religion, 'overlayPane');
        customVectors.push(religionPolygon);
      }
    } else {
      console.warn("No config found for:", currentMap, selectedOptionId);
    }
  }
}

function drawFrontLines(openPopup = null, latLng = null, drawOnlyArrows = false) {
  if (typeof fontLinePoints === "undefined" || !fontLinePoints[currentMap] || typeof fontLinePoints[currentMap][selectedOptionId] === "undefined") {
    console.warn("No config found for:", currentMap, selectedOptionId);
    return;
  }

  const options = fontLinePoints[currentMap][selectedOptionId];
  Object.entries(options).forEach(([frontline, details]) => {
    const {points, drawArrows, description, linkEnabled, linkTitle, region, rotation, category} = details;

    if (!drawOnlyArrows) {
      const popupContent = generatePopupContent(frontline, category, generateFrontLineDescription(description), linkEnabled, linkTitle, null);
      const color = countryColors[region] || region;

      let frontLineLine = L.polyline(points, {color}).addTo(map);
      let frontLineClickLine = L.polyline(points, {color, opacity: 0, weight: 15}).addTo(map);
      frontLineClickLine.bindPopup(`<div id="frontline-popup">${popupContent}</div>`);

      customVectors.push(frontLineLine, frontLineClickLine);

      if (openPopup && frontline == openPopup) {
        frontLineClickLine.openPopup(latLng);
      }
    }

    if (drawArrows) {
      if (drawOnlyArrows) {
        clearLineDecorators();
      }

      const zoomLevel = map._zoom;
      const fontSize = Math.round(Math.log(zoomLevel) / Math.log(2) * 8);
      const density = Math.pow(fontSize, 2) * 0.002;
      const color = countryColors[region] || region;

      let arrows = L.featureGroup(getArrows(points, color, density, fontSize, map, rotation, 5)).addTo(map);
      lineDecorators.push(arrows);
    }
  });

  function clearLineDecorators() {
    lineDecorators.forEach(layer => map.removeLayer(layer));
    lineDecorators = [];
  }
}

function generateFrontLineDescription(data) {
  const separator =
    '<img style="height:3px;width: 65%; display: block; margin-left: auto; margin-right: auto;" src="images/divider_small.png" alt="map popup divider">';
  const description = `
  <div>
    ${data[0]}<br>${separator}
    <b>Winner: </b>${data[4]}<br>
    <b>Total Casualties: </b>${data[1]}<br>
    <b>Attacking Casualties: </b>${data[2]}<br>
    <b>Defending Casualties: </b>${data[3]}<br>
    <b>Started: </b>${data[5]}<br>
    <b>Ended: </b>${data[6]}<br>
  </div>
  `
  return description;
}

function setUp(dataUrl) {
  markerDataPath = dataUrl;

  fetch(dataUrl)
    .then((response) => response.json())
    .then((data) => processImportedData(data))
    .then(() => {
      map.whenReady(() => {
        checkUrl();
      });
    })
    .catch((error) => console.error(`Error loading ${dataUrl}:`, error));

  fetch("contextMenu.html")
    .then((response) => response.text())
    .then((html) => {
      // Check if a div with the ID 'customContextMenu' already exists
      if (!document.getElementById("customContextMenu")) {
        // If it doesn't exist, insert the new HTML into the body
        document.body.insertAdjacentHTML("beforeend", html);
      }
    })
    .then(() => {
      if (getFromUrl("country") == null && getFromUrl("markerid") == null) {
        centerMap();
      }
    })
    .catch((error) => {
      console.error("Error loading the context menu:", error);
    });

  map.on("popupopen", function (e) {
    openPopupsSet.add(e.popup._source);
  });

  map.on("popupclose", function (e) {
    openPopupsSet.delete(e.popup._source);
  });

  currentZoom = Math.round(map._zoom);

  // Context menu logic
  document.addEventListener(
    "contextmenu",
    function (e) {
      // Check if the event target is within the Leaflet control container
      var leafletControlContainer = document.querySelector(
        ".leaflet-control-container"
      );

      if (
        leafletControlContainer &&
        !leafletControlContainer.contains(e.target)
      ) {
        // Prevent the default context menu only if the right-click is outside Leaflet controls
        e.preventDefault();

        // Display the custom context menu
        displayContextMenu(e);
      }
    },
    false
  );

  // Hide the context menu when clicking elsewhere
  document.addEventListener("click", function (e) {
    clearContextMenu();
  });

  map.on('zoomend', function() {
    let radioButtons = document.getElementsByName("displayOptions");
    if (typeof radioButtons != "undefined") {
      radioButtons.forEach(radioButton => {
        if (radioButton.checked == true && radioButton.value == "displayOption2") {
          drawFrontLines(null, null, true);
        }
      })
    }
    currentZoom = Math.round(map._zoom);
  });
}

function findAllOpenPopups(map) {
  const openPopups = [];

  // Iterate over all layers on the map
  map.eachLayer(function(layer) {
      // Check if the layer has a popup
      if (layer.getPopup && layer.getPopup()) {
          // Check if the popup is open
          if (map.hasLayer(layer.getPopup())) {
              openPopups.push(layer.getPopup());
          }
      }
  });

  return openPopups;
}

function pageCoordsToLatLng(x, y) {
  // Convert page coordinates to map container point
  let containerPoint = map.containerPointToLayerPoint([x, y]);

  // Convert container point to geographical coordinates (LatLng)
  let latLng = map.layerPointToLatLng(containerPoint);

  return `${latLng}`;
}

function displayContextMenu(e, customizeContextMenu = null) {
  clearContextMenu();

  // Use provided event's page coordinates
  let x = e.pageX || e.originalEvent.pageX;
  let y = e.pageY || e.originalEvent.pageY;

  if (openPopupsSet.size != 0) {
    document.getElementById("closeMarker").style.display = "block";
    document.getElementById("openMarkerDivider").style.display = "block";
  }

  // Customize the context menu based on the current context
  if (typeof customizeContextMenu === "function") {
    customizeContextMenu();
  }

  const zoomLevel = isZoomMax();
  document.getElementById("zoomIn").style.display =
    zoomLevel === "max" ? "none" : "block";
  document.getElementById("zoomOut").style.display =
    zoomLevel === "min" ? "none" : "block";

  const measureDistanceBtn = document.getElementById("measureDistance");
  const measureDistanceFinalBtn = document.getElementById(
    "measureDistanceFinal"
  );

  if (!firstPoint) {
    measureDistanceBtn.style.display = "block";
    measureDistanceFinalBtn.style.display = "none";
    measureDistanceBtn.onclick = function () {
      createFirstMeasurementPoint(pageCoordsToLatLng(x, y));
    };
  } else {
    measureDistanceBtn.style.display = "none";
    measureDistanceFinalBtn.style.display = "block";
    measureDistanceFinalBtn.onclick = function () {
      drawMeasurementLine(pageCoordsToLatLng(x, y));
    };
  }

  document.getElementById("removeAllDistance").style.display =
    polylineLayers.length != 0 ? "block" : "none";

  if (map._zoom == map._layersMinZoom) {
    document.getElementById("centerBtn").style.display = "none";
  } else {
    document.getElementById("centerBtn").style.display = "block";
  }

  if (devMode) {
    let polygonBtn = document.getElementById("showPolygonBtn");
    let clearPolygonBtn = document.getElementById("clearPolygonBtn");
    let polygonDivider = document.getElementById("polygonDivider");
    polygonBtn.style.display = "none";
    polygonDivider.style.display = "none";
    if (countryPolygons[currentMap][selectedOptionId]) {
      for (const region in countryPolygons[currentMap][selectedOptionId]) {
        const polygon = countryPolygons[currentMap][selectedOptionId][region];
        if (isPointInsidePolygon(pageCoordsToLatLng(x, y), polygon)) {
          polygonBtn.style.display = "block";
          polygonDivider.style.display = "block";
          polygonBtn.addEventListener("click", function () {
            clearAllVectors();
            displayPolygon(polygon, region);
            showingPolygon = true;
          });
          break;
        }
      }
    }
    if (showingPolygon) {
      clearPolygonBtn.style.display = "block";
    } else {
      clearPolygonBtn.style.display = "none";
    }
  }

  adjustLastButtonMargin();

  let contextMenu = document.getElementById("customContextMenu");
  contextMenu.style.display = "block";
  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
}

function clearContextMenu() {
  const contextMenu = document.getElementById("customContextMenu");
  contextMenu.style.display = "none";

  // Select and iterate over each child element of the context menu
  Array.from(contextMenu.children).forEach((child) => {
    if (safeContextBtns.has(child.id) === false) {
      child.style.display = "none";
    }
  });
}

function centerMap() {
  map.setView([0, 0], 0);
  document.getElementById("customContextMenu").style.display = "none"; // Hide the menu
}

function resetMap() {
  defaultMap =
    neededMaps[0].name.charAt(0).toUpperCase() + neededMaps[0].name.slice(1);
  defaultSubMap = mapConfigurations[defaultMap].defaultOptionId;

  openMap(defaultMap, defaultSubMap);

  performActions(
    mapConfigurations[defaultMap].options[defaultSubMap].mapLayer,
    mapConfigurations[defaultMap].options[defaultSubMap].show,
    mapConfigurations[defaultMap].options[defaultSubMap].checkboxIndex,
    mapConfigurations[defaultMap].options[defaultSubMap].checkboxState,
    mapConfigurations[defaultMap].options[defaultSubMap].hideCheckboxes
  );
}

function isZoomMax() {
  let currentZoom = map._zoom;
  let maxZoom = map._layersMaxZoom;
  let minZoom = map._layersMinZoom;
  if (currentZoom == maxZoom) {
    return "max";
  } else if (currentZoom == minZoom) {
    return "min";
  }
  return false;
}

function zoomToContextMenu(zoomAmount) {
  let currentZoom = map._zoom;
  let zoomMultiplier = 1.5;
  contextMenu = document.getElementById("customContextMenu");

  // Use getBoundingClientRect to get the position of the context menu
  var rect = contextMenu.getBoundingClientRect();

  // The x and y coordinates (relative to the viewport)
  var x = rect.left;
  var y = rect.top;

  let latLng = map.containerPointToLatLng(L.point(x, y));

  map.setView(
    latLng,
    (currentZoom += map.options.zoomDelta * zoomAmount * zoomMultiplier)
  );
}

function adjustLastButtonMargin() {
  const buttons = document.querySelectorAll(".custom-context-menu button");
  let lastVisibleButton = null;

  // Find the last visible button
  buttons.forEach((button) => {
    button.style.marginBottom = "5px";
    if (button.style.display !== "none") {
      lastVisibleButton = button;
    }
  });

  // Remove the bottom margin from the last visible button
  if (lastVisibleButton) {
    lastVisibleButton.style.marginBottom = "0px";
  }
}

function createFirstMeasurementPoint(latlng) {
  firstPoint = L.latLng(parseLatLng(latlng));
  // Initialize the temporary line (to cursor)
  tempLine = L.polyline([firstPoint, firstPoint], { color: "red" }).addTo(map);
  map.on("mousemove", tempLineUpdate);
}

function drawMeasurementLine(latlng) {
  point = parseLatLng(latlng);
  point = L.latLng(point); // Ensure point is a LatLng object
  map.off("mousemove", tempLineUpdate);
  if (tempLine) {
    map.removeLayer(tempLine);
    tempLine = null;
  }

  // Calculate distance on a flat plane using Cartesian coordinates
  const dx = point.lat - firstPoint.lat;
  const dy = point.lng - firstPoint.lng;
  let distance = Math.sqrt(dx * dx + dy * dy); // Euclidean distance in the same units as your map's coordinate system

  let color1;
  let color2;
  if (typeof countryPolygons != "undefined") {
    try {
      color1 = colorToRGB(getPointCountryColor(firstPoint));
      color2 = colorToRGB(getPointCountryColor(point));
    } catch {
      color1 = colorToRGB("#ffffff");
      color2 = colorToRGB("#ffffff");
    }
  } else {
    color1 = colorToRGB(countryColors[currentMap]);
    color2 = colorToRGB(countryColors[currentMap]);
  }

  // Draw an invisible overarching line for the popup
  let overarchingLine = L.polycolor([firstPoint, point], {
    colors: [arrayToRgbString(color1), arrayToRgbString(color2)],
    useGradient: true,
  }).addTo(map);

  if (!useFlatDistance) {
    // Calculate the uncorrected distance using globe-based logic
    distance = firstPoint.distanceTo(point);

    // Calculate correction factors for both points and average them
    var correctionFactorStart = calculateCorrectionFactor(firstPoint.lat);
    var correctionFactorEnd = calculateCorrectionFactor(point.lat);
    var averageCorrectionFactor =
      (correctionFactorStart + correctionFactorEnd) / 2;

    // Apply the correction factor
    distance *= averageCorrectionFactor;
  }

  // Convert distance to kilometers and display it
  var distanceInKm = (distance / mapConfigurations[currentMap].meterConversion).toFixed(2);
  var popupContent = `
  <div class="leaflet-popup-content">
    <div>Distance: ${distanceInKm} km</div>
    <button id="removeMeasurementLineBtn" class="custom-button">Remove</button>
  </div>
  `;

  // Bind a popup to the measurement line with the distance text
  overarchingLine.bindPopup(popupContent);

  function removePolyLine() {
    // Check if overarchingLine is present before removal to avoid errors
    if (polylineLayers.includes(overarchingLine)) {
      map.removeLayer(overarchingLine); // Remove the overarching line from the map
      polylineLayers.splice(polylineLayers.indexOf(overarchingLine), 1);
    }
  }

  // Listen for the popup's open event to attach the event listener to the "Remove" button
  overarchingLine.on("popupopen", function () {
    var removeBtn = document.getElementById("removeMeasurementLineBtn");
    if (removeBtn) {
      removeBtn.onclick = function () {
        removePolyLine();
      };
    }
  });

  overarchingLine.on("contextmenu", function (e) {
    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();

    function customizeContextMenuForLine() {
      let removeDistanceBtn = document.getElementById("removeDistance");
      let removeDistanceOpenBtn = document.getElementById("measureDistanceOpen");

      removeDistanceBtn.style.display = "block";
      removeDistanceBtn.onclick = function () {
        removePolyLine();
      };

      removeDistanceOpenBtn.style.display = "block";
      removeDistanceOpenBtn.onclick = function () {
        overarchingLine.openPopup();
      };
    }

    // Display the customized context menu for the marker
    displayContextMenu(e, customizeContextMenuForLine);
  });

  overarchingLine.openPopup();
  polylineLayers.push(overarchingLine);

  // Reset for a new measurement or adjust logic to allow for continuous measurements
  firstPoint = null;
}

function getPointCountryColor(coords) {
  try {
    if (countryPolygons[currentMap][selectedOptionId]) {
      for (const region in countryPolygons[currentMap][selectedOptionId]) {
        const polygon = countryPolygons[currentMap][selectedOptionId][region];
        if (isPointInsidePolygon(coords, polygon)) {
          return countryColors[region];
        }
      }
    }
    return "#ffffff";
  } catch {
    return "#ffffff";
  }
}

function interpolateColor(color1, color2, factor) {
  if (arguments.length < 3) {
    factor = 0.5;
  }
  var result = color1.slice();
  for (var i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
}

function colorToRGB(color) {
  if (color.startsWith("#")) {
    let r = parseInt(color.slice(1, 3), 16),
      g = parseInt(color.slice(3, 5), 16),
      b = parseInt(color.slice(5, 7), 16);
    return [r, g, b];
  }
}

function rgbToHex(rgb) {
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function arrayToRgbString(rgbArray) {
  return `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`;
}

function deltaE(rgbA, rgbB) {
  let labA = rgb2lab(rgbA);
  let labB = rgb2lab(rgbB);
  let deltaL = labA[0] - labB[0];
  let deltaA = labA[1] - labB[1];
  let deltaB = labA[2] - labB[2];
  let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  let deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  let sc = 1.0 + 0.045 * c1;
  let sh = 1.0 + 0.015 * c1;
  let deltaLKlsl = deltaL / 1.0;
  let deltaCkcsc = deltaC / sc;
  let deltaHkhsh = deltaH / sh;
  let i =
    deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function rgb2lab(rgb) {
  let r = rgb[0] / 255,
    g = rgb[1] / 255,
    b = rgb[2] / 255,
    x,
    y,
    z;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function addRadioButtons(checked) {
  // Simplified createRadioButton function
  function createRadioButton(label, value, isChecked, name, clickDeselect = false) {
    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.value = value;
    radio.checked = isChecked; // Direct assignment
    radio.classList.add("custom-radio-class");

    if (clickDeselect) {
      // Custom attribute to track last clicked radio button
      radio.setAttribute('data-last-clicked', 'false');
  
      radio.addEventListener('click', function(e) {
        // If this was the last clicked radio button and it is checked, uncheck it
        if (this.getAttribute('data-last-clicked') === 'true' && this.checked) {
          this.checked = false;
          this.setAttribute('data-last-clicked', 'false');
          const deselectionEvent = new CustomEvent('radioDeselected', { detail: { name: this.name, value: this.value } });
          document.dispatchEvent(deselectionEvent);
        } else {
          // Mark all radios in the group as not last clicked
          var radios = document.querySelectorAll(`input[type="radio"][name="${this.name}"]`);
          radios.forEach(radio => radio.setAttribute('data-last-clicked', 'false'));
          // Mark this radio as the last clicked
          this.setAttribute('data-last-clicked', 'true');
        }
      });
    }

    var labelElement = document.createElement("label");
    labelElement.appendChild(radio);
    labelElement.appendChild(document.createTextNode(label));

    return labelElement;
  }

  // Get the overlay control container
  var overlayContainer = document.querySelector(
    ".leaflet-control-layers-overlays"
  );

  // Check and remove existing radio buttons and separators
  var existingRadios = overlayContainer.querySelectorAll(
    ".custom-radio-class"
  );
  var existingSeparators = overlayContainer.querySelectorAll(
    ".leaflet-control-layers-separator"
  );

  existingRadios.forEach(function (radio) {
    radio.parentNode.remove(); // This assumes the radio button is wrapped in a label
  });
  existingSeparators.forEach(function (separator) {
    separator.remove();
  });

  // Create and append the separator div
  var separatorDiv = document.createElement("div");
  separatorDiv.classList.add("leaflet-control-layers-separator");
  overlayContainer.appendChild(separatorDiv);

  // Loop to create and append radio buttons
  radioButtonsInfo.forEach((info) => {
    var radioButton = createRadioButton(
      info.label,
      info.option,
      checked === info.checkedIndex,
      "layerSelector"
    );
    radioButton.classList.add("leaflet-control-layers-selector");
    overlayContainer.appendChild(radioButton);
  });

  // Create and append the separator div
  var separatorDiv = document.createElement("div");
  separatorDiv.classList.add("leaflet-control-layers-separator");
  overlayContainer.appendChild(separatorDiv);

  // Loop to create and append radio buttons
  displaySettings.forEach((info) => {
    var radioButton = createRadioButton(
      info.label,
      info.option,
      checked === info.checkedIndex,
      "displayOptions",
      info.clickDeselect,
    );
    radioButton.classList.add("leaflet-control-display-options");
    overlayContainer.appendChild(radioButton);
  });
}
