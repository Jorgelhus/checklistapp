import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// pdf-lib runs entirely in the browser and lets us edit an existing PDF template
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// -----------------------------
// Helper data
// -----------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);

const range = (start, end, step = 1) => {
  const out = [];
  for (let i = start; i <= end; i += step) out.push(i);
  return out;
};

// Visual inspection: 21 top-level items.
// Items 1 and 3 have 4 sub-items each.
const visualItems = [
  { id: "V1", label: "Item 1", children: [
    { id: "V1-a", label: "Sub-item 1" },
    { id: "V1-b", label: "Sub-item 2" },
    { id: "V1-c", label: "Sub-item 3" },
    { id: "V1-d", label: "Sub-item 4" },
  ] },
  { id: "V2", label: "Item 2" },
  { id: "V3", label: "Item 3", children: [
    { id: "V3-a", label: "Sub-item 1" },
    { id: "V3-b", label: "Sub-item 2" },
    { id: "V3-c", label: "Sub-item 3" },
    { id: "V3-d", label: "Sub-item 4" },
  ] },
  { id: "V4", label: "Item 4" },
  { id: "V5", label: "Item 5" },
  { id: "V6", label: "Item 6" },
  { id: "V7", label: "Item 7" },
  { id: "V8", label: "Item 8" },
  { id: "V9", label: "Item 9" },
  { id: "V10", label: "Item 10" },
  { id: "V11", label: "Item 11" },
  { id: "V12", label: "Item 12" },
  { id: "V13", label: "Item 13" },
  { id: "V14", label: "Item 14" },
  { id: "V15", label: "Item 15" },
  { id: "V16", label: "Item 16" },
  { id: "V17", label: "Item 17" },
  { id: "V18", label: "Item 18" },
  { id: "V19", label: "Item 19" },
  { id: "V20", label: "Item 20" },
  { id: "V21", label: "Item 21" },
];

// Operational inspection: A-J (10 items). E and F have 4 sub-items each
const operationalItems = [
  { id: "O-A", label: "A" },
  { id: "O-B", label: "B" },
  { id: "O-C", label: "C" },
  { id: "O-D", label: "D" },
  { id: "O-E", label: "E", children: [
    { id: "O-E-1", label: "E-1" },
    { id: "O-E-2", label: "E-2" },
    { id: "O-E-3", label: "E-3" },
    { id: "O-E-4", label: "E-4" },
  ] },
  { id: "O-F", label: "F", children: [
    { id: "O-F-1", label: "F-1" },
    { id: "O-F-2", label: "F-2" },
    { id: "O-F-3", label: "F-3" },
    { id: "O-F-4", label: "F-4" },
  ] },
  { id: "O-G", label: "G" },
  { id: "O-H", label: "H" },
  { id: "O-I", label: "I" },
  { id: "O-J", label: "J" },
];

// -----------------------------
// PDF coordinate mapping (EDIT THESE)
// -----------------------------
// You will add the precise coordinates for your template.pdf here.
// Coordinates are in PDF user space (origin at bottom-left). Units are points.
// Leave entries undefined to skip.
const headerPlacement = {
  date: { page: 0, x: 100, y: 700 }, // TODO: set exact x,y
  truck: { page: 0, x: 100, y: 680 },
  operator: { page: 0, x: 100, y: 660 },
  startHour: { page: 0, x: 400, y: 700 },
  endHour: { page: 0, x: 400, y: 680 },
  fuel: { page: 0, x: 400, y: 660 },
};

// Map each checkbox id to a coordinate on the template where the box should be marked
const checkboxPlacement = {
  // Visual items
  V1: { page: 0, x: 60, y: 600 },
  "V1-a": { page: 0, x: 80, y: 582 },
  "V1-b": { page: 0, x: 80, y: 564 },
  "V1-c": { page: 0, x: 80, y: 546 },
  "V1-d": { page: 0, x: 80, y: 528 },
  V2: { page: 0, x: 60, y: 510 },
  V3: { page: 0, x: 60, y: 492 },
  "V3-a": { page: 0, x: 80, y: 474 },
  "V3-b": { page: 0, x: 80, y: 456 },
  "V3-c": { page: 0, x: 80, y: 438 },
  "V3-d": { page: 0, x: 80, y: 420 },
  // ...add coordinates for the rest of V4..V21 and O-*
};

