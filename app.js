const STORAGE_KEY = "fitness-tracker-records-v1";

const PLAN_ITEMS = [
  {
    id: "burpee",
    name: "波比跳",
    kind: "strength",
    max: 40,
    targetReps: 30,
    targetSets: 3,
    color: "#111111",
  },
  {
    id: "lunge",
    name: "箭步蹲",
    kind: "strength",
    max: 50,
    targetReps: 30,
    targetSets: 3,
    color: "#2b2b2b",
  },
  {
    id: "dumbbell-upright-row",
    name: "4公斤哑铃提拉",
    kind: "strength",
    max: 60,
    targetReps: 40,
    targetSets: 3,
    color: "#444444",
  },
  {
    id: "crunch",
    name: "卷腹",
    kind: "strength",
    max: 40,
    targetReps: 30,
    targetSets: 3,
    color: "#666666",
  },
  {
    id: "cable-machine",
    name: "龙门架",
    kind: "strength",
    max: 30,
    targetReps: 30,
    targetSets: 1,
    color: "#808080",
  },
  {
    id: "run",
    name: "跑步",
    kind: "cardio",
    color: "#333333",
  },
  {
    id: "bike",
    name: "骑单车",
    kind: "cardio",
    color: "#5f5f5f",
  },
];

const state = {
  records: [],
  pendingPhoto: "",
  editingPhoto: "",
};

const $ = (selector) => document.querySelector(selector);
const planById = new Map(PLAN_ITEMS.map((item) => [item.id, item]));
const planByName = new Map(PLAN_ITEMS.map((item) => [item.name, item]));

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
  planBoard: $("#planBoard"),
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
  targetSummary: $("#targetSummary"),
  targetProgress: $("#targetProgress"),
  recordList: $("#recordList"),
  resetBtn: $("#resetBtn"),
  submitBtn: $("#submitBtn"),
  heroLine: $("#heroLine"),
  heroStats: $("#heroStats"),
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

function targetLabel(item) {
  if (item.kind === "cardio") return "可选有氧";
  return `${item.targetReps} 个 x ${item.targetSets} 组`;
}

function targetTotal(item) {
  return Number(item.targetReps || 0) * Number(item.targetSets || 0);
}

function itemTotalReps(item) {
  if (item.kind !== "strength") return 0;
  return Number(item.sets || 0) * Number(item.reps || 0);
}

function itemTargetTotal(item) {
  const plan = planById.get(item.id) || planByName.get(item.name);
  if (!plan || plan.kind !== "strength") return 0;
  return targetTotal(plan);
}

function normalizeItems(record) {
  if (Array.isArray(record.items) && record.items.length) {
    return record.items.map((item) => {
      const plan = planById.get(item.id) || planByName.get(item.name) || {};
      return {
        ...plan,
        ...item,
        kind: item.kind || plan.kind || "strength",
        color: item.color || plan.color || "#8e8e93",
      };
    });
  }

  return (record.exercises || []).map((name) => {
    const plan = planByName.get(name) || { id: `custom-${name}`, name, kind: "custom", color: "#8e8e93" };
    return {
      ...plan,
      sets: plan.targetSets || 1,
      reps: plan.targetReps || 0,
      totalReps: targetTotal(plan),
      minutes: record.duration || 0,
      distance: "",
    };
  });
}

function selectedItems(records = state.records) {
  return records.flatMap((record) => normalizeItems(record));
}

function strengthItems(records = state.records) {
  return selectedItems(records).filter((item) => item.kind === "strength");
}

