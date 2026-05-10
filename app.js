const STORAGE_KEY = "fitness-tracker-records-v1";

const state = {
  records: [],
  pendingPhoto: "",
  editingPhoto: "",
};

const colors = ["#2f7d58", "#df6545", "#2f67d8", "#e7b93c", "#78c6a3", "#7d5fff", "#0f9f9a", "#b6538b"];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  form: $("#workoutForm"),
  recordId: $("#recordId"),
  date: $("#dateInput"),
  duration: $("#durationInput"),
  intensity: $("#intensityInput"),
  customExercise: $("#customExerciseInput"),
  notes: $("#notesInput"),
  photo: $("#photoInput"),
  photoDrop: $("#photoDrop"),
  photoPreview: $("#photoPreview"),
  exerciseGrid: $("#exerciseGrid"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  month: $("#monthInput"),
  search: $("#searchInput"),
  metricGrid: $("#metricGrid"),
  barChart: $("#barChart"),
  chartTotal: $("#chartTotal"),
  heatmap: $("#heatmap"),
  monthActive: $("#monthActive"),
  donut: $("#donutChart"),
  legend: $("#legend"),
  typeTotal: $("#typeTotal"),
  recordList: $("#recordList"),
  resetBtn: $("#resetBtn"),
  submitBtn: $("#submitBtn"),
  heroLine: $("#heroLine"),
};

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function monthString(dateText = todayString()) {
  return dateText.slice(0, 7);
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateText}T12:00:00`));
}

function uniqueId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  } catch {
    alert("记录没有保存成功。图片可能太大，请先导出备份，再删除几张大图或换小一点的图片。");
  }
}

function sortRecords(records) {
  return records.sort((a, b) => {
    if (a.date === b.date) return (b.createdAt || "").localeCompare(a.createdAt || "");
    return b.date.localeCompare(a.date);
  });
}

function getCheckedExercises() {
  const checked = $$("#exerciseGrid input:checked").map((input) => input.value);
  const custom = elements.customExercise.value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...checked, ...custom])];
}

function resetForm() {
  elements.form.reset();
  elements.recordId.value = "";
  elements.date.value = todayString();
  elements.intensity.value = "中等";
  state.pendingPhoto = "";
  state.editingPhoto = "";
  elements.submitBtn.textContent = "保存记录";
  renderPhotoPreview("");
}

function renderPhotoPreview(image) {
  if (image) {
    elements.photoPreview.innerHTML = `<img src="${image}" alt="训练图片预览">`;
    return;
  }
  elements.photoPreview.innerHTML = "<span>选择或拖入图片</span>";
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  state.pendingPhoto = await compressImage(file);
  renderPhotoPreview(state.pendingPhoto);
}

function getFilteredRecords() {
  const selectedMonth = elements.month.value;
  const query = elements.search.value.trim().toLowerCase();

  return state.records.filter((record) => {
    const inMonth = !selectedMonth || record.date.startsWith(selectedMonth);
    const text = [record.date, record.duration, record.intensity, ...(record.exercises || []), record.notes || ""]
      .join(" ")
      .toLowerCase();
    return inMonth && (!query || text.includes(query));
  });
}

function totalMinutes(records) {
  return records.reduce((sum, record) => sum + Number(record.duration || 0), 0);
}

function activeDays(records) {
  return new Set(records.map((record) => record.date)).size;
}

function longestStreak(records) {
  const dates = [...new Set(records.map((record) => record.date))]
    .map((date) => new Date(`${date}T12:00:00`).getTime())
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous = null;
  const day = 24 * 60 * 60 * 1000;

  dates.forEach((date) => {
    run = previous !== null && date - previous === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  });

  return best;
}

function favoriteExercise(records) {
  const counts = new Map();
  records.forEach((record) => {
    (record.exercises || []).forEach((exercise) => {
      counts.set(exercise, (counts.get(exercise) || 0) + 1);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "暂无";
}

function renderMetrics(records) {
  const minutes = totalMinutes(records);
  const sessions = records.length;
  const average = sessions ? Math.round(minutes / sessions) : 0;
  const metrics = [
    ["训练次数", sessions, "筛选范围内"],
    ["总分钟", minutes, `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`],
    ["活跃天数", activeDays(records), `最长连续 ${longestStreak(state.records)} 天`],
    ["平均时长", average, `常练：${favoriteExercise(records)}`],
  ];

  elements.metricGrid.innerHTML = metrics
    .map(([label, value, note]) => `
      <article class="metric-card">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </article>
    `)
    .join("");
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateToInputValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function renderBarChart() {
  const today = new Date(`${todayString()}T12:00:00`);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    const key = dateToInputValue(date);
    const minutes = totalMinutes(state.records.filter((record) => record.date === key));
    return {
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      minutes,
    };
  });
  const max = Math.max(1, ...days.map((day) => day.minutes));
  const chartTotal = days.reduce((sum, day) => sum + day.minutes, 0);

  elements.chartTotal.textContent = `${chartTotal} 分钟`;
  elements.barChart.innerHTML = days
    .map((day) => {
      const height = Math.max(4, Math.round((day.minutes / max) * 100));
      return `
        <div class="bar-item" title="${day.key}: ${day.minutes} 分钟">
          <div class="bar-track">
            <div class="bar-fill" style="height:${height}%"></div>
          </div>
          <div class="bar-label">${day.label}</div>
        </div>
      `;
    })
    .join("");
}

function renderHeatmap(records) {
  const selected = elements.month.value || monthString();
  const [year, month] = selected.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const labels = ["一", "二", "三", "四", "五", "六", "日"];
  const today = todayString();
  const dayTotals = new Map();

  records.forEach((record) => {
    dayTotals.set(record.date, (dayTotals.get(record.date) || 0) + Number(record.duration || 0));
  });

  let html = labels.map((label) => `<div class="heat-label">${label}</div>`).join("");
  html += Array.from({ length: leading }, () => `<div class="heat-cell" aria-hidden="true"></div>`).join("");

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${selected}-${String(day).padStart(2, "0")}`;
    const minutes = dayTotals.get(key) || 0;
    const level = minutes >= 80 ? 3 : minutes >= 35 ? 2 : minutes > 0 ? 1 : 0;
    html += `<div class="heat-cell level-${level} ${key === today ? "is-today" : ""}" title="${key}: ${minutes} 分钟">${day}</div>`;
  }

  elements.heatmap.innerHTML = html;
  elements.monthActive.textContent = `${[...dayTotals.values()].filter(Boolean).length} 天`;
}

