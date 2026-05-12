const sampleCsv = `id,pre,post
1,12,16
2,15,15
3,10,14
4,18,17
5,9,13
6,14,18
7,11,11
8,16,20
9,13,15
10,17,19
11,20,24
12,13,12`;

const state = {
  rows: [],
  columns: [],
  clean: [],
};

const el = {
  fileInput: document.querySelector("#fileInput"),
  fileDrop: document.querySelector("#fileDrop"),
  fileStatus: document.querySelector("#fileStatus"),
  csvInput: document.querySelector("#csvInput"),
  loadPasteButton: document.querySelector("#loadPasteButton"),
  sampleButton: document.querySelector("#sampleButton"),
  rowCountInput: document.querySelector("#rowCountInput"),
  makeRowsButton: document.querySelector("#makeRowsButton"),
  useGridButton: document.querySelector("#useGridButton"),
  editableTable: document.querySelector("#editableTable"),
  idColumn: document.querySelector("#idColumn"),
  preColumn: document.querySelector("#preColumn"),
  postColumn: document.querySelector("#postColumn"),
  alphaSelect: document.querySelector("#alphaSelect"),
  maxScoreInput: document.querySelector("#maxScoreInput"),
  analyzeButton: document.querySelector("#analyzeButton"),
  previewTable: document.querySelector("#previewTable"),
  summaryCards: document.querySelector("#summaryCards"),
  descriptiveOutput: document.querySelector("#descriptiveOutput"),
  assumptionOutput: document.querySelector("#assumptionOutput"),
  testOutput: document.querySelector("#testOutput"),
  normalizedOutput: document.querySelector("#normalizedOutput"),
  interpretationOutput: document.querySelector("#interpretationOutput"),
  combinedPlot: document.querySelector("#combinedPlot"),
  normalizedPlot: document.querySelector("#normalizedPlot"),
};

const colors = {
  green: "#2e7d32",
  yellow: "#f4b63d",
  red: "#c8403a",
  blue: "#2f63c7",
  ink: "#17211e",
  muted: "#60706a",
};