function renderPlanBoard() {
  elements.planBoard.innerHTML = PLAN_ITEMS.map((item) => {
    const isStrength = item.kind === "strength";
    const progress = isStrength ? Math.min(100, Math.round((item.targetReps / item.max) * 100)) : 0;
    const defaultChecked = isStrength ? "checked" : "";

    return `
      <article class="plan-card" data-plan-card="${item.id}" style="--item-color:${item.color}">
        <label class="plan-toggle">
          <input type="checkbox" data-plan-check="${item.id}" ${defaultChecked}>
          <span>${item.name}</span>
        </label>
        <div class="plan-meta">
          <span>${targetLabel(item)}</span>
          ${isStrength ? `<strong>极限 ${item.max} 个</strong>` : `<strong>可选</strong>`}
        </div>
        ${
          isStrength
            ? `
              <div class="limit-line" aria-hidden="true">
                <span style="width:${progress}%"></span>
              </div>
              <div class="plan-inputs">
                <label>
                  <span>完成组数</span>
                  <input type="number" min="0" max="20" step="1" data-plan-field="${item.id}:sets" value="${item.targetSets}">
                </label>
                <label>
                  <span>每组次数</span>
                  <input type="number" min="0" max="300" step="1" data-plan-field="${item.id}:reps" value="${item.targetReps}">
                </label>
              </div>
            `
            : `
              <div class="plan-inputs">
                <label>
                  <span>分钟</span>
                  <input type="number" min="0" max="600" step="1" data-plan-field="${item.id}:minutes" placeholder="30">
                </label>
                <label>
                  <span>公里</span>
                  <input type="number" min="0" max="300" step="0.1" data-plan-field="${item.id}:distance" placeholder="5.0">
                </label>
              </div>
            `
        }
      </article>
    `;
  }).join("");
}

function getPlanField(id, field) {
  const input = $(`[data-plan-field="${CSS.escape(`${id}:${field}`)}"]`);
  return input ? input.value : "";
}

function setPlanField(id, field, value) {
  const input = $(`[data-plan-field="${CSS.escape(`${id}:${field}`)}"]`);
  if (input) input.value = value ?? "";
}

function collectWorkoutItems() {
  const plannedItems = PLAN_ITEMS.filter((item) => $(`[data-plan-check="${item.id}"]`)?.checked).map((item) => {
    if (item.kind === "strength") {
      const sets = Number(getPlanField(item.id, "sets") || 0);
      const reps = Number(getPlanField(item.id, "reps") || 0);
      return {
        id: item.id,
        name: item.name,
        kind: item.kind,
        max: item.max,
        targetReps: item.targetReps,
        targetSets: item.targetSets,
        color: item.color,
        sets,
        reps,
        totalReps: sets * reps,
      };
    }

    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      color: item.color,
      minutes: Number(getPlanField(item.id, "minutes") || 0),
      distance: Number(getPlanField(item.id, "distance") || 0),
    };
  });

  const customItems = elements.customExercise.value
    .split(/[、,，]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: `custom-${name}`,
      name,
      kind: "custom",
      color: "#8e8e93",
    }));

  return [...plannedItems, ...customItems];
}

function resetPlanBoard() {
  PLAN_ITEMS.forEach((item) => {
    const checkbox = $(`[data-plan-check="${item.id}"]`);
    if (checkbox) checkbox.checked = item.kind === "strength";
    if (item.kind === "strength") {
      setPlanField(item.id, "sets", item.targetSets);
      setPlanField(item.id, "reps", item.targetReps);
    } else {
      setPlanField(item.id, "minutes", "");
      setPlanField(item.id, "distance", "");
    }
  });
  elements.customExercise.value = "";
}

function resetForm() {
  elements.form.reset();
  resetPlanBoard();
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
    const items = normalizeItems(record);
    const inMonth = !selectedMonth || record.date.startsWith(selectedMonth);
    const text = [
      record.date,
      record.duration,
      record.intensity,
      ...items.map((item) => `${item.name} ${item.sets || ""} ${item.reps || ""}`),
      record.notes || "",
    ]
      .join(" ")
      .toLowerCase();
    return inMonth && (!query || text.includes(query));
  });
}

function totalMinutes(records) {
  return records.reduce((sum, record) => sum + Number(record.duration || 0), 0);
}

function totalStrengthReps(records) {
  return strengthItems(records).reduce((sum, item) => sum + itemTotalReps(item), 0);
}

