// graph/dataLoader3.js
const API_URL = "http://localhost:3000";

export async function loadGraphData() {
    const [students, tutoring] = await Promise.all([
        fetch(`${API_URL}/students`).then(r => r.json()),
        fetch(`${API_URL}/tutoring`).then(r => r.json())
    ]);
    // Extract families from tutoring
    const families = Array.from(
        new Map(
            tutoring.map(t => [
                t.family + "_" + t.year,
                { name: t.family, year: t.year, color: t.color }
            ])
        ).values()
    );
    const nodes = students.map(s => ({
        id: s.id,
        label: `${s.firstName}--${s.lastName}--${s.promo}`,
    }));
    const links = tutoring.map(t => ({
        source: t.mentorId,
        target: t.studentId,
        label: `${t.family}--${t.year}`,
        color: t.color
    }));
    return { nodes, links, tutoring, students, families };
}

export async function getStudents() {
    return fetch(`${API_URL}/students`).then(r => r.json());
}

export async function getFamilies() {
    const tutoring = await fetch(`${API_URL}/tutoring`).then(r => r.json());
    return Array.from(
        new Map(
            tutoring.map(t => [
                t.family + "_" + t.year,
                { name: t.family, year: t.year, color: t.color }
            ])
        ).values()
    );
}

export async function createStudentSelect(name, label, allowNew = false) {
    const students = await getStudents();
    // Sort by promo (year), then lastName, then firstName
    students.sort((a, b) =>
        b.promo - a.promo ||
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
    );
    const select = document.createElement('select');
    select.name = name;
    select.required = true;
    select.innerHTML =
        `<option value="">Select ${label}...</option>` +
        (allowNew ? `<option value="__new__">Add new...</option>` : '') +
        students.map(s =>
            `<option value="${s.id}">${s.firstName} ${s.lastName} (${s.promo})</option>`
        ).join('');
    // Initialize Select2 (assumes jQuery and Select2 are loaded)
    /*$(select).select2({
        placeholder: `Select ${label}...`,
        allowClear: true
    });*/
    return select;
}

export async function createFamilySelect(allowNew = false) {
    const families = await getFamilies();
    // Sort by year descending, then name
    families.sort((a, b) =>
        b.year.localeCompare(a.year) ||
        a.name.localeCompare(b.name)
    );
    const select = document.createElement('select');
    select.name = 'family';
    select.required = true;
    select.innerHTML =
        `<option value="">Select family...</option>` +
        (allowNew ? `<option value="__new__">Add new...</option>` : '') +
        families.map(f =>
            `<option value="${f.name}--${f.year}">${f.name} (${f.year})</option>`
        ).join('');
    return select;
}

export async function addStudent(firstName, lastName, promo) {
    console.log('Adding student:', { firstName, lastName, promo });
    const res = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, promo })
    });
    const data = await res.json();
    console.log('Student added:', data);
    return data; // Only return data, not res.json() again
}

export async function addTutoring(mentorId, studentId, family, year, color) {
    console.log('Adding tutoring:', { mentorId, studentId, family, year, color });
    const res = await fetch(`${API_URL}/tutoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId, studentId, family, year, color })
    });
    const data = await res.json();
    console.log('Tutoring added:', data);
    return data; // Only return data, not res.json() again
}

export async function addIssueReport(report) {
    console.log('Adding issue report:', report);
    const res = await fetch("http://localhost:3000/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
    });
    const data = await res.json();
    console.log('Issue report added:', data);
    return data;
}