function parseNumber(value) {
  if (value === null || value === undefined) return Number.NaN;
  const cleaned = String(value).trim().replace(/,/g, "");
  if (!cleaned) return Number.NaN;
  return Number(cleaned);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return Number.NaN;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

function sd(values) {
  return Math.sqrt(variance(values));
}

function quantile(values, q) {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function median(values) {
  return quantile(values, 0.5);
}

function skewness(values) {
  const n = values.length;
  const avg = mean(values);
  const s = sd(values);
  if (!Number.isFinite(s) || s === 0 || n < 3) return 0;
  return (n / ((n - 1) * (n - 2))) * values.reduce((sum, value) => sum + ((value - avg) / s) ** 3, 0);
}

function kurtosisExcess(values) {
  const n = values.length;
  const avg = mean(values);
  const s = sd(values);
  if (!Number.isFinite(s) || s === 0 || n < 4) return 0;
  const fourth = values.reduce((sum, value) => sum + ((value - avg) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourth - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * abs);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-abs * abs);
  return sign * y;
}

function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function inverseNormal(p) {
  if (p <= 0 || p >= 1) return Number.NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function logGamma(z) {
  const coefficients = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = 0.9999999999998099;
  const shifted = z - 1;
  for (let i = 0; i < coefficients.length; i += 1) x += coefficients[i] / (shifted + i + 1);
  const t = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(x, a, b) {
  const maxIterations = 100;
  const epsilon = 3e-7;
  const fpmin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(x, a, b)) / a;
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function tCdf(t, df) {
  const x = df / (df + t * t);
  const ib = regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib / 2 : ib / 2;
}

function gammaP(a, x) {
  if (x < 0 || a <= 0) return Number.NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 100; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function chiSquareCdf(x, df) {
  return gammaP(df / 2, x / 2);
}

function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "NA";
  return value.toLocaleString("th-TH", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatP(value) {
  if (!Number.isFinite(value)) return "NA";
  if (value < 0.001) return "< .001";
  return value.toFixed(3);
}

function detectColumn(columns, names) {
  const lowerMap = new Map(columns.map((column) => [String(column).trim().toLowerCase(), column]));
  for (const name of names) {
    if (lowerMap.has(name)) return lowerMap.get(name);
  }
  return columns.find((column) => names.some((name) => String(column).trim().toLowerCase().includes(name))) || "";
}

function setRows(rows) {
  state.rows = rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
  state.columns = state.rows.length ? Object.keys(state.rows[0]) : [];
  populateColumns();
  renderPreview();
  renderEditableGridFromRows(state.rows.length ? state.rows : makeBlankRows(Number(el.rowCountInput.value) || 20));
}

function makeBlankRows(count) {
  const safeCount = Math.min(500, Math.max(1, Number(count) || 20));
  return Array.from({ length: safeCount }, (_, index) => ({ id: index + 1, pre: "", post: "" }));
}

function renderEditableGridFromRows(rows) {
  const limited = rows.slice(0, 500);
  const columns = limited.length ? Object.keys(limited[0]) : [];
  const detectedId = detectColumn(columns, ["id", "student_id", "participant", "code", "รหัส", "เลขที่"]);
  const detectedPre = detectColumn(columns, ["pre", "pretest", "pre-test", "ก่อน", "ก่อนเรียน"]);
  const detectedPost = detectColumn(columns, ["post", "posttest", "post-test", "หลัง", "หลังเรียน"]);
  const body = limited
    .map((row, index) => {
      const id = detectedId ? row[detectedId] : row.id ?? row.ID ?? row.Id ?? row.student_id ?? index + 1;
      const pre = detectedPre ? row[detectedPre] : row.pre ?? row.Pre ?? row.pretest ?? row["pre-test"] ?? "";
      const post = detectedPost ? row[detectedPost] : row.post ?? row.Post ?? row.posttest ?? row["post-test"] ?? "";
      return `<tr>
        <td>${index + 1}</td>
        <td><input class="grid-id" value="${escapeHtml(id)}" aria-label="ID row ${index + 1}" /></td>
        <td><input class="grid-pre" inputmode="decimal" value="${escapeHtml(pre)}" aria-label="Pre-test row ${index + 1}" /></td>
        <td><input class="grid-post" inputmode="decimal" value="${escapeHtml(post)}" aria-label="Post-test row ${index + 1}" /></td>
      </tr>`;
    })
    .join("");
  el.editableTable.innerHTML = `<thead><tr><th>#</th><th>ID</th><th>Pre-test</th><th>Post-test</th></tr></thead><tbody>${body}</tbody>`;
  el.rowCountInput.value = limited.length;
}

function rowsFromEditableGrid() {
  const rows = [...el.editableTable.querySelectorAll("tbody tr")].map((tr) => ({
    id: tr.querySelector(".grid-id")?.value.trim() ?? "",
    pre: tr.querySelector(".grid-pre")?.value.trim() ?? "",
    post: tr.querySelector(".grid-post")?.value.trim() ?? "",
  }));
  return rows.filter((row) => row.id || row.pre || row.post);
}

function useEditableGridRows() {
  const rows = rowsFromEditableGrid();
  if (!rows.length) throw new Error("กรุณากรอกข้อมูลในตารางอย่างน้อย 2 แถว");
  state.rows = rows;
  state.columns = ["id", "pre", "post"];
  populateColumns();
  el.idColumn.value = "id";
  el.preColumn.value = "pre";
  el.postColumn.value = "post";
  renderPreview();
}

function populateColumns() {
  const options = ['<option value="">ไม่ใช้</option>', ...state.columns.map((column) => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`)].join("");
  el.idColumn.innerHTML = options;
  el.preColumn.innerHTML = options;
  el.postColumn.innerHTML = options;
  el.idColumn.value = detectColumn(state.columns, ["id", "student_id", "participant", "code", "รหัส", "เลขที่"]);
  el.preColumn.value = detectColumn(state.columns, ["pre", "pretest", "pre-test", "ก่อน", "ก่อนเรียน"]);
  el.postColumn.value = detectColumn(state.columns, ["post", "posttest", "post-test", "หลัง", "หลังเรียน"]);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPreview() {
  if (!state.rows.length) {
    el.previewTable.innerHTML = "";
    return;
  }
  const columns = state.columns;
  const head = `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>`;
  const body = state.rows
    .slice(0, 8)
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  el.previewTable.innerHTML = `${head}<tbody>${body}</tbody>`;
}

function parseCsv(text) {
  setRows(parseDelimitedText(text));
}

function parseDelimitedText(text) {
  if (window.Papa) {
    const parsed = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: false });
    if (parsed.errors.length) throw new Error(parsed.errors[0].message);
    return tableRowsToObjects(parsed.data);
  }
  return tableRowsToObjects(basicDelimitedParse(text));
}

function basicDelimitedParse(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function tableRowsToObjects(rows) {
  const cleaned = rows
    .map((row) => row.map((value) => String(value ?? "").trim()))
    .filter((row) => row.some((value) => value !== ""));
  if (!cleaned.length) return [];
  const first = cleaned[0];
  const headerKeywords = ["id", "student", "participant", "code", "pre", "post", "before", "after", "รหัส", "เลขที่", "ก่อน", "หลัง"];
  const firstHeaderHits = first.filter((value) => headerKeywords.some((keyword) => value.toLowerCase().includes(keyword))).length;
  const firstHasHeader = firstHeaderHits >= 1 && first.some((value) => !Number.isFinite(parseNumber(value)));
  let headers;
  let dataRows;
  if (firstHasHeader) {
    headers = first.map((header, index) => header || `column_${index + 1}`);
    dataRows = cleaned.slice(1);
  } else if (first.length >= 3) {
    headers = ["id", "pre", "post", ...first.slice(3).map((_, index) => `column_${index + 4}`)];
    dataRows = cleaned;
  } else if (first.length === 2) {
    headers = ["pre", "post"];
    dataRows = cleaned;
  } else {
    headers = ["pre"];
    dataRows = cleaned;
  }
  return dataRows.map((values, rowIndex) => {
    const obj = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    if (!("id" in obj)) obj.id = rowIndex + 1;
    return obj;
  });
}

async function parseFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (el.fileStatus) el.fileStatus.textContent = `กำลังอ่านไฟล์: ${file.name}`;
  if (extension === "csv") {
    parseCsv(await file.text());
    if (el.fileStatus) el.fileStatus.textContent = `อ่านไฟล์แล้ว: ${file.name}`;
    return;
  }
  if (!window.XLSX) throw new Error("ไม่พบตัวอ่าน XLSX กรุณาตรวจการเชื่อมต่ออินเทอร์เน็ตหรือใช้ไฟล์ CSV แทน");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  setRows(XLSX.utils.sheet_to_json(firstSheet, { defval: "" }));
  if (el.fileStatus) el.fileStatus.textContent = `อ่านไฟล์แล้ว: ${file.name}`;
}

function cleanPairs() {
  const idColumn = el.idColumn.value;
  const preColumn = el.preColumn.value;
  const postColumn = el.postColumn.value;
  if (!preColumn || !postColumn) throw new Error("กรุณาเลือกคอลัมน์ pre-test และ post-test");
  const clean = [];
  let dropped = 0;
  state.rows.forEach((row, index) => {
    const pre = parseNumber(row[preColumn]);
    const post = parseNumber(row[postColumn]);
    if (!Number.isFinite(pre) || !Number.isFinite(post)) {
      dropped += 1;
      return;
    }
    const diff = post - pre;
    clean.push({
      id: idColumn ? row[idColumn] : index + 1,
      pre,
      post,
      diff,
      group: diff > 0 ? "เพิ่มขึ้น" : diff < 0 ? "ลดลง" : "เท่าเดิม",
    });
  });
  if (clean.length < 2) throw new Error("ต้องมีข้อมูลครบคู่ pre/post อย่างน้อย 2 รายการ");
  state.clean = clean;
  return { clean, dropped };
}

function describe(values) {
  return {
    n: values.length,
    mean: mean(values),
    sd: sd(values),
    median: median(values),
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function outlierCheck(values) {
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const count = values.filter((value) => value < lower || value > upper).length;
  return { count, lower, upper };
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomNormal(rand) {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function shapiroWStatistic(values) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(sorted);
  const denominator = sorted.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  if (denominator === 0) return 1;
  const expected = Array.from({ length: n }, (_, i) => inverseNormal((i + 1 - 0.375) / (n + 0.25)));
  const norm = Math.sqrt(expected.reduce((sum, value) => sum + value * value, 0));
  const weights = expected.map((value) => value / norm);
  const numerator = sorted.reduce((sum, value, index) => sum + weights[index] * value, 0) ** 2;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function shapiroMonteCarloP(values) {
  const n = values.length;
  const observed = shapiroWStatistic(values);
  const reps = n <= 100 ? 1200 : 600;
  const rand = seededRandom(5192026 + n);
  let lessOrEqual = 0;
  for (let r = 0; r < reps; r += 1) {
    const simulated = Array.from({ length: n }, () => randomNormal(rand));
    if (shapiroWStatistic(simulated) <= observed) lessOrEqual += 1;
  }
  return {
    statistic: observed,
    p: (lessOrEqual + 1) / (reps + 1),
    reps,
  };
}

function normalityCheck(values) {
  const n = values.length;
  const skew = skewness(values);
  const kurt = kurtosisExcess(values);
  if (n < 3) {
    return {
      test: "Shapiro-Wilk",
      statistic: Number.NaN,
      p: Number.NaN,
      skew,
      kurt,
      normal: false,
      note: "n < 3 จึงทดสอบ Shapiro-Wilk ไม่ได้",
    };
  }
  const shapiro = shapiroMonteCarloP(values);
  return {
    test: "Shapiro-Wilk",
    statistic: shapiro.statistic,
    p: shapiro.p,
    skew,
    kurt,
    normal: shapiro.p >= Number(el.alphaSelect.value),
    note: `ตรวจ normality ของคะแนนต่าง post - pre โดยประมาณ p-value ด้วย Monte Carlo ${shapiro.reps.toLocaleString("th-TH")} รอบ`,
  };
}

function pairedTTest(values) {
  const n = values.length;
  const avg = mean(values);
  const s = sd(values);
  const se = s / Math.sqrt(n);
  const t = avg / se;
  const df = n - 1;
  const cdf = tCdf(t, df);
  const pLess = cdf;
  const pGreater = 1 - cdf;
  const pTwo = Math.min(1, 2 * Math.min(pLess, pGreater));
  return { t, df, pTwo, pGreater, pLess, effect: avg / s };
}

function rankAbsolute(values) {
  const items = values.map((value, index) => ({ index, abs: Math.abs(value), sign: Math.sign(value) })).sort((a, b) => a.abs - b.abs);
  const ranks = Array(values.length).fill(0);
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j].abs === items[i].abs) j += 1;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k += 1) ranks[items[k].index] = avgRank;
    i = j;
  }
  return ranks;
}

function wilcoxon(values) {
  const nonzero = values.filter((value) => value !== 0);
  if (!nonzero.length) return null;
  const ranks = rankAbsolute(nonzero);
  const wPlus = ranks.reduce((sum, rank, index) => sum + (nonzero[index] > 0 ? rank : 0), 0);
  const wMinus = ranks.reduce((sum, rank, index) => sum + (nonzero[index] < 0 ? rank : 0), 0);
  const n = nonzero.length;
  const meanW = (n * (n + 1)) / 4;
  const sdW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const zGreater = (wPlus - meanW - 0.5) / sdW;
  const zLess = (wPlus - meanW + 0.5) / sdW;
  const pGreater = 1 - normalCdf(zGreater);
  const pLess = normalCdf(zLess);
  const pTwo = Math.min(1, 2 * Math.min(pGreater, pLess));
  const rankBiserial = (wPlus - wMinus) / (wPlus + wMinus);
  return { wPlus, wMinus, statistic: Math.min(wPlus, wMinus), z: (wPlus - meanW) / sdW, pTwo, pGreater, pLess, effect: rankBiserial, n };
}

function normalizedChange(pre, post, maxScore) {
  if (post > pre) {
    const denominator = maxScore - pre;
    return denominator > 0 ? (post - pre) / denominator : Number.NaN;
  }
  if (post < pre) {
    return pre > 0 ? (post - pre) / pre : Number.NaN;
  }
  return 0;
}

function normalizedCategory(value) {
  if (!Number.isFinite(value)) return { key: "undefined", label: "คำนวณไม่ได้", color: "#7b8794" };
  if (value < 0) return { key: "decrease", label: "ลดลง", color: colors.red };
  if (value === 0) return { key: "same", label: "เท่าเดิม", color: colors.yellow };
  if (value < 0.3) return { key: "low", label: "Low positive (< 0.30)", color: "#8bbf61" };
  if (value < 0.7) return { key: "medium", label: "Medium positive (0.30-0.69)", color: colors.green };
  return { key: "high", label: "High positive (>= 0.70)", color: "#155c25" };
}

function normalizedSummary(clean, maxScore) {
  const order = ["high", "medium", "low", "same", "decrease", "undefined"];
  const labels = {
    high: "High positive (>= 0.70)",
    medium: "Medium positive (0.30-0.69)",
    low: "Low positive (< 0.30)",
    same: "เท่าเดิม",
    decrease: "ลดลง",
    undefined: "คำนวณไม่ได้",
  };
  const categoryColors = {
    high: "#155c25",
    medium: colors.green,
    low: "#8bbf61",
    same: colors.yellow,
    decrease: colors.red,
    undefined: "#7b8794",
  };
  const counts = Object.fromEntries(order.map((key) => [key, 0]));
  const values = clean.map((row) => {
    const value = normalizedChange(row.pre, row.post, maxScore);
    const category = normalizedCategory(value);
    counts[category.key] += 1;
    return { ...row, normalizedChange: value, normalizedCategory: category };
  });
  return {
    values,
    categories: order.map((key) => ({
      key,
      label: labels[key],
      color: categoryColors[key],
      count: counts[key],
      percent: (counts[key] / clean.length) * 100,
    })),
  };
}

function runAnalysis() {
  const alpha = Number(el.alphaSelect.value);
  const maxScore = Number(el.maxScoreInput.value) || 100;
  const gridRows = rowsFromEditableGrid();
  const gridHasScores = gridRows.some((row) => row.pre !== "" || row.post !== "");
  if (gridHasScores) useEditableGridRows();
  const { clean, dropped } = cleanPairs();
  const pre = clean.map((row) => row.pre);
  const post = clean.map((row) => row.post);
  const diff = clean.map((row) => row.diff);
  const descPre = describe(pre);
  const descPost = describe(post);
  const descDiff = describe(diff);
  const normality = normalityCheck(diff);
  const outliers = outlierCheck(diff);
  const t = pairedTTest(diff);
  const w = wilcoxon(diff);
  const recommended = normality.normal && outliers.count === 0 ? "Paired t-test" : "Wilcoxon signed-rank test";
  const norm = normalizedSummary(clean, maxScore);
  renderSummary(clean, dropped, descPre, descPost, descDiff);
  renderDescriptives(descPre, descPost);
  renderAssumptions(normality, outliers, recommended, alpha);
  renderTests(t, w, alpha);
  renderNormalized(norm, maxScore);
  renderCombinedPlot(clean);
  renderNormalizedPlot(norm.categories);
  renderInterpretation({
    alpha,
    clean,
    dropped,
    descPre,
    descPost,
    descDiff,
    normality,
    outliers,
    t,
    w,
    recommended,
    norm,
    maxScore,
  });
}

function renderSummary(clean, dropped, descPre, descPost, descDiff) {
  const n = clean.length;
  const counts = {
    up: clean.filter((row) => row.diff > 0).length,
    same: clean.filter((row) => row.diff === 0).length,
    down: clean.filter((row) => row.diff < 0).length,
  };
  const pct = (count) => `${formatNumber((count / n) * 100, 1)}%`;
  el.summaryCards.innerHTML = [
    summaryCard("Complete pairs", clean.length, `ตัดออก ${dropped} แถว`),
    summaryCard("Mean pre/post", `${formatNumber(descPre.mean, 2)} → ${formatNumber(descPost.mean, 2)}`, `mean diff = ${formatNumber(descDiff.mean, 2)}`),
    summaryCard("เพิ่ม/เท่าเดิม/ลด", `${counts.up}/${counts.same}/${counts.down}`, `${pct(counts.up)} / ${pct(counts.same)} / ${pct(counts.down)}`),
    summaryCard("Median diff", formatNumber(descDiff.median, 2), `IQR ${formatNumber(descDiff.q1, 2)} ถึง ${formatNumber(descDiff.q3, 2)}`),
  ].join("");
}

function summaryCard(label, value, note) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function renderDescriptives(descPre, descPost) {
  const rows = [
    ["Pre-test", descPre],
    ["Post-test", descPost],
  ]
    .map(
      ([label, d]) => `<tr>
        <td>${label}</td>
        <td>${formatNumber(d.mean, 2)} (${formatNumber(d.sd, 2)})</td>
        <td>${formatNumber(d.median, 2)} (${formatNumber(d.q1, 2)}, ${formatNumber(d.q3, 2)})</td>
        <td>${formatNumber(d.min, 2)}</td>
        <td>${formatNumber(d.max, 2)}</td>
      </tr>`
    )
    .join("");
  el.descriptiveOutput.classList.remove("empty-state");
  el.descriptiveOutput.innerHTML = `<div class="preview-wrap"><table class="descriptive-table">
    <thead><tr><th>ตัวแปร</th><th>Mean (SD)</th><th>Median (Q1, Q3)</th><th>Min</th><th>Max</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function statusClass(ok, warning = false) {
  if (ok) return "ok";
  return warning ? "warn" : "bad";
}

function renderAssumptions(normality, outliers, recommended, alpha) {
  const normalStatus = normality.normal ? "ผ่านโดยประมาณ" : "ควรใช้ non-parametric เป็นหลัก";
  const outlierOk = outliers.count === 0;
  el.assumptionOutput.classList.remove("empty-state");
  el.assumptionOutput.innerHTML = [
    metricRow(
      "Normality ของ post - pre",
      `<span class="status ${statusClass(normality.normal, true)}">${normalStatus}</span>`,
      `${normality.test}${Number.isFinite(normality.statistic) ? ` = ${formatNumber(normality.statistic)}` : ""}${Number.isFinite(normality.p) ? `, p = ${formatP(normality.p)}` : ""}. skewness = ${formatNumber(normality.skew)}, excess kurtosis = ${formatNumber(normality.kurt)}. ${normality.note}`
    ),
    metricRow(
      "Outlier ของ difference",
      `<span class="status ${statusClass(outlierOk, true)}">${outliers.count} ค่า</span>`,
      `ใช้เกณฑ์ 1.5 IQR ช่วงที่คาดหวัง ${formatNumber(outliers.lower)} ถึง ${formatNumber(outliers.upper)}`
    ),
    metricRow(
      "สถิติหลักที่แนะนำ",
      `<span class="status ok">${recommended}</span>`,
      `ใช้ alpha = ${alpha}. ถ้า normality ไม่ชัดหรือมี outlier ให้รายงาน Wilcoxon เป็นหลัก แล้วใช้ paired t-test เป็น sensitivity analysis ได้`
    ),
  ].join("");
}

function metricRow(label, value, note) {
  return `<div class="metric-row"><div><strong>${label}</strong></div><div>${value}<small>${note}</small></div></div>`;
}

function renderTests(t, w, alpha) {
  const rows = [
    ["แตกต่างกันหรือไม่", "Paired t-test", `t(${t.df}) = ${formatNumber(t.t)}`, t.pTwo, "Cohen's dz", t.effect],
    ["post-test สูงกว่า pre-test หรือไม่", "Paired t-test", `t(${t.df}) = ${formatNumber(t.t)}`, t.pGreater, "Cohen's dz", t.effect],
    ["post-test ต่ำกว่า pre-test หรือไม่", "Paired t-test", `t(${t.df}) = ${formatNumber(t.t)}`, t.pLess, "Cohen's dz", t.effect],
  ];
  if (w) {
    rows.push(
      ["แตกต่างกันหรือไม่", "Wilcoxon signed-rank", `W = ${formatNumber(w.statistic)}, z = ${formatNumber(w.z)}`, w.pTwo, "rank-biserial r", w.effect],
      ["post-test สูงกว่า pre-test หรือไม่", "Wilcoxon signed-rank", `W+ = ${formatNumber(w.wPlus)}, z = ${formatNumber(w.z)}`, w.pGreater, "rank-biserial r", w.effect],
      ["post-test ต่ำกว่า pre-test หรือไม่", "Wilcoxon signed-rank", `W+ = ${formatNumber(w.wPlus)}, z = ${formatNumber(w.z)}`, w.pLess, "rank-biserial r", w.effect]
    );
  }
  const tableRows = rows
    .map(([hypothesis, test, stat, p, effectName, effect]) => {
      const significant = p < alpha;
      return `<tr><td>${hypothesis}</td><td>${test}</td><td>${stat}</td><td><span class="status ${significant ? "ok" : "warn"}">${formatP(p)}</span></td><td>${effectName} = ${formatNumber(effect)}</td></tr>`;
    })
    .join("");
  el.testOutput.classList.remove("empty-state");
  el.testOutput.innerHTML = `<div class="preview-wrap"><table><thead><tr><th>สมมติฐาน</th><th>สถิติ</th><th>ค่าสถิติ</th><th>p-value</th><th>effect size</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
}

function renderNormalized(norm, maxScore) {
  const active = norm.categories.filter((category) => category.count > 0 || category.key !== "undefined");
  const bars = active
    .map(
      (category) => `<div class="norm-row">
        <strong>${category.label}</strong>
        <div class="norm-track"><div class="norm-fill" style="width:${category.percent}%; background:${category.color}"></div></div>
        <span>${category.count} (${formatNumber(category.percent, 1)}%)</span>
      </div>`
    )
    .join("");
  const positive = norm.values.filter((row) => Number.isFinite(row.normalizedChange) && row.normalizedChange > 0).length;
  const same = norm.values.filter((row) => row.normalizedChange === 0).length;
  const negative = norm.values.filter((row) => Number.isFinite(row.normalizedChange) && row.normalizedChange < 0).length;
  el.normalizedOutput.classList.remove("empty-state");
  el.normalizedOutput.innerHTML = `
    <div class="change-grid">
      <article class="change-card up"><span>Positive normalized change</span><strong>${positive}</strong><small>${formatNumber((positive / norm.values.length) * 100, 1)}%</small></article>
      <article class="change-card same"><span>เท่าเดิม</span><strong>${same}</strong><small>${formatNumber((same / norm.values.length) * 100, 1)}%</small></article>
      <article class="change-card down"><span>Negative normalized change</span><strong>${negative}</strong><small>${formatNumber((negative / norm.values.length) * 100, 1)}%</small></article>
    </div>
    <div class="normalized-bars">
      ${bars}
      <small>คำนวณ normalized change โดยใช้คะแนนเต็ม = ${formatNumber(maxScore, 0)}</small>
    </div>
  `;
}

function testDecision(p, alpha, positiveText, negativeText) {
  return p < alpha ? positiveText : negativeText;
}

function effectMagnitude(value, type) {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs)) return "ไม่สามารถประเมินขนาดอิทธิพลได้";
  if (type === "dz") {
    if (abs < 0.2) return "ขนาดอิทธิพลเล็กมาก";
    if (abs < 0.5) return "ขนาดอิทธิพลเล็ก";
    if (abs < 0.8) return "ขนาดอิทธิพลปานกลาง";
    return "ขนาดอิทธิพลใหญ่";
  }
  if (abs < 0.1) return "ขนาดอิทธิพลเล็กมาก";
  if (abs < 0.3) return "ขนาดอิทธิพลเล็ก";
  if (abs < 0.5) return "ขนาดอิทธิพลปานกลาง";
  return "ขนาดอิทธิพลใหญ่";
}

function renderInterpretation(context) {
  const { alpha, clean, dropped, descPre, descPost, descDiff, normality, outliers, t, w, recommended, norm, maxScore } = context;
  const n = clean.length;
  const counts = {
    up: clean.filter((row) => row.diff > 0).length,
    same: clean.filter((row) => row.diff === 0).length,
    down: clean.filter((row) => row.diff < 0).length,
  };
  const pct = (count) => formatNumber((count / n) * 100, 1);
  const primary = recommended === "Paired t-test" || !w ? t : w;
  const primaryName = recommended === "Paired t-test" || !w ? "paired t-test" : "Wilcoxon signed-rank test";
  const primaryTwo = recommended === "Paired t-test" || !w ? t.pTwo : w.pTwo;
  const primaryGreater = recommended === "Paired t-test" || !w ? t.pGreater : w.pGreater;
  const primaryEffect = recommended === "Paired t-test" || !w ? t.effect : w.effect;
  const effectName = recommended === "Paired t-test" || !w ? "Cohen's dz" : "rank-biserial correlation";
  const effectType = recommended === "Paired t-test" || !w ? "dz" : "r";
  const positiveNorm = norm.values.filter((row) => Number.isFinite(row.normalizedChange) && row.normalizedChange > 0).length;
  const sameNorm = norm.values.filter((row) => row.normalizedChange === 0).length;
  const negativeNorm = norm.values.filter((row) => Number.isFinite(row.normalizedChange) && row.normalizedChange < 0).length;
  const high = norm.categories.find((category) => category.key === "high");
  const medium = norm.categories.find((category) => category.key === "medium");
  const low = norm.categories.find((category) => category.key === "low");
  const normalText = normality.normal
    ? `ผล Shapiro-Wilk ไม่พบหลักฐานว่าคะแนนต่าง post - pre เบี่ยงเบนจาก normality อย่างมีนัยสำคัญ (W = ${formatNumber(normality.statistic)}, p = ${formatP(normality.p)})`
    : `ผล Shapiro-Wilk ชี้ว่าคะแนนต่าง post - pre อาจไม่เป็น normal (W = ${formatNumber(normality.statistic)}, p = ${formatP(normality.p)})`;
  const outlierText = outliers.count === 0
    ? "ไม่พบ outlier ของคะแนนต่างด้วยเกณฑ์ 1.5 IQR"
    : `พบ outlier ของคะแนนต่าง ${outliers.count} ค่า ด้วยเกณฑ์ 1.5 IQR`;
  const statLine = primaryName === "paired t-test"
    ? `ผลหลักคือ paired t-test: t(${t.df}) = ${formatNumber(t.t)}, p(two-sided) = ${formatP(t.pTwo)}, p(post > pre) = ${formatP(t.pGreater)}, ${effectName} = ${formatNumber(primaryEffect)}`
    : `ผลหลักคือ Wilcoxon signed-rank test: W = ${formatNumber(w.statistic)}, z = ${formatNumber(w.z)}, p(two-sided) = ${formatP(w.pTwo)}, p(post > pre) = ${formatP(w.pGreater)}, ${effectName} = ${formatNumber(primaryEffect)}`;
  const conclusion = testDecision(
    primaryGreater,
    alpha,
    `ที่ระดับนัยสำคัญ ${alpha} พบหลักฐานว่า post-test สูงกว่า pre-test อย่างมีนัยสำคัญ`,
    `ที่ระดับนัยสำคัญ ${alpha} ยังไม่พบหลักฐานเพียงพอว่า post-test สูงกว่า pre-test`
  );
  const differenceConclusion = testDecision(
    primaryTwo,
    alpha,
    "เมื่อทดสอบแบบ two-sided พบความแตกต่างระหว่าง pre-test และ post-test อย่างมีนัยสำคัญ",
    "เมื่อทดสอบแบบ two-sided ยังไม่พบความแตกต่างระหว่าง pre-test และ post-test อย่างมีนัยสำคัญ"
  );

  el.interpretationOutput.classList.remove("empty-state");
  el.interpretationOutput.innerHTML = `
    <article class="interpretation-card interpretation-lead">
      <h3>ข้อสรุปหลัก</h3>
      <p>${conclusion}. ${differenceConclusion}. โดยรวมคะแนนเฉลี่ยเพิ่มจาก ${formatNumber(descPre.mean, 2)} เป็น ${formatNumber(descPost.mean, 2)} คะแนน และค่าเฉลี่ยความต่างเท่ากับ ${formatNumber(descDiff.mean, 2)} คะแนน</p>
    </article>
    <article class="interpretation-card">
      <h3>ข้อมูลพรรณนา</h3>
      <p>ใช้ข้อมูลครบคู่ทั้งหมด ${n} รายการ${dropped > 0 ? ` และตัดข้อมูลที่ไม่สมบูรณ์ออก ${dropped} แถว` : ""}. Pre-test มี Mean (SD) = ${formatNumber(descPre.mean, 2)} (${formatNumber(descPre.sd, 2)}), Median (Q1, Q3) = ${formatNumber(descPre.median, 2)} (${formatNumber(descPre.q1, 2)}, ${formatNumber(descPre.q3, 2)}), Min-Max = ${formatNumber(descPre.min, 2)}-${formatNumber(descPre.max, 2)}. Post-test มี Mean (SD) = ${formatNumber(descPost.mean, 2)} (${formatNumber(descPost.sd, 2)}), Median (Q1, Q3) = ${formatNumber(descPost.median, 2)} (${formatNumber(descPost.q1, 2)}, ${formatNumber(descPost.q3, 2)}), Min-Max = ${formatNumber(descPost.min, 2)}-${formatNumber(descPost.max, 2)}</p>
    </article>
    <article class="interpretation-card">
      <h3>ทิศทางการเปลี่ยนแปลงรายบุคคล</h3>
      <p>คะแนนเพิ่มขึ้น ${counts.up} คน (${pct(counts.up)}%), เท่าเดิม ${counts.same} คน (${pct(counts.same)}%), และลดลง ${counts.down} คน (${pct(counts.down)}%). กราฟรวม box plot และ individual change plot ช่วยให้เห็นทั้งการกระจายของคะแนนและทิศทางรายบุคคลพร้อมกัน</p>
    </article>
    <article class="interpretation-card">
      <h3>Assumption และสถิติที่ใช้</h3>
      <p>${normalText}. ${outlierText}. ดังนั้นระบบแนะนำให้ใช้ ${recommended} เป็นผลหลัก. ${statLine}. ขนาดอิทธิพล (${effectName}) = ${formatNumber(primaryEffect)} จัดว่า${effectMagnitude(primaryEffect, effectType)}</p>
    </article>
    <article class="interpretation-card">
      <h3>Normalized change</h3>
      <p>เมื่อคำนวณ normalized change โดยใช้คะแนนเต็ม ${formatNumber(maxScore, 0)} พบว่าเป็นบวก ${positiveNorm} คน (${pct(positiveNorm)}%), เท่าเดิม ${sameNorm} คน (${pct(sameNorm)}%), และเป็นลบ ${negativeNorm} คน (${pct(negativeNorm)}%). ในกลุ่มบวก แบ่งเป็น high ${high.count} คน (${formatNumber(high.percent, 1)}%), medium ${medium.count} คน (${formatNumber(medium.percent, 1)}%), และ low ${low.count} คน (${formatNumber(low.percent, 1)}%)</p>
    </article>
    <article class="interpretation-card">
      <h3>ประโยคสำหรับรายงาน</h3>
      <p>จากการวิเคราะห์คะแนนก่อนและหลังเรียนของผู้เรียน ${n} คน พบว่าคะแนนหลังเรียนมีแนวโน้มสูงกว่าคะแนนก่อนเรียน โดย ${primaryName} ให้ผล p(post &gt; pre) = ${formatP(primaryGreater)} และ ${effectName} = ${formatNumber(primaryEffect)} (${effectMagnitude(primaryEffect, effectType)}). ผล normalized change สนับสนุนว่าผู้เรียนส่วนใหญ่มีการเปลี่ยนแปลงเชิงบวก</p>
    </article>
  `;
}

function svg(tag, attrs = {}, children = "") {
  const attrText = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
  return `<${tag} ${attrText}>${children}</${tag}>`;
}

function chartScale(values, height, top, bottom) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.12, 1);
  const domainMin = min - pad;
  const domainMax = max + pad;
  return {
    domainMin,
    domainMax,
    y(value) {
      return bottom - ((value - domainMin) / (domainMax - domainMin)) * (bottom - top);
    },
  };
}

function renderAxes(scale, width, top, bottom, left, right) {
  const ticks = 5;
  const parts = [];
  for (let i = 0; i <= ticks; i += 1) {
    const value = scale.domainMin + ((scale.domainMax - scale.domainMin) * i) / ticks;
    const y = scale.y(value);
    parts.push(`<line class="grid-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}"></line>`);
    parts.push(`<text class="chart-label" x="${left - 10}" y="${y + 4}" text-anchor="end">${formatNumber(value, 1)}</text>`);
  }
  parts.push(`<line class="axis-line" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"></line>`);
  parts.push(`<line class="axis-line" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"></line>`);
  return parts.join("");
}

function renderCombinedPlot(clean) {
  const width = 860;
  const height = 500;
  const left = 86;
  const right = 820;
  const top = 36;
  const bottom = 420;
  const xPre = 270;
  const xPost = 610;
  const pre = clean.map((row) => row.pre);
  const post = clean.map((row) => row.post);
  const scale = chartScale([...pre, ...post], height, top, bottom);
  const lines = clean
    .map((row) => {
      const color = row.diff > 0 ? colors.green : row.diff < 0 ? colors.red : colors.yellow;
      return `
        <line x1="${xPre}" y1="${scale.y(row.pre)}" x2="${xPost}" y2="${scale.y(row.post)}" stroke="${color}" stroke-width="2.3" opacity="0.62"></line>
        <circle cx="${xPre}" cy="${scale.y(row.pre)}" r="4.8" fill="${color}" opacity="0.9"></circle>
        <circle cx="${xPost}" cy="${scale.y(row.post)}" r="4.8" fill="${color}" opacity="0.9"></circle>
      `;
    })
    .join("");
  const box = (values, x) => {
    const q1 = quantile(values, 0.25);
    const q2 = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const w = 108;
    return `
      <line x1="${x}" y1="${scale.y(min)}" x2="${x}" y2="${scale.y(max)}" stroke="${colors.blue}" stroke-width="2.1" opacity="0.85"></line>
      <line x1="${x - w / 3}" y1="${scale.y(min)}" x2="${x + w / 3}" y2="${scale.y(min)}" stroke="${colors.blue}" stroke-width="2.1"></line>
      <line x1="${x - w / 3}" y1="${scale.y(max)}" x2="${x + w / 3}" y2="${scale.y(max)}" stroke="${colors.blue}" stroke-width="2.1"></line>
      <rect class="box-fill" x="${x - w / 2}" y="${scale.y(q3)}" width="${w}" height="${Math.max(1, scale.y(q1) - scale.y(q3))}" rx="4" opacity="0.68"></rect>
      <line class="median-line" x1="${x - w / 2}" y1="${scale.y(q2)}" x2="${x + w / 2}" y2="${scale.y(q2)}"></line>
    `;
  };
  el.combinedPlot.innerHTML = `
    ${renderAxes(scale, width, top, bottom, left, right)}
    ${box(pre, xPre)}
    ${box(post, xPost)}
    ${lines}
    <text class="chart-label" x="${xPre}" y="456" text-anchor="middle">Pre-test</text>
    <text class="chart-label" x="${xPost}" y="456" text-anchor="middle">Post-test</text>
    <text class="chart-label" x="24" y="230" text-anchor="middle" transform="rotate(-90 24 230)">Score</text>
  `;
}

function renderNormalizedPlot(categories) {
  const width = 720;
  const height = 460;
  const left = 205;
  const right = 655;
  const top = 48;
  const barHeight = 38;
  const gap = 20;
  const active = categories.filter((category) => category.count > 0 || category.key !== "undefined");
  const maxPercent = Math.max(10, ...active.map((category) => category.percent));
  const rows = active
    .map((category, index) => {
      const y = top + index * (barHeight + gap);
      const widthBar = ((right - left) * category.percent) / maxPercent;
      return `
        <text class="chart-label" x="${left - 12}" y="${y + 25}" text-anchor="end">${category.label}</text>
        <rect x="${left}" y="${y}" width="${right - left}" height="${barHeight}" rx="8" fill="#edf2ee"></rect>
        <rect x="${left}" y="${y}" width="${Math.max(2, widthBar)}" height="${barHeight}" rx="8" fill="${category.color}" opacity="0.92"></rect>
        <text class="chart-label" x="${left + Math.max(44, widthBar + 12)}" y="${y + 25}">${category.count} (${formatNumber(category.percent, 1)}%)</text>
      `;
    })
    .join("");
  el.normalizedPlot.innerHTML = `
    ${rows}
    <text class="chart-label" x="${left}" y="426">Category จาก normalized change: negative, 0, low, medium, high</text>
  `;
}

function showError(message) {
  el.descriptiveOutput.classList.add("empty-state");
  el.assumptionOutput.classList.add("empty-state");
  el.testOutput.classList.add("empty-state");
  el.normalizedOutput.classList.add("empty-state");
  el.interpretationOutput.classList.add("empty-state");
  el.descriptiveOutput.textContent = "ยังไม่มีผลวิเคราะห์";
  el.assumptionOutput.textContent = message;
  el.testOutput.textContent = "ยังไม่มีผลวิเคราะห์";
  el.normalizedOutput.textContent = "ยังไม่มีผล normalized change";
  el.interpretationOutput.textContent = "ยังไม่มีผลแปลผล";
}

el.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await parseFile(file);
  } catch (error) {
    showError(`อ่านไฟล์ไม่สำเร็จ: ${error.message}`);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  el.fileDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    el.fileDrop.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  el.fileDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    el.fileDrop.classList.remove("drag-over");
  });
});

el.fileDrop.addEventListener("drop", async (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    await parseFile(file);
  } catch (error) {
    showError(`อ่านไฟล์ไม่สำเร็จ: ${error.message}`);
  }
});

el.loadPasteButton.addEventListener("click", () => {
  try {
    parseCsv(el.csvInput.value);
  } catch (error) {
    showError(`อ่าน CSV ไม่สำเร็จ: ${error.message}`);
  }
});

el.makeRowsButton.addEventListener("click", () => {
  renderEditableGridFromRows(makeBlankRows(el.rowCountInput.value));
});

el.useGridButton.addEventListener("click", () => {
  try {
    useEditableGridRows();
    runAnalysis();
  } catch (error) {
    showError(error.message);
  }
});

document.querySelectorAll(".row-preset").forEach((button) => {
  button.addEventListener("click", () => {
    el.rowCountInput.value = button.dataset.rows;
    renderEditableGridFromRows(makeBlankRows(button.dataset.rows));
  });
});

el.sampleButton.addEventListener("click", () => {
  el.csvInput.value = sampleCsv;
  parseCsv(sampleCsv);
  runAnalysis();
});

el.analyzeButton.addEventListener("click", () => {
  try {
    runAnalysis();
  } catch (error) {
    showError(error.message);
  }
});

el.csvInput.value = sampleCsv;
parseCsv(sampleCsv);
runAnalysis();
