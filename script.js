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
