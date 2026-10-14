"use strict";

const notesContainer = document.querySelector(".notes-container");
const createBtn = document.querySelector("#create-note-btn");
const searchInput = document.querySelector("#search-notes");
const sortSelect = document.querySelector("#sort-notes");
const categoryFilter = document.querySelector("#filter-category");

const STORAGE_KEY = "smartNotes";

const NOTE_COLORS = [
    "default",
    "yellow",
    "green",
    "blue",
    "pink",
    "purple"
];

const NOTE_CATEGORIES = [
    "Study",
    "Work",
    "Personal",
    "Ideas",
    "Other"
];

function sanitizeFormattedHtml(html) {
    const parsed = new DOMParser().parseFromString(html, "text/html");

    const allowedTags = new Set([
        "B", "STRONG", "I", "EM", "U", "BR", "DIV", "P"
    ]);

    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.tagName)) {
            return document.createDocumentFragment();
        }

        const fragment = document.createDocumentFragment();
        for (const child of node.childNodes) {
            fragment.appendChild(cleanNode(child));
        }
        if (!allowedTags.has(node.tagName)) {
            return fragment;
        }

        const cleanElement = document.createElement(
            node.tagName.toLowerCase()
        );
        cleanElement.appendChild(fragment);
        return cleanElement;
    }

    const result = document.createElement("div");
    for (const child of parsed.body.childNodes) {
        result.appendChild(cleanNode(child));
    }
    return result.innerHTML;
}

function updateFormattingToolbar(editor) {
    if (!editor) return;
    const noteElement = editor.closest(".input-box");
    if (!noteElement) return;

    const buttons = noteElement.querySelectorAll("[data-command]");

    buttons.forEach(button => {
        const isActive =
            document.queryCommandState(button.dataset.command);

        button.classList.toggle("active", isActive);
    });
}

function loadNotes() {
    try {
        const savedNotes = localStorage.getItem(STORAGE_KEY);
        if (!savedNotes) {
            return [];
        }
        const parsedNotes = JSON.parse(savedNotes);
        if (!Array.isArray(parsedNotes)) {
            return [];
        }
        return parsedNotes
            .filter(
                note =>
                    note &&
                    typeof note.id === "string" &&
                    typeof note.content === "string"
            )
            .map(note => ({
                ...note,
                createdAt:
                    typeof note.createdAt === "number" &&
                    Number.isFinite(note.createdAt)
                        ? note.createdAt
                        : 0,
                pinned: note.pinned === true,
                color: NOTE_COLORS.includes(note.color)
                    ? note.color
                    : "default",
                category: NOTE_CATEGORIES.includes(note.category)
                    ? note.category
                    : "Other",
                tags: Array.isArray(note.tags)
                    ? note.tags.filter(tag => typeof tag === "string")
                    : []
            }));
    } catch (error) {
        console.error("Unable to load saved notes:", error);
        return [];
    }
}

let notes = loadNotes();

function saveNotes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Unable to save notes:", error);
        alert("Your notes could not be saved. Check your browser storage.");
    }
}