function renderDistribution(records) {
  const counts = new Map();
  records.forEach((record) => {
    (record.exercises || []).forEach((exercise) => {
      counts.set(exercise, (counts.get(exercise) || 0) + 1);
    });
  });

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  elements.typeTotal.textContent = `${total} 项`;

  if (!total) {
    elements.donut.style.background = "conic-gradient(#edf3ee 0 100%)";
    elements.legend.innerHTML = `<div class="empty-state">还没有项目数据</div>`;
    return;
  }

  let cursor = 0;
  const slices = entries.map(([name, count], index) => {
    const start = cursor;
    const end = cursor + (count / total) * 100;
    cursor = end;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  elements.donut.style.background = `conic-gradient(${slices.join(", ")})`;
  elements.legend.innerHTML = entries
    .map(([name, count], index) => `
      <div class="legend-item">
        <span class="legend-name">
          <span class="legend-dot" style="background:${colors[index % colors.length]}"></span>
          ${name}
        </span>
        <strong>${count}</strong>
      </div>
    `)
    .join("");
}

function renderRecords(records) {
  if (!records.length) {
    elements.recordList.innerHTML = `<div class="empty-state">还没有符合条件的记录</div>`;
    return;
  }

  const template = $("#recordTemplate");
  elements.recordList.innerHTML = "";

  records.forEach((record) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".record-card");
    const media = node.querySelector(".record-media");
    const time = node.querySelector("time");
    const title = node.querySelector("h3");
    const duration = node.querySelector(".duration-pill");
    const tags = node.querySelector(".tag-row");
    const notes = node.querySelector(".record-notes");

    card.dataset.id = record.id;
    time.dateTime = record.date;
    time.textContent = formatDate(record.date);
    title.textContent = (record.exercises || []).join(" + ") || "运动";
    duration.textContent = `${record.duration} 分钟`;
    notes.textContent = record.notes || "没有备注";
    tags.innerHTML = [record.intensity, ...(record.exercises || [])]
      .filter(Boolean)
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");

    if (record.image) {
      media.innerHTML = `<img src="${record.image}" alt="${record.date} 训练图片">`;
    }

    elements.recordList.appendChild(node);
  });
}

