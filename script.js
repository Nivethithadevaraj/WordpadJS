//Editor
class Editor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.editor.addEventListener("keyup", () => this.updateActiveStates());
        this.editor.addEventListener("mouseup", () => this.updateActiveStates());
    }
    execCmd(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
        this.updateActiveStates();
    }
    formatBlock(tag) {
        document.execCommand("formatBlock", false, tag);
        this.editor.focus();
        this.updateActiveStates();
    }
    updateActiveStates() {
        const states = {
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
        };
        const b = document.getElementById("btn-bold");
        const i = document.getElementById("btn-italic");
        const u = document.getElementById("btn-underline");
        if (b) b.classList.toggle("active-format", states.bold);
        if (i) i.classList.toggle("active-format", states.italic);
        if (u) u.classList.toggle("active-format", states.underline);
    }
}

//Inserter
class Inserter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    insertLink() { const url = prompt("Enter URL:"); if (url) document.execCommand("createLink", false, url); }
    insertImage() {
        const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = ev => document.execCommand("insertImage", false, ev.target.result);
            r.readAsDataURL(file);
        };
        input.click();
    }
    insertImageURL() { const url = prompt("Enter image URL:"); if (url) document.execCommand("insertImage", false, url); }
    insertTable() {
        const rows = parseInt(prompt("Rows:"), 10); const cols = parseInt(prompt("Cols:"), 10);
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
}

//Viewer
class Viewer {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    clearFormatting() { document.execCommand("removeFormat", false, null); }
    resetContent() { if (confirm("Reset?")) this.editor.innerHTML = ""; }
    copyPlain() { navigator.clipboard.writeText(this.editor.innerText); }
    copyHTML() { navigator.clipboard.writeText(this.editor.innerHTML); }
    previewDoc() {
        const title = document.getElementById("docTitle")?.value || "";
        const content = this.editor.innerHTML;
        const previewWin = window.open("", "_blank", "width=900,height=700");
        previewWin.document.write(`
          <!DOCTYPE html>
          <html><head><title>${title}</title><link rel="stylesheet" href="style.css"></head>
          <body class="preview-body">
            <div class="page preview-page">
              <h1 class="title">${title}</h1>
              ${content}
            </div>
          </body></html>`);
        previewWin.document.close();
    }
}

//Exporter 
class Exporter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    getMetaData() {
        let title = document.getElementById("docTitle").value.trim();
        let author = document.getElementById("docAuthor").value.trim();
        if (!title) title = prompt("Enter document title:", "Untitled") || "Untitled";
        if (!author) author = prompt("Enter author name:", "Unknown") || "Unknown";
        return { title, author };
    }
    exportWord() {
        const { title, author } = this.getMetaData();
        const content = `<h1>${title}</h1><p>${author}</p>` + this.editor.innerHTML;
        const blob = new Blob([content], { type: "application/msword" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = title + ".doc";
        a.click();
    }
    exportPDF() {
        const { title, author } = this.getMetaData();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `<h1>${title}</h1><p><b>Author:</b> ${author}</p>${this.editor.innerHTML}`;
        const opt = {
            margin: 10, filename: title + ".pdf",
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(wrapper).toPdf().get('pdf').then(pdf => {
            pdf.setProperties({ title, subject: "WordPad Export", author, keywords: "WordPad, Export, PDF", creator: "Custom WordPad Clone" });
        }).save();
    }
}

//FileManager
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
        } catch (err) { console.error("Open cancelled", err); }
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
        } catch (err) { console.error("Save As cancelled", err); }
    }
    async saveFile() {
        try {
            if (!this.fileHandle) { await this.saveAs(); return; }
            const writable = await this.fileHandle.createWritable();
            await writable.write(this.editor.innerHTML);
            await writable.close();
            console.log("Saved:", this.fileName);
        } catch (err) { console.error("Save failed", err); }
    }
    toggleAutoSave() {
        const status = document.getElementById("autosaveStatus");
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            if (status) status.textContent = "AutoSave: OFF";
        } else {
            this.autoSaveInterval = setInterval(() => this.saveFile(), 3000);
            if (status) status.textContent = "AutoSave: ON ";
        }
    }
}