function renderNotes() {
    notesContainer.replaceChildren();

    const searchTerm = searchInput.value.trim().toLowerCase();

    const sortBy = sortSelect.value;

    const selectedCategory = categoryFilter.value;

    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.content
            .toLowerCase()
            .includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            note.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const sortedNotes = [...filteredNotes].sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return b.pinned ? 1 : -1;
        }
        if (sortBy === "oldest") {
            return a.createdAt - b.createdAt;
        }
        if (sortBy === "alphabetical") {
            return a.content.localeCompare(b.content);
        }
        return b.createdAt - a.createdAt;
    });

    if (sortedNotes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";

        if (searchTerm && selectedCategory !== "all") {
            emptyMessage.textContent =
                "No notes match your search and selected category.";
        } else if (searchTerm) {
            emptyMessage.textContent = "No notes match your search.";
        } else if (selectedCategory !== "all") {
            emptyMessage.textContent =
                `No notes found in the ${selectedCategory} category.`;
        } else {
            emptyMessage.textContent =
                "No notes yet. Create your first note to get started!";
        }
        notesContainer.appendChild(emptyMessage);
        return;
    }

    sortedNotes.forEach(note => {
        const noteElement = document.createElement("article");
        noteElement.className = `input-box note-${note.color}`;
        noteElement.dataset.noteId = note.id;

        const pinButton = document.createElement("button");
        pinButton.className = "pin-note-btn";
        pinButton.type = "button";
        pinButton.dataset.action = "pin";
        pinButton.dataset.noteId = note.id;
        pinButton.setAttribute(
            "aria-label",
            note.pinned ? "Unpin note" : "Pin note"
        );
        pinButton.setAttribute("aria-pressed", String(note.pinned));

        const pinIcon = document.createElement("img");
        pinIcon.src = note.pinned
            ? "images/unpin.png"
            : "images/pin.png";
        pinIcon.alt = "";
        pinIcon.width = 20;
        pinIcon.height = 20;

        pinButton.appendChild(pinIcon);

        const countDisplay = document.createElement("div");
        countDisplay.className = "note-count";

        const wordCount = note.content.trim()
            ? note.content.trim().split(/\s+/).length
            : 0;

        const characterCount = note.content.length;

        countDisplay.textContent =
            `Words: ${wordCount} · Characters: ${characterCount}`;

        const editor = document.createElement("div");
        editor.className = "note-content";
        editor.contentEditable = "true";
        editor.setAttribute("role", "textbox");
        editor.setAttribute("aria-label", "Edit note");
        editor.setAttribute("aria-multiline", "true");
        editor.dataset.noteId = note.id;
        editor.innerHTML = sanitizeFormattedHtml(
            note.formattedContent ?? note.content
        );
        
        const formattingToolbar = document.createElement("div");
        formattingToolbar.className = "formatting-toolbar";

        const formattingButtons = [
            { command: "bold", label: "B", title: "Bold" },
            { command: "italic", label: "I", title: "Italic" },
            { command: "underline", label: "U", title: "Underline" }
        ];

        formattingButtons.forEach(({ command, label, title }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `format-btn format-${command}`;
            button.textContent = label;
            button.title = title;
            button.setAttribute("aria-label", title);
            button.dataset.command = command;
            formattingToolbar.appendChild(button);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-note-btn";
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", "Delete note");
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.noteId = note.id;

        const deleteIcon = document.createElement("img");
        deleteIcon.src = "images/delete.png";
        deleteIcon.alt = "";
        deleteIcon.width = 25;
        deleteIcon.height = 25;
        deleteButton.appendChild(deleteIcon);

        const colorPicker = document.createElement("select");
        colorPicker.className = "note-color-picker";
        colorPicker.dataset.action = "color";
        colorPicker.dataset.noteId = note.id;
        colorPicker.setAttribute("aria-label", "Change note color");

        NOTE_COLORS.forEach(color => {
            const option = document.createElement("option");
            option.value = color;
            option.textContent =
                color.charAt(0).toUpperCase() + color.slice(1);
            option.selected = note.color === color;
            colorPicker.appendChild(option);
        });

        const categoryPicker = document.createElement("select");
        categoryPicker.className = "note-category-picker";
        categoryPicker.dataset.action = "category";
        categoryPicker.dataset.noteId = note.id;
        categoryPicker.setAttribute("aria-label", "Choose note category");
        
        const tagInput = document.createElement("input");
        tagInput.type = "text";
        tagInput.className = "note-tag-input";
        tagInput.placeholder = "Add a tag and press Enter";
        tagInput.setAttribute("aria-label", "Add a custom tag");
        tagInput.dataset.noteId = note.id;
        
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "note-tags";

        (note.tags || []).forEach(tag => {
            const tagElement = document.createElement("span");
            tagElement.className = "note-tag";

            const tagText = document.createElement("span");
            tagText.textContent = tag;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-tag-btn";
            removeButton.textContent = "×";
            removeButton.setAttribute("aria-label", `Remove tag ${tag}`);
            removeButton.dataset.action = "remove-tag";
            removeButton.dataset.noteId = note.id;
            removeButton.dataset.tag = tag;

            tagElement.append(tagText, removeButton);
            tagsContainer.appendChild(tagElement);
        });

        NOTE_CATEGORIES.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            option.selected = note.category === category;
            categoryPicker.appendChild(option);
        });

        noteElement.append(
            pinButton,
            colorPicker,
            categoryPicker,
            tagInput,
            tagsContainer,
            formattingToolbar,
            editor,
            countDisplay,
            deleteButton
        );

        notesContainer.appendChild(noteElement);
    });
}

function createNote() {
    const note = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        content: "",
        createdAt: Date.now(),
        pinned: false,
        color: "default",
        category: "Other"
    };

    notes.unshift(note);
    saveNotes();

    searchInput.value = "";
    sortSelect.value = "newest";

    renderNotes();

    const editor = notesContainer.querySelector(
        `[data-note-id="${note.id}"].note-content`
    );

    editor?.focus();
}

function updateNote(noteId, content, formattedContent) {
    const note = notes.find(item => item.id === noteId);
    if (!note) {
        return;
    }
    note.content = content;
    note.formattedContent = sanitizeFormattedHtml(formattedContent);
    saveNotes();
}

function deleteNote(noteId) {
    notes = notes.filter(note => note.id !== noteId);
    saveNotes();
    renderNotes();
}

createBtn.addEventListener("click", createNote);

