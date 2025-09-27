class Editor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.editor.focus();
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
const editor = new Editor("editor");
// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".toolbar").forEach(tb => tb.style.display = "none");
        document.getElementById(btn.dataset.tab).style.display = "flex";
    });
});
class Inserter {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.enableDragDrop();
        this.observeNewElements();
    }
    insertLink() {
        const url = prompt("Enter URL:");
        if (url) document.execCommand("createLink", false, url);
    }
    insertImage() {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                document.execCommand("insertImage", false, ev.target.result);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }
    insertImageURL() {
        const url = prompt("Enter image URL:");
        if (url) document.execCommand("insertImage", false, url);
    }
    insertTable() {
        const rows = parseInt(prompt("Rows:"), 10);
        const cols = parseInt(prompt("Cols:"), 10);
        if (!rows || !cols) return;
        let html = "<table>";
        for (let r = 0; r < rows; r++) {
            html += "<tr>";
            for (let c = 0; c < cols; c++) html += "<td></td>";
            html += "</tr>";
        }
        html += "</table>";
        document.execCommand("insertHTML", false, html);
    }
    enableDragDrop() {
        this.editor.addEventListener("dragover", e => e.preventDefault());
        this.editor.addEventListener("drop", e => e.preventDefault());
    }
    observeNewElements() {
        const obs = new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(node => {
                if (node.nodeName === "IMG" || node.nodeName === "TABLE") node.draggable = true;
            }));
        });
        obs.observe(this.editor, { childList: true, subtree: true });
    }
}
const inserter = new Inserter("editor");
class Viewer {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    clearFormatting() { document.execCommand("removeFormat", false, null); }
    resetContent() { if (confirm("Reset?")) this.editor.innerHTML = ""; }
    copyPlain() { navigator.clipboard.writeText(this.editor.innerText); }
    copyHTML() { navigator.clipboard.writeText(this.editor.innerHTML); }
    previewDoc() {
        const w = window.open("", "_blank");
        w.document.write(this.editor.innerHTML);
        w.document.close();
    }
}
const viewer = new Viewer("editor");

class Exporter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    exportWord() {
        const title = document.getElementById("docTitle").value || "Untitled";
        const author = document.getElementById("docAuthor").value || "Unknown";
        const content = `<h1>${title}</h1><p>${author}</p>` + this.editor.innerHTML;
        const blob = new Blob([content], { type: "application/msword" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = title + ".doc"; a.click();
    }
    exportPDF() {
        const w = window.open("", "_blank");
        w.document.write(this.editor.innerHTML);
        w.print();
    }
}
const exporter = new Exporter("editor");