// -----------------------------
// UI Components
// -----------------------------
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-5 ${className}`}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl font-semibold text-gray-900 mb-4">{children}</h2>
  );
}

function Stepper({ step, setStep, total }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-4">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
      <div className="text-sm text-gray-600">Step {step + 1} / {total}</div>
    </div>
  );
}

function CheckboxRow({ id, label, state, setState }) {
  const checked = Boolean(state[id]?.checked);
  const comment = state[id]?.comment || "";

  return (
    <div className="border rounded-xl p-3 mb-2">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={checked}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              [id]: { checked: e.target.checked, comment: e.target.checked ? (prev[id]?.comment || "") : "" },
            }))
          }
        />
        <span className="text-gray-900 font-medium select-none">{label}</span>
      </label>

      <AnimatePresence initial={false}>
        {checked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <textarea
              className="mt-3 w-full rounded-xl border p-3 text-sm"
              placeholder="Add comment (optional)"
              rows={3}
              value={comment}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  [id]: { checked: true, comment: e.target.value },
                }))
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupedChecklist({ title, items, state, setState, imageSrc }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Reference diagram"
          className="w-full rounded-xl mb-4 object-contain"
        />
      )}
      <div className="flex flex-col">
        {items.map((item) => (
          <div key={item.id} className="mb-3">
            <CheckboxRow id={item.id} label={item.label} state={state} setState={setState} />
            {item.children?.length > 0 && (
              <div className="ml-6">
                {item.children.map((c) => (
                  <CheckboxRow key={c.id} id={c.id} label={c.label} state={state} setState={setState} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// -----------------------------
// PDF generation
// -----------------------------
async function generatePdf({
  header, // {date, truck, operator, startHour, endHour, fuel}
  checks, // object mapping id -> {checked, comment}
}) {
  // Fetch template.pdf from the same directory (place it in /public or project root on Pages)
  const templateBytes = await fetch("template.pdf").then((r) => {
    if (!r.ok) throw new Error("template.pdf not found. Add it to your repo root or public folder.");
    return r.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const drawText = (pageIndex, text, x, y, size = 10) => {
    if (pageIndex == null || x == null || y == null) return; // skip if not configured
    const page = pdfDoc.getPage(pageIndex);
    page.drawText(String(text ?? ""), { x, y, size, font: helv, color: rgb(0, 0, 0) });
  };

  const drawCheck = (pageIndex, x, y, size = 10) => {
    if (pageIndex == null || x == null || y == null) return;
    const page = pdfDoc.getPage(pageIndex);
    // Draw an "X" inside a checkbox square
    page.drawRectangle({ x: x - 2, y: y - 2, width: size + 4, height: size + 4, borderWidth: 0.5, color: rgb(1, 1, 1), borderColor: rgb(0,0,0) });
    page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 1, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 1, color: rgb(0, 0, 0) });
  };

  // 1) Header text placements
  drawText(headerPlacement.date?.page, header.date, headerPlacement.date?.x, headerPlacement.date?.y);
  drawText(headerPlacement.truck?.page, header.truck, headerPlacement.truck?.x, headerPlacement.truck?.y);
  drawText(headerPlacement.operator?.page, header.operator, headerPlacement.operator?.x, headerPlacement.operator?.y);
  drawText(headerPlacement.startHour?.page, header.startHour, headerPlacement.startHour?.x, headerPlacement.startHour?.y);
  drawText(headerPlacement.endHour?.page, header.endHour, headerPlacement.endHour?.x, headerPlacement.endHour?.y);
  drawText(headerPlacement.fuel?.page, `${header.fuel}%`, headerPlacement.fuel?.x, headerPlacement.fuel?.y);

  // 2) Checkboxes
  Object.entries(checks).forEach(([id, { checked }]) => {
    if (!checked) return;
    const pos = checkboxPlacement[id];
    if (!pos) return; // not configured yet
    drawCheck(pos.page ?? 0, pos.x, pos.y, 9);
  });

  // 3) Comments page (only if at least one checked item has a comment)
  const commented = Object.entries(checks)
    .filter(([_, v]) => v.checked && v.comment && v.comment.trim().length > 0)
    .map(([id, v]) => ({ id, comment: v.comment.trim() }));

  if (commented.length > 0) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
    const title = "Comments";
    page.drawText(title, { x: 40, y: 800, size: 18, font: helv });

    // simple text flow
    const maxWidth = 515; // page width - margins
    const lineHeight = 14;
    let cursorY = 770;
    const fontSize = 11;

    const wrap = (text) => {
      const words = text.split(/\s+/);
      const lines = [];
      let line = "";
      const measure = (s) => helv.widthOfTextAtSize(s, fontSize);
      words.forEach((w) => {
        const tryLine = line ? line + " " + w : w;
        if (measure(tryLine) > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = tryLine;
        }
      });
      if (line) lines.push(line);
      return lines;
    };

    commented.forEach(({ id, comment }, idx) => {
      const header = `${idx + 1}. ${id}`;
      page.drawText(header, { x: 40, y: cursorY, size: 12, font: helv });
      cursorY -= lineHeight + 2;
      wrap(comment).forEach((ln) => {
        if (cursorY < 60) {
          // add another page if needed
          const np = pdfDoc.addPage([595.28, 841.89]);
          cursorY = 800;
          np.drawText("Comments (cont.)", { x: 40, y: cursorY, size: 14, font: helv });
          cursorY -= lineHeight * 2;
        }
        const current = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        current.drawText(ln, { x: 60, y: cursorY, size: fontSize, font: helv });
        cursorY -= lineHeight;
      });
      cursorY -= lineHeight;
    });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `truck-inspection-${header.date}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// -----------------------------
