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
            justifyLeft: document.queryCommandState("justifyLeft"),
            justifyCenter: document.queryCommandState("justifyCenter"),
            justifyRight: document.queryCommandState("justifyRight"),
            insertUnorderedList: document.queryCommandState("insertUnorderedList"),
            insertOrderedList: document.queryCommandState("insertOrderedList")
        };

        const buttons = {
            bold: document.getElementById("btn-bold"),
            italic: document.getElementById("btn-italic"),
            underline: document.getElementById("btn-underline"),
            justifyLeft: document.getElementById("btn-justifyLeft"),
            justifyCenter: document.getElementById("btn-justifyCenter"),
            justifyRight: document.getElementById("btn-justifyRight"),
            insertUnorderedList: document.getElementById("btn-bulleted"),
            insertOrderedList: document.getElementById("btn-numbered")
        };

        for (let cmd in states) {
            if (buttons[cmd]) {
                buttons[cmd].classList.toggle("active-format", states[cmd]);
            }
        }
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
            r.onload = ev => {
                const img = document.createElement("img");
                img.src = ev.target.result;
                img.style.maxWidth = "100%";
                document.getElementById("editor").appendChild(img);
            };
            r.readAsDataURL(file);
        };
        input.click();
    }
    insertImageURL() {
        const url = prompt("Enter image URL:");
        if (url) {
            const img = document.createElement("img");
            img.src = url;
            img.style.maxWidth = "100%";
            document.getElementById("editor").appendChild(img);
        }
    }
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
    addRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentNode;
        const newRow = row.cloneNode(true);
        newRow.querySelectorAll("td").forEach(td => td.textContent = "");
        row.parentNode.insertBefore(newRow, row.nextSibling);
    }
    addColumn() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const colIndex = Array.from(cell.parentNode.children).indexOf(cell);
        const table = cell.closest("table");
        Array.from(table.rows).forEach(row => {
            const newCell = row.insertCell(colIndex + 1);
            newCell.textContent = "";
        });
    }
    removeRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentNode;
        row.parentNode.removeChild(row);
    }
    removeColumn() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const colIndex = Array.from(cell.parentNode.children).indexOf(cell);
        const table = cell.closest("table");
        Array.from(table.rows).forEach(row => {
            if (row.cells[colIndex]) row.deleteCell(colIndex);
        });
    }
    removeTable() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const table = cell.closest("table");
        table.parentNode.removeChild(table);
    }
    getSelectedCell() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        let node = sel.anchorNode;
        while (node && node.nodeName !== "TD") {
            node = node.parentNode;
        }
        return node;
    }
}
// Image Handler
class ImageHandler {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.lastClickedImage = null;
        this.init();
    }

    init() {
        this.editor.addEventListener("click", e => {
            if (e.target.tagName === "IMG") {
                this.lastClickedImage = e.target;
                this.makeResizableDraggable(e.target);
                const imgTools = document.getElementById("image-tools");
                if (imgTools) imgTools.style.display = "inline-flex";
            } else {
                const imgTools = document.getElementById("image-tools");
                if (imgTools) imgTools.style.display = "none";
            }
        });
    }

    makeResizableDraggable(img) {
        if (!img.parentNode.classList.contains("img-wrapper")) {
            const wrapper = document.createElement("div");
            wrapper.className = "img-wrapper";
            wrapper.style.position = "absolute";
            wrapper.style.left = img.offsetLeft + "px";
            wrapper.style.top = img.offsetTop + "px";
            wrapper.style.display = "inline-block";
            wrapper.style.cursor = "move";

            this.editor.style.position = "relative"; 
            this.editor.appendChild(wrapper);
            wrapper.appendChild(img);

            wrapper.onmousedown = e => {
                if (e.target.classList.contains("resize-handle")) return;
                e.preventDefault();
                const shiftX = e.clientX - wrapper.getBoundingClientRect().left;
                const shiftY = e.clientY - wrapper.getBoundingClientRect().top;

                const moveAt = (pageX, pageY) => {
                    const editorRect = this.editor.getBoundingClientRect();
                    let newLeft = pageX - editorRect.left - shiftX;
                    let newTop = pageY - editorRect.top - shiftY;

                    newLeft = Math.max(0, Math.min(newLeft, editorRect.width - wrapper.offsetWidth));
                    newTop = Math.max(0, Math.min(newTop, editorRect.height - wrapper.offsetHeight));

                    wrapper.style.left = newLeft + "px";
                    wrapper.style.top = newTop + "px";
                };

                const onMouseMove = e2 => moveAt(e2.pageX, e2.pageY);

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", () => {
                    document.removeEventListener("mousemove", onMouseMove);
                }, { once: true });
            };

            wrapper.ondragstart = () => false;

            ["nw", "ne", "sw", "se"].forEach(corner => {
                const handle = document.createElement("div");
                handle.className = "resize-handle";
                handle.style.width = "10px";
                handle.style.height = "10px";
                handle.style.background = "blue";
                handle.style.position = "absolute";
                handle.style.cursor = corner + "-resize";

                if (corner === "nw") { handle.style.left = "0"; handle.style.top = "0"; }
                if (corner === "ne") { handle.style.right = "0"; handle.style.top = "0"; }
                if (corner === "sw") { handle.style.left = "0"; handle.style.bottom = "0"; }
                if (corner === "se") { handle.style.right = "0"; handle.style.bottom = "0"; }

                wrapper.appendChild(handle);

                handle.addEventListener("mousedown", e => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startW = img.offsetWidth;
                    const startH = img.offsetHeight;

                    const onMouseMove = e2 => {
                        let newW = startW + (e2.clientX - startX) * (corner.includes("e") ? 1 : -1);
                        let newH = startH + (e2.clientY - startY) * (corner.includes("s") ? 1 : -1);
                        if (newW > 10 && newH > 10) {
                            img.style.width = newW + "px";
                            img.style.height = newH + "px";
                        }
                    };
                    const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                    };
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                });
            });
        }
    }
    cropImage() {
        if (!this.lastClickedImage) {
            alert("Click an image first, then crop.");
            return;
        }
        const img = this.lastClickedImage;
        const maxW = img.naturalWidth;
        const maxH = img.naturalHeight;

        const cropLeft = parseInt(prompt(`Crop from left (0-${maxW - 10}):`, 0), 10) || 0;
        const cropRight = parseInt(prompt(`Crop from right (0-${maxW - cropLeft - 10}):`, 0), 10) || 0;
        const cropTop = parseInt(prompt(`Crop from top (0-${maxH - 10}):`, 0), 10) || 0;
        const cropBottom = parseInt(prompt(`Crop from bottom (0-${maxH - cropTop - 10}):`, 0), 10) || 0;

        const newW = maxW - cropLeft - cropRight;
        const newH = maxH - cropTop - cropBottom;

        if (newW < 10 || newH < 10) {
            alert("Invalid crop size, image too small after cropping.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            img,
            cropLeft, cropTop, newW, newH,
            0, 0, newW, newH                
        );

        img.src = canvas.toDataURL();
        img.style.width = newW + "px";
        img.style.height = newH + "px";
    }

}

