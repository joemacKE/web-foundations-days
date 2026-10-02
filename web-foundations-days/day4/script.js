const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const DRAFT_KEY = "draft";
const THEME_KEY = "theme";

function updateCounts() {
    const text = noteText.value;

    const characters = text.length;

    const words =
        text.trim() === ""
            ? 0
            : text.trim().split(/\s+/).length;

    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

function clearNote() {
    noteText.value = "";

    localStorage.removeItem(DRAFT_KEY);

    updateCounts();
}

noteText.addEventListener("input", () => {
    updateCounts();

    localStorage.setItem(DRAFT_KEY, noteText.value);
});

clearBtn.addEventListener("click", clearNote);

noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
        localStorage.setItem(THEME_KEY, "dark");
    } else {
        themeToggle.textContent = "Dark mode";
        localStorage.setItem(THEME_KEY, "light");
    }
});

window.addEventListener("DOMContentLoaded", () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);

    if (savedDraft) {
        noteText.value = savedDraft;
    }

    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "Light mode";
    }

    updateCounts();
});