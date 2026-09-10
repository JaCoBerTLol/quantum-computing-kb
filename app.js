// 量子计算知识库 — 搜索引擎与交互逻辑 v2.0
const State = {
  data: null,
  entries: [],
  categories: [],
  activeCategory: "all",
  activeColor: "#7c3aed",
  query: "",
  expandedIds: new Set(),
  timelineScroll: 0,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 同义词映射表 =====
const synonymMap = {
  "龙头": ["主要企业", "领先企业", "头部企业", "领军企业", "代表性企业"],
  "老大": ["领先", "龙头", "主要", "代表"],
  "国内": ["中国", "国产", "本土"],
  "国际": ["全球", "海外", "世界", "国外"],
  "区别": ["差异", "不同", "对比", "比较"],
  "原理": ["概念", "基础", "基本", "是什么"],
  "怎么实现": ["如何实现", "实现方式", "技术路线"],
  "什么时候": ["时间", "预期", "路线图", "未来"],
  "多少钱": ["投资", "成本", "融资", "市场规模"],
  "哪家强": ["比较", "对比", "竞争", "排名"],
  "前景": ["趋势", "未来", "展望", "发展"],
  "用途": ["应用", "场景", "使用"],
  "缺点": ["挑战", "瓶颈", "限制", "问题", "困难"],
  "优点": ["优势", "好处", "特点"],
  "入门": ["基础", "初学", "开始"],
  "最新": ["热点", "新闻", "突破", "新进展"],
  "进展": ["突破", "最新", "动态", "现状"],
  "量子计算机": ["量子计算", "量子比特", "量子硬件"],
  "速度": ["加速", "效率", "性能"],
  "安全": ["密码", "加密", "安全"],
  "龙头老大": ["主要企业", "领先企业", "领军企业"],
  "商业": ["产业化", "商业化", "市场"],
  "投资": ["融资", "市场", "规模"],
};

// 反向映射：自动生成
const reverseSynonymMap = {};
for (const [key, values] of Object.entries(synonymMap)) {
  for (const val of values) {
    if (!reverseSynonymMap[val]) reverseSynonymMap[val] = [];
    reverseSynonymMap[val].push(key);
  }
}

// ===== 模糊匹配：Levenshtein距离 =====
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ===== 关键词扩展 =====
function expandKeyword(kw) {
  const lower = kw.toLowerCase();
  const expansions = new Set([lower]);

  // 同义词映射
  for (const [key, values] of Object.entries(synonymMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      values.forEach(v => expansions.add(v.toLowerCase()));
    }
  }

  // 反向映射
  for (const [key, values] of Object.entries(reverseSynonymMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      values.forEach(v => expansions.add(v.toLowerCase()));
    }
  }

  // 英文常见缩写
  const abbrMap = {
    "qubit": ["量子比特"],
    "量子比特": ["qubit"],
    "qc": ["量子计算", "quantum computing"],
    "ai": ["人工智能", "机器学习"],
    "ml": ["机器学习"],
    "rsa": ["rsa加密", "非对称加密"],
    "nisq": ["噪声中等规模量子"],
  };
  for (const [key, values] of Object.entries(abbrMap)) {
    if (lower === key || lower.includes(key)) {
      values.forEach(v => expansions.add(v.toLowerCase()));
    }
  }

  return [...expansions];
}

// ===== 粒子背景 =====
function createParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colors = ["#7c3aed", "#2563eb", "#0891b2", "#a78bfa", "#22d3ee"];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width:${size}px;height:${size}px;
      background:${color};
      left:${Math.random() * 100}%;
      opacity:${Math.random() * 0.15 + 0.05};
      animation-duration:${Math.random() * 20 + 15}s;
      animation-delay:${Math.random() * 20}s;
    `;
    container.appendChild(p);
  }
}

// ===== 初始化 =====
async function init() {
  createParticles();

  try {
    const res = await fetch("data/knowledge-base.json");
    State.data = await res.json();
    State.entries = State.data.entries;
    State.categories = State.data.categories;

    $("#totalEntries").textContent = State.entries.length;
    $("#lastUpdated").textContent = `最后更新：${State.data.lastUpdated}`;

    renderCategories();
    renderResults(State.entries);
    renderTimeline();
    renderHotNews();
    renderBlochSphere();

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
    <button class="cat-pill active" data-cat="all" data-color="#7c3aed" style="background:#7c3aed;border-color:#7c3aed">
      <span class="cat-dot" style="background:#fff"></span>
      全部 <span class="cat-count">${allCount}</span>
    </button>`;

  for (const cat of State.categories) {
    const count = State.entries.filter((e) => e.category === cat.id).length;
    html += `
      <button class="cat-pill" data-cat="${cat.id}" data-color="${cat.color}">
        <span class="cat-dot" style="background:${cat.color}"></span>
        ${cat.name} <span class="cat-count">${count}</span>
      </button>`;
  }

  container.innerHTML = html;
}

