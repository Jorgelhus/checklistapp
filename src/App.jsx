import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// pdf-lib runs entirely in the browser and lets us edit an existing PDF template
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// -----------------------------
// Helper data
// -----------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);

// Visual inspection: 21 top-level items.
// Items 1 and 3 have sub-items.
const visualItems = [
  { id: "V1", label: "Propane", children: [
    { id: "V1-a", label: "Relief Valve" },
    { id: "V1-b", label: "Fuel Level" },
    { id: "V1-c", label: "No Leaks" },
    { id: "V1-d", label: "Safety Straps" },
  ] },
  { id: "V2", label: "Rear Tire (Left)" },
  { id: "V3", label: "Engine Compartment", children: [
    { id: "V3-a", label: "Oil" },
    { id: "V3-b", label: "Battery" },
    { id: "V3-c", label: "Radiator" },
    { id: "V3-d", label: "Air Filter" },
    { id: "V3-e", label: "Fan Belt" },
  ] },
  { id: "V4", label: "Overhead Guard" },
  { id: "V5", label: "Front Tire (Left)" },
  { id: "V6", label: "Tilt Cylinder" },
  { id: "V7", label: "Carriage" },
  { id: "V8", label: "Fork Locking Pin (Left)" },
  { id: "V9", label: "Fork (Left)", children: [
    { id: "V9-a", label: "Attachment Appliccable" },
  ] },
  { id: "V10", label: "Mast" },
  { id: "V11", label: "Lift Cylinder", children: [
    { id: "V11-a", label: "Lift Chains" },
  ] },
  { id: "V12", label: "Fork (Right)", children: [
    { id: "V12-a", label: "Attachment Appliccable" },
  ] },
  { id: "V13", label: "Fork Locking Pin (Right)" },
  { id: "V14", label: "Carriage" },
  { id: "V15", label: "Tilt Cylinder" },
  { id: "V16", label: "Front Tire (Right)" },
  { id: "V17", label: "Hydraulic Oil" },
  { id: "V18", label: "Data Plate" },
  { id: "V19", label: "Seat & Seat Belt" },
  { id: "V20", label: "Operator Manual" },
  { id: "V21", label: "Rear Tire (Right)" },
];

// Operational inspection: A-J (10 items). E and F have sub-items
const operationalItems = [
  { id: "O-A", label: "A - Listen for unusal Noise" },
  { id: "O-B", label: "B - Check Service & Parking Brake" },
  { id: "O-C", label: "C - Lifting Control" },
  { id: "O-D", label: "D - Tilt Control" },
  { id: "O-E", label: "E - Forward Driving", children: [
    { id: "O-E-1", label: "Accelerator" },
    { id: "O-E-2", label: "Steering" },
    { id: "O-E-3", label: "Braking" },
  ] },
  { id: "O-F", label: "F - Reverse Driving", children: [
    { id: "O-F-1", label: "Accelerators" },
    { id: "O-F-2", label: "Steering" },
    { id: "O-F-3", label: "Braking" },
    { id: "O-F-4", label: "Backup Alarm" },
  ] },
  { id: "O-G", label: "G - Lights" },
  { id: "O-H", label: "H - Horn" },
  { id: "O-I", label: "I - Gauges" },
  { id: "O-J", label: "J - Oil Spot on Floor" },
];

// Prepare flattened lists and label map
const allItemsFlat = [...visualItems, ...operationalItems].flatMap((it) => [it, ...(it.children || [])]);
const allItemIds = allItemsFlat.map((it) => it.id);
const labelMap = allItemsFlat.reduce((acc, it) => { acc[it.id] = it.label; return acc; }, {});

// -----------------------------
// PDF coordinate mapping (EDIT THESE)
// -----------------------------
// Coordinates are in PDF user space (origin at bottom-left). Units are points.
const headerPlacement = {
  date: { page: 0, x: 50, y: 535 },
  truck: { page: 0, x: 170, y: 535 },
  operator: { page: 0, x: 283, y: 535 },
  startHour: { page: 0, x: 73, y: 516 },
  endHour: { page: 0, x: 176, y: 516 },
  fuel: { page: 0, x: 283, y: 516 },
};