//Viewer
class Viewer {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
    }
    clearFormatting() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const content = range.cloneContents();
        const div = document.createElement("div");
        div.appendChild(content);
        const plain = div.textContent || div.innerText || "";
        document.execCommand("insertText", false, plain);
    }
    resetContent() {
        if (confirm("Reset?")) this.editor.innerHTML = "";
    }
    copyPlain() {
        const text = this.editor.innerText;
        navigator.clipboard.writeText(text).then(() => {
            alert("Copied plain text!");
        });
    }
    copyHTML() {
        const html = this.editor.innerHTML;
        navigator.clipboard.writeText(html).then(() => {
            alert("Copied HTML!");
        });
    }
    previewDoc() {
        const title = document.getElementById("docTitle")?.value || "Preview";
        const content = this.editor.innerHTML;
        const previewWin = window.open("", "_blank", "width=900,height=700");
        previewWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Calibri, Arial, sans-serif; padding: 20px; }
              .title { text-align:center; margin-bottom:20px; }
            </style>
          </head>
          <body>
            <h1 class="title">${title}</h1>
            ${content}
          </body>
          </html>
        `);
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
    async saveFile() {
        try {
            if (!this.fileHandle) {
                this.fileHandle = await window.showSaveFilePicker({
                    suggestedName: "document.docx",
                    types: [{
                        description: "Word Document",
                        accept: {
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
                        }
                    }]
                });
                this.fileName = this.fileHandle.name;
                this.updateTitle();
            }
            const title = document.getElementById("docTitle")?.value || "Untitled";
            const author = document.getElementById("docAuthor")?.value || "Unknown";
            const content = `
              <html xmlns:o='urn:schemas-microsoft-com:office:office'
                    xmlns:w='urn:schemas-microsoft-com:office:word'
                    xmlns='http://www.w3.org/TR/REC-html40'>
              <head><meta charset="utf-8"><title>${title}</title></head>
              <body>
                <h1>${title}</h1>
                <p><b>Author:</b> ${author}</p>
                ${this.editor.innerHTML}
              </body>
              </html>`;
            const blob = new Blob([content], {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
            const writable = await this.fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log("AutoSaved:", this.fileName);
            this.editor.focus();
        } catch (err) {
            console.error("AutoSave failed", err);
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

    if (Editor && Editor.editor) Editor.editor.focus();

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".toolbar").forEach(tb => tb.style.display = "none");
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.style.display = "flex";
            if (editor && editor.editor) editor.editor.focus();
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
    document.addEventListener("selectionchange", () => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.anchorNode;
        while (node && node.nodeName !== "TABLE" && node.nodeName !== "TD") {
            node = node.parentNode;
        }

        const tools = document.getElementById("table-tools");
        if (tools) {
            tools.style.display = node ? "inline-flex" : "none";
        }
    });
    window.imageHandler = new ImageHandler("editor");
});