// ===== 搜索核心（同义词+模糊匹配） =====
function search(query, entries) {
  const keywords = query
    .trim()
    .split(/\s+/)
    .filter((k) => k.length > 0);

  if (keywords.length === 0) return entries;

  // 展开所有关键词（含同义词）
  const expandedKeywords = keywords.flatMap(k => expandKeyword(k));
  const lowerExpanded = expandedKeywords.map(k => k.toLowerCase());

  const scored = entries
    .map((entry) => {
      let score = 0;
      const q = entry.question.toLowerCase();
      const a = entry.answer.toLowerCase();
      const t = (entry.tags || []).join(" ").toLowerCase();
      const sub = (entry.subcategory || "").toLowerCase();

      for (const kw of lowerExpanded) {
        // 精确包含匹配
        if (q.includes(kw)) score += 3;
        if (sub.includes(kw)) score += 2;
        if (t.includes(kw)) score += 2;
        if (a.includes(kw)) score += 1;

        // 模糊匹配（similarity > 0.7 且长度 > 2）
        if (kw.length > 2) {
          const words = q.split(/[\s,，。？（）()·、]+/);
          for (const w of words) {
            if (w.length > 1 && w !== kw && !w.includes(kw) && !kw.includes(w)) {
              const sim = similarity(kw, w);
              if (sim > 0.75) score += 1.5;
            }
          }
        }
      }
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.entry);
}

// ===== 搜索建议 =====
function getSearchSuggestions(query) {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();
  const suggestions = new Set();

  // 从问题中提取关键词
  for (const entry of State.entries) {
    const questionLower = entry.question.toLowerCase();
    // 完整问题匹配
    if (questionLower.includes(q)) {
      suggestions.add(entry.question);
    }
  }

  // 同义词建议
  for (const [key, values] of Object.entries(synonymMap)) {
    if (key.includes(q) || q.includes(key)) {
      values.forEach(v => {
        // 找包含该同义词的问题
        for (const entry of State.entries) {
          if (entry.question.toLowerCase().includes(v.toLowerCase())) {
            suggestions.add(entry.question);
          }
        }
      });
    }
  }

  // tag建议
  for (const entry of State.entries) {
    for (const tag of (entry.tags || [])) {
      if (tag.toLowerCase().includes(q)) {
        suggestions.add(tag);
      }
    }
  }

  return [...suggestions].slice(0, 6);
}

// ===== 相关推荐 =====
function getRelatedEntries(entry, allEntries) {
  const entryTags = new Set((entry.tags || []).map(t => t.toLowerCase()));
  const entryCat = entry.category;

  const scored = allEntries
    .filter(e => e.id !== entry.id)
    .map(e => {
      let score = 0;
      if (e.category === entryCat) score += 2;
      const sharedTags = (e.tags || []).filter(t => entryTags.has(t.toLowerCase()));
      score += sharedTags.length;
      return { entry: e, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(x => x.entry);
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
  const expandedKw = kw.length > 0 ? kw.flatMap(k => expandKeyword(k)) : [];

  container.innerHTML = entries
    .map((entry, i) => {
      const cat = State.categories.find((c) => c.id === entry.category);
      const catName = cat ? cat.name : "";
      const catColor = cat ? cat.color : "#7c3aed";
      const isExpanded = State.expandedIds.has(entry.id);

      const highlightKws = expandedKw.length > 0 ? expandedKw : kw;
      const question = highlightKws.length > 0 ? highlightText(entry.question, highlightKws) : entry.question;
      const answer = highlightKws.length > 0 ? highlightText(entry.answer, highlightKws) : entry.answer;

      const tags = (entry.tags || [])
        .map((t) => `<span class="tag">${t}</span>`)
        .join("");

      const related = isExpanded ? getRelatedEntries(entry, State.entries) : [];

      const relatedHtml = related.length > 0
        ? `<div class="related-section">
            <div class="related-title">相关推荐</div>
            <div class="related-list">
              ${related.map(r => {
                const rCat = State.categories.find(c => c.id === r.category);
                const rColor = rCat ? rCat.color : "#7c3aed";
                return `<div class="related-item" onclick="jumpToEntry('${r.id}')">
                  <span class="related-dot" style="background:${rColor}"></span>
                  <span>${r.question}</span>
                </div>`;
              }).join("")}
            </div>
          </div>`
        : "";

      return `
        <div class="entry-card ${isExpanded ? "expanded" : ""}" data-id="${entry.id}" style="animation-delay:${Math.min(i * 0.05, 0.5)}s">
          <div class="entry-header" onclick="toggleEntry('${entry.id}')">
            <span class="entry-badge" style="background:${catColor}1a;color:${catColor};border:1px solid ${catColor}33">
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
              ${relatedHtml}
            </div>
          </div>
        </div>`;
    })
    .join("");

  $("#resultCount").innerHTML = `<strong>${entries.length}</strong> 条结果`;
}

// ===== 跳转到条目 =====
window.jumpToEntry = function(id) {
  const entry = State.entries.find(e => e.id === id);
  if (!entry) return;

  // 清除搜索，切换到对应分类
  $("#searchInput").value = "";
  State.query = "";
  $("#clearBtn").style.display = "none";

  // 切换分类
  document.querySelectorAll(".cat-pill").forEach((p) => {
    p.classList.remove("active");
    p.style.background = "";
    p.style.borderColor = "";
    const dot = p.querySelector(".cat-dot");
    if (dot) dot.style.background = p.dataset.color;
  });
  const targetPill = document.querySelector(`.cat-pill[data-cat="${entry.category}"]`);
  if (targetPill) {
    targetPill.classList.add("active");
    const color = targetPill.dataset.color || "#7c3aed";
    targetPill.style.background = color;
    targetPill.style.borderColor = color;
    const dot = targetPill.querySelector(".cat-dot");
    if (dot) dot.style.background = "#fff";
  }
  State.activeCategory = entry.category;

  State.expandedIds.clear();
  State.expandedIds.add(id);
  updateResults();

  setTimeout(() => {
    const card = document.querySelector(`.entry-card[data-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
};

// ===== 高亮关键词 =====
function highlightText(text, keywords) {
  let result = text;
  const sorted = [...new Set(keywords)].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (kw.length < 1) continue;
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
    // 重新渲染以加载相关推荐
    updateResults();
  }
};

// ===== 随机知识 =====
window.randomKnowledge = function() {
  const random = State.entries[Math.floor(Math.random() * State.entries.length)];

  // 清除搜索和分类
  $("#searchInput").value = "";
  State.query = "";
  $("#clearBtn").style.display = "none";

  document.querySelectorAll(".cat-pill").forEach((p) => {
    p.classList.remove("active");
    p.style.background = "";
    p.style.borderColor = "";
    const dot = p.querySelector(".cat-dot");
    if (dot) dot.style.background = p.dataset.color;
  });
  const allPill = document.querySelector('.cat-pill[data-cat="all"]');
  if (allPill) {
    allPill.classList.add("active");
    allPill.style.background = "#7c3aed";
    allPill.style.borderColor = "#7c3aed";
    const dot = allPill.querySelector(".cat-dot");
    if (dot) dot.style.background = "#fff";
  }
  State.activeCategory = "all";

  State.expandedIds.clear();
  State.expandedIds.add(random.id);

  renderResults([random]);

  setTimeout(() => {
    const card = document.querySelector(`.entry-card[data-id="${random.id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
};

// ===== 量子计算发展时间线 =====
function renderTimeline() {
  const container = $("#timeline");
  if (!container) return;

  const timelineData = [
    { year: "1980", title: "Feynman提出量子计算构想", desc: "理查德·费曼在MIT会议上提出「用计算机模拟物理」的设想，奠定了量子计算的理论基础。", color: "#6366f1" },
    { year: "1985", title: "Deutsch量子图灵机", desc: "David Deutsch提出通用量子图灵机模型，定义了量子计算的理论框架。", color: "#6366f1" },
    { year: "1994", title: "Shor算法问世", desc: "Peter Shor提出大数质因数分解的量子算法，证明量子计算可破解RSA加密。", color: "#7c3aed" },
    { year: "1996", title: "Grover算法问世", desc: "Lov Grover提出无结构数据库搜索的量子算法，提供平方级加速。", color: "#7c3aed" },
    { year: "1998", title: "首个NMR量子计算实验", desc: "Chuang等人在NMR系统中实现2比特量子计算，首次实验验证量子算法。", color: "#0891b2" },
    { year: "2001", title: "Shor算法实验验证", desc: "IBM Almaden用NMR量子计算机成功实现15=3×5的质因数分解。", color: "#0891b2" },
    { year: "2007", title: "D-Wave首台量子退火机", desc: "D-Wave Systems发布首台商用量子退火计算机Orion（16比特）。", color: "#db2777" },
    { year: "2016", title: "IBM Quantum Experience上线", desc: "IBM推出首个云端量子计算平台，让公众可以通过云访问真实量子硬件。", color: "#2563eb" },
    { year: "2019", title: "Google宣布量子优越性", desc: "Google用53比特Sycamore芯片在随机线路采样任务上实现量子优越性，比Summit超算快亿倍。", color: "#dc2626" },
    { year: "2020", title: "中国九章量子优越性", desc: "潘建伟团队用光量子计算系统「九章」实现高斯玻色采样量子优越性。", color: "#ea580c" },
    { year: "2022", title: "离子阱1000比特突破", desc: "IonQ和Atom Computing分别推进离子阱和中性原子量子比特数量突破。", color: "#059669" },
    { year: "2024", title: "Google Willow纠错突破", desc: "Google发布105比特Willow芯片，首次证明量子纠错「below threshold」——增加比特反而降低错误率。", color: "#dc2626" },
    { year: "2025", title: "中国九章四号发布", desc: "潘建伟团队发布「九章四号」光量子计算系统，在特定任务上持续保持领先。", color: "#ea580c" },
    { year: "2025", title: "本源悟空-180商业化", desc: "本源量子推出「悟源3.0」504比特超导量子计算机，中国首个超导量子计算云上线。", color: "#ea580c" },
    { year: "2026", title: "IBM纠错路线图推进", desc: "IBM推进Heron架构模块化扩展和量子LDPC纠错方案，向1000+逻辑比特迈进。", color: "#2563eb" },
  ];

  container.innerHTML = timelineData.map((item, i) => `
    <div class="timeline-item" style="--item-color:${item.color}">
      <div class="timeline-dot" style="background:${item.color}"></div>
      <div class="timeline-content">
        <div class="timeline-year" style="color:${item.color}">${item.year}</div>
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-desc">${item.desc}</div>
      </div>
    </div>
  `).join("");
}

// ===== 热门资讯卡片 =====
function renderHotNews() {
  const container = $("#hotNews");
  if (!container) return;

  const newsEntries = State.entries.filter(e => e.category === "news").slice(0, 6);

  container.innerHTML = newsEntries.map((entry, i) => {
    const cat = State.categories.find(c => c.id === entry.category);
    const color = cat ? cat.color : "#ea580c";
    const answerPreview = entry.answer.length > 120 ? entry.answer.substring(0, 120) + "..." : entry.answer;

    return `
      <div class="news-card" onclick="jumpToEntry('${entry.id}')" style="animation-delay:${i * 0.1}s">
        <div class="news-badge" style="background:${color}15;color:${color};border-color:${color}30">
          ${entry.subcategory || "热点"}
        </div>
        <div class="news-title">${entry.question}</div>
        <div class="news-preview">${answerPreview}</div>
        <div class="news-footer">
          <span style="color:${color}">阅读详情 →</span>
        </div>
      </div>
    `;
  }).join("");
}

// ===== Bloch球可视化 =====
function renderBlochSphere() {
  const container = $("#blochSphere");
  if (!container) return;

  container.innerHTML = `
    <div class="bloch-container">
      <svg viewBox="-110 -110 220 220" width="240" height="240" id="blochSvg">
        <!-- 球面 -->
        <ellipse cx="0" cy="0" rx="80" ry="80" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
        <ellipse cx="0" cy="0" rx="80" ry="30" fill="none" stroke="#7c3aed" stroke-width="0.8" opacity="0.25"/>
        <ellipse cx="0" cy="0" rx="30" ry="80" fill="none" stroke="#7c3aed" stroke-width="0.8" opacity="0.25"/>
        <line x1="-80" y1="0" x2="80" y2="0" stroke="#94a3b8" stroke-width="0.8" opacity="0.3" stroke-dasharray="3,3"/>
        <line x1="0" y1="-80" x2="0" y2="80" stroke="#94a3b8" stroke-width="0.8" opacity="0.3" stroke-dasharray="3,3"/>

        <!-- 轴标签 -->
        <text x="0" y="-88" text-anchor="middle" font-size="11" fill="#6366f1" font-weight="600">|0⟩</text>
        <text x="0" y="93" text-anchor="middle" font-size="11" fill="#db2777" font-weight="600">|1⟩</text>
        <text x="88" y="4" text-anchor="middle" font-size="10" fill="#059669" font-weight="500">x</text>
        <text x="-88" y="4" text-anchor="middle" font-size="10" fill="#059669" font-weight="500">y</text>

        <!-- 状态向量 -->
        <line x1="0" y1="0" x2="0" y2="-70" stroke="#7c3aed" stroke-width="2.5" id="blochVector" stroke-linecap="round"/>
        <circle cx="0" cy="-70" r="5" fill="#7c3aed" id="blochPoint"/>

        <!-- |0⟩标签 -->
        <text x="8" y="-72" font-size="9" fill="#7c3aed" opacity="0.6">|ψ⟩</text>
      </svg>
      <div class="bloch-controls">
        <div class="bloch-state-label" id="blochStateLabel">|0⟩</div>
        <div class="bloch-gates">
          <button class="gate-btn" onclick="applyGate('H')">H</button>
          <button class="gate-btn" onclick="applyGate('X')">X</button>
          <button class="gate-btn" onclick="applyGate('Y')">Y</button>
          <button class="gate-btn" onclick="applyGate('Z')">Z</button>
          <button class="gate-btn" onclick="applyGate('S')">S</button>
          <button class="gate-btn reset" onclick="resetBloch()">重置</button>
        </div>
        <div class="bloch-info" id="blochInfo">应用H门创建叠加态<br>应用X门翻转量子比特</div>
      </div>
    </div>
  `;

  // 初始化Bloch球状态
  window.blochState = { theta: 0, phi: 0 };
  updateBlochSphere();
}

window.applyGate = function(gate) {
  const s = window.blochState;

  switch(gate) {
    case 'H':
      // Hadamard: |0⟩ → |+⟩ (theta=π/2, phi=0)
      s.theta = Math.PI / 2;
      s.phi = 0;
      break;
    case 'X':
      // Pauli-X: 翻转 (theta → π - theta, phi不变)
      s.theta = Math.PI - s.theta;
      break;
    case 'Y':
      // Pauli-Y: (theta → π - theta, phi → phi + π)
      s.theta = Math.PI - s.theta;
      s.phi = s.phi + Math.PI;
      break;
    case 'Z':
      // Pauli-Z: (phi → phi + π)
      s.phi = s.phi + Math.PI;
      break;
    case 'S':
      // S gate: (phi → phi + π/2)
      s.phi = s.phi + Math.PI / 2;
      break;
  }

  updateBlochSphere();

  const gateInfo = {
    'H': 'Hadamard门：创建叠加态 |+⟩ = (|0⟩+|1⟩)/√2',
    'X': 'Pauli-X门：比特翻转（量子NOT门）',
    'Y': 'Pauli-Y门：Y轴旋转+相位翻转',
    'Z': 'Pauli-Z门：相位翻转',
    'S': 'S门：相位门，P=π/2旋转',
  };
  $("#blochInfo").innerHTML = gateInfo[gate] || '';
};

window.resetBloch = function() {
  window.blochState = { theta: 0, phi: 0 };
  updateBlochSphere();
  $("#blochInfo").innerHTML = '应用H门创建叠加态<br>应用X门翻转量子比特';
};

function updateBlochSphere() {
  const s = window.blochState;
  const r = 70;
  const x = r * Math.sin(s.theta) * Math.cos(s.phi);
  const z = r * Math.cos(s.theta);
  const y = r * Math.sin(s.theta) * Math.sin(s.phi);

  const vec = document.getElementById("blochVector");
  const pt = document.getElementById("blochPoint");
  if (vec) {
    vec.setAttribute("x2", x.toFixed(1));
    vec.setAttribute("y2", (-z).toFixed(1));
  }
  if (pt) {
    pt.setAttribute("cx", x.toFixed(1));
    pt.setAttribute("cy", (-z).toFixed(1));
  }

  // 状态标签
  const label = $("#blochStateLabel");
  if (label) {
    const cosT = Math.cos(s.theta / 2);
    const sinT = Math.sin(s.theta / 2);
    const phiDeg = (s.phi * 180 / Math.PI) % 360;
    let stateStr;
    if (Math.abs(s.theta) < 0.01) {
      stateStr = "|0⟩";
    } else if (Math.abs(s.theta - Math.PI) < 0.01) {
      stateStr = "|1⟩";
    } else if (Math.abs(s.theta - Math.PI/2) < 0.01 && Math.abs(s.phi % (2*Math.PI)) < 0.01) {
      stateStr = "|+⟩ = (|0⟩+|1⟩)/√2";
    } else if (Math.abs(s.theta - Math.PI/2) < 0.01 && Math.abs((s.phi - Math.PI) % (2*Math.PI)) < 0.01) {
      stateStr = "|-⟩ = (|0⟩-|1⟩)/√2";
    } else {
      stateStr = `cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩`;
    }
    label.textContent = stateStr;
  }
}

// ===== 搜索建议渲染 =====
function renderSuggestions(query) {
  const container = $("#suggestions");
  if (!container) return;

  if (!query.trim()) {
    container.style.display = "none";
    return;
  }

  const suggestions = getSearchSuggestions(query);
  if (suggestions.length === 0) {
    container.style.display = "none";
    return;
  }

  container.innerHTML = suggestions.map(s => {
    const escaped = s.replace(/'/g, "\\'");
    return `<div class="suggestion-item" onclick="selectSuggestion('${escaped}')">
      <svg viewBox="0 0 24 24" width="14" height="14" style="opacity:0.4;margin-right:6px">
        <path fill="none" stroke="currentColor" stroke-width="2" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      ${s}
    </div>`;
  }).join("");

  container.style.display = "block";
}

window.selectSuggestion = function(text) {
  $("#searchInput").value = text;
  State.query = text;
  $("#suggestions").style.display = "none";
  $("#clearBtn").style.display = "flex";
  updateResults();
};

// ===== 事件绑定 =====
function bindEvents() {
  const input = $("#searchInput");
  const clearBtn = $("#clearBtn");

  // 搜索（防抖）+ 建议
  let debounceTimer;
  input.addEventListener("input", (e) => {
    const val = e.target.value;
    clearBtn.style.display = val ? "flex" : "none";

    // 实时建议
    renderSuggestions(val);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      State.query = val;
      updateResults();
    }, 200);
  });

  // 建议点击外部消失
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box") && !e.target.closest("#suggestions")) {
      const sug = $("#suggestions");
      if (sug) sug.style.display = "none";
    }
  });

  // 清除搜索
  clearBtn.addEventListener("click", () => {
    input.value = "";
    State.query = "";
    clearBtn.style.display = "none";
    $("#suggestions").style.display = "none";
    updateResults();
    input.focus();
  });

  // 分类筛选
  $("#categories").addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (!pill) return;

    document.querySelectorAll(".cat-pill").forEach((p) => {
      p.classList.remove("active");
      p.style.background = "";
      p.style.borderColor = "";
      const dot = p.querySelector(".cat-dot");
      if (dot) dot.style.background = p.dataset.color;
    });

    pill.classList.add("active");
    const color = pill.dataset.color || "#7c3aed";
    pill.style.background = color;
    pill.style.borderColor = color;
    const dot = pill.querySelector(".cat-dot");
    if (dot) dot.style.background = "#fff";

    State.activeCategory = pill.dataset.cat;
    State.activeColor = color;
    updateResults();
  });

  // 时间线滚动
  const timelineScroll = $("#timelineScroll");
  if (timelineScroll) {
    const prevBtn = $("#timelinePrev");
    const nextBtn = $("#timelineNext");
    const scrollAmount = 280;

    if (prevBtn) prevBtn.addEventListener("click", () => {
      timelineScroll.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      timelineScroll.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }

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
      $("#suggestions").style.display = "none";
      updateResults();
    }
  });
}

// ===== 更新结果 =====
function updateResults() {
  let entries = State.entries;

  if (State.activeCategory !== "all") {
    entries = entries.filter((e) => e.category === State.activeCategory);
  }

  if (State.query.trim()) {
    entries = search(State.query, entries);
  }

  renderResults(entries);
}

// ===== 启动 =====
init();