// Map each checkbox id to a coordinate on the template where the mark should be drawn
const checkboxPlacement = {
  // Visual items
  V1:     { page: 0, x: 39, y: 436 },
  "V1-a": { page: 0, x: 59, y: 426 },
  "V1-b": { page: 0, x: 59, y: 415 },
  "V1-c": { page: 0, x: 59, y: 405 },
  "V1-d": { page: 0, x: 59, y: 395 },

  V2:     { page: 0, x: 39, y: 385 },

  V3:     { page: 0, x: 39, y: 375 },
  "V3-a": { page: 0, x: 59, y: 365 },
  "V3-b": { page: 0, x: 59, y: 355 },
  "V3-c": { page: 0, x: 59, y: 345 },
  "V3-d": { page: 0, x: 59, y: 335 },
  "V3-e": { page: 0, x: 59, y: 325 },

  V4:  { page: 0, x: 39, y: 315 },
  V5:  { page: 0, x: 39, y: 305 },
  V6:  { page: 0, x: 39, y: 295 },
  V7:  { page: 0, x: 39, y: 285 },
  V8:  { page: 0, x: 39, y: 275 },

  V9:     { page: 0, x: 39, y: 265 },
  "V9-a": { page: 0, x: 39, y: 255 },

  V10: { page: 0, x: 39, y: 245 },

  V11:     { page: 0, x: 39, y: 235 },
  "V11-a": { page: 0, x: 39, y: 225 },

  V12:     { page: 0, x: 39, y: 215 },
  "V12-a": { page: 0, x: 39, y: 205 },

  V13: { page: 0, x: 39, y: 195 },
  V14: { page: 0, x: 39, y: 185 },
  V15: { page: 0, x: 39, y: 175 },
  V16: { page: 0, x: 39, y: 165 },
  V17: { page: 0, x: 39, y: 155 },
  V18: { page: 0, x: 39, y: 145 },
  V19: { page: 0, x: 39, y: 135 },
  V20: { page: 0, x: 39, y: 125 },
  V21: { page: 0, x: 39, y: 115 },

  "O-A":   { page: 0, x: 223, y: 435 },
  "O-B":   { page: 0, x: 223, y: 425 },
  "O-C":   { page: 0, x: 223, y: 415 },
  "O-D":   { page: 0, x: 223, y: 405 },

  "O-E":   { page: 0, x: 223, y: 395 },
  "O-E-1": { page: 0, x: 241, y: 385 },
  "O-E-2": { page: 0, x: 241, y: 375 },
  "O-E-3": { page: 0, x: 241, y: 365 },

  "O-F":   { page: 0, x: 223, y: 355 },
  "O-F-1": { page: 0, x: 241, y: 345 },
  "O-F-2": { page: 0, x: 241, y: 335 },
  "O-F-3": { page: 0, x: 241, y: 325 },
  "O-F-4": { page: 0, x: 241, y: 315 },

  "O-G":   { page: 0, x: 223, y: 305 },
  "O-H":   { page: 0, x: 223, y: 295 },
  "O-I":   { page: 0, x: 223, y: 285 },
  "O-J":   { page: 0, x: 223, y: 275 },
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
        <span className="text-gray-900 text-sm select-none">{label}</span>
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

  // Vector marks to avoid emoji font issues
  const drawMark = (pageIndex, x, y, size = 10, type = "ok") => {
    if (pageIndex == null || x == null || y == null) return;
    const page = pdfDoc.getPage(pageIndex);
    if (type === "ok") {
      // Draw a check mark: two lines
      page.drawLine({ start: { x: x, y: y + size * 0.4 }, end: { x: x + size * 0.35, y: y }, thickness: 1.2, color: rgb(0, 0, 0) });
      page.drawLine({ start: { x: x + size * 0.35, y: y }, end: { x: x + size, y: y + size }, thickness: 1.2, color: rgb(0, 0, 0) });
    } else {
      // Draw an X
      page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 1.2, color: rgb(0, 0, 0) });
      page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 1.2, color: rgb(0, 0, 0) });
    }
  };

  // 1) Header text placements
  drawText(headerPlacement.date?.page, header.date, headerPlacement.date?.x, headerPlacement.date?.y);
  drawText(headerPlacement.truck?.page, header.truck, headerPlacement.truck?.x, headerPlacement.truck?.y);
  drawText(headerPlacement.operator?.page, header.operator, headerPlacement.operator?.x, headerPlacement.operator?.y);
  drawText(headerPlacement.startHour?.page, header.startHour, headerPlacement.startHour?.x, headerPlacement.startHour?.y);
  drawText(headerPlacement.endHour?.page, header.endHour, headerPlacement.endHour?.x, headerPlacement.endHour?.y);
  drawText(headerPlacement.fuel?.page, header.fuel, headerPlacement.fuel?.x, headerPlacement.fuel?.y);

  // Build a complete set of checks so every item receives a mark
  const allItemsFlatLocal = [...visualItems, ...operationalItems].flatMap((it) => [it, ...(it.children || [])]);
  const allItemIdsLocal = allItemsFlatLocal.map((it) => it.id);
  const resolvedChecks = Object.fromEntries(
    allItemIdsLocal.map((id) => {
      const v = checks[id] || {};
      return [id, { checked: Boolean(v.checked), comment: v.comment || "" }];
    })
  );

  // 2) Draw marks for ALL items: unchecked => OK (check), checked => ISSUE (X)
  allItemIdsLocal.forEach((id) => {
    const pos = checkboxPlacement[id];
    if (!pos) return; // not configured
    const isChecked = resolvedChecks[id].checked;
    drawMark(pos.page ?? 0, pos.x, pos.y, 10, isChecked ? "issue" : "ok");
  });

  // 3) Comments page (only if at least one checked item has a comment)
  const commented = Object.entries(resolvedChecks)
    .filter(([_, v]) => v.checked && v.comment && v.comment.trim().length > 0)
    .map(([id, v]) => ({ id, comment: v.comment.trim() }));

  if (commented.length > 0) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const title = "Comments";
    page.drawText(title, { x: 40, y: 800, size: 18, font: helv });

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
      const headerLine = `${idx + 1}. ${id}`;
      page.drawText(headerLine, { x: 40, y: cursorY, size: 12, font: helv });
      cursorY -= lineHeight + 2;
      wrap(comment).forEach((ln) => {
        if (cursorY < 60) {
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
    fuel: "Propane", // default to Propane (fuel type)
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
    const checks = { ...visualState, ...operationalState };
    await generatePdf({ header, checks });
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
                  <Field label="Fuel (Type)">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={header.fuel}
                      onChange={(e) => setHeader((h) => ({ ...h, fuel: e.target.value }))}
                    >
                      {['Propane','Diesel','Gasoline','Electric'].map((t) => (
                        <option key={t} value={t}>{t}</option>
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
                      <div><span className="text-gray-500">Fuel:</span> {header.fuel}</div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Visual Inspection (issues only)</div>
                    <ul className="list-disc ml-5">
                      {allItemsFlat
                        .filter((it) => it.id.startsWith('V'))
                        .filter((it) => visualState[it.id]?.checked)
                        .map((it) => (
                          <li key={it.id} className="mb-1">{labelMap[it.id]}{visualState[it.id]?.comment ? ` — ${visualState[it.id].comment}` : ""}</li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Operational Inspection (issues only)</div>
                    <ul className="list-disc ml-5">
                      {allItemsFlat
                        .filter((it) => it.id.startsWith('O'))
                        .filter((it) => operationalState[it.id]?.checked)
                        .map((it) => (
                          <li key={it.id} className="mb-1">{labelMap[it.id]}{operationalState[it.id]?.comment ? ` — ${operationalState[it.id].comment}` : ""}</li>
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
