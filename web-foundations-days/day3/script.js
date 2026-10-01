let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];

/*
 * 1. searchNotes(word)
 */
function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}

/*
 * 2. longestNote()
 */
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}

/*
 * 3. countByCategory()
 */
function countByCategory() {
    const counts = {};

    for (let note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}

/*
 * 4. getSummary()
 */
function getSummary() {
    const counts = countByCategory();
    const total = notes.length;

    const noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

/*
 * 5. isDuplicate(text)
 */
function isDuplicate(text) {
    const normalisedText = text.trim().toLowerCase();

    return notes.some(
        note => note.text.trim().toLowerCase() === normalisedText
    );
}

/*
 * 6. addNote(text, category)
 */
function addNote(text, category) {
    const validCategories = ["personal", "work", "study"];

    const trimmedText = text.trim();

    if (trimmedText.length < 1 || trimmedText.length > 200) {
        console.log("Invalid note length.");
        return false;
    }

    if (!validCategories.includes(category)) {
        console.log("Invalid category.");
        return false;
    }

    if (isDuplicate(trimmedText)) {
        console.log("Duplicate note.");
        return false;
    }

    const newNote = {
        id: notes.length + 1,
        text: trimmedText,
        category: category,
    };

    notes.push(newNote);

    return true;
}

/* ===========================
   TESTS
   =========================== */

/* searchNotes */
// Expected: array containing "Buy milk and bread"
console.log(searchNotes("milk"));

// Expected: []
console.log(searchNotes("holiday"));

/* longestNote */
// Expected: the note about emailing the project report
console.log(longestNote());

// Edge case
const savedNotes = [...notes];
notes = [];
// Expected: null
console.log(longestNote());

notes = savedNotes;

/* countByCategory */
// Expected: { personal: 2, study: 2, work: 1 }
console.log(countByCategory());

// Expected: same result after restoring notes
console.log(countByCategory());

/* getSummary */
// Expected: "5 notes: 2 personal, 1 work, 2 study."
console.log(getSummary());

// Expected: summary string
console.log(getSummary());

/* isDuplicate */
// Expected: true
console.log(isDuplicate("Buy milk and bread"));

// Expected: true
console.log(isDuplicate("  buy milk and bread  "));

// Expected: false
console.log(isDuplicate("Go jogging"));

/* addNote */
// Expected: true
console.log(addNote("Prepare for JavaScript quiz", "study"));

// Expected: false and logs "Duplicate note."
console.log(addNote("Buy milk and bread", "personal"));

// Expected: false and logs "Invalid category."
console.log(addNote("Test note", "sports"));

// Expected: false and logs "Invalid note length."
console.log(addNote("", "study"));

/* Final notes array */
// Expected: original 5 notes + 1 new study note
console.log(notes);