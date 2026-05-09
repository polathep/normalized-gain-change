const preInput = document.querySelector("#preInput");
const postInput = document.querySelector("#postInput");
const preRange = document.querySelector("#preRange");
const postRange = document.querySelector("#postRange");

const gainValue = document.querySelector("#gainValue");
const gainLabel = document.querySelector("#gainLabel");
const changeValue = document.querySelector("#changeValue");
const changeLabel = document.querySelector("#changeLabel");
const rawValue = document.querySelector("#rawValue");
const rawLabel = document.querySelector("#rawLabel");
const preBar = document.querySelector("#preBar");
const postBar = document.querySelector("#postBar");
const preValue = document.querySelector("#preValue");
const postValue = document.querySelector("#postValue");
const formulaText = document.querySelector("#formulaText");
const changeFormulaText = document.querySelector("#changeFormulaText");
const heroPre = document.querySelector("#heroPre");
const heroPost = document.querySelector("#heroPost");
const heroGain = document.querySelector("#heroGain");
const arcFill = document.querySelector(".arc-fill");
const exampleRows = document.querySelector("#exampleRows");

const examples = [
  {
    label: "เพิ่มแบบชัดเจน",
    pre: 40,
    post: 70,
    note: "ได้เพิ่มขึ้นครึ่งหนึ่งของคะแนนที่ยังเพิ่มได้",
  },
  {
    label: "คะแนนก่อนเรียนสูง",
    pre: 80,
    post: 90,
    note: "raw gain น้อย แต่เมื่อเทียบพื้นที่ที่เหลือถือว่าสูงขึ้นมาก",
  },
  {
    label: "คะแนนลดลง",
    pre: 80,
    post: 60,
    note: "normalized change ตีความ learning loss ได้สมดุลกว่า",
  },
  {
    label: "Ceiling effect",
    pre: 95,
    post: 98,
    note: "พื้นที่เพิ่มได้น้อย ทำให้ค่า g ไวต่อคะแนนที่เปลี่ยนเล็กน้อย",
  },
];

function clampScore(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2);
}

function formatSigned(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function normalizedGain(pre, post) {
  if (pre >= 100) return post === pre ? 0 : Number.NaN;
  return (post - pre) / (100 - pre);
}

function normalizedChange(pre, post) {
  if (post > pre) {
    if (pre >= 100) return Number.NaN;
    return (post - pre) / (100 - pre);
  }

  if (post < pre) {
    if (pre <= 0) return Number.NaN;
    return (post - pre) / pre;
  }

  return 0;
}

function describeGain(gain) {
  if (!Number.isFinite(gain)) return "คำนวณไม่ได้จากค่านี้";
  if (gain < 0) return "คะแนนลดลง";
  if (gain < 0.3) return "Low gain";
  if (gain < 0.7) return "Medium gain";
  return "High gain";
}

function describeChange(change, pre, post) {
  if (!Number.isFinite(change)) return "คำนวณไม่ได้จากค่านี้";
  const percent = Math.abs(change * 100).toFixed(0);
  if (post > pre) return `เพิ่มขึ้น ${percent}% ของพื้นที่ที่ยังเพิ่มได้`;
  if (post < pre) return `ลดลง ${percent}% เมื่อเทียบกับคะแนนตั้งต้น`;
  return "ไม่เปลี่ยนแปลงจากคะแนนก่อนเรียน";
}

function makeGainFormula(pre, post, gain) {
  if (!Number.isFinite(gain)) {
    return `g = (${post} - ${pre}) / (100 - ${pre}) = คำนวณไม่ได้`;
  }
  return `g = (${post} - ${pre}) / (100 - ${pre}) = ${formatNumber(gain)}`;
}

function makeChangeFormula(pre, post, change) {
  if (!Number.isFinite(change)) {
    return `c = คำนวณไม่ได้จาก pre = ${pre}, post = ${post}`;
  }

  if (post > pre) {
    return `c = (${post} - ${pre}) / (100 - ${pre}) = ${formatNumber(change)}`;
  }

  if (post < pre) {
    return `c = (${post} - ${pre}) / ${pre} = ${formatNumber(change)}`;
  }

  return "c = 0 เพราะคะแนนก่อนเรียนและหลังเรียนเท่ากัน";
}

function syncInputs(source, targetInput, targetRange) {
  const value = clampScore(source.value);
  targetInput.value = value;
  targetRange.value = value;
}

function updateCalculator() {
  const pre = clampScore(preInput.value);
  const post = clampScore(postInput.value);
  const raw = post - pre;
  const gain = normalizedGain(pre, post);
  const change = normalizedChange(pre, post);

  preInput.value = pre;
  postInput.value = post;
  preRange.value = pre;
  postRange.value = post;

  gainValue.textContent = formatNumber(gain);
  gainLabel.textContent = describeGain(gain);
  changeValue.textContent = formatNumber(change);
  changeLabel.textContent = describeChange(change, pre, post);
  rawValue.textContent = formatSigned(raw);
  rawLabel.textContent =
    raw > 0 ? "คะแนนหลังเรียนสูงขึ้น" : raw < 0 ? "คะแนนหลังเรียนลดลง" : "คะแนนคงเดิม";

  preBar.style.width = `${pre}%`;
  postBar.style.width = `${post}%`;
  postBar.style.background = post >= pre ? "var(--coral)" : "#8b5b82";
  preValue.textContent = pre;
  postValue.textContent = post;

  formulaText.textContent = makeGainFormula(pre, post, gain);
  changeFormulaText.textContent = makeChangeFormula(pre, post, change);

  heroPre.textContent = pre;
  heroPost.textContent = post;
  heroGain.textContent = formatNumber(gain);
  arcFill.style.width = `${Math.max(0, Math.min(100, Math.abs(change) * 100))}%`;
}

function renderExamples() {
  exampleRows.innerHTML = examples
    .map((item) => {
      const raw = item.post - item.pre;
      const gain = normalizedGain(item.pre, item.post);
      const change = normalizedChange(item.pre, item.post);

      return `
        <tr>
          <td><strong>${item.label}</strong></td>
          <td>${item.pre}</td>
          <td>${item.post}</td>
          <td>${formatSigned(raw)}</td>
          <td>${formatNumber(gain)}</td>
          <td>${formatNumber(change)}</td>
          <td>${item.note}</td>
        </tr>
      `;
    })
    .join("");
}

preInput.addEventListener("input", () => {
  syncInputs(preInput, preInput, preRange);
  updateCalculator();
});

postInput.addEventListener("input", () => {
  syncInputs(postInput, postInput, postRange);
  updateCalculator();
});

preRange.addEventListener("input", () => {
  syncInputs(preRange, preInput, preRange);
  updateCalculator();
});

postRange.addEventListener("input", () => {
  syncInputs(postRange, postInput, postRange);
  updateCalculator();
});

document.querySelectorAll("[data-pre][data-post]").forEach((button) => {
  button.addEventListener("click", () => {
    preInput.value = button.dataset.pre;
    postInput.value = button.dataset.post;
    updateCalculator();
  });
});

renderExamples();
updateCalculator();
