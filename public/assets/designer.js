const canvas = document.querySelector("#canvas");
const output = document.querySelector("#layoutOutput");
const addText = document.querySelector("#addText");
const exportLayout = document.querySelector("#exportLayout");

let counter = 1;
let active = null;
let offset = { x: 0, y: 0 };

function addTextBox() {
  const box = document.createElement("div");
  box.className = "text-box";
  box.textContent = counter === 1 ? "Recipient Name" : `Field ${counter}`;
  box.dataset.key = `field_${counter}`;
  box.dataset.source = counter === 1 ? "name_en" : `column_${counter}`;
  box.dataset.direction = counter === 1 ? "ltr" : "rtl";
  box.style.left = `${40 + counter * 12}px`;
  box.style.top = `${60 + counter * 18}px`;
  box.contentEditable = "true";
  box.addEventListener("pointerdown", startDrag);
  canvas.appendChild(box);
  counter += 1;
}

function startDrag(event) {
  active = event.currentTarget;
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
}

function stopDrag() {
  active = null;
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
      fontSize: 20,
      align: "center",
      direction: box.dataset.direction,
      color: "#111827"
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

addText.addEventListener("click", addTextBox);
exportLayout.addEventListener("click", exportJson);
canvas.addEventListener("pointermove", drag);
canvas.addEventListener("pointerup", stopDrag);
canvas.addEventListener("pointercancel", stopDrag);
addTextBox();
