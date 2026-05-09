const baseAlpha = 0.84;
const maxRespondents = 50;
const maxItems = 50;

const items = [
  {
    id: 1,
    text: "ตั้งใจเรียนเพราะอยากเข้าใจเนื้อหา",
    itemTotal: 0.62,
    alphaIfDeleted: 0.81,
  },
  {
    id: 2,
    text: "พยายามทำงานที่ได้รับมอบหมาย",
    itemTotal: 0.58,
    alphaIfDeleted: 0.82,
  },
  {
    id: 3,
    text: "รู้สึกว่าการเรียนมีคุณค่า",
    itemTotal: 0.66,
    alphaIfDeleted: 0.8,
  },
  {
    id: 4,
    text: "อยากพัฒนาตนเอง",
    itemTotal: 0.61,
    alphaIfDeleted: 0.81,
  },
  {
    id: 5,
    text: "ภูมิใจเมื่อทำได้ดี",
    itemTotal: 0.52,
    alphaIfDeleted: 0.83,
  },
  {
    id: 6,
    text: "ชอบห้องเรียนที่มีแอร์เย็น",
    itemTotal: 0.12,
    alphaIfDeleted: 0.89,
  },
  {
    id: 7,
    text: "สนุกกับการเรียนรู้สิ่งใหม่",
    itemTotal: 0.6,
    alphaIfDeleted: 0.81,
  },
];

const itemRows = document.querySelector("#itemRows");
const currentAlpha = document.querySelector("#currentAlpha");
const currentInterpretation = document.querySelector("#currentInterpretation");
const decisionText = document.querySelector("#decisionText");
const heroAlpha = document.querySelector("#heroAlpha");
const alphaFill = document.querySelector(".alpha-fill");

function fmt(value) {
  return value.toFixed(2).replace(/^0/, "");
}

function interpret(alpha) {
  if (alpha < 0.6) return "ต่ำ / ควรปรับปรุง";
  if (alpha < 0.7) return "พอใช้ แต่ควรระวัง";
  if (alpha < 0.8) return "ยอมรับได้";
  if (alpha < 0.9) return "อยู่ในระดับดี";
  return "สูงมาก อาจมี item ซ้ำซ้อน";
}

function selectedItems() {
  return items.filter((item) => {
    const checkbox = document.querySelector(`[data-item="${item.id}"]`);
    return checkbox?.checked;
  });
}

function estimateAlpha(activeItems) {
  if (activeItems.length === items.length) return baseAlpha;

  const removed = items.filter((item) => !activeItems.some((active) => active.id === item.id));
  if (removed.length === 1) return removed[0].alphaIfDeleted;

  // This page is pedagogical: use a transparent approximation for multiple removals.
  const averageImprovement =
    removed.reduce((sum, item) => sum + (item.alphaIfDeleted - baseAlpha), 0) / removed.length;
  const itemPenalty = Math.max(0, 7 - activeItems.length) * 0.015;
  return Math.min(0.96, Math.max(0, baseAlpha + averageImprovement - itemPenalty));
}

function makeDecision(activeItems, alpha) {
  const removed = items.filter((item) => !activeItems.some((active) => active.id === item.id));
  const risky = items.filter((item) => item.itemTotal < 0.3);

  if (removed.length === 0) {
    return `${risky.map((item) => `Item ${item.id}`).join(", ")} มี corrected item-total ต่ำกว่า .30 และควรตรวจเนื้อหาก่อนตัดออก`;
  }

  if (removed.length === 1) {
    const item = removed[0];
    return `เมื่อตัด Item ${item.id} ค่า alpha โดยประมาณเป็น ${fmt(alpha)} ควรตัดสินร่วมกับเหตุผลเชิงเนื้อหา ไม่ใช่ดูตัวเลขอย่างเดียว`;
  }

  return `ตอนนี้ตัดออก ${removed.length} items ค่า alpha โดยประมาณเป็น ${fmt(alpha)} ควรระวังว่า scale อาจแคบลงหรือเสียความครอบคลุมของ construct`;
}

