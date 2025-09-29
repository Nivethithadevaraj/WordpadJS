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
        if (window.historyManager) historyManager.save();   // track formatting & commands
    }
    formatBlock(tag) {
        document.execCommand("formatBlock", false, tag);
        this.editor.focus();
        this.updateActiveStates();
        if (window.historyManager) historyManager.save();   // track headings etc.
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

// History Manager (MutationObserver + debounced saves + undo/redo that restores HTML)
class HistoryManager {
    constructor(editorId, options = {}) {
        this.editor = document.getElementById(editorId);
        this.stack = [];
        this.index = -1;
        this.max = options.max || 200;           // keep last N states
        this.debounceMs = options.debounceMs || 150;
        this._debounceTimer = null;
        this._isRestoring = false;

        // MutationObserver to catch changes (insertImage via DOM append, img.src changes, attributes, moves)
        this.observeConfig = { childList: true, subtree: true, attributes: true, characterData: true };
        this.observer = new MutationObserver((mutations) => this._onMutations(mutations));
        this.observer.observe(this.editor, this.observeConfig);

        // Also listen to input for typing
        this.editor.addEventListener("input", () => this.save());

        // initial snapshot
        this.save();
    }

    _onMutations(mutations) {
        // ignore if we are restoring (undo/redo)
        if (this._isRestoring) return;
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.save(), this.debounceMs);
    }

    save() {
        if (this._isRestoring) return; // don't save while restoring
        const content = this.editor.innerHTML;
        // avoid duplicate consecutive states
        if (this.index >= 0 && this.stack[this.index] === content) return;
        // cut future if we've undone some steps
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(content);
        // limit size
        if (this.stack.length > this.max) {
            const excess = this.stack.length - this.max;
            this.stack.splice(0, excess);
        }
        this.index = this.stack.length - 1;
    }

    undo() {
        if (this.index <= 0) {
            // nothing to undo
            return;
        }
        // prevent observer from capturing our innerHTML set
        this._isRestoring = true;
        this.observer.disconnect();

        // clear any active wrappers so we restore clean DOM (ObjectHandler will recreate wrappers on click)
        if (window.objectHandler && typeof objectHandler.clearWrapper === 'function') {
            try { objectHandler.clearWrapper(); } catch (e) { /* ignore */ }
        }

        this.index--;
        this.editor.innerHTML = this.stack[this.index];

        // reconnect observer and finish
        this.observer.observe(this.editor, this.observeConfig);
        this._isRestoring = false;

        // refresh UI states and focus
        if (window.editor) {
            try { editor.updateActiveStates(); } catch (e) { /* ignore */ }
            try { editor.editor.focus(); } catch (e) { /* ignore */ }
        }
    }

    redo() {
        if (this.index >= this.stack.length - 1) return;
        this._isRestoring = true;
        this.observer.disconnect();

        if (window.objectHandler && typeof objectHandler.clearWrapper === 'function') {
            try { objectHandler.clearWrapper(); } catch (e) { /* ignore */ }
        }

        this.index++;
        this.editor.innerHTML = this.stack[this.index];

        this.observer.observe(this.editor, this.observeConfig);
        this._isRestoring = false;

        if (window.editor) {
            try { editor.updateActiveStates(); } catch (e) { /* ignore */ }
            try { editor.editor.focus(); } catch (e) { /* ignore */ }
        }
    }
}

//Inserter
class Inserter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }

    insertLink() {
        const url = document.getElementById("linkUrl")?.value.trim();
        if (url) {
            document.execCommand("createLink", false, url);
            if (window.historyManager) historyManager.save();
        }
    }

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
                if (window.historyManager) historyManager.save();
            };
            r.readAsDataURL(file);
        };
        input.click();
    }

    insertImageURL() {
        const url = document.getElementById("imgUrl")?.value.trim();
        if (!url) return;
        const img = document.createElement("img");
        img.src = url;
        img.style.maxWidth = "100%";
        document.getElementById("editor").appendChild(img);
        if (window.historyManager) historyManager.save();
    }

    insertTable() {
        const rows = parseInt(document.getElementById("tableRows")?.value, 10);
        const cols = parseInt(document.getElementById("tableCols")?.value, 10);
        if (!rows || !cols) return;

        let html = "<table>";
        for (let r = 0; r < rows; r++) {
            html += "<tr>";
            for (let c = 0; c < cols; c++) html += "<td></td>";
            html += "</tr>";
        }
        html += "</table>";
        document.execCommand("insertHTML", false, html);
        if (window.historyManager) historyManager.save();
    }

    addRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentNode;
        const newRow = row.cloneNode(true);
        newRow.querySelectorAll("td").forEach(td => td.textContent = "");
        row.parentNode.insertBefore(newRow, row.nextSibling);
        if (window.historyManager) historyManager.save();
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
        if (window.historyManager) historyManager.save();
    }
    removeRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentNode;
        row.parentNode.removeChild(row);
        if (window.historyManager) historyManager.save();
    }
    removeColumn() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const colIndex = Array.from(cell.parentNode.children).indexOf(cell);
        const table = cell.closest("table");
        Array.from(table.rows).forEach(row => {
            if (row.cells[colIndex]) row.deleteCell(colIndex);
        });
        if (window.historyManager) historyManager.save();
    }
    removeTable() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const table = cell.closest("table");
        table.parentNode.removeChild(table);
        if (window.historyManager) historyManager.save();
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

