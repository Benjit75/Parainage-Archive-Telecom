// script3.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {
    loadGraphData,
    getFamilies,
    getStudents,
    createStudentSelect,
    createFamilySelect,
    addStudent,
    addTutoring,
    addIssueReport
} from './graph/dataLoader.js';
import { renderGraph,
    zoomToFit,
    forceStrength,
    restartSimulation,
    exportCleanedSvg
} from './graph/graphUtils.js';
import {
    createResetZoomButton,
    createArrangeButton,
    createFreezeButton,
    createRedrawButton
} from './graph/graphDesign.js';
import {
    logRestart,
    logZoom,
    logFreeze,
    logPromoArrange,
    logStart
} from './graph/logger.js';

(async function () {
    // Initial data load
    let { nodes, links } = await loadGraphData();

    // Set up SVG and group
    const svg = d3.select("#graph-svg");
    const graphGroup = svg.append("g");
    const width = +svg.attr("width");
    const height = +svg.attr("height");

    // D3 zoom behavior
    const zoomBehavior = d3.zoom().on("zoom", (event) => {
        graphGroup.attr("transform", event.transform);
    });
    svg.call(zoomBehavior);

    // Zoom to fit helper
    function zoomToFitFn(nodes) {
        return zoomToFit(svg, graphGroup, nodes, zoomBehavior);
    }

    // Arrange by promo
    function arrangeByPromo(nodes, simulation, isFrozen, height = window.innerHeight) {
        const promos = Array.from(
            new Set(
                nodes.map(n => {
                    const [, , promo] = n.label.split("--");
                    return parseInt(promo, 10);
                })
            )
        ).filter(Number.isFinite).sort((a, b) => a - b);

        const promoY = {};
        promos.forEach((promo, i) => {
            promoY[promo] = (height / (promos.length + 1)) * (i + 1);
        });

        let changed = false;
        const factorSpacePromo = 3;
        nodes.forEach(n => {
            const [, , promoStr] = n.label.split("--");
            const promo = parseInt(promoStr, 10);
            const targetY = promoY[promo] * factorSpacePromo;
            if (promo && promoY[promo] && n.y !== targetY) {
                n.fy = targetY;
                if (isFrozen) n.y = targetY;
                changed = true;
            }
            n.fx = null;
        });

        if (changed) {
            if (isFrozen) {
                simulation.alpha(0).restart();
                setTimeout(() => {
                    nodes.forEach(n => { n.fy = null; });
                }, 10);
            } else {
                restartSimulation(0.3, 0., simulation, forceStrength);
                setTimeout(() => {
                    nodes.forEach(n => { n.fy = null; });
                }, 10);
            }
        }
        return !changed;
    }

    // Start the simulation
    logStart();

    // Render the graph
    let { simulation, isFrozenRef, setIsFrozen } = renderGraph({
        svg,
        graphGroup,
        nodes,
        links,
        width,
        height,
        zoomToFitFn,
        arrangeByPromo,
        zoomBehavior
    });

    // Filtering by year
    const yearFilter = document.getElementById("year-filter");
    function updateYearFilter(links) {
        yearFilter.innerHTML = `<option value="all">All Years</option>`;
        const years = Array.from(new Set(links.map(l => l.label.split("--")[1]))).sort();
        years.forEach(year => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
    }
    updateYearFilter(links);

    function renderFilteredByYear(selectedYear) {
        const filteredLinks = selectedYear === "all"
            ? links
            : links.filter(l => l.label.split("--")[1] === selectedYear);
        const nodeIds = new Set(filteredLinks.flatMap(l => [
            typeof l.source === "object" ? l.source.id : l.source,
            typeof l.target === "object" ? l.target.id : l.target
        ]));
        const filteredNodes = nodes.filter(n => nodeIds.has(n.id));
        renderGraph({
            svg,
            graphGroup,
            nodes: filteredNodes,
            links: filteredLinks,
            width,
            height,
            zoomToFitFn,
            arrangeByPromo,
            zoomBehavior
        });
    }

    yearFilter.addEventListener("change", function() {
        renderFilteredByYear(this.value);
    });

    // Button sizes
    const buttonSize = 36;
    const buttonPadding = 10;

    // Create and place buttons
    const resetZoomBtn = createResetZoomButton(svg, () => {
        const { alreadyZoomed } = zoomToFitFn(nodes);
        logZoom(alreadyZoomed);
    }, buttonSize, buttonPadding);

    const arrangeBtn = createArrangeButton(svg, () => {
        let alreadyArranged = arrangeByPromo(nodes, simulation, isFrozenRef());
        logPromoArrange(alreadyArranged);
        if (!alreadyArranged) {
            zoomToFitFn(nodes);
            logZoom(false);
        }
    }, buttonSize, buttonPadding);

    const freezeBtn = createFreezeButton(svg, () => {
        const newStatus = !isFrozenRef();
        setIsFrozen(newStatus);
        logFreeze(newStatus);
        if (!newStatus) {
            nodes.forEach(n => { n.fy = n.y; });
            zoomToFitFn(nodes);
            setTimeout(() => {
                nodes.forEach(n => { n.fy = null; });
                restartSimulation(0.1, 0., simulation, forceStrength);
            }, 10);
        } else {
            restartSimulation(0., 0., simulation, 0.);
        }
    }, buttonSize, buttonPadding);

    const redrawBtn = createRedrawButton(svg, () => {
        const centerX = width / 2;
        const centerY = height / 2;
        const spread = 40; // small spread

        nodes.forEach(n => {
            n.x = centerX + (Math.random() - 0.5) * spread;
            n.y = centerY + (Math.random() - 0.5) * spread;
            n.fx = null;
            n.fy = null;
        });
        setIsFrozen(false);
        restartSimulation(0.3, 0., simulation, forceStrength);
        zoomToFitFn(nodes);
        logRestart();
        logZoom();
    }, buttonSize, buttonPadding);

    function placeButtons() {
        const svgNode = svg.node();
        const svgRect = svgNode.getBoundingClientRect();
        const svgWidth = svgRect.width;
        resetZoomBtn.attr("transform", `translate(${svgWidth - buttonSize - buttonPadding},${buttonPadding})`);
        arrangeBtn.attr("transform", `translate(${svgWidth - 2 * (buttonSize + buttonPadding)},${buttonPadding})`);
        freezeBtn.attr("transform", `translate(${svgWidth - 3 * (buttonSize + buttonPadding)},${buttonPadding})`);
        redrawBtn.attr("transform", `translate(${svgWidth - 4 * (buttonSize + buttonPadding)},${buttonPadding})`);
    }
    placeButtons();
    window.addEventListener("resize", placeButtons);

    // -- Add Button and Form Logic --
    const sidePanel = document.getElementById('side-panel');

    // Create Save SVG button
    const saveSvgBtn = document.createElement('button');
    saveSvgBtn.textContent = 'Save SVG';
    sidePanel.appendChild(saveSvgBtn);

    saveSvgBtn.onclick = async () => {
        const svgNode = document.getElementById('graph-svg');
        await exportCleanedSvg(svgNode, 'parainage-telecom.svg');
    };

    // Add data button
    const addDataBtn = document.createElement('button');
    addDataBtn.textContent = 'Add Data';
    addDataBtn.style.marginTop = '16px';
    sidePanel.appendChild(addDataBtn);

    addDataBtn.onclick = async () => {
        // Modal overlay
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = 1000;

        // Modal content
        const form = document.createElement('form');
        form.style.background = '#fff';
        form.style.padding = '24px';
        form.style.borderRadius = '8px';
        form.style.minWidth = '350px';
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '12px';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Add Mentoring Entry';
        form.appendChild(title);

        // Mentor
        const mentorLabel = document.createElement('label');
        mentorLabel.textContent = 'Mentor Student';
        form.appendChild(mentorLabel);
        const mentorSelect = await createStudentSelect('mentor', 'mentor', true);
        form.appendChild(mentorSelect);
        $(mentorSelect).select2({
            placeholder: `Select Student...`,
            allowClear: true
        });
        const mentorNewFields = document.createElement('div');
        mentorNewFields.style.display = 'none';
        mentorNewFields.style.flexDirection = 'column';
        mentorNewFields.innerHTML = `
        <input name="mentor_first" placeholder="First name">
        <input name="mentor_last" placeholder="Last name">
        <input name="mentor_promo" placeholder="Promo">
    `;
        form.appendChild(mentorNewFields);

        // Tutored
        const tutoredLabel = document.createElement('label');
        tutoredLabel.textContent = 'Tutored Student';
        form.appendChild(tutoredLabel);
        const tutoredSelect = await createStudentSelect('tutored', 'tutored', true);
        form.appendChild(tutoredSelect);
        $(tutoredSelect).select2({
            placeholder: `Select Student...`,
            allowClear: true
        });
        const tutoredNewFields = document.createElement('div');
        tutoredNewFields.style.display = 'none';
        tutoredNewFields.style.flexDirection = 'column';
        tutoredNewFields.innerHTML = `
        <input name="tutored_first" placeholder="First name">
        <input name="tutored_last" placeholder="Last name">
        <input name="tutored_promo" placeholder="Promo">
    `;
        form.appendChild(tutoredNewFields);

        // Family
        const familyLabel = document.createElement('label');
        familyLabel.textContent = 'Family';
        form.appendChild(familyLabel);
        const familySelect = await createFamilySelect(true);
        form.appendChild(familySelect);
        $(familySelect).select2({
            placeholder: `Select Family...`,
            allowClear: true
        });
        const familyNewFields = document.createElement('div');
        familyNewFields.style.display = 'none';
        familyNewFields.style.flexDirection = 'column';
        familyNewFields.innerHTML = `
        <input name="family_name" placeholder="Family name">
        <input name="family_year" placeholder="Year - format 20YY/20YY+1">
        <input name="family_color" placeholder="Color">
    `;
        form.appendChild(familyNewFields);

        // Helper to toggle required
        function toggleRequired(fields, show) {
            Array.from(fields.querySelectorAll('input')).forEach(input => {
                input.required = show;
            });
        }

        // Show/hide new fields and toggle required
        mentorSelect.onchange = () => {
            const show = mentorSelect.value === "__new__";
            mentorNewFields.style.display = show ? "flex" : "none";
            toggleRequired(mentorNewFields, show);
        };
        tutoredSelect.onchange = () => {
            const show = tutoredSelect.value === "__new__";
            tutoredNewFields.style.display = show ? "flex" : "none";
            toggleRequired(tutoredNewFields, show);
        };
        familySelect.onchange = () => {
            const show = familySelect.value === "__new__";
            familyNewFields.style.display = show ? "flex" : "none";
            toggleRequired(familyNewFields, show);
        };

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'form-actions';
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'space-evenly';
        btnRow.style.gap = '8px';
        const sendBtn = document.createElement('button');
        sendBtn.type = 'submit';
        sendBtn.textContent = 'Send';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(sendBtn);
        form.appendChild(btnRow);

        modal.appendChild(form);
        document.body.appendChild(modal);

        cancelBtn.onclick = () => document.body.removeChild(modal);

        form.onsubmit = async (e) => {
            e.preventDefault();
            // Mentor
            let mentorId;
            if (mentorSelect.value === "__new__") {
                const first = form.elements["mentor_first"].value.trim();
                const last = form.elements["mentor_last"].value.trim();
                const promo = form.elements["mentor_promo"].value.trim();
                // Basic validation for promo as year
                if (!/^20\d{2}$/.test(promo)) {
                    alert('Promo must be a 4-digit year, e.g. 2023');
                    console.info(`Invalid promo format (expected 4-digit year): ${promo}`);
                    return;
                }
                // ensure it is not already in the list
                const studs = await getStudents();
                // Compare as strings
                const stu = studs.find(f =>
                    f.firstName.toLowerCase() === first.toLowerCase()
                    && f.lastName.toLowerCase() === last.toLowerCase()
                    && f.promo === promo
                );
                if (stu) {
                    alert(`Student ${first} ${last} (${promo}) already exists. Please select them from the list.`);
                    console.info(`Student already exists: ${first} ${last} (${promo})`);
                    return;
                }
                mentorId = (await addStudent(first, last, promo)).id;
            } else {
                mentorId = Number(mentorSelect.value);
            }
            // Tutored
            let tutoredId;
            if (tutoredSelect.value === "__new__") {
                const first = form.elements["tutored_first"].value.trim();
                const last = form.elements["tutored_last"].value.trim();
                const promo = form.elements["tutored_promo"].value.trim();
                // Basic validation for promo as year
                if (!/^20\d{2}$/.test(promo)) {
                    alert('Promo must be a 4-digit year, e.g. 2023');
                    console.info(`Invalid promo format (expected 4-digit year): ${promo}`);
                    return;
                }
                // ensure it is not already in the list
                const studs = await getStudents();
                // Compare as strings
                const stu = studs.find(f =>
                    f.firstName.toLowerCase() === first.toLowerCase()
                    && f.lastName.toLowerCase() === last.toLowerCase()
                    && String(f.promo) === promo
                );
                if (stu) {
                    alert(`Student ${first} ${last} (${promo}) already exists. Please select them from the list.`);
                    console.info(`Student already exists: ${first} ${last} (${promo})`);
                    return;
                }
                tutoredId = (await addStudent(first, last, promo)).id;
            } else {
                tutoredId = Number(tutoredSelect.value);
            }
            // Ensure mentor and tutored should be different
            if (mentorId === tutoredId) {
                alert('Mentor and tutored student cannot be the same person.');
                console.info('Mentor and tutored student are the same.');
                return;
            }

            // Family
            let familyName, familyYear, familyColor;
            if (familySelect.value === "__new__") {
                familyName = form.elements["family_name"].value.trim();
                familyYear = form.elements["family_year"].value.trim();
                familyColor = form.elements["family_color"].value.trim().toLowerCase();
                // ensure correct format for year 20YY/20YY+1
                if (!/^20\d{2}\/20\d{2}$/.test(familyYear) || (parseInt(familyYear.split('/')[1], 10) !== parseInt(familyYear.split('/')[0], 10) + 1)) {
                    alert('Year must be in format 20YY/20YY+1, e.g. 2023/2024');
                    console.info(`Invalid year format (expected 20YY/20YY+1, e.g. 2023/2024): ${familyYear}`);
                    return;
                }
                // ensure color starts with # or is a valid color name
                if (familyColor && !/^#([0-9A-F]{3}){1,2}$/i.test(familyColor)){
                    if (!/^[a-zA-Z]+$/.test(familyColor)) {
                        alert('Color must be a valid hex code (e.g. #FF5733) or color name (e.g. red)');
                        console.info(`Invalid color format (expected hex code or color name): ${familyColor}`);
                        return;
                    } else {
                        // ensure color name exists in browser
                        const s = new Option().style;
                        s.color = familyColor;
                        if (s.color === '') {
                            alert('Color name is not recognized. Please use a valid color name or hex code.');
                            console.info(`Unrecognized color name: ${familyColor}`);
                            return;
                        }
                    }
                }
                // ensure it is not already in the list
                const fams = await getFamilies();
                // Compare as strings
                const fam = fams.find(f =>
                    f.name.toLowerCase() === familyName.toLowerCase()
                    && String(f.year) === familyYear
                );
                if (fam) {
                    alert(`Family ${familyName} (${familyYear}) already exists. Please select it from the list.`);
                    console.info(`Family already exists: ${familyName} (${familyYear})`);
                    return;
                }
            } else {
                const [name, year] = familySelect.value.split("--");
                const fams = await getFamilies();
                // Compare as strings
                const fam = fams.find(f => f.name === name && String(f.year) === year);
                familyName = fam.name;
                familyYear = String(fam.year); // ensure string
                familyColor = fam.color;
            }
            await addTutoring(mentorId, tutoredId, familyName, familyYear, familyColor);

            alert('Entry saved!');
            document.body.removeChild(modal);

            // Reload and re-render
            const data = await loadGraphData();
            nodes = data.nodes;
            links = data.links;
            updateYearFilter(links);
            renderFilteredByYear(yearFilter.value);
        };
    };

    // Create Report Issue button
    const reportBtn = document.createElement('button');
    reportBtn.textContent = 'Report Issue';
    reportBtn.style.marginTop = '8px';
    sidePanel.appendChild(reportBtn);

    reportBtn.onclick = async () => {
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000
        });

        const form = document.createElement('form');
        Object.assign(form.style, {
            background: '#fff', padding: '24px', borderRadius: '8px',
            minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '12px'
        });

        const title = document.createElement('h3');
        title.textContent = 'Report an Issue';
        form.appendChild(title);

        // Type dropdown
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'What is the issue related to?';
        form.appendChild(typeLabel);

        const typeSelect = document.createElement('select');
        typeSelect.name = 'type';
        typeSelect.required = true;
        typeSelect.innerHTML = `
        <option value="">Select...</option>
        <option value="student">Error on student</option>
        <option value="family">Error on family</option>
        <option value="link">Incorrect affiliation</option>
        <option value="other">Other</option>
    `;
        form.appendChild(typeSelect);

        // Precision fields
        const precisionDiv = document.createElement('div');
        form.appendChild(precisionDiv);

        // Description
        const descLabel = document.createElement('label');
        descLabel.textContent = 'Describe the problem:';
        form.appendChild(descLabel);

        const descField = document.createElement('textarea');
        descField.name = 'description';
        descField.required = true;
        descField.rows = 4;
        form.appendChild(descField);

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'form-actions';
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'space-evenly';
        btnRow.style.gap = '8px';
        const sendBtn = document.createElement('button');
        sendBtn.type = 'submit';
        sendBtn.textContent = 'Send';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(sendBtn);
        form.appendChild(btnRow);

        modal.appendChild(form);
        document.body.appendChild(modal);

        cancelBtn.onclick = () => document.body.removeChild(modal);

        // Update precision field based on type
        typeSelect.onchange = async () => {
            precisionDiv.innerHTML = '';
            if (typeSelect.value === 'student') {
                const sel = await createStudentSelect('precision', 'student');
                sel.style.width = typeSelect.offsetWidth + 'px';
                precisionDiv.appendChild(sel);
                $(sel).select2({
                    placeholder: `Select Student...`,
                    allowClear: true
                });
            } else if (typeSelect.value === 'family') {
                const sel = await createFamilySelect();
                sel.name = 'precision';
                sel.style.width = typeSelect.offsetWidth + 'px';
                precisionDiv.appendChild(sel);
                $(sel).select2({
                    placeholder: `Select Family...`,
                    allowClear: true
                });
            } else if (typeSelect.value === 'link') {
                const { tutoring, students, families } = await loadGraphData();

                tutoring.sort((a, b) => {
                    const aMentor = students.find(s => s.id === a.mentorId) || {};
                    const bMentor = students.find(s => s.id === b.mentorId) || {};
                    const aTutored = students.find(s => s.id === a.studentId) || {};
                    const bTutored = students.find(s => s.id === b.studentId) || {};

                    // Year descending
                    if (String(b.year) !== String(a.year)) return String(b.year).localeCompare(String(a.year));
                    // Tutored last name
                    if ((aTutored.lastName || '') !== (bTutored.lastName || '')) return (aTutored.lastName || '').localeCompare(bTutored.lastName || '');
                    // Tutored first name
                    if ((aTutored.firstName || '') !== (bTutored.firstName || '')) return (aTutored.firstName || '').localeCompare(bTutored.firstName || '');
                    // Mentor last name
                    if ((aMentor.lastName || '') !== (bMentor.lastName || '')) return (aMentor.lastName || '').localeCompare(bMentor.lastName || '');
                    // Mentor first name
                    return (aMentor.firstName || '').localeCompare(bMentor.firstName || '');
                });

                const sel = document.createElement('select');
                sel.style.width = typeSelect.offsetWidth + 'px';
                sel.name = 'precision';
                sel.required = true;
                sel.innerHTML = `<option value="">Select link...</option>` +
                    tutoring.map(t => {
                        const mentor = students.find(s => s.id === t.mentorId);
                        const tutored = students.find(s => s.id === t.studentId);
                        return `<option value="${t.id}">
                ${mentor ? mentor.firstName + ' ' + mentor.lastName : t.mentorId} →
                ${tutored ? tutored.firstName + ' ' + tutored.lastName : t.studentId}
                [${t.family} ${t.year}]
            </option>`;
                    }).join('');
                precisionDiv.appendChild(sel);
                $(sel).select2({
                    placeholder: `Select Affiliation...`,
                    allowClear: true
                });
            } else if (typeSelect.value === 'other') {
                const input = document.createElement('input');
                input.name = 'precision';
                input.placeholder = 'Short description';
                input.required = true;
                precisionDiv.appendChild(input);
            }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const type = typeSelect.value;
            const precision = form.elements['precision'] ? form.elements['precision'].value : '';
            const description = descField.value;
            const reqObj = { type, precision, description };
            await addIssueReport(reqObj)
            alert('Your request has been submitted and will be reviewed shortly.');
            document.body.removeChild(modal);
        };
    };

})();