notesContainer.addEventListener("input", event => {
    const editor = event.target.closest(".note-content");
    if (!editor || !notesContainer.contains(editor)) {
        return;
    }

    const content = editor.innerText;
    updateNote(
        editor.dataset.noteId,
        content,
        editor.innerHTML
    );

    const noteElement = editor.closest(".input-box");
    const countDisplay = noteElement.querySelector(".note-count");

    const wordCount = content.trim()
        ? content.trim().split(/\s+/).length
        : 0;

    const characterCount = content.length;

    countDisplay.textContent =
        `Words: ${wordCount} · Characters: ${characterCount}`;
});

notesContainer.addEventListener("keyup", event => {
    const editor = event.target.closest(".note-content");
    if (editor) updateFormattingToolbar(editor);
});

notesContainer.addEventListener("mouseup", event => {
    const editor = event.target.closest(".note-content");
    if (editor) updateFormattingToolbar(editor);
});

notesContainer.addEventListener("focusin", event => {
    const editor = event.target.closest(".note-content");
    if (editor) updateFormattingToolbar(editor);
});

notesContainer.addEventListener("mousedown", event => {
    const formatButton = event.target.closest("[data-command]");
    if (formatButton) {
        event.preventDefault();
    }
});

notesContainer.addEventListener("click", event => {
    const formatButton = event.target.closest("[data-command]");

    if (formatButton && notesContainer.contains(formatButton)) {
        const command = formatButton.dataset.command;
        const noteElement = formatButton.closest(".input-box");
        const editor = noteElement?.querySelector(".note-content");
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, null);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        updateFormattingToolbar(editor);
        return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || !notesContainer.contains(actionButton)) {
        return;
    }

    const noteId = actionButton.dataset.noteId;
    if (actionButton.dataset.action === "delete") {
        deleteNote(noteId);
        return;
    }

    if (actionButton.dataset.action === "remove-tag") {
        const note = notes.find(item => item.id === noteId);
        if (!note || !Array.isArray(note.tags)) {
            return;
        }
        const tagToRemove = actionButton.dataset.tag;
        note.tags = note.tags.filter(tag => tag !== tagToRemove);
        saveNotes();
        renderNotes();
        return;
    }

    if (actionButton.dataset.action === "pin") {
        const note = notes.find(item => item.id === noteId);
        if (!note) {
            return;
        }
        note.pinned = !note.pinned;
        saveNotes();
        renderNotes();
    }
});

notesContainer.addEventListener("change", event => {
    const colorPicker = event.target.closest(".note-color-picker");
    if (!colorPicker) {
        return;
    }

    const note = notes.find(
        item => item.id === colorPicker.dataset.noteId
    );
    if (!note) {
        return;
    }

    if (!NOTE_COLORS.includes(colorPicker.value)) {
        return;
    }
    
    note.color = colorPicker.value;
    saveNotes();
    renderNotes();

    const updatedPicker = notesContainer.querySelector(
        `[data-note-id="${note.id}"].note-color-picker`
    );

    updatedPicker?.focus();
});


notesContainer.addEventListener("change", event => {
    const categoryPicker = event.target.closest(
        ".note-category-picker"
    );

    if (!categoryPicker) {
        return;
    }

    const note = notes.find(
        item => item.id === categoryPicker.dataset.noteId
    );

    if (!note || !NOTE_CATEGORIES.includes(categoryPicker.value)) {
        return;
    }

    note.category = categoryPicker.value;
    saveNotes();
});

notesContainer.addEventListener("keydown", event => {
    const tagInput = event.target.closest(".note-tag-input");

    if (!tagInput || event.key !== "Enter") {
        return;
    }

    event.preventDefault();

    const tag = tagInput.value.trim();
    const note = notes.find(
        item => item.id === tagInput.dataset.noteId
    );

    if (!note || !tag) {
        return;
    }

    if (!Array.isArray(note.tags)) {
        note.tags = [];
    }

    const alreadyExists = note.tags.some(
        existingTag => existingTag.toLowerCase() === tag.toLowerCase()
    );

    if (alreadyExists) {
        alert("This tag already exists on this note.");
        return;
    }

    note.tags.push(tag);
    saveNotes();

    tagInput.value = "";

    const tagElement = document.createElement("span");
    tagElement.className = "note-tag";

    const tagText = document.createElement("span");
    tagText.textContent = tag;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-tag-btn";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove tag ${tag}`);
    removeButton.dataset.action = "remove-tag";
    removeButton.dataset.noteId = note.id;
    removeButton.dataset.tag = tag;

    tagElement.append(tagText, removeButton);

    const tagsContainer = tagInput.nextElementSibling;
    tagsContainer.appendChild(tagElement);
});

renderNotes();
searchInput.addEventListener("input", renderNotes);
sortSelect.addEventListener("change", renderNotes);
categoryFilter.addEventListener("change", renderNotes);