function totalTargetReps(records) {
  return strengthItems(records).reduce((sum, item) => sum + itemTargetTotal(item), 0);
}

function completionPercent(records) {
  const target = totalTargetReps(records);
  if (!target) return 0;
  return Math.round((totalStrengthReps(records) / target) * 100);
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
  selectedItems(records).forEach((item) => {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "暂无";
}

function renderMetrics(records) {
  const minutes = totalMinutes(records);
  const sessions = records.length;
  const reps = totalStrengthReps(records);
  const percent = completionPercent(records);
  const metrics = [
    ["训练次数", sessions, "筛选范围内"],
    ["总分钟", minutes, `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`],
    ["力量总量", reps, "按组数 x 次数统计"],
    ["计划完成", `${percent}%`, `常练：${favoriteExercise(records)}`],
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

function exerciseCounts(records) {
  const counts = new Map();
  selectedItems(records).forEach((item) => {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function colorForName(name) {
  return planByName.get(name)?.color || "#8e8e93";
}

function renderDistribution(records) {
  const entries = exerciseCounts(records);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  elements.typeTotal.textContent = `${total} 项`;

  if (!total) {
    elements.donut.style.background = "conic-gradient(#e5e5ea 0 100%)";
    elements.legend.innerHTML = `<div class="empty-state">还没有项目数据</div>`;
    return;
  }

  let cursor = 0;
  const slices = entries.map(([name, count]) => {
    const start = cursor;
    const end = cursor + (count / total) * 100;
    cursor = end;
    return `${colorForName(name)} ${start}% ${end}%`;
  });

  elements.donut.style.background = `conic-gradient(${slices.join(", ")})`;
  elements.legend.innerHTML = entries
    .map(([name, count]) => `
      <div class="legend-item">
        <span class="legend-name">
          <span class="legend-dot" style="background:${colorForName(name)}"></span>
          ${name}
        </span>
        <strong>${count}</strong>
      </div>
    `)
    .join("");
}

function renderTargetProgress(records) {
  const grouped = new Map();

  PLAN_ITEMS.filter((item) => item.kind === "strength").forEach((item) => {
    grouped.set(item.id, {
      ...item,
      completed: 0,
      target: 0,
    });
  });

  strengthItems(records).forEach((item) => {
    const plan = planById.get(item.id) || planByName.get(item.name);
    if (!plan) return;
    const existing = grouped.get(plan.id);
    existing.completed += itemTotalReps(item);
    existing.target += targetTotal(plan);
  });

  const completed = [...grouped.values()].reduce((sum, item) => sum + item.completed, 0);
  const target = [...grouped.values()].reduce((sum, item) => sum + item.target, 0);
  elements.targetSummary.textContent = target ? `${Math.round((completed / target) * 100)}%` : "0%";

  elements.targetProgress.innerHTML = [...grouped.values()]
    .map((item) => {
      const percent = item.target ? Math.min(140, Math.round((item.completed / item.target) * 100)) : 0;
      return `
        <div class="target-row" style="--item-color:${item.color}">
          <div>
            <strong>${item.name}</strong>
            <span>${item.completed} / ${item.target || targetTotal(item)} 个</span>
          </div>
          <div class="target-track">
            <span style="width:${Math.min(100, percent)}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function itemDetailText(item) {
  if (item.kind === "cardio") {
    const minutes = Number(item.minutes || 0);
    const distance = Number(item.distance || 0);
    if (minutes && distance) return `${item.name} ${minutes} 分钟 / ${distance} km`;
    if (minutes) return `${item.name} ${minutes} 分钟`;
    if (distance) return `${item.name} ${distance} km`;
    return item.name;
  }

  if (item.kind === "custom") {
    return item.name;
  }

  return `${item.name} ${item.reps || 0} 个 x ${item.sets || 0} 组`;
}

function renderRecords(records) {
  if (!records.length) {
    elements.recordList.innerHTML = `<div class="empty-state">还没有符合条件的记录</div>`;
    return;
  }

  const template = $("#recordTemplate");
  elements.recordList.innerHTML = "";

  records.forEach((record) => {
    const items = normalizeItems(record);
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".record-card");
    const media = node.querySelector(".record-media");
    const time = node.querySelector("time");
    const title = node.querySelector("h3");
    const duration = node.querySelector(".duration-pill");
    const tags = node.querySelector(".tag-row");
    const details = node.querySelector(".record-details");
    const notes = node.querySelector(".record-notes");

    card.dataset.id = record.id;
    time.dateTime = record.date;
    time.textContent = formatDate(record.date);
    title.textContent = items.map((item) => item.name).join(" + ") || "运动";
    duration.textContent = `${record.duration} 分钟`;
    notes.textContent = record.notes || "没有备注";
    tags.innerHTML = [record.intensity, `${totalStrengthReps([record])} 个力量量`]
      .filter(Boolean)
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");
    details.innerHTML = items.map((item) => `<span>${itemDetailText(item)}</span>`).join("");

    if (record.image) {
      media.innerHTML = `<img src="${record.image}" alt="${record.date} 训练图片">`;
    }

    elements.recordList.appendChild(node);
  });
}

function renderHero(records) {
  const minutes = totalMinutes(records);
  const sessions = records.length;
  const reps = totalStrengthReps(records);

  elements.heroStats.innerHTML = `
    <span><strong>${sessions}</strong> 次训练</span>
    <span><strong>${reps}</strong> 个力量量</span>
    <span><strong>${activeDays(records)}</strong> 天活跃</span>
  `;

  if (!records.length) {
    elements.heroLine.textContent = "5 个固定动作，跑步和骑单车按当天状态加入。";
    return;
  }

  const latest = sortRecords([...state.records])[0];
  elements.heroLine.textContent = `最近一次：${latest.date}，${latest.duration} 分钟；累计 ${minutes} 分钟。`;
}

function render() {
  const filtered = getFilteredRecords();
  renderMetrics(filtered);
  renderBarChart();
  renderHeatmap(filtered);
  renderDistribution(filtered);
  renderTargetProgress(filtered);
  renderRecords(filtered);
  renderHero(state.records);
}

function handleSubmit(event) {
  event.preventDefault();
  const items = collectWorkoutItems();

  if (!items.length) {
    alert("请至少选择一个训练项目。");
    return;
  }

  const id = elements.recordId.value || uniqueId();
  const existing = state.records.find((record) => record.id === id);
  const record = {
    id,
    date: elements.date.value,
    duration: Number(elements.duration.value),
    intensity: elements.intensity.value,
    items,
    exercises: items.map((item) => item.name),
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

  PLAN_ITEMS.forEach((item) => {
    const checkbox = $(`[data-plan-check="${item.id}"]`);
    if (checkbox) checkbox.checked = false;
  });

  normalizeItems(record).forEach((item) => {
    const plan = planById.get(item.id) || planByName.get(item.name);
    if (!plan) return;
    const checkbox = $(`[data-plan-check="${plan.id}"]`);
    if (checkbox) checkbox.checked = true;
    if (plan.kind === "strength") {
      setPlanField(plan.id, "sets", item.sets || plan.targetSets);
      setPlanField(plan.id, "reps", item.reps || plan.targetReps);
    } else {
      setPlanField(plan.id, "minutes", item.minutes || "");
      setPlanField(plan.id, "distance", item.distance || "");
    }
  });

  elements.customExercise.value = normalizeItems(record)
    .filter((item) => !planById.has(item.id) && !planByName.has(item.name))
    .map((item) => item.name)
    .join("、");

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
    version: 2,
    exportedAt: new Date().toISOString(),
    plan: PLAN_ITEMS,
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
  renderPlanBoard();
  state.records = sortRecords(loadRecords());
  elements.date.value = todayString();
  elements.month.value = monthString();
  bindEvents();
  render();
}

init();
