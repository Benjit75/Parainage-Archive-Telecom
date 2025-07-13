// graph/graphDesign.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


// Function to get a contrast text color based on the background color
export function getContrastTextColor(colorStr) {
    const c = d3.color(colorStr);
    if (!c) return "#333";
    let [r, g, b] = [c.r / 255, c.g / 255, c.b / 255];
    [r, g, b] = [r, g, b].map(c =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const contrastWhite = (1.05) / (L + 0.05);
    const contrastBlack = (L + 0.05) / 0.05;
    return contrastWhite > contrastBlack ? "#fff" : "#333";
}


// Function to create arrowhead markers for links
export function createArrowheadMarkers(defs, colors) {
    defs.selectAll("*").remove();
    colors.forEach(color => {
        defs.append("marker")
            .attr("id", `arrowhead-${color}`)
            .attr("viewBox", "-10 -5 20 10")
            .attr("refX", 0)
            .attr("refY", 0)
            .attr("orient", "auto")
            .attr("markerWidth", 12)
            .attr("markerHeight", 12)
            .attr("xoverflow", "visible")
            .append("svg:path")
            .attr("d", "M -10,-5 L 0,0 L -10,5")
            .attr("fill", color);
    });
}


// -- Buttons for Graph Controls --
// Zoom to Fit Button
export function createResetZoomButton(svg, onClick, buttonSize, buttonPadding) {
    const group = svg.append("g")
        .attr("class", "graph-btn reset-zoom-btn")
        .style("cursor", "pointer")
        .style("opacity", 0.3)
        .on("mouseover", function () { d3.select(this).style("opacity", 1); })
        .on("mouseout", function () { d3.select(this).style("opacity", 0.3); })
        .on("click", onClick);

    group.append("rect")
        .attr("width", buttonSize)
        .attr("height", buttonSize)
        .attr("rx", 8)
        .attr("fill", "#fff")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5);

    group.append("title").text("Auto Zoom to Fit");
    group.append("path")
        .attr("d", "m-125 188l-1 0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 0-250 250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z")
        .attr("transform", "scale(0.032) translate(1000, 300)")
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 30)
        .attr("fill", "none")
        .attr("stroke-linecap", "round");
    return group;
}

// Arrange by Promo Button
export function createArrangeButton(svg, onClick, buttonSize, buttonPadding) {
    const group = svg.append("g")
        .attr("class", "graph-btn arrange-promo-btn")
        .style("cursor", "pointer")
        .style("opacity", 0.3)
        .on("mouseover", function () { d3.select(this).style("opacity", 1); })
        .on("mouseout", function () { d3.select(this).style("opacity", 0.3); })
        .on("click", onClick);

    group.append("rect")
        .attr("width", buttonSize)
        .attr("height", buttonSize)
        .attr("rx", 8)
        .attr("fill", "#fff")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5);

    group.append("title").text("Arrange by Promo");
    group.append("path")
        .attr("d", "M12,14 H24 M12,18 H24 M12,22 H24")
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("stroke-linecap", "round");
    return group;
}

// Freeze Forces Button
export function createFreezeButton(svg, onClick, buttonSize, buttonPadding) {
    const group = svg.append("g")
        .attr("class", "graph-btn freeze-forces-btn")
        .style("cursor", "pointer")
        .style("opacity", 0.3)
        .on("mouseover", function () { d3.select(this).style("opacity", 1); })
        .on("mouseout", function () { d3.select(this).style("opacity", 0.3); })
        .on("click", onClick);

    group.append("rect")
        .attr("width", buttonSize)
        .attr("height", buttonSize)
        .attr("rx", 8)
        .attr("fill", "#fff")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5);

    group.append("title").text("Freeze Forces");
    group.append("path")
        .attr("d", "M21.16,16.13l-2-1.15.89-.24a1,1,0,1,0-.52-1.93l-2.82.76L14,12l2.71-1.57,2.82.76.26,0a1,1,0,0,0,.26-2L19.16,9l2-1.15a1,1,0,0,0-1-1.74L18,7.37l.3-1.11a1,1,0,1,0-1.93-.52l-.82,3L13,10.27V7.14l2.07-2.07a1,1,0,0,0,0-1.41,1,1,0,0,0-1.42,0L13,4.31V2a1,1,0,0,0-2,0V4.47l-.81-.81a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41L11,7.3v3L8.43,8.78l-.82-3a1,1,0,1,0-1.93.52L6,7.37,3.84,6.13a1,1,0,0,0-1,1.74L4.84,9,4,9.26a1,1,0,0,0,.26,2l.26,0,2.82-.76L10,12,7.29,13.57l-2.82-.76A1,1,0,1,0,4,14.74l.89.24-2,1.15a1,1,0,0,0,1,1.74L6,16.63l-.3,1.11A1,1,0,0,0,6.39,19a1.15,1.15,0,0,0,.26,0,1,1,0,0,0,1-.74l.82-3L11,13.73v3.13L8.93,18.93a1,1,0,0,0,0,1.41,1,1,0,0,0,.71.3,1,1,0,0,0,.71-.3l.65-.65V22a1,1,0,0,0,2,0V19.53l.81.81a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.41L13,16.7v-3l2.57,1.49.82,3a1,1,0,0,0,1,.74,1.15,1.15,0,0,0,.26,0,1,1,0,0,0,.71-1.23L18,16.63l2.14,1.24a1,1,0,1,0,1-1.74Z")
        .attr("transform", "translate(6, 6)")
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("stroke-linecap", "round");
    return group;
}

// Redraw Randomly Button
export function createRedrawButton(svg, onClick, buttonSize, buttonPadding) {
    const group = svg.append("g")
        .attr("class", "graph-btn redraw-random-btn")
        .style("cursor", "pointer")
        .style("opacity", 0.3)
        .on("mouseover", function () { d3.select(this).style("opacity", 1); })
        .on("mouseout", function () { d3.select(this).style("opacity", 0.3); })
        .on("click", onClick);

    group.append("rect")
        .attr("width", buttonSize)
        .attr("height", buttonSize)
        .attr("rx", 8)
        .attr("fill", "#fff")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5);

    const centerX = 18, centerY = 18, radius = 10;
    const startAngle = -90;
    const endAngle = startAngle + 324;
    const toRadians = deg => (deg * Math.PI) / 180;
    const endX = centerX + radius * Math.cos(toRadians(endAngle));
    const endY = centerY + radius * Math.sin(toRadians(endAngle));
    const tangentAngle = endAngle + 70;
    const arrowLen = 7;
    const arrowAngle = 30;
    const leftX = endX - arrowLen * Math.cos(toRadians(tangentAngle - arrowAngle));
    const leftY = endY - arrowLen * Math.sin(toRadians(tangentAngle - arrowAngle));
    const rightX = endX - arrowLen * Math.cos(toRadians(tangentAngle + arrowAngle));
    const rightY = endY - arrowLen * Math.sin(toRadians(tangentAngle + arrowAngle));

    group.append("title").text("Redraw Randomly");
    group.append("path")
        .attr("d", `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`)
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("stroke-linecap", "round");
    group.append("line")
        .attr("x1", endX)
        .attr("y1", endY)
        .attr("x2", leftX)
        .attr("y2", leftY)
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");
    group.append("line")
        .attr("x1", endX)
        .attr("y1", endY)
        .attr("x2", rightX)
        .attr("y2", rightY)
        .attr("stroke", "#2d5d87")
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");
    return group;
}