function renderRows() {
  itemRows.innerHTML = items
    .map((item) => {
      const flagged = item.itemTotal < 0.3 ? "flagged" : "";
      return `
        <tr class="${flagged}">
          <td><input type="checkbox" data-item="${item.id}" checked aria-label="ใช้ Item ${item.id}" /></td>
          <td><strong>Item ${item.id}</strong></td>
          <td>${item.text}</td>
          <td>${fmt(item.itemTotal)}</td>
          <td>${fmt(item.alphaIfDeleted)}</td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-item]").forEach((checkbox) => {
    checkbox.addEventListener("change", updateSummary);
  });
}

function updateSummary() {
  const activeItems = selectedItems();
  const alpha = estimateAlpha(activeItems);
  currentAlpha.textContent = `α = ${fmt(alpha)}`;
  heroAlpha.textContent = `α = ${fmt(alpha)}`;
  currentInterpretation.textContent = interpret(alpha);
  decisionText.textContent = makeDecision(activeItems, alpha);
  alphaFill.style.width = `${Math.max(0, Math.min(100, alpha * 100))}%`;
}

renderRows();
updateSummary();

const sampleMatrix = [
  [5, 5, 4, 5, 4],
  [4, 4, 4, 5, 4],
  [5, 4, 5, 5, 5],
  [3, 3, 3, 4, 3],
  [4, 4, 3, 4, 4],
  [2, 2, 2, 3, 2],
  [5, 5, 5, 4, 5],
  [3, 4, 3, 3, 3],
  [4, 5, 4, 4, 4],
  [2, 3, 2, 2, 3],
];

let calcMatrix = sampleMatrix.map((row) => [...row]);
let reverseItems = Array.from({ length: sampleMatrix[0].length }, () => false);
let includedItems = Array.from({ length: sampleMatrix[0].length }, () => true);

const dataHead = document.querySelector("#dataHead");
const dataBody = document.querySelector("#dataBody");
const calcAlpha = document.querySelector("#calcAlpha");
const calcInterpretation = document.querySelector("#calcInterpretation");
const calcNote = document.querySelector("#calcNote");
const calcItemRows = document.querySelector("#calcItemRows");
const sampleDataBtn = document.querySelector("#sampleDataBtn");
const addRespondentBtn = document.querySelector("#addRespondentBtn");
const addItemBtn = document.querySelector("#addItemBtn");
const resetCalcBtn = document.querySelector("#resetCalcBtn");
const pasteData = document.querySelector("#pasteData");
const loadPasteBtn = document.querySelector("#loadPasteBtn");
const clearPasteBtn = document.querySelector("#clearPasteBtn");
const pasteStatus = document.querySelector("#pasteStatus");
const scaleMin = document.querySelector("#scaleMin");
const scaleMax = document.querySelector("#scaleMax");

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return Number.NaN;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

function covariance(xValues, yValues) {
  if (xValues.length !== yValues.length || xValues.length < 2) return Number.NaN;
  const xAvg = mean(xValues);
  const yAvg = mean(yValues);
  return (
    xValues.reduce((sum, value, index) => sum + (value - xAvg) * (yValues[index] - yAvg), 0) /
    (xValues.length - 1)
  );
}

function pearson(xValues, yValues) {
  const xVar = variance(xValues);
  const yVar = variance(yValues);
  if (!Number.isFinite(xVar) || !Number.isFinite(yVar) || xVar === 0 || yVar === 0) {
    return Number.NaN;
  }
  return covariance(xValues, yValues) / Math.sqrt(xVar * yVar);
}

function cleanMatrix(matrix) {
  return matrix
    .map((row) => row.map((value) => Number(value)))
    .filter((row) => row.every((value) => Number.isFinite(value)));
}

function getScaleBounds() {
  const min = Number(scaleMin.value);
  const max = Number(scaleMax.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return { min: 1, max: 5, valid: false };
  }
  return { min, max, valid: true };
}

function applyReverseScoring(matrix) {
  const { min, max } = getScaleBounds();
  return matrix.map((row) =>
    row.map((value, index) => {
      if (!Number.isFinite(value)) return value;
      return reverseItems[index] ? min + max - value : value;
    }),
  );
}

function filterIncludedItems(matrix) {
  return matrix.map((row) => row.filter((_, index) => includedItems[index]));
}

function normalizeMatrixShape(matrix) {
  const rowCount = Math.min(maxRespondents, matrix.length);
  const columnCount = Math.min(
    maxItems,
    Math.max(...matrix.slice(0, rowCount).map((row) => row.length), 0),
  );

  return matrix.slice(0, rowCount).map((row) =>
    Array.from({ length: columnCount }, (_, index) =>
      Number.isFinite(row[index]) ? row[index] : Number.NaN,
    ),
  );
}

function transpose(matrix) {
  if (!matrix.length) return [];
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

function rowTotals(matrix) {
  return matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
}

function cronbachAlpha(matrix) {
  const data = cleanMatrix(matrix);
  if (data.length < 2 || data[0]?.length < 2) return Number.NaN;
  const itemColumns = transpose(data);
  const itemVarianceSum = itemColumns.reduce((sum, column) => sum + variance(column), 0);
  const totalVariance = variance(rowTotals(data));
  const k = itemColumns.length;

  if (!Number.isFinite(totalVariance) || totalVariance === 0) return Number.NaN;
  return (k / (k - 1)) * (1 - itemVarianceSum / totalVariance);
}

function matrixWithoutColumn(matrix, removeIndex) {
  return matrix.map((row) => row.filter((_, index) => index !== removeIndex));
}

function itemTotalCorrelation(matrix, itemIndex) {
  const data = cleanMatrix(matrix);
  const itemScores = data.map((row) => row[itemIndex]);
  const restTotals = data.map((row) =>
    row.reduce((sum, value, index) => (index === itemIndex ? sum : sum + value), 0),
  );
  return pearson(itemScores, restTotals);
}

function updateCell(rowIndex, columnIndex, value) {
  calcMatrix[rowIndex][columnIndex] = value === "" ? Number.NaN : Number(value);
  updateCalculator();
}

function renderCalcTable() {
  const itemCount = calcMatrix[0]?.length ?? 0;
  dataHead.innerHTML = `
    <tr>
      <th>Respondent</th>
      ${Array.from({ length: itemCount }, (_, index) => `<th>Item ${index + 1}</th>`).join("")}
    </tr>
    <tr>
      <th>Reverse</th>
      ${Array.from(
        { length: itemCount },
        (_, index) => `
          <th>
            <label class="reverse-check">
              <input type="checkbox" data-reverse="${index}" ${reverseItems[index] ? "checked" : ""} />
              reverse
            </label>
          </th>
        `,
      ).join("")}
    </tr>
    <tr>
      <th>Use</th>
      ${Array.from(
        { length: itemCount },
        (_, index) => `
          <th>
            <label class="reverse-check">
              <input type="checkbox" data-include="${index}" ${includedItems[index] ? "checked" : ""} />
              use
            </label>
          </th>
        `,
      ).join("")}
    </tr>
  `;

  dataBody.innerHTML = calcMatrix
    .map(
      (row, rowIndex) => `
        <tr>
          <td><strong>R${rowIndex + 1}</strong></td>
          ${row
            .map(
              (value, columnIndex) => `
                <td>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="1"
                    value="${Number.isFinite(value) ? value : ""}"
                    data-row="${rowIndex}"
                    data-col="${columnIndex}"
                    aria-label="Respondent ${rowIndex + 1} Item ${columnIndex + 1}"
                  />
                </td>
              `,
            )
            .join("")}
        </tr>
      `,
    )
    .join("");

  dataBody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      updateCell(Number(input.dataset.row), Number(input.dataset.col), input.value);
    });
  });

  dataHead.querySelectorAll("[data-reverse]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      reverseItems[Number(checkbox.dataset.reverse)] = checkbox.checked;
      updateCalculator();
    });
  });

  dataHead.querySelectorAll("[data-include]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      includedItems[Number(checkbox.dataset.include)] = checkbox.checked;
      updateCalculator();
    });
  });
}

function updateCalculator() {
  const scoredMatrix = applyReverseScoring(calcMatrix);
  const activeMatrix = filterIncludedItems(scoredMatrix);
  const alpha = cronbachAlpha(activeMatrix);
  const clean = cleanMatrix(activeMatrix);
  const itemCount = clean[0]?.length ?? activeMatrix[0]?.length ?? 0;
  const totalItemCount = calcMatrix[0]?.length ?? 0;
  const bounds = getScaleBounds();

  calcAlpha.textContent = `α = ${Number.isFinite(alpha) ? fmt(alpha) : "N/A"}`;
  calcInterpretation.textContent = Number.isFinite(alpha) ? interpret(alpha) : "คำนวณไม่ได้";
  const reverseCount = reverseItems.filter(Boolean).length;
  const excludedCount = includedItems.filter((value) => !value).length;
  calcNote.textContent = `${clean.length} respondents ที่ข้อมูลครบ · ใช้ ${itemCount}/${totalItemCount} items · ตัดออก ${excludedCount} items · reverse ${reverseCount} items${
    bounds.valid ? "" : " · scale min/max ไม่ถูกต้อง ใช้ 1-5 ชั่วคราว"
  }`;
  addRespondentBtn.disabled = calcMatrix.length >= maxRespondents;
  addItemBtn.disabled = (calcMatrix[0]?.length || 0) >= maxItems;

  const activeIndexes = includedItems
    .map((included, index) => (included ? index : -1))
    .filter((index) => index >= 0);

  calcItemRows.innerHTML = Array.from({ length: totalItemCount }, (_, originalIndex) => {
    const activeIndex = activeIndexes.indexOf(originalIndex);
    const isIncluded = includedItems[originalIndex];
    const itemTotal = isIncluded && activeIndex >= 0 ? itemTotalCorrelation(clean, activeIndex) : Number.NaN;
    const deletedAlpha =
      isIncluded && activeIndex >= 0 ? cronbachAlpha(matrixWithoutColumn(clean, activeIndex)) : Number.NaN;
    const shouldInspect =
      isIncluded &&
      Number.isFinite(itemTotal) &&
      Number.isFinite(deletedAlpha) &&
      (itemTotal < 0.3 || deletedAlpha > alpha + 0.03);
    const recommendation = !isIncluded
      ? '<span class="recommend-drop">ถูกตัดออกจากการคำนวณ</span>'
      : shouldInspect
        ? '<span class="recommend-drop">ควรตรวจ/พิจารณาตัด</span>'
        : '<span class="recommend-keep">คงไว้ได้</span>';

    return `
      <tr class="${shouldInspect || !isIncluded ? "flagged" : ""}">
        <td>
          <input
            type="checkbox"
            data-result-include="${originalIndex}"
            ${isIncluded ? "checked" : ""}
            aria-label="ใช้ Item ${originalIndex + 1} ในการคำนวณ"
          />
        </td>
        <td><strong>Item ${originalIndex + 1}</strong></td>
        <td>${Number.isFinite(itemTotal) ? fmt(itemTotal) : "N/A"}</td>
        <td>${Number.isFinite(deletedAlpha) ? fmt(deletedAlpha) : "N/A"}</td>
        <td>${recommendation}</td>
      </tr>
    `;
  }).join("");

  calcItemRows.querySelectorAll("[data-result-include]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const index = Number(checkbox.dataset.resultInclude);
      includedItems[index] = checkbox.checked;
      renderCalcTable();
      updateCalculator();
    });
  });
}

function parsePastedMatrix(text) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split(/\t|,|;|\s+/)
        .map((cell) => Number(cell.trim()))
        .filter((value) => Number.isFinite(value)),
    )
    .filter((row) => row.length > 0);

  if (!rows.length) return [];
  return normalizeMatrixShape(rows);
}

sampleDataBtn.addEventListener("click", () => {
  calcMatrix = sampleMatrix.map((row) => [...row]);
  reverseItems = Array.from({ length: calcMatrix[0].length }, () => false);
  includedItems = Array.from({ length: calcMatrix[0].length }, () => true);
  renderCalcTable();
  updateCalculator();
});

addRespondentBtn.addEventListener("click", () => {
  if (calcMatrix.length >= maxRespondents) {
    pasteStatus.textContent = `เพิ่ม respondent ได้สูงสุด ${maxRespondents} คน`;
    return;
  }
  const itemCount = calcMatrix[0]?.length || 5;
  calcMatrix.push(Array.from({ length: itemCount }, () => 3));
  renderCalcTable();
  updateCalculator();
  pasteStatus.textContent = `เพิ่ม respondent แล้ว (${calcMatrix.length}/${maxRespondents})`;
});

addItemBtn.addEventListener("click", () => {
  if ((calcMatrix[0]?.length || 0) >= maxItems) {
    pasteStatus.textContent = `เพิ่ม item ได้สูงสุด ${maxItems} items`;
    return;
  }
  calcMatrix = calcMatrix.map((row) => [...row, 3]);
  reverseItems = [...reverseItems, false];
  includedItems = [...includedItems, true];
  renderCalcTable();
  updateCalculator();
  pasteStatus.textContent = `เพิ่ม item แล้ว (${calcMatrix[0]?.length || 0}/${maxItems})`;
});

resetCalcBtn.addEventListener("click", () => {
  calcMatrix = Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => Number.NaN));
  reverseItems = Array.from({ length: 4 }, () => false);
  includedItems = Array.from({ length: 4 }, () => true);
  renderCalcTable();
  updateCalculator();
  pasteStatus.textContent = "reset ตารางคำนวณแล้ว";
});

loadPasteBtn.addEventListener("click", () => {
  const parsed = parsePastedMatrix(pasteData.value);

  if (!parsed.length || !parsed[0]?.length) {
    pasteStatus.textContent = "ยังไม่พบข้อมูลตัวเลขที่นำไปคำนวณได้";
    return;
  }

  const originalRows = pasteData.value.trim().split(/\r?\n/).filter(Boolean).length;
  const importedRows = parsed.length;
  const importedColumns = parsed[0].length;
  calcMatrix = parsed;
  reverseItems = Array.from({ length: parsed[0].length }, () => false);
  includedItems = Array.from({ length: parsed[0].length }, () => true);
  renderCalcTable();
  updateCalculator();

  const clipped =
    originalRows > maxRespondents || importedColumns >= maxItems
      ? ` ระบบจำกัดไว้ที่ ${maxRespondents} respondents × ${maxItems} items`
      : "";
  pasteStatus.textContent = `นำเข้าข้อมูลแล้ว: ${importedRows} respondents × ${importedColumns} items.${clipped}`;
});

clearPasteBtn.addEventListener("click", () => {
  pasteData.value = "";
  pasteStatus.textContent = "ล้างช่อง paste แล้ว";
});

scaleMin.addEventListener("input", updateCalculator);
scaleMax.addEventListener("input", updateCalculator);

renderCalcTable();
updateCalculator();
