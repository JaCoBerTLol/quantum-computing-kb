// 量子计算知识库 — 搜索引擎与交互逻辑
const State = {
  data: null,
  entries: [],
  categories: [],
  activeCategory: "all",
  query: "",
  expandedIds: new Set(),
};

const $ = (sel) => document.querySelector(sel);

// ===== 初始化 =====
async function init() {
  try {
    const res = await fetch("data/knowledge-base.json");
    State.data = await res.json();
    State.entries = State.data.entries;
    State.categories = State.data.categories;

    $("#totalEntries").textContent = State.entries.length;
    $("#lastUpdated").textContent = `最后更新：${State.data.lastUpdated}`;

    renderCategories();
    renderResults(State.entries);

    bindEvents();
  } catch (err) {
    $("#results").innerHTML = `
      <div class="empty-state">
        <p>知识库加载失败</p>
        <p class="hint">请确保通过 HTTP 服务器访问（如 python -m http.server），直接打开 HTML 文件无法加载 JSON</p>
      </div>`;
  }
}

// ===== 分类导航 =====
function renderCategories() {
  const container = $("#categories");
  const allCount = State.entries.length;

  let html = `
    <button class="cat-pill active" data-cat="all">
      <span class="cat-dot" style="background:#94a3b8"></span>
      全部 <span class="cat-count">${allCount}</span>
    </button>`;

  for (const cat of State.categories) {
    const count = State.entries.filter((e) => e.category === cat.id).length;
    html += `
      <button class="cat-pill" data-cat="${cat.id}">
        <span class="cat-dot" style="background:${cat.color}"></span>
        ${cat.name} <span class="cat-count">${count}</span>
      </button>`;
  }

  container.innerHTML = html;
}

// ===== 搜索核心 =====
function search(query, entries) {
  const keywords = query
    .trim()
    .split(/\s+/)
    .filter((k) => k.length > 0);

  if (keywords.length === 0) return entries;

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  const scored = entries
    .map((entry) => {
      let score = 0;
      const q = entry.question.toLowerCase();
      const a = entry.answer.toLowerCase();
      const t = (entry.tags || []).join(" ").toLowerCase();
      const sub = (entry.subcategory || "").toLowerCase();

      for (const kw of lowerKeywords) {
        if (q.includes(kw)) score += 3;
        if (sub.includes(kw)) score += 2;
        if (t.includes(kw)) score += 2;
        if (a.includes(kw)) score += 1;
      }
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.entry);
}

// ===== 渲染结果 =====
function renderResults(entries) {
  const container = $("#results");

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" style="opacity:0.3">
          <path fill="none" stroke="currentColor" stroke-width="1.5" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p>未找到匹配的知识条目</p>
        <p class="hint">试试其他关键词，或选择「全部」分类查看所有内容</p>
      </div>`;
    return;
  }

  const kw = State.query.trim().split(/\s+/).filter((k) => k.length > 0);

  container.innerHTML = entries
    .map((entry, i) => {
      const cat = State.categories.find((c) => c.id === entry.category);
      const catName = cat ? cat.name : "";
      const catColor = cat ? cat.color : "#6366f1";
      const isExpanded = State.expandedIds.has(entry.id);

      const question = kw.length > 0 ? highlightText(entry.question, kw) : entry.question;
      const answer = kw.length > 0 ? highlightText(entry.answer, kw) : entry.answer;

      const tags = (entry.tags || [])
        .map((t) => `<span class="tag">${t}</span>`)
        .join("");

      return `
        <div class="entry-card ${isExpanded ? "expanded" : ""}" data-id="${entry.id}" style="animation-delay:${i * 0.05}s">
          <div class="entry-header" onclick="toggleEntry('${entry.id}')">
            <span class="entry-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44">
              ${catName}
            </span>
            <div class="entry-body">
              <div class="entry-question">${question}</div>
              <div class="entry-subcategory">${entry.subcategory || ""}</div>
            </div>
            <svg class="entry-arrow" viewBox="0 0 24 24" width="20" height="20">
              <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div class="entry-answer">
            <div class="entry-answer-inner">
              ${answer}
              <div class="entry-tags">${tags}</div>
            </div>
          </div>
        </div>`;
    })
    .join("");

  $("#resultCount").innerHTML = `<strong>${entries.length}</strong> 条结果`;
}

// ===== 高亮关键词 =====
function highlightText(text, keywords) {
  let result = text;
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    result = result.replace(regex, '<span class="highlight">$1</span>');
  }
  return result;
}

// ===== 展开/折叠 =====
window.toggleEntry = function (id) {
  const card = document.querySelector(`.entry-card[data-id="${id}"]`);
  if (!card) return;

  if (State.expandedIds.has(id)) {
    State.expandedIds.delete(id);
    card.classList.remove("expanded");
  } else {
    State.expandedIds.add(id);
    card.classList.add("expanded");
  }
};

// ===== 事件绑定 =====
function bindEvents() {
  const input = $("#searchInput");
  const clearBtn = $("#clearBtn");

  // 搜索（防抖）
  let debounceTimer;
  input.addEventListener("input", (e) => {
    const val = e.target.value;
    clearBtn.style.display = val ? "flex" : "none";

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      State.query = val;
      updateResults();
    }, 200);
  });

  // 清除搜索
  clearBtn.addEventListener("click", () => {
    input.value = "";
    State.query = "";
    clearBtn.style.display = "none";
    updateResults();
    input.focus();
  });

  // 分类筛选
  $("#categories").addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (!pill) return;

    document.querySelectorAll(".cat-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");

    State.activeCategory = pill.dataset.cat;
    updateResults();
  });

  // 键盘快捷键
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === "Escape") {
      input.value = "";
      State.query = "";
      clearBtn.style.display = "none";
      updateResults();
    }
  });
}

// ===== 更新结果 =====
function updateResults() {
  let entries = State.entries;

  // 分类筛选
  if (State.activeCategory !== "all") {
    entries = entries.filter((e) => e.category === State.activeCategory);
  }

  // 关键词搜索
  if (State.query.trim()) {
    entries = search(State.query, entries);
  }

  renderResults(entries);
}

// ===== 启动 =====
init();
