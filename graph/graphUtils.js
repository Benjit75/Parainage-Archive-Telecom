// graph/graphUtils.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { getContrastTextColor, createArrowheadMarkers } from './graphDesign.js';

// -- Constants for the simulation and rendering --
export const forceStrength = 100; // Strength of the forces in the simulation
export const zoomPadding = 100; // Padding for zooming to fit

// Helper: Extract CSS rules relevant to an SVG node
function extractSvgCss(svgNode) {
    let css = '';
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (svgNode.querySelector(rule.selectorText)) {
                    css += rule.cssText + '\n';
                }
            }
        } catch (e) {
            // Ignore CORS-restricted stylesheets
        }
    }
    return css;
}

// Export cleaned SVG
export async function exportCleanedSvg(svgNode, filename = 'export.svg') {
    const serializer = new XMLSerializer();

    // Get all geometry elements
    const elements = Array.from(svgNode.querySelectorAll('circle, path, rect, text, ellipse, polygon, polyline, line'));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        try {
            const bbox = el.getBBox();
            if (bbox.width > 0 || bbox.height > 0) {
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        } catch (e) {}
    });

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        minX = 0; minY = 0;
        maxX = svgNode.width.baseVal.value || 800;
        maxY = svgNode.height.baseVal.value || 600;
    }

    // Padding
    const percentPadding = 0.1;
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const padX = boxWidth * percentPadding;
    const padY = boxHeight * percentPadding;
    minX -= padX;
    minY -= padY;
    maxX += padX;
    maxY += padY;

    // Extract CSS
    const css = extractSvgCss(svgNode);
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = css;

    // Clone and clean up
    const clone = svgNode.cloneNode(true);
    clone.insertBefore(style, clone.firstChild);
    clone.querySelectorAll('.graph-btn').forEach(btn => btn.remove());

    const graphGroup = clone.querySelector('g');
    if (graphGroup) {
        graphGroup.setAttribute('transform', `translate(${-minX},${-minY})`);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    // Background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', 0);
    bgRect.setAttribute('y', 0);
    bgRect.setAttribute('width', width);
    bgRect.setAttribute('height', height);
    bgRect.setAttribute('fill', '#f0f0f0');
    clone.insertBefore(bgRect, clone.firstChild.nextSibling);

    // Remove interactive/hover elements before export
    clone.querySelectorAll('.link-hover, .hover-link-label').forEach(el => el.remove());
    // Remove the hover label group (if it has a unique class or structure)
    const hoverLabelGroup = clone.querySelector('g[style*="pointer-events: none"]');
    if (hoverLabelGroup) hoverLabelGroup.remove();

    // Serialize and save
    let source = serializer.serializeToString(clone);
    if (!source.match(/^<\?xml/)) {
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    }

    // Use File System Access API if available
    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: 'parainage-telecom.svg',
                types: [{
                    description: 'SVG Files',
                    accept: { 'image/svg+xml': ['.svg'] }
                }]
            };
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(source);
            await writable.close();
        } catch (err) {
            // User cancelled or error
            alert('Save cancelled or failed.');
        }
    } else {
        // Fallback: download as before
        console.log('File System Access API not supported, using fallback download method.');
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'parainage-telecom.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Function to zoom the SVG to fit all nodes with padding
export function zoomToFit(svg, graphGroup, nodes, zoomBehavior) {
    const minX = Math.min(...nodes.map(d => d.x - d.r));
    const maxX = Math.max(...nodes.map(d => d.x + d.r));
    const minY = Math.min(...nodes.map(d => d.y - d.r));
    const maxY = Math.max(...nodes.map(d => d.y + d.r));
    const boxWidth = maxX - minX + 2 * zoomPadding;
    const boxHeight = maxY - minY + 2 * zoomPadding;
    const rect = svg.node().getBoundingClientRect();
    const svgWidth = rect.width;
    const svgHeight = rect.height;
    const scale = Math.min(svgWidth / boxWidth, svgHeight / boxHeight, 1);
    const translateX = svgWidth / 2 - scale * (minX + maxX) / 2;
    const translateY = svgHeight / 2 - scale * (minY + maxY) / 2;

    const currentTransform = d3.zoomTransform(svg.node());
    const epsilon = 1e-2;
    const alreadyZoomed =
        Math.abs(currentTransform.k - scale) < epsilon &&
        Math.abs(currentTransform.x - translateX) < epsilon &&
        Math.abs(currentTransform.y - translateY) < epsilon;

    if (alreadyZoomed) {
        return { transition: null, alreadyZoomed: true };
    }

    const t = svg.transition()
        .duration(500)
        .call(
            zoomBehavior.transform,
            d3.zoomIdentity
                .translate(translateX, translateY)
                .scale(scale)
        );
    return { transition: t, alreadyZoomed: false };
}


// Function to restart the simulation with new parameters
export function restartSimulation(alpha = 0.3, alphaTarget = 0., simulation, forceStrength) {
    simulation.force("link").strength(0.01 * 0.01 * forceStrength);
    simulation.force("charge").strength(-forceStrength);
    simulation.force("center").strength(0.1 * 0.03 * forceStrength);
    simulation.force("collision").strength(0.1 * 0.03 * forceStrength);
    simulation.alpha(alpha).alphaTarget(alphaTarget).restart();
}


// Function to render the graph with nodes and links
export function renderGraph({
                                svg,
                                graphGroup,
                                nodes,
                                links,
                                width,
                                height,
                                zoomToFitFn,
                                arrangeByPromo,
                                zoomBehavior
                            }) {
    graphGroup.selectAll("*").remove();

    // -- Simulation and rendering initial setup --
    let zoomAfter = true;
    let lastAlpha = 0.3;
    let isFrozen = false;

    // Arrowhead markers (delegated to design module)
    let defs = graphGroup.select("defs");
    if (defs.empty()) defs = graphGroup.append("defs");
    const uniqueColors = Array.from(new Set(links.map(l => l.color)));
    createArrowheadMarkers(defs, uniqueColors);

    // Links
    const linkGroup = graphGroup.append("g")
        .attr("stroke-width", 2)
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("marker-end", d => `url(#arrowhead-${d.color})`)
        .attr("stroke", d => d.color);

    // Add hover labels for links
    const hoverLabelGroup = graphGroup.append("g")
        .style("pointer-events", "none")
        .style("display", "none");
    const hoverLabelBg = hoverLabelGroup.append("rect")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "#eee")
        .attr("opacity", 0.5);
    const hoverLabelText = hoverLabelGroup.append("text")
        .attr("class", "hover-link-label")
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#333");

    // Add invisible, thick hover paths behind links
    const linkHoverGroup = graphGroup.append("g")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("class", "link-hover")
        .attr("stroke", "transparent")
        .attr("stroke-width", 20)
        .attr("fill", "none")
        .style("cursor", "pointer");

    // Functions to show hover label for links, if link or invisible hover path is hovered
    function showHoverLabel(event, d) {
        const transform = d3.zoomTransform(svg.node());
        const [x, y] = transform.invert(d3.pointer(event, svg.node()));
        const label = d.label.split("--").join(" - ");
        const textColor = getContrastTextColor(d.color);
        hoverLabelText.text(label)
            .attr("x", x)
            .attr("y", y - 10)
            .style("fill", textColor);
        setTimeout(() => {
            const bbox = hoverLabelText.node().getBBox();
            hoverLabelBg
                .attr("x", bbox.x - 8)
                .attr("y", bbox.y - 4)
                .attr("width", bbox.width + 16)
                .attr("height", bbox.height + 8)
                .attr("fill", d.color)
                .attr("opacity", 0.5);
        }, 0);
        hoverLabelGroup.style("display", "block");
    }
    function moveHoverLabel(event) {
        const transform = d3.zoomTransform(svg.node());
        const [x, y] = transform.invert(d3.pointer(event, svg.node()));
        hoverLabelText.attr("x", x).attr("y", y - 10);
        setTimeout(() => {
            const bbox = hoverLabelText.node().getBBox();
            hoverLabelBg
                .attr("x", bbox.x - 8)
                .attr("y", bbox.y - 4)
                .attr("width", bbox.width + 16)
                .attr("height", bbox.height + 8);
        }, 0);
    }
    function hideHoverLabel() {
        hoverLabelGroup.style("display", "none");
    }

    linkHoverGroup
        .on("mouseover", showHoverLabel)
        .on("mousemove", moveHoverLabel)
        .on("mouseout", hideHoverLabel);
    linkGroup
        .on("mouseover", showHoverLabel)
        .on("mousemove", moveHoverLabel)
        .on("mouseout", hideHoverLabel);

    // Nodes
    const nodeGroup = graphGroup.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", "student")
        .call(
            d3.drag()
                .on("start", (event, d) => {
                    if (event.sourceEvent) event.sourceEvent.stopPropagation();
                    d.fx = d.x;
                    d.fy = d.y;
                    zoomAfter = false;
                })
                .on("drag", (event, d) => {
                    if (event.active) restartSimulation(0.3, 0., simulation, isFrozen ? 0. : forceStrength);
                    d.fx = event.x;
                    d.fy = event.y;
                    lastAlpha = 0.3;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
        );
    nodeGroup.append("circle").attr("r", 30);
    nodeGroup.append("text")
        .selectAll("tspan")
        .data(d => {
            const [firstName, lastName, promo] = d.label.split("--");
            return [`${firstName} ${lastName}`, `promo ${promo}`];
        })
        .join("tspan")
        .attr("x", 0)
        .attr("dy", (d, i) => i === 0 ? -7 : 18)
        .attr("text-anchor", "middle")
        .text(d => d);
    nodeGroup.each(function (d) {
        const text = d3.select(this).select("text");
        const bbox = text.node().getBBox();
        const padding = 5;
        const radius = Math.max(bbox.width, bbox.height) / 2 + padding;
        d3.select(this).select("circle").attr("r", radius);
        d.r = radius;
    });

    // Set initial positions for nodes
    const nodeById = new Map(nodes.map(d => [d.id, d]));
    links.forEach(l => {
        if (typeof l.source !== "object") l.source = nodeById.get(l.source);
        if (typeof l.target !== "object") l.target = nodeById.get(l.target);
    });
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("collision", d3.forceCollide().radius(d => d.r + 50))
        .force("charge", d3.forceManyBody().distanceMax(500))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alphaDecay(0.05);
    restartSimulation(1., 0., simulation, forceStrength);

    simulation.on("tick", () => {
        linkGroup.attr("d", d => {
            const rTarget = d.target.r;
            const rSource = d.source.r;
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const startX = d.source.x + (dx * rSource) / dist;
            const startY = d.source.y + (dy * rSource) / dist;
            const endX = d.target.x - (dx * rTarget) / dist;
            const endY = d.target.y - (dy * rTarget) / dist;
            return `M${startX},${startY}L${endX},${endY}`;
        });

        linkHoverGroup.attr("d", d => {
            const rTarget = d.target.r;
            const rSource = d.source.r;
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const startX = d.source.x + (dx * rSource) / dist;
            const startY = d.source.y + (dy * rSource) / dist;
            const endX = d.target.x - (dx * rTarget) / dist;
            const endY = d.target.y - (dy * rTarget) / dist;
            return `M${startX},${startY}L${endX},${endY}`;
        });

        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    simulation.on("end", () => {
        if (zoomAfter) {
            zoomToFitFn(nodes);
        }
    });

    // Node/Link highlight logic
    const neighborMap = new Map(nodes.map(n => [n.id, new Set()]));
    links.forEach(l => {
        neighborMap.get(l.source.id).add(l.target.id);
        neighborMap.get(l.target.id).add(l.source.id);
    });

    let lastClickedNode = null;
    nodeGroup.on("click", function (event, d) {
        if (lastClickedNode && lastClickedNode.id === d.id) {
            nodeGroup.selectAll("circle").style("fill", "#4f8bc9");
            graphGroup.selectAll(".link")
                .attr("stroke", d => d.color)
                .attr("opacity", 1);
            lastClickedNode = null;
            return;
        }
        lastClickedNode = d;
        const neighbors = neighborMap.get(d.id);
        nodeGroup.selectAll("circle")
            .style("fill", n =>
                n.id === d.id || neighbors.has(n.id) ? "#4f8bc9" : "#ddd"
            );
        graphGroup.selectAll(".link")
            .attr("stroke", l =>
                l.source.id === d.id || l.target.id === d.id ? l.color : "#ccc"
            )
            .attr("opacity", l =>
                l.source.id === d.id || l.target.id === d.id ? 1 : 0.3
            );
    });

    svg.on("click", function (event) {
        if (event.target.tagName === "svg") {
            nodeGroup.selectAll("circle").style("fill", "#4f8bc9");
            graphGroup.selectAll(".link")
                .attr("stroke", d => d.color)
                .attr("opacity", 1);
        }
    });

    // Expose simulation and isFrozen for external control (e.g., buttons)
    return { simulation, isFrozenRef: () => isFrozen, setIsFrozen: v => { isFrozen = v; } };
}