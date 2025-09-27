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