function renderHero(records) {
  const minutes = totalMinutes(records);
  if (!records.length) {
    elements.heroLine.textContent = "今天先写下第一条，后面就会有趋势。";
    return;
  }

  const latest = sortRecords([...state.records])[0];
  elements.heroLine.textContent = `最近一次：${latest.date}，${latest.duration} 分钟，累计 ${minutes} 分钟。`;
}

function render() {
  const filtered = getFilteredRecords();
  renderMetrics(filtered);
  renderBarChart();
  renderHeatmap(filtered);
  renderDistribution(filtered);
  renderRecords(filtered);
  renderHero(state.records);
}

function handleSubmit(event) {
  event.preventDefault();
  const exercises = getCheckedExercises();

  if (!exercises.length) {
    alert("请至少选择或填写一个运动项目。");
    return;
  }

  const id = elements.recordId.value || uniqueId();
  const existing = state.records.find((record) => record.id === id);
  const record = {
    id,
    date: elements.date.value,
    duration: Number(elements.duration.value),
    intensity: elements.intensity.value,
    exercises,
    notes: elements.notes.value.trim(),
    image: state.pendingPhoto || state.editingPhoto || existing?.image || "",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.records = sortRecords([record, ...state.records.filter((item) => item.id !== id)]);
  saveRecords();
  resetForm();
  render();
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  resetForm();
  elements.recordId.value = record.id;
  elements.date.value = record.date;
  elements.duration.value = record.duration;
  elements.intensity.value = record.intensity || "中等";
  elements.notes.value = record.notes || "";
  elements.submitBtn.textContent = "更新记录";
  state.editingPhoto = record.image || "";
  renderPhotoPreview(state.editingPhoto);

  const known = new Set($$("#exerciseGrid input").map((input) => input.value));
  const custom = [];
  (record.exercises || []).forEach((exercise) => {
    const input = $(`#exerciseGrid input[value="${CSS.escape(exercise)}"]`);
    if (input) {
      input.checked = true;
    } else if (!known.has(exercise)) {
      custom.push(exercise);
    }
  });
  elements.customExercise.value = custom.join("、");
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteRecord(id) {
  if (!confirm("确定删除这条记录吗？")) return;
  state.records = state.records.filter((record) => record.id !== id);
  saveRecords();
  render();
}

function exportRecords() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fitness-records-${todayString()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importRecords(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(incoming)) throw new Error("Invalid records");

      const merged = new Map(state.records.map((record) => [record.id, record]));
      incoming.forEach((record) => {
        if (record && record.id && record.date) merged.set(record.id, record);
      });
      state.records = sortRecords([...merged.values()]);
      saveRecords();
      render();
      elements.importInput.value = "";
    } catch {
      alert("导入失败，请选择由本页面导出的 JSON 文件。");
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetBtn.addEventListener("click", resetForm);
  elements.photo.addEventListener("change", (event) => handlePhotoFile(event.target.files[0]));
  elements.exportBtn.addEventListener("click", exportRecords);
  elements.importInput.addEventListener("change", (event) => importRecords(event.target.files[0]));
  elements.month.addEventListener("change", render);
  elements.search.addEventListener("input", render);

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.photoDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.photoDrop.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.photoDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.photoDrop.classList.remove("is-dragging");
    });
  });

  elements.photoDrop.addEventListener("drop", (event) => {
    handlePhotoFile(event.dataTransfer.files[0]);
  });

  elements.recordList.addEventListener("click", (event) => {
    const card = event.target.closest(".record-card");
    if (!card) return;
    if (event.target.matches(".edit-record")) editRecord(card.dataset.id);
    if (event.target.matches(".delete-record")) deleteRecord(card.dataset.id);
  });
}

function init() {
  state.records = sortRecords(loadRecords());
  elements.date.value = todayString();
  elements.month.value = monthString();
  bindEvents();
  render();
}

init();
