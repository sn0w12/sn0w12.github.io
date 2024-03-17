function getArrows(arrLatlngs, color, density, fontSize, mapObj, rotateDeg, baseOffsetAmount) {
    if (typeof arrLatlngs === 'undefined' || arrLatlngs == null || 
        (!arrLatlngs.length) || arrLatlngs.length < 2) 
        return [];

    if (typeof density === 'undefined' || density == null || density <= 0)
        density = 0.1; // Default density: 1 arrow per 10 units of distance

    if (typeof color === 'undefined' || color == null)
        color = '';
    else
        color = 'color:' + color;

    if (typeof fontSize === 'undefined' || fontSize == null)
        fontSize = '24px'; // Default font size

    rotateDeg = typeof rotateDeg === 'undefined' ? 0 : rotateDeg;
    baseOffsetAmount = typeof baseOffsetAmount === 'undefined' ? 0 : baseOffsetAmount;

    var result = [];
    for (var i = 1; i < arrLatlngs.length; i++) {
        var segmentDistance = getDistance(arrLatlngs[i - 1], arrLatlngs[i]);
        var arrowCount = Math.max(1, Math.round(segmentDistance * density));
        
        var dynamicOffsetAmount = calculateDynamicOffset(segmentDistance, fontSize, baseOffsetAmount);

        var totalRotation = parseFloat(getAngle(arrLatlngs[i - 1], arrLatlngs[i], -1)) + rotateDeg;
        var transform = 'rotate(' + totalRotation + 'deg) translate(' + dynamicOffsetAmount + 'px)';
        var iconHtml = '<div style="' + color + '; font-size: ' + fontSize + 'px; transform: ' + transform + '; transform-origin: 50% 50%;">▶</div>';
        var icon = L.divIcon({ 
            className: 'arrow-icon', 
            html: iconHtml
        });
        for (var c = 1; c <= arrowCount; c++) {
            result.push(L.marker(myMidPoint(arrLatlngs[i], arrLatlngs[i - 1], (c / (arrowCount + 1)), mapObj), { icon: icon }));
        }
    }
    return result;
}

// Dynamic offset calculation based on segment length and font size
function calculateDynamicOffset(segmentDistance, fontSize, baseOffset) {
    var fontSizeValue = parseFloat(fontSize);
    var adjustmentFactor = fontSizeValue * 0.05;
    return baseOffset + (segmentDistance * adjustmentFactor);
}


// Function to calculate the distance between two points using the Haversine formula
function getDistance(latlng1, latlng2) {
    // Calculate distance on a flat plane using Cartesian coordinates
    const dx = latlng1[0] - latlng2[0];
    const dy = latlng1[1] - latlng2[1];
    let distance = Math.sqrt(dx * dx + dy * dy); // Euclidean distance in the same units as your map's coordinate system

    return distance; // Distance in meters
}

function getAngle(latLng1, latlng2, coef) {
    var dy = latlng2[0] - latLng1[0];
    var dx = Math.cos(Math.PI / 180 * latLng1[0]) * (latlng2[1] - latLng1[1]);
    var ang = ((Math.atan2(dy, dx) / Math.PI) * 180 * coef);
    return (ang).toFixed(2);
}

function myMidPoint(latlng1, latlng2, per, mapObj) {
    if (!mapObj)
        throw new Error('map is not defined');

    var halfDist, segDist, dist, p1, p2, ratio,
        points = [];

    p1 = mapObj.project(new L.latLng(latlng1));
    p2 = mapObj.project(new L.latLng(latlng2));

    halfDist = distanceTo(p1, p2) * per;

    if (halfDist === 0)
        return mapObj.unproject(p1);

    dist = distanceTo(p1, p2);

    if (dist > halfDist) {
        ratio = (dist - halfDist) / dist;
        var res = mapObj.unproject(new Point(p2.x - ratio * (p2.x - p1.x), p2.y - ratio * (p2.y - p1.y)));
        return [res.lat, res.lng];
    }

}

function distanceTo(p1, p2) {
    var x = p2.x - p1.x,
        y = p2.y - p1.y;

    return Math.sqrt(x * x + y * y);
}

function toPoint(x, y, round) {
    if (x instanceof Point) {
        return x;
    }
    if (isArray(x)) {
        return new Point(x[0], x[1]);
    }
    if (x === undefined || x === null) {
        return x;
    }
    if (typeof x === 'object' && 'x' in x && 'y' in x) {
        return new Point(x.x, x.y);
    }
    return new Point(x, y, round);
}

function Point(x, y, round) {
    this.x = (round ? Math.round(x) : x);
    this.y = (round ? Math.round(y) : y);
}