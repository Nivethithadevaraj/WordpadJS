class Editor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
    }
    execCmd(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
    }
    formatBlock(tag) {
        document.execCommand("formatBlock", false, tag);
        this.editor.focus();
    }
}

class Inserter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    insertLink() { const url = prompt("Enter URL:"); if (url) document.execCommand("createLink", false, url); }
    insertImage() {
        const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader(); r.onload = ev => document.execCommand("insertImage", false, ev.target.result); r.readAsDataURL(file);
        };
        input.click();
    }
    insertImageURL() { const url = prompt("Enter image URL:"); if (url) document.execCommand("insertImage", false, url); }
    insertTable() {
        const rows = parseInt(prompt("Rows:"), 10); const cols = parseInt(prompt("Cols:"), 10);
        if (!rows || !cols) return; let html = "<table>";
        for (let r = 0; r < rows; r++) { html += "<tr>"; for (let c = 0; c < cols; c++) html += "<td></td>"; html += "</tr>"; }
        html += "</table>"; document.execCommand("insertHTML", false, html);
    }
}

class Viewer {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
    }

    clearFormatting() {
        document.execCommand("removeFormat", false, null);
    }

    resetContent() {
        if (confirm("Reset?")) this.editor.innerHTML = "";
    }

    copyPlain() {
        navigator.clipboard.writeText(this.editor.innerText);
    }

    copyHTML() {
        navigator.clipboard.writeText(this.editor.innerHTML);
    }

    previewDoc() {
        const title = document.getElementById("docTitle")?.value || "";
        const content = this.editor.innerHTML;

        const previewWin = window.open("", "_blank", "width=900,height=700");
        previewWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link rel="stylesheet" href="style.css">
      </head>
      <body class="preview-body">
        <div class="page preview-page">
          <h1 class="title">${title}</h1>
          ${content}
        </div>
      </body>
      </html>
    `);
        previewWin.document.close();
    }
}

class Exporter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    exportWord() {
        const title = document.getElementById("docTitle").value || "Untitled";
        const author = document.getElementById("docAuthor").value || "Unknown";
        const content = `<h1>${title}</h1><p>${author}</p>` + this.editor.innerHTML;
        const blob = new Blob([content], { type: "application/msword" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = title + ".doc"; a.click();
    }
    exportPDF() { const w = window.open("", "_blank"); w.document.write(this.editor.innerHTML); w.print(); }
}
class FileManager {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.fileHandle = null;
        this.fileName = "Untitled Document";
        this.autoSaveInterval = null;
        this.updateTitle();
    }

    updateTitle() {
        document.title = this.fileName + " - WordPad";
        const label = document.getElementById("currentFile");
        if (label) label.textContent = "Current File: " + this.fileName;
    }

    newDoc() {
        if (confirm("Clear the document?")) {
            this.editor.innerHTML = "";
            this.fileHandle = null;
            this.fileName = "Untitled Document";
            this.updateTitle();
        }
    }

    async openFile() {
        try {
            [this.fileHandle] = await window.showOpenFilePicker({
                types: [{ description: "HTML Document", accept: { "text/html": [".html"] } }]
            });
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            this.editor.innerHTML = text;
            this.fileName = this.fileHandle.name;
            this.updateTitle();
        } catch (err) {
            console.error("Open cancelled", err);
        }
    }

    async saveAs() {
        try {
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: "document.html",
                types: [{ description: "HTML Document", accept: { "text/html": [".html"] } }]
            });
            this.fileName = this.fileHandle.name;
            await this.saveFile();
            this.updateTitle();
        } catch (err) {
            console.error("Save As cancelled", err);
        }
    }

    async saveFile() {
        try {
            if (!this.fileHandle) {
                await this.saveAs();
                return;
            }
            const writable = await this.fileHandle.createWritable();
            await writable.write(this.editor.innerHTML);
            await writable.close();
            console.log("Saved:", this.fileName);
        } catch (err) {
            console.error("Save failed", err);
        }
    }

    toggleAutoSave() {
        const status = document.getElementById("autosaveStatus");
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            if (status) status.textContent = "AutoSave: OFF";
        } else {
            this.autoSaveInterval = setInterval(() => this.saveFile(), 3000);
            if (status) status.textContent = "AutoSave: ON → " + this.fileName;
        }
    }
}

// Instances
const editor = new Editor("editor");
const inserter = new Inserter("editor");
const viewer = new Viewer("editor");
const exporter = new Exporter("editor");
const fileManager = new FileManager("editor");

// Cursor auto-focus
window.onload = () => { editor.editor.focus(); };

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".toolbar").forEach(tb => tb.style.display = "none");
        document.getElementById(btn.dataset.tab).style.display = "flex";
    });
});
