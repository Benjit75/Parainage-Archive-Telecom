import express from 'express';
import fs from 'fs/promises';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 3000;
const DATA_DIR = './data';

app.use(cors());
app.use(express.json());

// Helper to get file paths
const studentsPath = path.join(DATA_DIR, 'students.json');
const tutoringPath = path.join(DATA_DIR, 'tutoring.json');
const reportedIssuesPath = path.join(DATA_DIR, 'reported_issues.json');

// Get all students
app.get('/students', async (req, res) => {
    const data = await fs.readFile(studentsPath, 'utf-8');
    res.json(JSON.parse(data));
});

// Get all tutoring
app.get('/tutoring', async (req, res) => {
    const data = await fs.readFile(tutoringPath, 'utf-8');
    res.json(JSON.parse(data));
});

// Helper to find a student by id
async function findStudentWithId(id) {
    const students = JSON.parse(await fs.readFile(studentsPath, 'utf-8'));
    return students.find(s => String(s.id) === String(id));
}

// Helper to find a family by name and year
async function findFamily(name, year) {
    const tutoring = JSON.parse(await fs.readFile(tutoringPath, 'utf-8'));
    const entry = tutoring.find(t => String(t.family) === name && String(t.year) === year);
    return entry ? { name: entry.family, year: entry.year, color: entry.color } : null;
}

// Helper to find a link (tutoring entry) by id
async function findLinkWithId(id, detailStudents = false) {
    const tutoring = JSON.parse(await fs.readFile(tutoringPath, 'utf-8'));
    const entry =  tutoring.find(t => String(t.id) === String(id));
    if (detailStudents) {
        const student = await findStudentWithId(entry.studentId);
        const mentor = await findStudentWithId(entry.mentorId);
        return {
            id: entry.id,
            student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            mentor: mentor ? `${mentor.firstName} ${mentor.lastName}` : 'Unknown',
            family: entry.family,
            year: entry.year,
            color: entry.color
        };
    }
    return entry;

}

// --- Queue infrastructure ---
const writeQueues = {
    students: [],
    tutoring: [],
    reportedIssues: []
};
const writing = {
    students: false,
    tutoring: false,
    reportedIssues: false
};

function enqueueWrite(type, data, res) {
    writeQueues[type].push({ data, res });
    processQueue(type);
}

async function processQueue(type) {
    if (writing[type] || writeQueues[type].length === 0) return;
    writing[type] = true;
    const { data, res } = writeQueues[type].shift();
    try {
        let filePath, updated, response;
        if (type === 'students') {
            filePath = studentsPath;
            const students = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const id = Math.max(0, ...students.map(s => s.id)) + 1;
            const student = { id, ...data, promo: Number(data.promo) };
            students.push(student);
            updated = students;
            response = student;
        } else if (type === 'tutoring') {
            filePath = tutoringPath;
            const tutoring = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const id = Math.max(0, ...tutoring.map(t => t.id)) + 1;
            const entry = { id, ...data };
            tutoring.push(entry);
            updated = tutoring;
            response = entry;
        } else if (type === 'reportedIssues') {
            filePath = reportedIssuesPath;
            const reportedIssues = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            let { type: issueType, precision, description } = data;
            let precisionValue = precision;
            if (issueType === 'student') {
                precisionValue = await findStudentWithId(precision);
            } else if (issueType === 'family') {
                const [name, year] = precision.split('--');
                precisionValue = await findFamily(name, year);
            } else if (issueType === 'link') {
                precisionValue = await findLinkWithId(precision, true);
            }
            const id = Math.max(0, ...reportedIssues.map(r => r.id)) + 1;
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            const datetime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}:${pad(now.getMinutes())}`;
            const entry = { id, type: issueType, precision: precisionValue, description, datetime };
            reportedIssues.push(entry);
            updated = reportedIssues;
            response = entry;
        }
        await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
    writing[type] = false;
    processQueue(type);
}

// --- Route handlers using the queue ---

app.post('/students', (req, res) => {
    const { firstName, lastName, promo } = req.body;
    enqueueWrite('students', { firstName, lastName, promo }, res);
});

app.post('/tutoring', (req, res) => {
    const { mentorId, studentId, family, year, color } = req.body;
    enqueueWrite('tutoring', { mentorId, studentId, family, year, color }, res);
});

app.post('/report-issue', (req, res) => {
    const { type, precision, description } = req.body;
    enqueueWrite('reportedIssues', { type, precision, description }, res);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});