//Finder
class Finder {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.lastIndex = 0;
        this.lastQuery = "";
        this.statusEl = document.getElementById("findStatus");
    }

    getTextNodes() {
        const nodes = [];
        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                if (node.parentNode && node.parentNode.nodeName === "MARK" && node.parentNode.classList.contains("search-mark")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
    }

    getPlainText() {
        const nodes = this.getTextNodes();
        return nodes.map(n => n.nodeValue).join('');
    }

    makeRangeFromOffset(startOffset, length) {
        const nodes = this.getTextNodes();
        let acc = 0;
        let startNode = null, startNodeOffset = 0;
        let endNode = null, endNodeOffset = 0;

        for (let n of nodes) {
            const l = n.nodeValue.length;
            if (startOffset < acc + l) {
                startNode = n;
                startNodeOffset = startOffset - acc;
                break;
            }
            acc += l;
        }
        if (!startNode) return null;

        const endOffsetGlobal = startOffset + length;
        acc = 0;
        for (let n of nodes) {
            const l = n.nodeValue.length;
            if (endOffsetGlobal <= acc + l) {
                endNode = n;
                endNodeOffset = endOffsetGlobal - acc;
                break;
            }
            acc += l;
        }
        if (!endNode) {
            endNode = nodes[nodes.length - 1];
            endNodeOffset = endNode.nodeValue.length;
        }

        const range = document.createRange();
        try {
            range.setStart(startNode, startNodeOffset);
            range.setEnd(endNode, endNodeOffset);
            return range;
        } catch {
            return null;
        }
    }

    clearHighlights() {
        const marks = Array.from(this.editor.querySelectorAll('mark.search-mark'));
        marks.forEach(m => {
            const text = document.createTextNode(m.textContent);
            m.parentNode.replaceChild(text, m);
        });
        this.lastIndex = 0;
        this.lastQuery = "";
        this.showStatus("Highlights cleared");
    }

    showStatus(msg, timeout = 2000) {
        if (!this.statusEl) return;
        this.statusEl.textContent = msg;
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => this.statusEl.textContent = '', timeout);
    }

    findNext() {
        const q = document.getElementById("findText").value;
        if (!q) {
            this.showStatus("Enter text to find");
            return;
        }

        if (this.lastQuery !== q) {
            this.clearHighlights();
            this.lastQuery = q;
            this.lastIndex = 0;

            // highlight all matches
            const regex = new RegExp(q, "gi");
            this.getTextNodes().forEach(node => {
                const frag = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(node.nodeValue)) !== null) {
                    if (match.index > lastIndex) {
                        frag.appendChild(document.createTextNode(node.nodeValue.substring(lastIndex, match.index)));
                    }
                    const mark = document.createElement("mark");
                    mark.className = "search-mark";
                    mark.textContent = match[0];
                    frag.appendChild(mark);
                    lastIndex = match.index + match[0].length;
                }
                if (lastIndex < node.nodeValue.length) {
                    frag.appendChild(document.createTextNode(node.nodeValue.substring(lastIndex)));
                }
                if (frag.childNodes.length) node.parentNode.replaceChild(frag, node);
            });
        }

        const marks = Array.from(this.editor.querySelectorAll("mark.search-mark"));
        if (!marks.length) {
            this.showStatus("No matches");
            return;
        }

        const current = this.editor.querySelector("mark.search-mark.current");
        let index = current ? marks.indexOf(current) + 1 : 0;
        if (index >= marks.length) index = 0;

        marks.forEach(m => m.classList.remove("current"));
        marks[index].classList.add("current");
        marks[index].scrollIntoView({ behavior: "smooth", block: "center" });

        this.showStatus(`Match ${index + 1} of ${marks.length}`);
    }

    replace() {
        const q = document.getElementById("findText").value;
        const r = document.getElementById("replaceText").value;
        if (!q) { this.showStatus("Enter text to replace"); return; }

        let current = this.editor.querySelector('mark.search-mark.current');
        if (!current) {
            this.findNext();
            current = this.editor.querySelector('mark.search-mark.current');
            if (!current) { this.showStatus("No match to replace"); return; }
        }

        const replacementNode = document.createTextNode(r);
        current.parentNode.replaceChild(replacementNode, current);

        this.lastQuery = q;
        this.clearHighlights();
        this.showStatus("Replaced one");
    }

    replaceAll() {
        const q = document.getElementById("findText").value;
        const r = document.getElementById("replaceText").value;
        if (!q) { this.showStatus("Enter text to replace"); return; }

        const nodes = this.getTextNodes();
        const regex = new RegExp(q, "gi");
        let total = 0;
        nodes.forEach(node => {
            const matches = node.nodeValue.match(regex);
            if (matches) {
                total += matches.length;
                node.nodeValue = node.nodeValue.replace(regex, r);
            }
        });

        this.clearHighlights();
        this.lastIndex = 0;
        this.lastQuery = "";
        this.showStatus(total ? `Replaced ${total} occurrence(s)` : "No matches to replace");
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new Editor("editor");
    window.inserter = new Inserter("editor");
    window.viewer = new Viewer("editor");
    window.exporter = new Exporter("editor");
    window.fileManager = new FileManager("editor");
    window.finder = new Finder("editor");

    if (editor && editor.editor) editor.editor.focus();

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".toolbar").forEach(tb => tb.style.display = "none");
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.style.display = "flex";
        });
    });

    // Dark / Light Mode Toggle
    const toggleBtn = document.getElementById("modeToggle");
    function setMode(mode) {
        if (!toggleBtn) return;
        if (mode === "dark") {
            document.body.classList.add("dark");
            toggleBtn.textContent = "☀️ Light";
            toggleBtn.setAttribute("aria-pressed", "true");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark");
            toggleBtn.textContent = "🌙 Dark";
            toggleBtn.setAttribute("aria-pressed", "false");
            localStorage.setItem("theme", "light");
        }
    }
    const savedTheme = localStorage.getItem("theme") || "light";
    setMode(savedTheme);
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const isDark = document.body.classList.contains("dark");
            setMode(isDark ? "light" : "dark");
        });
    }
});