// Main App
// -----------------------------
export default function App() {
  const [step, setStep] = useState(0); // 0: Header, 1: Visual, 2: Operational, 3: Review
  const totalSteps = 4;

  const [header, setHeader] = useState({
    date: todayISO(),
    truck: "",
    operator: "",
    startHour: "",
    endHour: "",
    fuel: 100,
  });

  const [visualState, setVisualState] = useState({});
  const [operationalState, setOperationalState] = useState({});

  const anyCheckedWithComment = useMemo(() => {
    const merged = { ...visualState, ...operationalState };
    return Object.values(merged).some((v) => v?.checked && v?.comment?.trim());
  }, [visualState, operationalState]);

  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const onGenerate = async () => {
    await generatePdf({ header, checks: { ...visualState, ...operationalState } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Truck Inspection</h1>
        <Stepper step={step} setStep={setStep} total={totalSteps} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card>
                <SectionTitle>Header</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date">
                    <input
                      type="date"
                      className="w-full rounded-xl border p-3"
                      value={header.date}
                      onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))}
                    />
                  </Field>
                  <Field label="Truck #">
                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="e.g., 47"
                      value={header.truck}
                      onChange={(e) => setHeader((h) => ({ ...h, truck: e.target.value }))}
                    />
                  </Field>
                  <Field label="Operator">
                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="Name"
                      value={header.operator}
                      onChange={(e) => setHeader((h) => ({ ...h, operator: e.target.value }))}
                    />
                  </Field>
                  <Field label="Start Hour">
                    <input
                      type="time"
                      className="w-full rounded-xl border p-3"
                      value={header.startHour}
                      onChange={(e) => setHeader((h) => ({ ...h, startHour: e.target.value }))}
                    />
                  </Field>
                  <Field label="End Hour">
                    <input
                      type="time"
                      className="w-full rounded-xl border p-3"
                      value={header.endHour}
                      onChange={(e) => setHeader((h) => ({ ...h, endHour: e.target.value }))}
                    />
                  </Field>
                  <Field label="Fuel">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={header.fuel}
                      onChange={(e) => setHeader((h) => ({ ...h, fuel: Number(e.target.value) }))}
                    >
                      {range(0, 100, 10).map((n) => (
                        <option key={n} value={n}>{n}%</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium"
                    onClick={goNext}
                  >
                    Next
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <GroupedChecklist
                title="Visual Inspection"
                items={visualItems}
                state={visualState}
                setState={setVisualState}
                imageSrc="car-details.png" // Place this file in your repo root or public folder
              />
              <div className="mt-6 flex justify-between gap-3">
                <button className="px-4 py-2 rounded-xl bg-gray-200" onClick={goPrev}>Back</button>
                <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium" onClick={goNext}>Next</button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <GroupedChecklist
                title="Operational Inspection (A–J)"
                items={operationalItems}
                state={operationalState}
                setState={setOperationalState}
              />
              <div className="mt-6 flex justify-between gap-3">
                <button className="px-4 py-2 rounded-xl bg-gray-200" onClick={goPrev}>Back</button>
                <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium" onClick={goNext}>Review</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card>
                <SectionTitle>Review</SectionTitle>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Header</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Date:</span> {header.date}</div>
                      <div><span className="text-gray-500">Truck #:</span> {header.truck}</div>
                      <div><span className="text-gray-500">Operator:</span> {header.operator}</div>
                      <div><span className="text-gray-500">Start:</span> {header.startHour}</div>
                      <div><span className="text-gray-500">End:</span> {header.endHour}</div>
                      <div><span className="text-gray-500">Fuel:</span> {header.fuel}%</div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Visual Inspection (checked)</div>
                    <ul className="list-disc ml-5">
                      {[...Object.entries(visualState)].filter(([_, v]) => v?.checked).map(([k, v]) => (
                        <li key={k} className="mb-1">{k}{v?.comment ? ` — ${v.comment}` : ""}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Operational Inspection (checked)</div>
                    <ul className="list-disc ml-5">
                      {[...Object.entries(operationalState)].filter(([_, v]) => v?.checked).map(([k, v]) => (
                        <li key={k} className="mb-1">{k}{v?.comment ? ` — ${v.comment}` : ""}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-gray-600">
                    {anyCheckedWithComment ? "Comments page will be added to the PDF." : "No comments added."}
                  </div>
                </div>

                <div className="mt-6 flex justify-between gap-3">
                  <button className="px-4 py-2 rounded-xl bg-gray-200" onClick={goPrev}>Back</button>
                  <button className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium" onClick={onGenerate}>Generate PDF</button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-10 text-center text-xs text-gray-500">
          Works fully offline in your browser. Add <code>template.pdf</code> and <code>car-details.png</code> to your repo root or <code>/public</code>.
        </footer>
      </div>
    </div>
  );
}