// Object Handler
class ObjectHandler {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.activeWrapper = null;
        this.init();
    }
    init() {
        this.editor.addEventListener("click", e => {
            if (e.target.tagName === "IMG" || e.target.tagName === "TABLE") {
                this.showWrapper(e.target);
                e.stopPropagation();
            } else {
                this.clearWrapper();
            }
        });
        document.addEventListener("click", e => {
            if (!this.editor.contains(e.target)) {
                this.clearWrapper();
            }
        });
    }
    showWrapper(el) {
        this.clearWrapper();
        const wrapper = document.createElement("div");
        wrapper.className = "obj-wrapper";
        wrapper.style.position = "absolute";
        wrapper.style.left = el.offsetLeft + "px";
        wrapper.style.top = el.offsetTop + "px";
        wrapper.style.width = el.offsetWidth + "px";
        wrapper.style.height = el.offsetHeight + "px";
        wrapper.style.display = "inline-block";
        this.editor.style.position = "relative";
        this.editor.appendChild(wrapper);
        wrapper.appendChild(el);

        if (el.tagName === "IMG" || el.tagName === "TABLE") {
            const moveHandle = document.createElement("div");
            moveHandle.className = "move-handle";
            moveHandle.style.width = "12px";
            moveHandle.style.height = "12px";
            moveHandle.style.background = "blue";
            moveHandle.style.position = "absolute";
            moveHandle.style.top = "-6px";
            moveHandle.style.left = "-6px";
            moveHandle.style.cursor = "move";
            wrapper.appendChild(moveHandle);

            const resizeHandle = document.createElement("div");
            resizeHandle.className = "resize-handle";
            resizeHandle.style.width = "12px";
            resizeHandle.style.height = "12px";
            resizeHandle.style.background = "blue";
            resizeHandle.style.position = "absolute";
            resizeHandle.style.bottom = "-6px";
            resizeHandle.style.right = "-6px";
            resizeHandle.style.cursor = "se-resize";
            wrapper.appendChild(resizeHandle);

            this.attachMove(wrapper, moveHandle);
            this.attachResize(wrapper, resizeHandle, el);
        }
        this.activeWrapper = wrapper;
        if (window.historyManager) historyManager.save();
    }
    attachMove(wrapper, handle) {
        handle.addEventListener("mousedown", e => {
            e.preventDefault();
            const shiftX = e.clientX - wrapper.getBoundingClientRect().left;
            const shiftY = e.clientY - wrapper.getBoundingClientRect().top;
            const editorRect = this.editor.getBoundingClientRect();
            const moveAt = (pageX, pageY) => {
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
                if (window.historyManager) historyManager.save();
            }, { once: true });
        });
    }
    attachResize(wrapper, handle, el) {
        handle.addEventListener("mousedown", e => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = el.offsetWidth;
            const startH = el.offsetHeight;
            const onMouseMove = e2 => {
                const newW = Math.max(30, startW + (e2.clientX - startX));
                const newH = Math.max(30, startH + (e2.clientY - startY));
                el.style.width = newW + "px";
                el.style.height = newH + "px";
                wrapper.style.width = newW + "px";
                wrapper.style.height = newH + "px";
            };
            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                if (window.historyManager) historyManager.save();
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }
    clearWrapper() {
        if (this.activeWrapper) {
            const el = this.activeWrapper.querySelector("img, table");
            if (el) {
                this.editor.insertBefore(el, this.activeWrapper);
            }
            this.activeWrapper.remove();
            this.activeWrapper = null;
        }
    }
}

// Viewer
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
        if (window.historyManager) historyManager.save();
    }
    resetContent() {
        this.editor.innerHTML = ""; 
        if (window.historyManager) historyManager.save();
    }
    copyPlain() {
        const text = this.editor.innerText;
        navigator.clipboard.writeText(text);
    }
    copyHTML() {
        const html = this.editor.innerHTML;
        navigator.clipboard.writeText(html);
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

// Exporter 
class Exporter {
    constructor(editorId) { this.editor = document.getElementById(editorId); }
    getMetaData() {
        let title = document.getElementById("docTitle").value.trim() || "Untitled";
        let author = document.getElementById("docAuthor").value.trim() || "Unknown";
        return { title, author };
    }
    exportWord() {
        const { title, author } = this.getMetaData();
        const content = `
  <h1>${title}</h1><p>${author}</p>
  <style>
    table { border-collapse: collapse; }
    td, th { border: 1px solid #000; padding: 5px; }
    table, td, th { table-layout: fixed; }
    img, table { max-width: 100%; }
  </style>
  ${this.editor.innerHTML}
`;
        const blob = new Blob([content], { type: "application/msword" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = title + ".doc";
        a.click();
    }
    exportPDF() {
        const { title, author } = this.getMetaData();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
  <h1>${title}</h1><p><b>Author:</b> ${author}</p>
  <style>
    table { border-collapse: collapse; }
    td, th { border: 1px solid #000; padding: 5px; }
    table, td, th { table-layout: fixed; }
    img, table { max-width: 100%; }
  </style>
  ${this.editor.innerHTML}
`;
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
        this.editor.innerHTML = "";
        this.fileHandle = null;
        this.fileName = "Untitled Document";
        this.updateTitle();
        if (window.historyManager) historyManager.save();
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
        if (window.historyManager) historyManager.save();
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
        if (window.historyManager) historyManager.save();
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
    window.objectHandler = new ObjectHandler("editor");
    window.historyManager = new HistoryManager("editor");

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

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.key.toLowerCase() === "z") {
            e.preventDefault();
            historyManager.undo();
        }
        if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
            e.preventDefault();
            historyManager.redo();
        }
    });
});