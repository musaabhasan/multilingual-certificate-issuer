const canvas = document.querySelector("#canvas");
const output = document.querySelector("#layoutOutput");
const addText = document.querySelector("#addText");
const exportLayout = document.querySelector("#exportLayout");
const applyField = document.querySelector("#applyField");
const fieldLabel = document.querySelector("#fieldLabel");
const fieldSource = document.querySelector("#fieldSource");
const fieldDirection = document.querySelector("#fieldDirection");
const fieldAlign = document.querySelector("#fieldAlign");
const fieldSize = document.querySelector("#fieldSize");
const fieldColor = document.querySelector("#fieldColor");

let counter = 1;
let active = null;
let selected = null;
let offset = { x: 0, y: 0 };

function addTextBox(settings = {}) {
  const box = document.createElement("div");
  box.className = "text-box";
  box.textContent = settings.label || (counter === 1 ? "Recipient Name" : `Field ${counter}`);
  box.dataset.key = settings.key || `field_${counter}`;
  box.dataset.source = settings.source || (counter === 1 ? "name_en" : `column_${counter}`);
  box.dataset.direction = settings.direction || (counter === 1 ? "ltr" : "rtl");
  box.dataset.align = settings.align || "center";
  box.dataset.fontSize = settings.fontSize || "20";
  box.dataset.color = settings.color || "#111827";
  box.style.left = `${settings.left || 44 + counter * 12}px`;
  box.style.top = `${settings.top || 64 + counter * 18}px`;
  applyBoxStyles(box);
  box.contentEditable = "true";
  box.addEventListener("pointerdown", startDrag);
  box.addEventListener("focus", () => selectBox(box));
  box.addEventListener("click", () => selectBox(box));
  canvas.appendChild(box);
  selectBox(box);
  counter += 1;
  exportJson();
}

function applyBoxStyles(box) {
  box.style.textAlign = box.dataset.align;
  box.style.direction = box.dataset.direction;
  box.style.fontSize = `${box.dataset.fontSize}px`;
  box.style.color = box.dataset.color;
}

function selectBox(box) {
  if (selected) {
    selected.classList.remove("selected");
  }
  selected = box;
  selected.classList.add("selected");
  fieldLabel.value = selected.textContent.trim();
  fieldSource.value = selected.dataset.source;
  fieldDirection.value = selected.dataset.direction;
  fieldAlign.value = selected.dataset.align;
  fieldSize.value = selected.dataset.fontSize;
  fieldColor.value = selected.dataset.color;
}

function startDrag(event) {
  active = event.currentTarget;
  selectBox(active);
  const rect = active.getBoundingClientRect();
  offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  active.setPointerCapture(event.pointerId);
}

function drag(event) {
  if (!active) return;
  const canvasRect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(event.clientX - canvasRect.left - offset.x, canvasRect.width - active.offsetWidth));
  const y = Math.max(0, Math.min(event.clientY - canvasRect.top - offset.y, canvasRect.height - active.offsetHeight));
  active.style.left = `${x}px`;
  active.style.top = `${y}px`;
  exportJson();
}

function stopDrag() {
  active = null;
}

function applySelectedField() {
  if (!selected) return;
  selected.textContent = fieldLabel.value.trim() || selected.dataset.key;
  selected.dataset.source = fieldSource.value.trim() || selected.dataset.source;
  selected.dataset.direction = fieldDirection.value;
  selected.dataset.align = fieldAlign.value;
  selected.dataset.fontSize = fieldSize.value || "20";
  selected.dataset.color = fieldColor.value;
  applyBoxStyles(selected);
  exportJson();
}

function exportJson() {
  const canvasRect = canvas.getBoundingClientRect();
  const elements = [...canvas.querySelectorAll(".text-box")].map((box) => {
    const rect = box.getBoundingClientRect();
    return {
      key: box.dataset.key,
      label: box.textContent.trim(),
      source: box.dataset.source,
      x: roundMm((rect.left - canvasRect.left) / canvasRect.width * 297),
      y: roundMm((rect.top - canvasRect.top) / canvasRect.height * 210),
      width: roundMm(rect.width / canvasRect.width * 297),
      height: roundMm(rect.height / canvasRect.height * 210),
      font: "dejavusans",
      fontSize: Number(box.dataset.fontSize),
      align: box.dataset.align,
      direction: box.dataset.direction,
      color: box.dataset.color
    };
  });

  output.value = JSON.stringify({
    page: { width: 297, height: 210, orientation: "landscape" },
    background: "storage/uploads/backgrounds/certificate.png",
    elements
  }, null, 2);
}

function roundMm(value) {
  return Math.round(value * 10) / 10;
}

addText.addEventListener("click", () => addTextBox());
exportLayout.addEventListener("click", exportJson);
applyField.addEventListener("click", applySelectedField);
canvas.addEventListener("pointermove", drag);
canvas.addEventListener("pointerup", stopDrag);
canvas.addEventListener("pointercancel", stopDrag);

addTextBox({ label: "Recipient Name", source: "name_en", direction: "ltr", align: "center", left: 170, top: 150 });
addTextBox({ label: "اسم المستلم", source: "name_ar", direction: "rtl", align: "center", left: 170, top: 205, fontSize: "24" });
