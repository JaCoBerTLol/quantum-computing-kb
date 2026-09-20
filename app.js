// 量子知识库 v4.0 — 三大量子领域多分区交互平台
const State = {
  data: null, entries: [], categories: [],
  activeTab: "knowledge",
  activeDomain: "all", activeCategory: "all", activeColor: "#7c3aed",
  query: "", expandedIds: new Set(),
  newsData: null, newsFilter: "latest",
  tlEra: "all",
  blochState: { theta: 0, phi: 0 },
  circuit: { qubits: 2, gates: [], cols: 8 },
  entangleState: { prepared: false, measuredA: null, measuredB: null },
  slitState: { particles: 0, detect: false, pattern: [] },
  bb84State: { bits: [], evePresent: false, stats: { sent: 0, errors: 0, matches: 0 } },
  matrixGate: "H",
  coinState: { flipping: false, totalFlips: 0, heads: 0, tails: 0 },
  companies: [], ecoDomain: "all", compareSlots: [null, null],
  lpLevel: "beginner", lpProgress: {},
  glFilter: "all",
  mapDomain: "all",
};

const DOMAIN_COLORS = {
  qc: "#7c3aed", qt: "#2563eb", qm: "#0891b2"
};
const DOMAIN_NAMES = {
  qc: "量子计算", qt: "量子通信", qm: "量子精密测量"
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ===== 同义词映射 =====
const synonymMap = {
  "龙头": ["主要企业","领先企业","头部企业","领军企业","代表性企业"],
  "老大": ["领先","龙头","主要","代表"],
  "国内": ["中国","国产","本土"],
  "国际": ["全球","海外","世界","国外"],
  "区别": ["差异","不同","对比","比较"],
  "原理": ["概念","基础","基本","是什么"],
  "怎么实现": ["如何实现","实现方式","技术路线"],
  "什么时候": ["时间","预期","路线图","未来"],
  "多少钱": ["投资","成本","融资","市场规模"],
  "哪家强": ["比较","对比","竞争","排名"],
  "前景": ["趋势","未来","展望","发展"],
  "用途": ["应用","场景","使用"],
  "缺点": ["挑战","瓶颈","限制","问题","困难"],
  "优点": ["优势","好处","特点"],
  "入门": ["基础","初学","开始"],
  "最新": ["热点","新闻","突破","新进展"],
  "进展": ["突破","最新","动态","现状"],
  "量子计算机": ["量子计算","量子比特","量子硬件"],
  "速度": ["加速","效率","性能"],
  "安全": ["密码","加密","安全"],
  "龙头老大": ["主要企业","领先企业","领军企业"],
  "商业": ["产业化","商业化","市场"],
  "投资": ["融资","市场","规模"],
};
const reverseSynonymMap = {};
for (const [k, vs] of Object.entries(synonymMap)) { for (const v of vs) { (reverseSynonymMap[v] = reverseSynonymMap[v]||[]).push(k); } }

// ===== Levenshtein =====
function levenshtein(a, b) {
  const m=a.length, n=b.length, dp=Array(m+1).fill(0).map(()=>Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i; for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1;
  return dp[m][n];
}
function similarity(a,b) { const m=Math.max(a.length,b.length); return m===0?1:1-levenshtein(a,b)/m; }

function expandKeyword(kw) {
  const l = kw.toLowerCase(); const ex = new Set([l]);
  for (const [k,vs] of Object.entries(synonymMap)) { if (l.includes(k)||k.includes(l)) vs.forEach(v=>ex.add(v.toLowerCase())); }
  for (const [k,vs] of Object.entries(reverseSynonymMap)) { if (l.includes(k)||k.includes(l)) vs.forEach(v=>ex.add(v.toLowerCase())); }
  const abbr = {"qubit":["量子比特"],"量子比特":["qubit"],"qc":["量子计算"],"ai":["人工智能"],"rsa":["rsa加密"],"nisq":["噪声中等规模量子"]};
  for (const [k,vs] of Object.entries(abbr)) { if (l===k||l.includes(k)) vs.forEach(v=>ex.add(v.toLowerCase())); }
  return [...ex];
}

// ===== 粒子 =====
function createParticles() {
  const c = $("#particles"); if (!c) return;
  const colors = ["#7c3aed","#2563eb","#0891b2","#a78bfa","#22d3ee"];
  for (let i=0;i<20;i++) { const p=document.createElement("div"); p.className="particle";
    const s=Math.random()*4+2, cl=colors[Math.floor(Math.random()*colors.length)];
    p.style.cssText=`width:${s}px;height:${s}px;background:${cl};left:${Math.random()*100}%;opacity:${Math.random()*0.15+0.05};animation-duration:${Math.random()*20+15}s;animation-delay:${Math.random()*20}s;`;
    c.appendChild(p);
  }
}

// ===== Tab Logic =====
function initTabs() {
  const tabBar = $("#tabBar"); if (!tabBar) return;
  const indicator = $("#tabIndicator");
  const tabs = $$(".tab-btn");

  function updateIndicator() {
    const active = $(".tab-btn.active");
    if (!active || !indicator) return;
    const rect = active.getBoundingClientRect();
    const barRect = tabBar.getBoundingClientRect();
    indicator.style.left = (rect.left - barRect.left) + "px";
    indicator.style.width = rect.width + "px";
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      State.activeTab = target;
      $$(".tab-panel").forEach(p => p.classList.remove("active"));
      $("#panel-" + target).classList.add("active");
      updateIndicator();
      updateFloatClearBtn();
    });
  });

  setTimeout(updateIndicator, 50);
  window.addEventListener("resize", updateIndicator);
}

// ===== Init =====
async function init() {
  createParticles();
  initTabs();

  try {
    const res = await fetch("data/knowledge-base.json");
    State.data = await res.json();
    State.entries = State.data.entries;
    State.categories = State.data.categories;
    $("#totalEntries").textContent = State.entries.length;
    $("#lastUpdated").textContent = `最后更新：${State.data.lastUpdated}`;
    renderCategories(); renderResults(State.entries); bindEvents();
  } catch (err) {
    $("#results").innerHTML = `<div class="empty-state"><p>知识库加载失败</p><p class="hint">请通过 HTTP 服务器访问</p></div>`;
  }

  // Load news
  try {
    const newsRes = await fetch("data/news-data.json");
    State.newsData = await newsRes.json();
    renderNews();
  } catch (e) {
    renderNewsFallback();
  }

  renderTimeline();
  initBlochSphere();
  initCircuitSim();
  initEntangleDemo();
  initSlitExperiment();
  initBB84();
  initMatrixView();
  initQuantumCoin();
  initEcosystem();
  initLearningPath();
  initToolbox();
  initGlossary();
  initQuantumMap();
}

// ===== Categories =====
function renderCategories() {
  const c = $("#categories"); if (!c) return;
  const domains = State.data.domains || [{id:"qc",name:"量子计算"},{id:"qt",name:"量子通信"},{id:"qm",name:"量子精密测量"}];
  let html = `<button class="cat-pill active" data-cat="all" data-color="#7c3aed" style="background:#7c3aed;border-color:#7c3aed"><span class="cat-dot" style="background:#fff"></span>全部 <span class="cat-count">${State.entries.length}</span></button>`;
  for (const cat of State.categories) {
    const n = State.entries.filter(e=>e.category===cat.id).length;
    const color = cat.color || DOMAIN_COLORS[cat.domain] || "#7c3aed";
    html += `<button class="cat-pill" data-cat="${cat.id}" data-color="${color}" data-domain="${cat.domain||'qc'}"><span class="cat-dot" style="background:${color}"></span>${cat.name} <span class="cat-count">${n}</span></button>`;
  }
  c.innerHTML = html;
}

// ===== Search =====
function search(query, entries) {
  const kws = query.trim().split(/\s+/).filter(k=>k.length>0);
  if (kws.length===0) return entries;
  const expanded = kws.flatMap(k=>expandKeyword(k)).map(k=>k.toLowerCase());
  const scored = entries.map(e => {
    let s=0; const q=e.question.toLowerCase(), a=e.answer.toLowerCase(), t=(e.tags||[]).join(" ").toLowerCase(), sub=(e.subcategory||"").toLowerCase();
    for (const kw of expanded) {
      if (q.includes(kw)) s+=3; if (sub.includes(kw)) s+=2; if (t.includes(kw)) s+=2; if (a.includes(kw)) s+=1;
      if (kw.length>2) { const ws=q.split(/[\s,，。？（）()·、]+/); for (const w of ws) { if (w.length>1&&w!==kw&&!w.includes(kw)&&!kw.includes(w)) { const sim=similarity(kw,w); if (sim>0.75) s+=1.5; } } }
    }
    return {entry:e, score:s};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return scored.map(x=>x.entry);
}

function getSearchSuggestions(query) {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase(); const s = new Set();
  for (const e of State.entries) { if (e.question.toLowerCase().includes(q)) s.add(e.question); }
  for (const [k,vs] of Object.entries(synonymMap)) { if (k.includes(q)||q.includes(k)) { vs.forEach(v=>{ for (const e of State.entries) { if (e.question.toLowerCase().includes(v.toLowerCase())) s.add(e.question); } }); } }
  for (const e of State.entries) { for (const t of (e.tags||[])) { if (t.toLowerCase().includes(q)) s.add(t); } }
  return [...s].slice(0,6);
}

function getRelated(entry, all) {
  const tags = new Set((entry.tags||[]).map(t=>t.toLowerCase())); const cat = entry.category;
  return all.filter(e=>e.id!==entry.id).map(e=>{
    let s=0; if (e.category===cat) s+=2;
    const shared=(e.tags||[]).filter(t=>tags.has(t.toLowerCase())); s+=shared.length;
    return {entry:e,score:s};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.entry);
}

// ===== Render Results =====
function renderResults(entries) {
  const c = $("#results"); if (!c) return;
  if (entries.length===0) { c.innerHTML=`<div class="empty-state"><svg viewBox="0 0 24 24" width="48" height="48" style="opacity:0.3"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><p>未找到匹配的知识条目</p><p class="hint">试试其他关键词，或选择「全部」分类</p></div>`; return; }
  const kw = State.query.trim().split(/\s+/).filter(k=>k.length>0);
  const eKw = kw.length>0 ? kw.flatMap(k=>expandKeyword(k)) : [];
  c.innerHTML = entries.map((e,i) => {
    const cat = State.categories.find(c=>c.id===e.category); const cn = cat?cat.name:""; const cc = cat?(cat.color||DOMAIN_COLORS[cat.domain]||"#7c3aed"):"#7c3aed";
    const exp = State.expandedIds.has(e.id);
    const hkw = eKw.length>0 ? eKw : kw;
    const q = hkw.length>0 ? highlight(e.question, hkw) : e.question;
    const a = hkw.length>0 ? highlight(e.answer, hkw) : e.answer;
    const tags = (e.tags||[]).map(t=>`<span class="tag">${t}</span>`).join("");
    const rel = exp ? getRelated(e, State.entries) : [];
    const rh = rel.length>0 ? `<div class="related-section"><div class="related-title">+ 相关推荐</div><div class="related-list">${rel.map(r=>{const rc=State.categories.find(c=>c.id===r.category);const rcc=rc?(rc.color||DOMAIN_COLORS[rc.domain]||"#7c3aed"):"#7c3aed";return `<div class="related-item" onclick="jumpToEntry('${r.id}')"><span class="related-dot" style="background:${rcc}"></span><span>${r.question}</span></div>`;}).join("")}</div></div>`:"";
    return `<div class="entry-card ${exp?"expanded":""}" data-id="${e.id}" style="animation-delay:${Math.min(i*0.05,0.5)}s"><div class="entry-header" onclick="toggleEntry('${e.id}')"><span class="entry-badge" style="background:${cc}1a;color:${cc};border:1px solid ${cc}33">${cn}</span><div class="entry-body"><div class="entry-question">${q}</div><div class="entry-subcategory">${e.subcategory||""}</div></div><svg class="entry-arrow" viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 9l6 6 6-6"/></svg></div><div class="entry-answer"><div class="entry-answer-inner">${a}<div class="entry-tags">${tags}</div>${rh}</div></div></div>`;
  }).join("");
  $("#resultCount").innerHTML = `<strong>${entries.length}</strong> 条结果`;
}

function highlight(text, kws) {
  let r = text; const sorted = [...new Set(kws)].sort((a,b)=>b.length-a.length);
  for (const k of sorted) { if (k.length<1) continue; const e=k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); r=r.replace(new RegExp(`(${e})`,"gi"),'<span class="highlight">$1</span>'); }
  return r;
}

window.toggleEntry = function(id) {
  const card = document.querySelector(`.entry-card[data-id="${id}"]`); if (!card) return;
  if (State.expandedIds.has(id)) { State.expandedIds.delete(id); card.classList.remove("expanded"); }
  else { State.expandedIds.add(id); updateResults(); }
};

window.jumpToEntry = function(id) {
  const e = State.entries.find(x=>x.id===id); if (!e) return;
  $("#searchInput").value=""; State.query=""; $("#clearBtn").style.display="none"; $("#suggestions").style.display="none";
  const ed=e.domain||"qc";
  $$(".kb-domain-pill").forEach(p=>p.classList.remove("active"));
  const dp=document.querySelector(`.kb-domain-pill[data-domain="${ed}"]`);
  if(dp) dp.classList.add("active"); else document.querySelector('.kb-domain-pill[data-domain="all"]')?.classList.add("active");
  State.activeDomain=ed;
  $$(".cat-pill").forEach(p=>{p.classList.remove("active");p.style.background="";p.style.borderColor="";const d=p.querySelector(".cat-dot");if(d)d.style.background=p.dataset.color;});
  const tp=document.querySelector(`.cat-pill[data-cat="${e.category}"]`);
  if (tp) { tp.classList.add("active"); const c=tp.dataset.color||"#7c3aed"; tp.style.background=c; tp.style.borderColor=c; const d=tp.querySelector(".cat-dot"); if(d) d.style.background="#fff"; }
  State.activeCategory=e.category; State.expandedIds.clear(); State.expandedIds.add(id); updateResults();
  setTimeout(()=>{ const c=document.querySelector(`.entry-card[data-id="${id}"]`); if (c) c.scrollIntoView({behavior:"smooth",block:"center"}); },100);
};

window.randomKnowledge = function() {
  const r = State.entries[Math.floor(Math.random()*State.entries.length)];
  $("#searchInput").value=""; State.query=""; $("#clearBtn").style.display="none";
  const rd=r.domain||"qc";
  $$(".kb-domain-pill").forEach(p=>p.classList.remove("active"));
  const dp=document.querySelector(`.kb-domain-pill[data-domain="${rd}"]`);
  if(dp) dp.classList.add("active"); else document.querySelector('.kb-domain-pill[data-domain="all"]')?.classList.add("active");
  State.activeDomain=rd;
  $$(".cat-pill").forEach(p=>{p.classList.remove("active");p.style.background="";p.style.borderColor="";const d=p.querySelector(".cat-dot");if(d)d.style.background=p.dataset.color;});
  const ap=document.querySelector('.cat-pill[data-cat="all"]'); if(ap){ap.classList.add("active");ap.style.background="#7c3aed";ap.style.borderColor="#7c3aed";const d=ap.querySelector(".cat-dot");if(d)d.style.background="#fff";}
  State.activeCategory="all"; State.expandedIds.clear(); State.expandedIds.add(r.id);
  renderResults([r]);
  setTimeout(()=>{ const c=document.querySelector(`.entry-card[data-id="${r.id}"]`); if (c) c.scrollIntoView({behavior:"smooth",block:"center"}); },100);
};

function renderSuggestions(query) {
  const c = $("#suggestions"); if (!c) return;
  if (!query.trim()) { c.style.display="none"; return; }
  const sugs = getSearchSuggestions(query);
  if (sugs.length===0) { c.style.display="none"; return; }
  c.innerHTML = sugs.map(s=>{const e=s.replace(/'/g,"\\'");return `<div class="suggestion-item" onclick="selectSuggestion('${e}')"><svg viewBox="0 0 24 24" width="14" height="14" style="opacity:0.4;margin-right:6px"><path fill="none" stroke="currentColor" stroke-width="2" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>${s}</div>`;}).join("");
  c.style.display="block";
}
window.selectSuggestion = function(text) {
  $("#searchInput").value=text; State.query=text; $("#suggestions").style.display="none"; $("#clearBtn").style.display="flex"; updateResults();
};

function updateResults() {
  let entries = State.entries;
  if (State.activeDomain!=="all") entries=entries.filter(e=>e.domain===State.activeDomain);
  if (State.activeCategory!=="all") entries=entries.filter(e=>e.category===State.activeCategory);
  if (State.query.trim()) entries=search(State.query, entries);
  renderResults(entries);
}

// ===== Event Binding =====
function bindEvents() {
  const input = $("#searchInput"); const clearBtn = $("#clearBtn");
  let dt;
  if (input) {
    input.addEventListener("input", (e) => {
      const v=e.target.value; clearBtn.style.display=v?"flex":"none";
      renderSuggestions(v);
      clearTimeout(dt); dt=setTimeout(()=>{State.query=v;updateResults();},200);
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest(".search-box")&&!e.target.closest("#suggestions")) {const s=$("#suggestions");if(s)s.style.display="none";} });
    clearBtn.addEventListener("click",()=>{ input.value="";State.query="";clearBtn.style.display="none";$("#suggestions").style.display="none";updateResults();input.focus(); });
    $("#categories").addEventListener("click",(e)=>{
      const p=e.target.closest(".cat-pill"); if(!p) return;
      $$(".cat-pill").forEach(p2=>{p2.classList.remove("active");p2.style.background="";p2.style.borderColor="";const d=p2.querySelector(".cat-dot");if(d)d.style.background=p2.dataset.color;});
      p.classList.add("active"); const c=p.dataset.color||"#7c3aed"; p.style.background=c; p.style.borderColor=c; const d=p.querySelector(".cat-dot"); if(d) d.style.background="#fff";
      State.activeCategory=p.dataset.cat; State.activeColor=c; updateResults();
    });
    document.addEventListener("keydown",(e)=>{
      if(e.key==="/"&&document.activeElement!==input){e.preventDefault();input.focus();}
      if(e.key==="Escape"){input.value="";State.query="";clearBtn.style.display="none";$("#suggestions").style.display="none";updateResults();}
    });
  }
  // Knowledge base domain filter
  const kbdf = $("#kbDomainFilter");
  if (kbdf) kbdf.addEventListener("click",(e)=>{
    const p=e.target.closest(".kb-domain-pill"); if(!p) return;
    $$(".kb-domain-pill").forEach(p2=>p2.classList.remove("active")); p.classList.add("active");
    State.activeDomain=p.dataset.domain; State.activeCategory="all";
    $$(".cat-pill").forEach(p2=>{p2.classList.remove("active");p2.style.background="";p2.style.borderColor="";const d=p2.querySelector(".cat-dot");if(d)d.style.background=p2.dataset.color;});
    const ap=document.querySelector('.cat-pill[data-cat="all"]'); if(ap){ap.classList.add("active");ap.style.background="#7c3aed";ap.style.borderColor="#7c3aed";const d=ap.querySelector(".cat-dot");if(d)d.style.background="#fff";}
    updateResults();
  });
  // News filter
  const nfb = $("#newsFilterBar");
  if (nfb) nfb.addEventListener("click",(e)=>{
    const b=e.target.closest(".news-filter-btn"); if(!b) return;
    $$(".news-filter-btn").forEach(b2=>b2.classList.remove("active")); b.classList.add("active");
    State.newsFilter=b.dataset.filter; renderNews();
  });
  // Timeline era
  const teb = $("#tlEraBar");
  if (teb) teb.addEventListener("click",(e)=>{
    const p=e.target.closest(".tl-era-pill"); if(!p) return;
    $$(".tl-era-pill").forEach(p2=>p2.classList.remove("active")); p.classList.add("active");
    State.tlEra=p.dataset.era; renderTimeline();
  });
}

// ===== Bloch Sphere =====
function initBlochSphere() {
  const c = $("#blochSphere"); if (!c) return;
  c.innerHTML = `
    <div class="bloch-container">
      <svg viewBox="-110 -110 220 220" width="220" height="220" id="blochSvg">
        <ellipse cx="0" cy="0" rx="80" ry="80" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
        <ellipse cx="0" cy="0" rx="80" ry="30" fill="none" stroke="#7c3aed" stroke-width="0.8" opacity="0.25"/>
        <ellipse cx="0" cy="0" rx="30" ry="80" fill="none" stroke="#7c3aed" stroke-width="0.8" opacity="0.25"/>
        <line x1="-80" y1="0" x2="80" y2="0" stroke="#94a3b8" stroke-width="0.8" opacity="0.3" stroke-dasharray="3,3"/>
        <line x1="0" y1="-80" x2="0" y2="80" stroke="#94a3b8" stroke-width="0.8" opacity="0.3" stroke-dasharray="3,3"/>
        <text x="0" y="-88" text-anchor="middle" font-size="11" fill="#6366f1" font-weight="600">|0⟩</text>
        <text x="0" y="93" text-anchor="middle" font-size="11" fill="#db2777" font-weight="600">|1⟩</text>
        <line x1="0" y1="0" x2="0" y2="-70" stroke="#7c3aed" stroke-width="2.5" id="blochVector" stroke-linecap="round"/>
        <circle cx="0" cy="-70" r="5" fill="#7c3aed" id="blochPoint"/>
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
    </div>`;
  updateBloch();
}
window.applyGate = function(g) {
  const s = State.blochState;
  switch(g) {
    case 'H': s.theta=Math.PI/2; s.phi=0; break;
    case 'X': s.theta=Math.PI-s.theta; break;
    case 'Y': s.theta=Math.PI-s.theta; s.phi+=Math.PI; break;
    case 'Z': s.phi+=Math.PI; break;
    case 'S': s.phi+=Math.PI/2; break;
  }
  updateBloch();
  const info={"H":"Hadamard门：创建叠加态 |+⟩=(|0⟩+|1⟩)/√2","X":"Pauli-X门：比特翻转（量子NOT门）","Y":"Pauli-Y门：Y轴旋转+相位翻转","Z":"Pauli-Z门：相位翻转","S":"S门：相位门，π/2旋转"};
  const el=$("#blochInfo"); if(el) el.innerHTML=info[g]||"";
};
window.resetBloch = function() { State.blochState={theta:0,phi:0}; updateBloch(); $("#blochInfo").innerHTML="应用H门创建叠加态<br>应用X门翻转量子比特"; };
function updateBloch() {
  const s=State.blochState, r=70;
  const x=r*Math.sin(s.theta)*Math.cos(s.phi), z=r*Math.cos(s.theta);
  const v=$("#blochVector"),p=$("#blochPoint");
  if(v){v.setAttribute("x2",x.toFixed(1));v.setAttribute("y2",(-z).toFixed(1));}
  if(p){p.setAttribute("cx",x.toFixed(1));p.setAttribute("cy",(-z).toFixed(1));}
  const l=$("#blochStateLabel"); if(l) {
    let st;
    if(Math.abs(s.theta)<0.01) st="|0⟩";
    else if(Math.abs(s.theta-Math.PI)<0.01) st="|1⟩";
    else if(Math.abs(s.theta-Math.PI/2)<0.01&&Math.abs(s.phi%(2*Math.PI))<0.01) st="|+⟩=(|0⟩+|1⟩)/√2";
    else if(Math.abs(s.theta-Math.PI/2)<0.01&&Math.abs((s.phi-Math.PI)%(2*Math.PI))<0.01) st="|-⟩=(|0⟩-|1⟩)/√2";
    else st=`cos(θ/2)|0⟩+e^(iφ)sin(θ/2)|1⟩`;
    l.textContent=st;
  }
}

// ===== Quantum Circuit Simulator =====
function initCircuitSim() {
  const c = $("#circuitSim"); if (!c) return;
  const gates = ["H","X","Y","Z","S","T","CNOT"];
  c.innerHTML = `
    <div class="circuit-gate-palette">
      ${gates.map(g=>`<div class="circuit-gate-option" draggable="true" data-gate="${g}">${g}</div>`).join("")}
      <span style="font-size:12px;color:var(--text-muted);align-self:center">拖拽或点击放置门</span>
    </div>
    <div class="circuit-board" id="circuitBoard"></div>
    <div class="circuit-controls">
      <button class="gate-btn reset" onclick="clearCircuit()">清空</button>
      <button class="gate-btn" onclick="runCircuit()">运行</button>
    </div>
    <div class="circuit-prob" id="circuitProb" style="display:none">
      <div class="circuit-prob-title">测量概率分布</div>
      <div id="probBars"></div>
    </div>`;

  renderCircuitBoard();

  // Gate palette interactions
  let selectedGate = null;
  $$(".circuit-gate-option").forEach(opt => {
    opt.addEventListener("click", () => { selectedGate = opt.dataset.gate; $$(".circuit-gate-option").forEach(o=>o.style.background=""); opt.style.background="var(--accent-purple)"; opt.style.color="#fff"; });
    opt.addEventListener("dragstart", (e)=>{ e.dataTransfer.setData("gate", opt.dataset.gate); });
  });

  const board = $("#circuitBoard");
  board.addEventListener("click", (e) => {
    const slot = e.target.closest(".circuit-slot");
    if (!slot || !selectedGate) return;
    const row = parseInt(slot.dataset.row), col = parseInt(slot.dataset.col);
    State.circuit.gates = State.circuit.gates.filter(g => !(g.row===row && g.col===col));
    State.circuit.gates.push({ gate: selectedGate, row, col });
    renderCircuitBoard();
  });
  board.addEventListener("dragover", (e)=>{ e.preventDefault(); });
  board.addEventListener("drop", (e) => {
    e.preventDefault();
    const slot = e.target.closest(".circuit-slot"); if (!slot) return;
    const g = e.dataTransfer.getData("gate"); if (!g) return;
    const row=parseInt(slot.dataset.row),col=parseInt(slot.dataset.col);
    State.circuit.gates = State.circuit.gates.filter(g2=>!(g2.row===row&&g2.col===col));
    State.circuit.gates.push({gate:g,row,col});
    renderCircuitBoard();
  });
}

function renderCircuitBoard() {
  const board = $("#circuitBoard"); if (!board) return;
  const {qubits, gates, cols} = State.circuit;
  let html = "";
  for (let q=0; q<qubits; q++) {
    html += `<div class="circuit-row"><span class="circuit-qubit-label">q${q}⟩</span>`;
    for (let c=0; c<cols; c++) {
      const g = gates.find(g2=>g2.row===q&&g2.col===c);
      html += g ? `<div class="circuit-slot has-gate" data-row="${q}" data-col="${c}">${g.gate}</div>` : `<div class="circuit-slot" data-row="${q}" data-col="${c}"></div>`;
      if (c<cols-1) html += `<div class="circuit-wire"></div>`;
    }
    html += `</div>`;
  }
  board.innerHTML = html;
}

window.clearCircuit = function() { State.circuit.gates=[]; renderCircuitBoard(); $("#circuitProb").style.display="none"; };

window.runCircuit = function() {
  const {qubits, gates} = State.circuit;
  // Quantum state vector: 2^qubits amplitudes
  const dim = 1 << qubits;
  let state = new Array(dim).fill(0); state[0] = 1;

  // Sort gates by column
  const sorted = [...gates].sort((a,b)=>a.col-b.col);

  for (const g of sorted) {
    const gate = g.gate;
    if (gate==="H") state = applySingleGate(state, g.row, [[1/Math.SQRT2,1/Math.SQRT2],[1/Math.SQRT2,-1/Math.SQRT2]], qubits);
    else if (gate==="X") state = applySingleGate(state, g.row, [[0,1],[1,0]], qubits);
    else if (gate==="Y") state = applySingleGate(state, g.row, [[0,-1],[1,0]], qubits);
    else if (gate==="Z") state = applySingleGate(state, g.row, [[1,0],[0,-1]], qubits);
    else if (gate==="S") state = applySingleGate(state, g.row, [[1,0],[0,0]], qubits);
    else if (gate==="T") state = applySingleGate(state, g.row, [[1,0],[0,0.7]], qubits);
    else if (gate==="CNOT") {
      // Control = g.row, Target = 1-g.row (for 2 qubits)
      const target = 1 - g.row;
      state = applyCNOT(state, g.row, target, qubits);
    }
  }

  // Calculate probabilities
  const probs = state.map((amp) => {
    const val = typeof amp === "number" ? amp : (amp.re || 0);
    return Math.abs(val * val);
  });

  // Render
  const pb = $("#circuitProb"); const bars = $("#probBars");
  if (pb && bars) {
    pb.style.display = "block";
    bars.innerHTML = probs.map((p, i) => {
      const bits = i.toString(2).padStart(qubits, "0");
      const pct = (p * 100).toFixed(1);
      return `<div class="prob-bar-row"><span class="prob-bar-label">|${bits}⟩</span><div class="prob-bar-track"><div class="prob-bar-fill" style="width:${pct}%"></div></div><span class="prob-bar-value">${pct}%</span></div>`;
    }).join("");
  }
};

function applySingleGate(state, qubit, matrix, n) {
  const dim = 1 << n;
  const newState = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    const bit = (i >> qubit) & 1;
    const i0 = i & ~(1 << qubit);
    const i1 = i0 | (1 << qubit);
    const a0 = state[i0] || 0, a1 = state[i1] || 0;
    const m00 = matrix[0][0], m01 = matrix[0][1];
    const m10 = matrix[1][0], m11 = matrix[1][1];
    if (bit === 0) {
      newState[i] = m00 * a0 + m01 * a1;
    } else {
      newState[i] = m10 * a0 + m11 * a1;
    }
  }
  return newState;
}

function applyCNOT(state, control, target, n) {
  const dim = 1 << n;
  const newState = [...state];
  for (let i = 0; i < dim; i++) {
    if ((i >> control) & 1) { // control is 1
      const j = i ^ (1 << target); // flip target
      newState[i] = state[j];
      newState[j] = state[i];
    }
  }
  return newState;
}

// ===== Entanglement Demo =====
function initEntangleDemo() {
  const c = $("#entangleDemo"); if (!c) return;
  c.innerHTML = `
    <div class="entangle-stage">
      <div class="entangle-qubit">
        <div class="entangle-circle" id="entQA" onclick="measureEntangle(0)">?</div>
        <div class="entangle-label">量子比特 A</div>
      </div>
      <div class="entangle-link">
        <div class="entangle-link-icon">⟨ψ|ψ⟩</div>
        <div class="entangle-line"></div>
        <div class="entangle-label" style="text-align:center;font-size:11px">纠缠链接</div>
      </div>
      <div class="entangle-qubit">
        <div class="entangle-circle" id="entQB" onclick="measureEntangle(1)">?</div>
        <div class="entangle-label">量子比特 B</div>
      </div>
    </div>
    <div class="entangle-actions">
      <button class="gate-btn" onclick="prepareBell()">制备 Bell 态</button>
      <button class="gate-btn reset" onclick="resetEntangle()">重置</button>
    </div>
    <div class="entangle-result" id="entResult"></div>`;
}

window.prepareBell = function() {
  State.entangleState = {prepared:true, measuredA:null, measuredB:null};
  const a=$("#entQA"),b=$("#entQB"),r=$("#entResult");
  if(a){a.textContent="?";a.classList.remove("measured");}
  if(b){b.textContent="?";b.classList.remove("measured");}
  if(r){r.classList.remove("show");r.textContent="";}
  if(r){r.textContent="Bell态已制备：|Φ+⟩ = (|00⟩+|11⟩)/√2 — 点击任意量子比特测量";r.classList.add("show");}
};

window.measureEntangle = function(which) {
  if (!State.entangleState.prepared) return;
  if (which===0 && State.entangleState.measuredA!==null) return;
  if (which===1 && State.entangleState.measuredB!==null) return;

  const val = Math.random() < 0.5 ? 0 : 1;
  const otherVal = val; // Perfectly correlated in Bell state |Φ+⟩

  if (which===0) {
    State.entangleState.measuredA = val;
    State.entangleState.measuredB = otherVal;
    const a=$("#entQA"),b=$("#entQB");
    if(a){a.textContent=val;a.classList.add("measured");}
    if(b){b.textContent=otherVal;b.classList.add("measured");}
    const r=$("#entResult");
    if(r){r.textContent=`测量A=${val} → B瞬间坍缩为${otherVal}！这就是"幽灵般的超距作用"`;r.classList.add("show");}
  } else {
    State.entangleState.measuredB = val;
    State.entangleState.measuredA = otherVal;
    const a=$("#entQA"),b=$("#entQB");
    if(a){a.textContent=otherVal;a.classList.add("measured");}
    if(b){b.textContent=val;b.classList.add("measured");}
    const r=$("#entResult");
    if(r){r.textContent=`测量B=${val} → A瞬间坍缩为${otherVal}！量子纠缠的非局域关联`;r.classList.add("show");}
  }
};

window.resetEntangle = function() {
  State.entangleState={prepared:false,measuredA:null,measuredB:null};
  const a=$("#entQA"),b=$("#entQB"),r=$("#entResult");
  if(a){a.textContent="?";a.classList.remove("measured");}
  if(b){b.textContent="?";b.classList.remove("measured");}
  if(r){r.classList.remove("show");r.textContent="";}
};

// ===== Double-Slit Experiment =====
function initSlitExperiment() {
  const c = $("#slitExperiment"); if (!c) return;
  c.innerHTML = `
    <canvas class="slit-canvas" id="slitCanvas" width="600" height="280"></canvas>
    <div class="slit-controls">
      <button class="gate-btn" onclick="fireSlitParticle()">发射粒子</button>
      <button class="gate-btn" onclick="fireSlitBurst()">连续发射20个</button>
      <button class="gate-btn reset" onclick="clearSlit()">清空</button>
      <div class="slit-toggle">
        <span>路径探测</span>
        <div class="slit-switch" id="slitSwitch" onclick="toggleSlitDetect()"></div>
      </div>
      <div class="slit-counter" id="slitCounter">粒子数: 0</div>
    </div>`;
  drawSlitBase();
}

function drawSlitBase() {
  const canvas = $("#slitCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Source
  ctx.fillStyle = "#7c3aed"; ctx.beginPath(); ctx.arc(30,140,8,0,Math.PI*2); ctx.fill();
  ctx.font = "11px sans-serif"; ctx.fillStyle = "#94a3b8"; ctx.fillText("源", 20, 165);
  // Barrier with two slits
  ctx.fillStyle = "#475569"; ctx.fillRect(200,0,8,110); ctx.fillRect(200,170,8,280);
  ctx.fillRect(200,130,8,20); // slit gap 1 (around y=120)
  ctx.fillRect(200,0,8,0); // top wall
  // Actually: wall from 0 to 120, gap 120-140, wall 140-160, gap 160-180, wall 180 to 280
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#475569";
  ctx.fillRect(200,0,6,115); // top wall
  ctx.fillRect(200,145,6,25); // middle wall
  ctx.fillRect(200,180,6,100); // bottom wall
  // source
  ctx.fillStyle = "#7c3aed"; ctx.beginPath(); ctx.arc(30,140,6,0,Math.PI*2); ctx.fill();
  ctx.font = "10px sans-serif"; ctx.fillStyle = "#94a3b8"; ctx.fillText("源",22,160);
  // screen
  ctx.fillStyle = "#1e293b"; ctx.fillRect(560,0,4,280);
  ctx.fillStyle = "#94a3b8"; ctx.fillText("探测屏",545,270);
  // Slit labels
  ctx.fillStyle = "#0891b2"; ctx.fillText("缝1",205,135); ctx.fillText("缝2",205,170);
  // Existing pattern
  drawSlitPattern(ctx);
}

function drawSlitPattern(ctx) {
  if (!ctx) { const canvas=$("#slitCanvas"); if(!canvas) return; ctx=canvas.getContext("2d"); }
  for (const p of State.slitState.pattern) {
    ctx.fillStyle = p.color || "#7c3aed";
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
  }
}

window.fireSlitParticle = function() {
  const canvas = $("#slitCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const detect = State.slitState.detect;
  // Particle goes through slit 1 or 2
  const slit = Math.random() < 0.5 ? 1 : 2;
  const slitY = slit === 1 ? 130 : 165;
  // If detecting: particle behaves like a particle, lands near slit projection
  // If not detecting: interference pattern
  let screenY;
  if (detect) {
    // Gaussian around slit position
    screenY = slitY + (Math.random()-0.5)*60;
  } else {
    // Interference pattern
    const x = Math.random();
    const interference = Math.cos(x * Math.PI * 4) * 0.4 + 0.5;
    if (Math.random() > interference) {
      screenY = 20 + Math.random()*240; // uniform background
    } else {
      screenY = 140 + (x-0.5)*200 + (Math.random()-0.5)*15; // interference bands
    }
  }
  screenY = Math.max(10, Math.min(270, screenY));

  // Animate particle path
  let progress = 0;
  const animate = () => {
    progress += 0.04;
    if (progress >= 1) { drawSlitBase(); return; }
    drawSlitBase();
    const px = 36 + progress * 520;
    const py = 140 + progress * (screenY - 140);
    ctx.fillStyle = detect ? "#ef4444" : "#22d3ee";
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fill();
    // Show which slit if detecting
    if (detect && progress > 0.3 && progress < 0.5) {
      ctx.fillStyle = "#ef4444"; ctx.font="10px sans-serif";
      ctx.fillText(`缝${slit}`, 210, slitY-5);
    }
    requestAnimationFrame(animate);
  };
  animate();

  State.slitState.particles++;
  State.slitState.pattern.push({x:562, y:screenY, color: detect?"#ef4444":"#22d3ee"});
  $("#slitCounter").textContent = `粒子数: ${State.slitState.particles}`;
};

window.fireSlitBurst = function() {
  let n = 0;
  const interval = setInterval(() => {
    window.fireSlitParticle();
    n++;
    if (n >= 20) clearInterval(interval);
  }, 200);
};

window.clearSlit = function() { State.slitState={particles:0,detect:State.slitState.detect,pattern:[]}; drawSlitBase(); $("#slitCounter").textContent="粒子数: 0"; };
window.toggleSlitDetect = function() {
  const sw = $("#slitSwitch");
  State.slitState.detect = !State.slitState.detect;
  if (sw) sw.classList.toggle("on", State.slitState.detect);
  // Clear pattern when switching mode
  State.slitState.pattern = [];
  drawSlitBase();
  $("#slitCounter").textContent = `粒子数: 0`;
  State.slitState.particles = 0;
};

// ===== BB84 QKD =====
function initBB84() {
  const c = $("#bb84Demo"); if (!c) return;
  c.innerHTML = `
    <div class="bb84-controls">
      <button class="gate-btn" onclick="runBB84Round()">执行一轮传输</button>
      <button class="gate-btn" onclick="runBB8Batch()">批量传输10轮</button>
      <div class="slit-toggle">
        <span>Eve 窃听</span>
        <div class="slit-switch" id="bb84EveSwitch" onclick="toggleBB84Eve()"></div>
      </div>
      <button class="gate-btn reset" onclick="resetBB84()">重置</button>
    </div>
    <div class="bb84-stage" id="bb84Stage">
      <div style="text-align:center;font-size:13px;color:var(--text-muted);padding:20px">点击「执行一轮传输」开始演示</div>
    </div>
    <div class="bb84-stats" id="bb84Stats" style="display:none">
      <div class="bb84-stat"><div class="bb84-stat-value" id="bb84Sent">0</div><div class="bb84-stat-label">发送比特</div></div>
      <div class="bb84-stat"><div class="bb84-stat-value" id="bb84Match">0</div><div class="bb84-stat-label">基匹配</div></div>
      <div class="bb84-stat"><div class="bb84-stat-value" id="bb84Error">0</div><div class="bb84-stat-label">错误率</div></div>
    </div>`;
}

window.toggleBB84Eve = function() {
  State.bb84State.evePresent = !State.bb84State.evePresent;
  const sw = $("#bb84EveSwitch"); if (sw) sw.classList.toggle("on", State.bb84State.evePresent);
};

function runBB84Single() {
  // Alice sends: random bit (0/1) + random basis (rectilinear/diagonal)
  const bit = Math.random() < 0.5 ? 0 : 1;
  const aliceBasis = Math.random() < 0.5 ? "R" : "D"; // Rectilinear or Diagonal
  // Eve (if present): random basis
  const eveBasis = Math.random() < 0.5 ? "R" : "D";
  // Bob: random basis
  const bobBasis = Math.random() < 0.5 ? "R" : "D";

  // Eve's measurement
  let eveBit = null;
  if (State.bb84State.evePresent) {
    eveBit = (eveBasis === aliceBasis) ? bit : (Math.random() < 0.5 ? 0 : 1);
  }

  // Bob's measurement
  const effectiveBit = State.bb84State.evePresent ? eveBit : bit;
  let bobBit;
  if (bobBasis === aliceBasis) {
    bobBit = State.bb84State.evePresent ? eveBit : bit;
  } else {
    bobBit = Math.random() < 0.5 ? 0 : 1;
  }

  const basisMatch = bobBasis === aliceBasis;
  const hasError = basisMatch && bobBit !== bit;

  State.bb84State.bits.push({alice:{bit,basis:aliceBasis},eve:{bit:eveBit,basis:eveBasis},bob:{bit:bobBit,basis:bobBasis},basisMatch,hasError});
  State.bb84State.stats.sent++;
  if (basisMatch) State.bb84State.stats.matches++;
  if (hasError) State.bb84State.stats.errors++;

  return {alice:{bit,basis:aliceBasis},eve:{bit:eveBit,basis:eveBasis},bob:{bit:bobBit,basis:bobBasis},basisMatch,hasError};
}

window.runBB84Round = function() {
  const r = runBB84Single();
  const stage = $("#bb84Stage"); if (!stage) return;
  const bC = (v) => v ? "#db2777" : "#2563eb"; // bit color
  const basisLabel = (b) => b==="R"?"⊥":"↗";

  stage.innerHTML = `
    <div class="bb84-step"><div class="bb84-step-label">Alice 比特</div><div class="bb84-bit-box alice">${r.alice.bit}</div></div>
    <div class="bb84-step"><div class="bb84-step-label">Alice 基</div><div class="bb84-bit-box alice">${basisLabel(r.alice.basis)}</div></div>
    ${State.bb84State.evePresent ? `<div class="bb84-arrow">→</div><div class="bb84-step"><div class="bb84-step-label">Eve 窃听</div><div class="bb84-bit-box eve">${r.eve.bit!==null?r.eve.bit:"?"}</div></div>`:""}
    <div class="bb84-arrow">→</div>
    <div class="bb84-step"><div class="bb84-step-label">Bob 基</div><div class="bb84-bit-box bob">${basisLabel(r.bob.basis)}</div></div>
    <div class="bb84-step"><div class="bb84-step-label">Bob 比特</div><div class="bb84-bit-box ${r.basisMatch?(r.hasError?"mismatch":"match"):"bob"}">${r.bob.bit}</div></div>`;
  updateBB84Stats();
};

window.runBB8Batch = function() {
  for (let i=0; i<10; i++) runBB84Single();
  renderBB84Batch();
};

function renderBB84Batch() {
  const stage = $("#bb84Stage"); if (!stage) return;
  const bits = State.bb84State.bits.slice(-15);
  stage.innerHTML = bits.map((b, i) => {
    return `<div class="bb84-step"><div class="bb84-step-label">#${State.bb84State.bits.length-15+i+1}</div><div class="bb84-bit-box ${b.basisMatch?(b.hasError?"mismatch":"match"):"bob"}">${b.bob.bit}</div></div>`;
  }).join("");
  updateBB84Stats();
}

function updateBB84Stats() {
  const s = State.bb84State.stats;
  $("#bb84Stats").style.display = "flex";
  $("#bb84Sent").textContent = s.sent;
  $("#bb84Match").textContent = s.matches;
  const errRate = s.matches > 0 ? (s.errors / s.matches * 100).toFixed(0) + "%" : "0%";
  $("#bb84Error").textContent = errRate;
}

window.resetBB84 = function() {
  State.bb84State = {bits:[],evePresent:State.bb84State.evePresent,stats:{sent:0,errors:0,matches:0}};
  const stage=$("#bb84Stage"); if(stage) stage.innerHTML=`<div style="text-align:center;font-size:13px;color:var(--text-muted);padding:20px">点击「执行一轮传输」开始演示</div>`;
  $("#bb84Stats").style.display="none";
};

// ===== Matrix View =====
function initMatrixView() {
  const c = $("#matrixView"); if (!c) return;
  const gates = ["H","X","Y","Z","S","T","CNOT"];
  const matrixData = {
    "H": { matrix: [["1/√2","1/√2"],["1/√2","-1/√2"]], desc: "Hadamard门：创建叠加态，将|0⟩变为(|0⟩+|1⟩)/√2，|1⟩变为(|0⟩-|1⟩)/√2", size: "2×2" },
    "X": { matrix: [["0","1"],["1","0"]], desc: "Pauli-X门：量子NOT门，翻转|0⟩↔|1⟩", size: "2×2" },
    "Y": { matrix: [["0","-i"],["i","0"]], desc: "Pauli-Y门：Y轴旋转π+相位翻转", size: "2×2" },
    "Z": { matrix: [["1","0"],["0","-1"]], desc: "Pauli-Z门：|0⟩不变，|1⟩→-|1⟩（相位翻转）", size: "2×2" },
    "S": { matrix: [["1","0"],["0","i"]], desc: "S门（相位门）：|1⟩→i|1⟩，旋转π/2", size: "2×2" },
    "T": { matrix: [["1","0"],["0","e^(iπ/4)"]], desc: "T门：|1⟩相位旋转π/4，与H/S构成通用门集", size: "2×2" },
    "CNOT": { matrix: [["1","0","0","0"],["0","1","0","0"],["0","0","0","1"],["0","0","1","0"]], desc: "CNOT门：控制-非门，control=1时翻转target。4×4矩阵，双量子比特门", size: "4×4" },
  };
  c.innerHTML = `
    <div class="matrix-gate-selector">
      ${gates.map(g=>`<button class="gate-btn ${g===State.matrixGate?'':''}" data-gate="${g}" onclick="selectMatrixGate('${g}')">${g}</button>`).join("")}
    </div>
    <div class="matrix-display" id="matrixDisplay"></div>
    <div class="matrix-info" id="matrixInfo"></div>`;
  window._matrixData = matrixData;
  renderMatrix();
}

window.selectMatrixGate = function(g) {
  State.matrixGate = g;
  $$(".matrix-gate-selector .gate-btn").forEach(b => { b.style.background = b.dataset.gate===g ? "var(--accent-purple)" : ""; b.style.color = b.dataset.gate===g ? "#fff" : ""; });
  renderMatrix();
};

function renderMatrix() {
  const d = window._matrixData[State.matrixGate]; if (!d) return;
  const md = $("#matrixDisplay"); const mi = $("#matrixInfo");
  if (md) {
    const rows = d.matrix.map(row => `<div class="matrix-row">${row.map(c=>`<span class="matrix-cell">${c}</span>`).join("")}</div>`).join("");
    md.innerHTML = `<div style="display:flex;align-items:center;gap:4px"><span class="matrix-bracket">[</span><div>${rows}</div><span class="matrix-bracket">]</span></div><div style="font-size:12px;color:var(--text-muted);margin-top:8px;text-align:center">${d.size}</div>`;
  }
  if (mi) mi.textContent = d.desc;
}

// ===== News Rendering =====
function renderNews() {
  const c = $("#newsTimeline"); if (!c) return;
  const data = State.newsData;
  if (!data || !data.items) { renderNewsFallback(); return; }

  const badge = $("#newsUpdateBadge");
  if (badge) badge.textContent = `更新于 ${data.lastUpdated}`;

  let items = data.items || [];
  const filter = State.newsFilter;

  if (filter === "archive") {
    items = items.filter(i => i.isKey === true);
  } else if (filter !== "latest") {
    items = items.filter(i => i.category === filter);
  }

  // Sort by date desc
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Split into latest and archive
  const keyItems = items.filter(i => i.isKey);
  const regularItems = items.filter(i => !i.isKey);

  let html = "";

  if (filter === "latest" || filter === "archive") {
    if (filter === "archive") {
      html += items.map((item, i) => renderNewsItem(item, i)).join("");
    } else {
      html += regularItems.map((item, i) => renderNewsItem(item, i)).join("");
      if (keyItems.length > 0) {
        html += `<div class="news-archive-divider">— 重点新闻存档 —</div>`;
        html += keyItems.map((item, i) => renderNewsItem(item, i)).join("");
      }
    }
  } else {
    html += items.map((item, i) => renderNewsItem(item, i)).join("");
  }

  if (items.length === 0) {
    html = `<div class="empty-state"><p>暂无该分类的新闻</p></div>`;
  }

  c.innerHTML = html;
}

function renderNewsItem(item, i) {
  const catColors = { breakthrough: "#dc2626", industry: "#059669", policy: "#2563eb" };
  const catLabels = { breakthrough: "技术突破", industry: "产业投资", policy: "政策战略" };
  const color = catColors[item.category] || "#ea580c";
  const label = catLabels[item.category] || item.category || "资讯";
  const date = item.date || "";
  const source = item.source ? ` · 来源: ${item.url ? `<a href="${item.url}" target="_blank">${item.source}</a>` : item.source}` : "";

  return `<div class="news-item cat-${item.category||'latest'}" style="animation-delay:${i*0.05}s">
    <div class="news-item-date">
      <span class="news-item-cat" style="background:${color}15;color:${color}">${label}</span>
      ${date}
      ${item.isKey ? '<span style="color:#7c3aed;font-size:11px">★ 重点</span>' : ''}
    </div>
    <div class="news-item-title">${item.title}</div>
    <div class="news-item-summary">${item.summary || item.summary || ""}</div>
    <div class="news-item-source">${source}</div>
  </div>`;
}

function renderNewsFallback() {
  const c = $("#newsTimeline"); if (!c) return;
  const badge = $("#newsUpdateBadge");
  if (badge) badge.textContent = "使用知识库内置资讯";

  const newsEntries = State.entries.filter(e => e.category === "news");
  c.innerHTML = newsEntries.map((e, i) => {
    const cat = State.categories.find(c2 => c2.id === e.category);
    const color = cat ? cat.color : "#ea580c";
    const preview = e.answer.length > 150 ? e.answer.substring(0, 150) + "..." : e.answer;
    return `<div class="news-item cat-breakthrough" style="animation-delay:${i*0.05}s">
      <div class="news-item-date"><span class="news-item-cat" style="background:${color}15;color:${color}">${e.subcategory || "热点"}</span></div>
      <div class="news-item-title">${e.question}</div>
      <div class="news-item-summary">${preview}</div>
      <div class="news-item-source">来源: 知识库内置</div>
    </div>`;
  }).join("");
}

// ===== Timeline =====
function renderTimeline() {
  const eraBar = $("#tlEraBar"); if (!eraBar) return;
  const vertical = $("#tlVertical"); if (!vertical) return;

  const eras = [
    { id: "all", label: "全部" },
    { id: "1980s", label: "1980s 理论奠基" },
    { id: "1990s", label: "1990s 算法突破" },
    { id: "2000s", label: "2000s 实验验证" },
    { id: "2010s", label: "2010s 工程化" },
    { id: "2020s", label: "2020s 量子优越" },
  ];

  eraBar.innerHTML = eras.map(e => `<button class="tl-era-pill ${e.id===State.tlEra?"active":""}" data-era="${e.id}">${e.label}</button>`).join("");

  const data = [
    { year: "1980", title: "Feynman提出量子计算构想", desc: "理查德·费曼在MIT会议上提出「用计算机模拟物理」的设想，奠定了量子计算的理论基础。", color: "#6366f1", era: "1980s", tags: ["Feynman","理论"] },
    { year: "1985", title: "Deutsch量子图灵机", desc: "David Deutsch提出通用量子图灵机模型，定义了量子计算的理论框架。", color: "#6366f1", era: "1980s", tags: ["Deutsch","理论"] },
    { year: "1994", title: "Shor算法问世", desc: "Peter Shor提出大数质因数分解的量子算法，证明量子计算可破解RSA加密。", color: "#7c3aed", era: "1990s", tags: ["Shor","算法","RSA"] },
    { year: "1996", title: "Grover算法问世", desc: "Lov Grover提出无结构数据库搜索的量子算法，提供平方级加速。", color: "#7c3aed", era: "1990s", tags: ["Grover","搜索"] },
    { year: "1998", title: "首个NMR量子计算实验", desc: "Chuang等人在NMR系统中实现2比特量子计算，首次实验验证量子算法。", color: "#0891b2", era: "1990s", tags: ["NMR","实验"] },
    { year: "2001", title: "Shor算法实验验证", desc: "IBM Almaden用NMR量子计算机成功实现15=3×5的质因数分解。", color: "#0891b2", era: "2000s", tags: ["IBM","Shor","实验"] },
    { year: "2007", title: "D-Wave首台量子退火机", desc: "D-Wave Systems发布首台商用量子退火计算机Orion（16比特）。", color: "#db2777", era: "2000s", tags: ["D-Wave","退火"] },
    { year: "2016", title: "IBM Quantum Experience上线", desc: "IBM推出首个云端量子计算平台，让公众可以通过云访问真实量子硬件。", color: "#2563eb", era: "2010s", tags: ["IBM","云平台"] },
    { year: "2019", title: "Google宣布量子优越性", desc: "Google用53比特Sycamore芯片在随机线路采样任务上实现量子优越性，比Summit超算快亿倍。", color: "#dc2626", era: "2010s", tags: ["Google","Sycamore","优越性"] },
    { year: "2020", title: "中国九章量子优越性", desc: "潘建伟团队用光量子计算系统「九章」实现高斯玻色采样量子优越性。", color: "#ea580c", era: "2020s", tags: ["九章","潘建伟","优越性"] },
    { year: "2022", title: "离子阱1000比特突破", desc: "IonQ和Atom Computing分别推进离子阱和中性原子量子比特数量突破。", color: "#059669", era: "2020s", tags: ["IonQ","Atom"] },
    { year: "2024", title: "Google Willow纠错突破", desc: "Google发布105比特Willow芯片，首次证明量子纠错「below threshold」——增加比特反而降低错误率。", color: "#dc2626", era: "2020s", tags: ["Google","Willow","纠错"] },
    { year: "2025", title: "中国九章四号发布", desc: "潘建伟团队发布「九章四号」光量子计算系统，在特定任务上持续保持领先。", color: "#ea580c", era: "2020s", tags: ["九章四号","潘建伟"] },
    { year: "2025", title: "本源悟空-180商业化", desc: "本源量子推出「悟源3.0」504比特超导量子计算机，中国首个超导量子计算云上线。", color: "#ea580c", era: "2020s", tags: ["本源","悟源","超导"] },
    { year: "2026", title: "IBM纠错路线图推进", desc: "IBM推进Heron架构模块化扩展和量子LDPC纠错方案，向1000+逻辑比特迈进。", color: "#2563eb", era: "2020s", tags: ["IBM","Heron","LDPC"] },
  ];

  const filtered = State.tlEra === "all" ? data : data.filter(d => d.era === State.tlEra);

  vertical.innerHTML = filtered.map((e, i) => `
    <div class="tl-event" style="animation-delay:${i*0.06}s">
      <div class="tl-event-dot" style="background:${e.color};color:${e.color}"></div>
      <div class="tl-event-card">
        <div class="tl-event-year" style="color:${e.color}">${e.year}</div>
        <div class="tl-event-title">${e.title}</div>
        <div class="tl-event-desc">${e.desc}</div>
        <div class="tl-event-tags">${e.tags.map(t=>`<span class="tl-event-tag">${t}</span>`).join("")}</div>
      </div>
    </div>
  `).join("");
}

// ===== Quantum Coin (Dice) =====
function initQuantumCoin() {
  const c = $("#quantumCoin"); if (!c) return;
  c.innerHTML = `
    <div class="quantum-coin-box">
      <div class="quantum-coin" id="coinBtn" onclick="flipQuantumCoin()" title="点击掷骰子">
        ?
      </div>
      <div class="quantum-coin-result" id="coinResult">点击硬币，体验量子叠加态坍缩</div>
      <div class="quantum-coin-stats" id="coinStats">
        <span>总次数: <strong>0</strong></span>
        <span>正面: <strong>0</strong></span>
        <span>反面: <strong>0</strong></span>
      </div>
      <button class="gate-btn reset" onclick="resetQuantumCoin()" style="margin-top:8px">重置统计</button>
    </div>`;
}

window.flipQuantumCoin = function() {
  const coin = $("#coinBtn"); const result = $("#coinResult");
  if (!coin || State.coinState.flipping) return;

  State.coinState.flipping = true;
  coin.classList.add("flipping");
  coin.textContent = "?";

  if (result) result.textContent = "叠加态中... 正在坍缩";

  setTimeout(() => {
    const isHeads = Math.random() < 0.5;
    coin.classList.remove("flipping");

    if (isHeads) {
      coin.textContent = "正";
      coin.style.background = "linear-gradient(135deg, #7c3aed, #6366f1)";
      if (result) result.textContent = "测量结果：|0⟩ — 正面！量子态已坍缩";
      State.coinState.heads++;
    } else {
      coin.textContent = "反";
      coin.style.background = "linear-gradient(135deg, #0891b2, #2563eb)";
      if (result) result.textContent = "测量结果：|1⟩ — 反面！量子态已坍缩";
      State.coinState.tails++;
    }

    State.coinState.totalFlips++;
    State.coinState.flipping = false;

    const stats = $("#coinStats");
    if (stats) {
      const headsPct = State.coinState.totalFlips > 0 ? (State.coinState.heads / State.coinState.totalFlips * 100).toFixed(0) : 0;
      stats.innerHTML = `
        <span>总次数: <strong>${State.coinState.totalFlips}</strong></span>
        <span>正面: <strong>${State.coinState.heads}</strong></span>
        <span>反面: <strong>${State.coinState.tails}</strong></span>
        <span>正面率: <strong>${headsPct}%</strong></span>`;
    }
  }, 600);
};

window.resetQuantumCoin = function() {
  State.coinState = { flipping: false, totalFlips: 0, heads: 0, tails: 0 };
  const coin = $("#coinBtn"); const result = $("#coinResult"); const stats = $("#coinStats");
  if (coin) { coin.textContent = "?"; coin.style.background = "linear-gradient(135deg, #7c3aed, #6366f1)"; }
  if (result) result.textContent = "点击硬币，体验量子叠加态坍缩";
  if (stats) stats.innerHTML = `<span>总次数: <strong>0</strong></span><span>正面: <strong>0</strong></span><span>反面: <strong>0</strong></span>`;
};

// ===== Ecosystem / Company Comparison =====
const domainMeta = {
  qc: { name: "量子计算", color: "#6d3bea", light: "#f1edff" },
  qt: { name: "量子通信", color: "#2563eb", light: "#e8f0ff" },
  qm: { name: "量子精密测量", color: "#0891b2", light: "#e0f7fb" },
};

async function initEcosystem() {
  try {
    const res = await fetch("data/companies.json");
    State.companies = await res.json();
  } catch (e) {
    State.companies = [];
  }
  renderEcoMarket();
  renderEcoCompanies();
  bindEcoEvents();
  renderCompareSlots();
}

function renderEcoMarket() {
  const c = $("#ecoMarketRow"); if (!c) return;
  const markets = [
    { domain: "qc", label: "量子计算 · 全球", value: "13.9", unit: " 亿USD", growth: "+28% YoY · 2025" },
    { domain: "qt", label: "量子通信 · 中国", value: "138.6", unit: " 亿CNY", growth: "+24.7% YoY · 2025" },
    { domain: "qm", label: "量子精密测量 · 全球", value: "19.3", unit: " 亿USD", growth: "+16% YoY · 2025" },
  ];
  c.innerHTML = markets.map(m => `
    <div class="eco-market-card ${m.domain}">
      <div class="eco-market-label">${m.label}</div>
      <div class="eco-market-value">${m.value}<span class="eco-market-unit">${m.unit}</span></div>
      <div class="eco-market-growth">${m.growth}</div>
    </div>`).join("");
}

function renderEcoCompanies() {
  const c = $("#ecoCompanyGrid"); if (!c) return;
  const domain = State.ecoDomain;
  const filtered = domain === "all" ? State.companies : State.companies.filter(c => c.domain === domain);
  c.innerHTML = filtered.map((co, i) => {
    const dm = domainMeta[co.domain];
    const inCompare = State.compareSlots.includes(co.id);
    const logoText = co.name.length <= 3 ? co.name : co.name.substring(0, 2);
    const tags = [co.ticker, co.techRoute, co.keyProduct].filter(Boolean).slice(0, 3);
    return `<div class="eco-card ${inCompare ? "in-compare" : ""}" data-id="${co.id}" draggable="true" style="animation-delay:${Math.min(i*0.04,0.4)}s">
      <div class="eco-card-header">
        <div class="eco-logo ${co.domain}">${logoText}</div>
        <div>
          <div class="eco-name">${co.name}</div>
          <div class="eco-domain-tag">${dm.name} · ${co.country}</div>
        </div>
      </div>
      <div class="eco-info">${tags.map(t => `<span class="eco-tag">${t}</span>`).join("")}</div>
      <div class="eco-desc">${co.description}</div>
      <button class="eco-compare-btn ${inCompare ? "in-compare" : ""}" onclick="toggleCompare('${co.id}')" ${inCompare && State.compareSlots.every(s => s) ? "disabled" : ""}>
        ${inCompare ? "已加入对比" : "加入对比"}
      </button>
    </div>`;
  }).join("");
}

function bindEcoEvents() {
  const filter = $("#ecoDomainFilter");
  if (filter) filter.addEventListener("click", (e) => {
    const pill = e.target.closest(".eco-domain-pill");
    if (!pill) return;
    $$(".eco-domain-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    State.ecoDomain = pill.dataset.domain;
    renderEcoCompanies();
  });

  // Drag-and-drop for company cards into comparison slots
  const grid = $("#ecoCompanyGrid");
  if (grid) {
    grid.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".eco-card");
      if (!card) return;
      e.dataTransfer.setData("companyId", card.dataset.id);
      e.dataTransfer.effectAllowed = "copy";
      card.classList.add("dragging");
    });
    grid.addEventListener("dragend", (e) => {
      const card = e.target.closest(".eco-card");
      if (card) card.classList.remove("dragging");
    });
  }

  for (let i = 0; i < 2; i++) {
    const slot = $(`#compareSlot${i + 1}`);
    if (!slot) continue;
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drag-over");
    });
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drag-over");
      const companyId = e.dataTransfer.getData("companyId");
      if (!companyId) return;
      State.compareSlots[i] = companyId;
      renderEcoCompanies();
      renderCompareSlots();
      updateFloatClearBtn();
      if (State.compareSlots[0] && State.compareSlots[1]) showCompareOverlay();
    });
  }
}

window.toggleCompare = function(companyId) {
  const slots = State.compareSlots;
  const idx = slots.indexOf(companyId);
  if (idx !== -1) {
    slots[idx] = null;
  } else {
    const empty = slots.indexOf(null);
    if (empty !== -1) {
      slots[empty] = companyId;
    } else {
      slots[0] = companyId;
    }
  }
  renderEcoCompanies();
  renderCompareSlots();
  updateFloatClearBtn();
  if (slots[0] && slots[1]) showCompareOverlay();
};

window.clearCompare = function() {
  State.compareSlots = [null, null];
  renderEcoCompanies();
  renderCompareSlots();
  closeCompareOverlay();
  updateFloatClearBtn();
};

window.removeFromCompare = function(slotIdx) {
  State.compareSlots[slotIdx] = null;
  renderEcoCompanies();
  renderCompareSlots();
  closeCompareOverlay();
  updateFloatClearBtn();
};

function showCompareOverlay() {
  const overlay = $("#compareOverlay");
  const content = $("#compareOverlayContent");
  if (!overlay || !content) return;
  if (State.compareSlots.some(s => !s)) return;
  const [id1, id2] = State.compareSlots;
  const co1 = State.companies.find(c => c.id === id1);
  const co2 = State.companies.find(c => c.id === id2);
  if (!co1 || !co2) return;
  const dm1 = domainMeta[co1.domain];
  const dm2 = domainMeta[co2.domain];

  const fields = [
    { label: "领域", v1: dm1.name, v2: dm2.name },
    { label: "国家/地区", v1: co1.country, v2: co2.country },
    { label: "总部", v1: co1.hq, v2: co2.hq },
    { label: "成立年份", v1: co1.founded, v2: co2.founded },
    { label: "股票/融资", v1: co1.ticker, v2: co2.ticker },
    { label: "市值/估值", v1: co1.marketCap, v2: co2.marketCap },
    { label: "技术路线", v1: co1.techRoute, v2: co2.techRoute },
    { label: "核心产品", v1: co1.keyProduct, v2: co2.keyProduct },
    { label: "量子比特数", v1: co1.qubits || "—", v2: co2.qubits || "—" },
    { label: "关键里程碑", v1: co1.milestones, v2: co2.milestones },
    { label: "简介", v1: co1.description, v2: co2.description },
  ];

  content.innerHTML = `
    <div class="compare-detail">
      <div class="compare-detail-row compare-detail-row-header">
        <div class="compare-detail-cell" style="background:#f8faff">对比项</div>
        <div class="compare-detail-cell">${co1.name}<br><span class="compare-domain-badge ${co1.domain}">${dm1.name}</span></div>
        <div class="compare-detail-cell">${co2.name}<br><span class="compare-domain-badge ${co2.domain}">${dm2.name}</span></div>
      </div>
      ${fields.map(f => `
        <div class="compare-detail-row">
          <div class="compare-detail-cell label">${f.label}</div>
          <div class="compare-detail-cell value">${f.v1}</div>
          <div class="compare-detail-cell value">${f.v2}</div>
        </div>`).join("")}
    </div>`;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

window.closeCompareOverlay = function() {
  const overlay = $("#compareOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  State.compareSlots = [null, null];
  renderEcoCompanies();
  renderCompareSlots();
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCompareOverlay();
});

function updateFloatClearBtn() {
  const btn = $("#compareFloatClear");
  if (!btn) return;
  const active = State.activeTab === "ecosystem" && State.compareSlots.some(s => s);
  btn.classList.toggle("visible", active);
}

function renderCompareSlots() {
  const slots = State.compareSlots;
  let hasBoth = true;
  for (let i = 0; i < 2; i++) {
    const slot = $(`#compareSlot${i + 1}`);
    if (!slot) continue;
    const companyId = slots[i];
    if (companyId) {
      const co = State.companies.find(c => c.id === companyId);
      if (co) {
        const dm = domainMeta[co.domain];
        const logoText = co.name.length <= 3 ? co.name : co.name.substring(0, 2);
        slot.classList.add("filled");
        slot.innerHTML = `
          <button class="compare-remove-btn" onclick="removeFromCompare(${i})">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          <div class="compare-slot-content" style="padding:16px;text-align:center">
            <div class="eco-logo ${co.domain}" style="margin:0 auto 8px">${logoText}</div>
            <div class="eco-name">${co.name}</div>
            <span class="compare-domain-badge ${co.domain}">${dm.name}</span>
          </div>`;
      }
    } else {
      hasBoth = false;
      slot.classList.remove("filled");
      slot.innerHTML = `
        <div class="compare-slot-label">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          <span>${i === 0 ? "左侧公司" : "右侧公司"}</span>
        </div>`;
    }
  }
  renderCompareDetail(hasBoth);
}

function renderCompareDetail(show) {
  const c = $("#compareDetail");
  if (!c) return;
  if (!show || State.compareSlots.some(s => !s)) {
    c.innerHTML = "";
    return;
  }
  const [id1, id2] = State.compareSlots;
  const co1 = State.companies.find(c => c.id === id1);
  const co2 = State.companies.find(c => c.id === id2);
  if (!co1 || !co2) { c.innerHTML = ""; return; }
  const dm1 = domainMeta[co1.domain];
  const dm2 = domainMeta[co2.domain];

  const fields = [
    { label: "领域", v1: dm1.name, v2: dm2.name },
    { label: "国家/地区", v1: co1.country, v2: co2.country },
    { label: "总部", v1: co1.hq, v2: co2.hq },
    { label: "成立年份", v1: co1.founded, v2: co2.founded },
    { label: "股票/融资", v1: co1.ticker, v2: co2.ticker },
    { label: "市值/估值", v1: co1.marketCap, v2: co2.marketCap },
    { label: "技术路线", v1: co1.techRoute, v2: co2.techRoute },
    { label: "核心产品", v1: co1.keyProduct, v2: co2.keyProduct },
    { label: "量子比特数", v1: co1.qubits || "—", v2: co2.qubits || "—" },
    { label: "关键里程碑", v1: co1.milestones, v2: co2.milestones },
    { label: "简介", v1: co1.description, v2: co2.description },
  ];

  c.innerHTML = `
    <div class="compare-detail">
      <div class="compare-detail-row compare-detail-row-header">
        <div class="compare-detail-cell" style="background:#f8faff">对比项</div>
        <div class="compare-detail-cell">${co1.name}<br><span class="compare-domain-badge ${co1.domain}">${dm1.name}</span></div>
        <div class="compare-detail-cell">${co2.name}<br><span class="compare-domain-badge ${co2.domain}">${dm2.name}</span></div>
      </div>
      ${fields.map(f => `
        <div class="compare-detail-row">
          <div class="compare-detail-cell label">${f.label}</div>
          <div class="compare-detail-cell value">${f.v1}</div>
          <div class="compare-detail-cell value">${f.v2}</div>
        </div>`).join("")}
    </div>`;
}

// ===== Learning Path =====
const LEARNING_PATHS = {
  beginner: [
    {id:"b1",title:"量子力学基本概念",desc:"理解波粒二象性、叠加态、测量坍缩",icon:"W",domain:"qc",items:["量子比特(qubit)是什么？","什么是量子叠加？","量子测量与坍缩","波粒二象性双缝实验"]},
    {id:"b2",title:"量子比特与经典比特",desc:"从0/1到|0⟩+|1⟩的飞跃",icon:"Q",domain:"qc",items:["量子比特与经典比特的区别","Bloch球表示","单比特操作：X/Y/Z门"]},
    {id:"b3",title:"量子门与线路",desc:"H门、CNOT门与量子线路",icon:"C",domain:"qc",items:["Hadamard门创建叠加","CNOT门创建纠缠","量子线路的基本结构"]},
    {id:"b4",title:"量子通信初探",desc:"QKD原理与BB84协议",icon:"K",domain:"qt",items:["量子密钥分发(QKD)的基本原理","BB84协议的详细工作流程","量子通信的安全性保证"]},
    {id:"b5",title:"量子精密测量入门",desc:"量子传感器与原子钟",icon:"S",domain:"qm",items:["量子传感器的基本概念","原子钟：时间的量子标准","NV色心磁力仪"]},
    {id:"b6",title:"产业概览与未来展望",desc:"了解量子产业生态",icon:"I",domain:"qc",items:["全球量子计算市场规模","中国量子通信网络建设","量子精密测量产业现状"]},
  ],
  intermediate: [
    {id:"i1",title:"量子算法核心",desc:"Shor、Grover、VQE算法原理",icon:"A",domain:"qc",items:["Shor算法：量子因数分解","Grover算法：量子搜索","变分量子本征求解(VQE)"]},
    {id:"i2",title:"量子纠错码",desc:"Shor码、Steane码与表面码",icon:"E",domain:"qc",items:["量子纠错的必要性","Shor码与Steane码","表面码(Surface Code)"]},
    {id:"i3",title:"硬件技术路线",desc:"超导、离子阱、光量子等路线对比",icon:"H",domain:"qc",items:["超导量子比特(Transmon)","离子阱量子计算","光量子计算路线","半导体量子点","中性原子阵列"]},
    {id:"i4",title:"量子通信进阶",desc:"MDI-QKD、TF-QKD、量子中继",icon:"K",domain:"qt",items:["MDI-QKD：测量器件无关","TF-QKD：双场长距离","量子中继原理","DV-QKD与CV-QKD的区别"]},
    {id:"i5",title:"量子精密测量进阶",desc:"SQUID、冷原子、量子雷达",icon:"S",domain:"qm",items:["SQUID超导磁力仪","冷原子干涉仪与重力仪","量子雷达：单光子与鬼成像","光抽运磁力仪(OPM)"]},
    {id:"i6",title:"量子网络与互联网",desc:"量子网络架构与协议栈",icon:"N",domain:"qt",items:["量子网络的基本架构","量子隐形传态","纠缠分发与量子中继网络"]},
    {id:"i7",title:"NISQ与后量子密码",desc:"含噪量子计算与PQC",icon:"P",domain:"qc",items:["NISQ时代的特点与限制","后量子密码(PQC)标准","量子退火与组合优化"]},
    {id:"i8",title:"量子软件栈",desc:"Qiskit、Cirq、PennyLane",icon:"S",domain:"qc",items:["Qiskit框架入门","量子编程模型","量子算法库与工具链"]},
  ],
  expert: [
    {id:"e1",title:"容错量子计算",desc:"容错阈值与magic state distillation",icon:"F",domain:"qc",items:["容错量子计算的理论基础","magic state distillation","颜色码与拓扑纠错"]},
    {id:"e2",title:"量子复杂度理论",desc:"BQP、QMA与量子优势",icon:"C",domain:"qc",items:["BQP与经典复杂度类","QMA：量子证明验证","量子优势的理论边界"]},
    {id:"e3",title:"量子机器学习",desc:"量子增强学习算法",icon:"M",domain:"qc",items:["量子变分算法(VQA)","量子支持向量机","量子神经网络","量子梯度估计"]},
    {id:"e4",title:"量子热力学与开放系统",desc:"退相干与量子主方程",icon:"T",domain:"qc",items:["退相干理论(Lindblad)","量子主方程","环境诱导退相干"]},
    {id:"e5",title:"DI-QKD与量子密钥安全",desc:"设备无关安全证明",icon:"K",domain:"qt",items:["DI-QKD：设备无关安全","Bell不等式验证","测量器件无关(MDI)安全证明"]},
    {id:"e6",title:"量子传感极限",desc:"标准量子极限与海森堡极限",icon:"S",domain:"qm",items:["标准量子极限(SQL)","海森堡极限与纠缠增强","量子Fisher信息","自旋压缩与原子干涉"]},
    {id:"e7",title:"光钟与频率计量",desc:"光晶格钟与光钟比对",icon:"O",domain:"qm",items:["光晶格钟原理","Sr/Yb光钟","光钟比对与秒重新定义"]},
    {id:"e8",title:"量子模拟与多体物理",desc:"量子模拟器与凝聚态应用",icon:"Q",domain:"qc",items:["量子模拟器架构","拓扑物态模拟","Hubbard模型量子模拟"]},
    {id:"e9",title:"量子网络协议",desc:"量子互联网协议栈",icon:"N",domain:"qt",items:["量子网络层协议","纠缠交换网络","量子中继架构设计"]},
    {id:"e10",title:"量子计量学前沿",desc:"引力波探测与暗物质搜索",icon:"G",domain:"qm",items:["量子增强引力波探测","量子暗物质搜索","宏观量子叠加态"]},
  ],
};

function initLearningPath() {
  const lp = $("#lpLevelBar"); if (!lp) return;
  lp.addEventListener("click",(e)=>{
    const b=e.target.closest(".lp-level-btn"); if(!b) return;
    $$(".lp-level-btn").forEach(b2=>b2.classList.remove("active")); b.classList.add("active");
    State.lpLevel=b.dataset.level; renderLearningPath();
  });
  State.lpProgress = JSON.parse(localStorage.getItem("lpProgress")||"{}");
  renderLearningPath();
}

function renderLearningPath() {
  const c=$("#lpTrack"); if(!c) return;
  const path=LEARNING_PATHS[State.lpLevel]||[];
  const dc=DOMAIN_COLORS.qc;
  c.innerHTML=path.map((step,i)=>{
    const done=State.lpProgress[step.id]||false;
    const pct=Math.round(Object.values(State.lpProgress).filter(Boolean).length/path.length*100);
    $("#lpProgressFill").style.width=pct+"%"; $("#lpProgressText").textContent=pct+"%";
    return `<div class="lp-step ${done?"done":""}" data-step="${step.id}" style="--step-color:${DOMAIN_COLORS[step.domain]||dc}">
      <div class="lp-step-num">${i+1}</div>
      <div class="lp-step-body">
        <div class="lp-step-header" onclick="toggleLpStep('${step.id}')">
          <span class="lp-step-domain" style="background:${(DOMAIN_COLORS[step.domain]||dc)+"1a"};color:${DOMAIN_COLORS[step.domain]||dc}">${DOMAIN_NAMES[step.domain]||"量子计算"}</span>
          <div class="lp-step-title">${step.title}</div>
          <div class="lp-step-desc">${step.desc}</div>
          <div class="lp-step-check ${done?"checked":""}">${done?"✓":"○"}</div>
        </div>
        <div class="lp-step-items" id="lpItems-${step.id}" style="display:none">
          ${step.items.map((item,j)=>`<div class="lp-item"><span class="lp-item-num">${j+1}</span><span>${item}</span></div>`).join("")}
          <button class="lp-complete-btn" onclick="completeLpStep('${step.id}')">${done?"重新学习":"标记完成"}</button>
        </div>
      </div>
      ${i<path.length-1?'<div class="lp-step-connector"></div>':""}
    </div>`;
  }).join("");
}

window.toggleLpStep=function(id) {
  const el=$("#lpItems-"+id); if(el) el.style.display=el.style.display==="none"?"block":"none";
};
window.completeLpStep=function(id) {
  State.lpProgress[id]=!State.lpProgress[id];
  localStorage.setItem("lpProgress",JSON.stringify(State.lpProgress));
  renderLearningPath();
};

// ===== Toolbox =====
function initToolbox() {
  initStateVectorTool();
  initFidelityTool();
  initConverterTool();
  initGateTool();
  initDecibitTool();
  initBellTool();
}

function initStateVectorTool() {
  const c=$("#tbStateVector"); if(!c) return;
  c.innerHTML=`
    <div class="tb-controls">
      <label>θ: <input type="range" id="svTheta" min="0" max="180" value="0" oninput="updateStateVector()"></label>
      <label>φ: <input type="range" id="svPhi" min="0" max="360" value="0" oninput="updateStateVector()"></label>
    </div>
    <div class="tb-output" id="svOutput"></div>`;
  window.updateStateVector=function(){
    const theta=parseFloat($("#svTheta").value)*Math.PI/180;
    const phi=parseFloat($("#svPhi").value)*Math.PI/180;
    const a=Math.cos(theta/2), b=Math.sin(theta/2)*Math.cos(phi), b2=Math.sin(theta/2)*Math.sin(phi);
    const p0=Math.abs(a)**2, p1=Math.abs(b)**2+b2*b2;
    $("#svOutput").innerHTML=`
      <div class="tb-vector">|ψ⟩ = ${a.toFixed(3)}|0⟩ + (${b.toFixed(3)}${b2>=0?"+":""}${b2.toFixed(3)}i)|1⟩</div>
      <div class="tb-prob">P(|0⟩) = ${p0.toFixed(4)} (${(p0*100).toFixed(1)}%)</div>
      <div class="tb-prob">P(|1⟩) = ${p1.toFixed(4)} (${(p1*100).toFixed(1)}%)</div>
      <div class="tb-bar"><div class="tb-bar-0" style="width:${p0*100}%"></div><div class="tb-bar-1" style="width:${p1*100}%"></div></div>`;
  };
  updateStateVector();
}

function initFidelityTool() {
  const c=$("#tbFidelity"); if(!c) return;
  c.innerHTML=`
    <div class="tb-controls">
      <div>态 |ψ⟩: θ₁=<input type="range" id="fTheta1" min="0" max="180" value="0" oninput="updateFidelity()"> φ₁=<input type="range" id="fPhi1" min="0" max="360" value="0" oninput="updateFidelity()"></div>
      <div>态 |φ⟩: θ₂=<input type="range" id="fTheta2" min="0" max="180" value="90" oninput="updateFidelity()"> φ₂=<input type="range" id="fPhi2" min="0" max="360" value="0" oninput="updateFidelity()"></div>
    </div>
    <div class="tb-output" id="fOutput"></div>`;
  window.updateFidelity=function(){
    const t1=parseFloat($("#fTheta1").value)*Math.PI/180, p1=parseFloat($("#fPhi1").value)*Math.PI/180;
    const t2=parseFloat($("#fTheta2").value)*Math.PI/180, p2=parseFloat($("#fPhi2").value)*Math.PI/180;
    const a1=Math.cos(t1/2),b1r=Math.sin(t1/2)*Math.cos(p1),b1i=Math.sin(t1/2)*Math.sin(p1);
    const a2=Math.cos(t2/2),b2r=Math.sin(t2/2)*Math.cos(p2),b2i=Math.sin(t2/2)*Math.sin(p2);
    const dot=a1*a2+b1r*b2r+b1i*b2i;
    const F=dot*dot;
    $("#fOutput").innerHTML=`<div class="tb-result">保真度 F = ${F.toFixed(4)} (${(F*100).toFixed(1)}%)</div><div class="tb-bar"><div class="tb-bar-fid" style="width:${F*100}%;background:linear-gradient(90deg,#7c3aed,#2563eb)"></div></div>`;
  };
  updateFidelity();
}

function initConverterTool() {
  const c=$("#tbConverter"); if(!c) return;
  c.innerHTML=`
    <div class="tb-controls">
      <label>θ: <input type="range" id="cvTheta" min="0" max="180" value="45" oninput="updateConverter()"></label>
      <label>φ: <input type="range" id="cvPhi" min="0" max="360" value="0" oninput="updateConverter()"></label>
    </div>
    <div class="tb-output" id="cvOutput"></div>`;
  window.updateConverter=function(){
    const theta=parseFloat($("#cvTheta").value)*Math.PI/180;
    const phi=parseFloat($("#cvPhi").value)*Math.PI/180;
    const a=Math.cos(theta/2);
    const br=Math.sin(theta/2)*Math.cos(phi), bi=Math.sin(theta/2)*Math.sin(phi);
    const p0=a*a, p1=br*br+bi*bi;
    $("#cvOutput").innerHTML=`
      <div class="tb-section"><strong>Bloch坐标</strong><br>θ=${(theta*180/Math.PI).toFixed(1)}°, φ=${(phi*180/Math.PI).toFixed(1)}°<br>x=${(br*2).toFixed(3)}, y=${(-bi*2).toFixed(3)}, z=${(a*a-p1).toFixed(3)}</div>
      <div class="tb-section"><strong>态矢量</strong><br>|ψ⟩ = ${a.toFixed(3)}|0⟩ + (${br.toFixed(3)}${bi>=0?"+":""}${bi.toFixed(3)}i)|1⟩</div>
      <div class="tb-section"><strong>测量概率</strong><br>P(|0⟩) = ${(p0*100).toFixed(1)}%<br>P(|1⟩) = ${(p1*100).toFixed(1)}%</div>`;
  };
  updateConverter();
}

function initGateTool() {
  const c=$("#tbGate"); if(!c) return;
  const gates={H:[["1/√2","1/√2"],["1/√2","-1/√2"]],X:[["0","1"],["1","0"]],Y:[["0","-i"],["i","0"]],Z:[["1","0"],["0","-1"]],S:[["1","0"],["0","i"]],T:[["1","0"],["0","e^(iπ/4)"]]};
  c.innerHTML=`
    <div class="tb-controls">
      ${Object.keys(gates).map(g=>`<button class="tb-gate-btn" data-gate="${g}" onclick="selectGate('${g}')">${g}</button>`).join("")}
    </div>
    <div class="tb-output" id="gateOutput"></div>`;
  window.selectGate=function(g){
    $$(".tb-gate-btn").forEach(b=>b.classList.remove("active"));
    document.querySelector(`.tb-gate-btn[data-gate="${g}"]`).classList.add("active");
    const m=gates[g];
    $("#gateOutput").innerHTML=`
      <div class="tb-matrix-label">${g}门矩阵：</div>
      <div class="tb-matrix">
        <div class="tb-matrix-row"><span>${m[0][0]}</span><span>${m[0][1]}</span></div>
        <div class="tb-matrix-row"><span>${m[1][0]}</span><span>${m[1][1]}</span></div>
      </div>
      <div class="tb-gate-desc">${g==="H"?"Hadamard门：创建叠加态":g==="X"?"Pauli-X门：比特翻转":g==="Y"?"Pauli-Y门":g==="Z"?"Pauli-Z门：相位翻转":g==="S"?"S门：π/2相位":g==="T"?"T门：π/4相位":""}</div>`;
  };
  selectGate("H");
}

function initDecibitTool() {
  const c=$("#tbDecibit"); if(!c) return;
  c.innerHTML=`
    <div class="tb-controls">
      <label>量子比特数 n: <input type="range" id="dbN" min="1" max="40" value="20" oninput="updateDecibit()"></label>
    </div>
    <div class="tb-output" id="dbOutput"></div>`;
  window.updateDecibit=function(){
    const n=parseInt($("#dbN").value);
    const states=Math.pow(2,n);
    const bytes=states*16;
    const KB=bytes/1024,MB=KB/1024,GB=MB/1024,TB=GB/1024,PB=TB/1024,EB=PB/1024;
    let sizeStr;
    if(EB>=1) sizeStr=`${EB.toExponential(2)} EB`; else if(PB>=1) sizeStr=`${PB.toFixed(1)} PB`; else if(TB>=1) sizeStr=`${TB.toFixed(1)} TB`; else if(GB>=1) sizeStr=`${GB.toFixed(1)} GB`; else if(MB>=1) sizeStr=`${MB.toFixed(1)} MB`; else sizeStr=`${KB.toFixed(1)} KB`;
    $("#dbOutput").innerHTML=`
      <div class="tb-section"><strong>${n} 量子比特</strong></div>
      <div class="tb-stat">状态空间维度: <strong>${states.toExponential(3)}</strong></div>
      <div class="tb-stat">存储完整态矢量: <strong>${sizeStr}</strong></div>
      <div class="tb-stat">经典模拟极限: ${n<=30?"桌面可模拟":n<=40?"超算勉强":"不可能模拟"}</div>
      <div class="tb-bar"><div class="tb-bar-scale" style="width:${Math.min(n/40*100,100)}%;background:linear-gradient(90deg,#0891b2,#7c3aed)"></div></div>`;
  };
  updateDecibit();
}

function initBellTool() {
  const c=$("#tbBell"); if(!c) return;
  const bellStates=[
    {name:"|Φ⁺⟩",expr:"( |00⟩ + |11⟩ ) / √2",desc:"最大纠缠，测量结果完全关联"},
    {name:"|Φ⁻⟩",expr:"( |00⟩ - |11⟩ ) / √2",desc:"最大纠缠，测量结果完全反关联"},
    {name:"|Ψ⁺⟩",expr:"( |01⟩ + |10⟩ ) / √2",desc:"最大纠缠，反关联态"},
    {name:"|Ψ⁻⟩",expr:"( |01⟩ - |10⟩ ) / √2",desc:"最大纠缠，Bell基之一"}
  ];
  c.innerHTML=bellStates.map((s,i)=>`
    <div class="tb-bell-state ${i===0?"active":""}" onclick="selectBellState(${i})">
      <div class="tb-bell-name">${s.name}</div>
      <div class="tb-bell-expr">${s.expr}</div>
      <div class="tb-bell-desc">${s.desc}</div>
    </div>`).join("");
  window.selectBellState=function(idx){
    $$(".tb-bell-state").forEach((el,i)=>el.classList.toggle("active",i===idx));
  };
}

// ===== Glossary =====
const GLOSSARY_DATA=[
  // QC
  {cn:"量子比特",en:"Qubit",domain:"qc",desc:"量子信息的基本单元，可同时处于0和1的叠加态"},
  {cn:"叠加态",en:"Superposition",domain:"qc",desc:"量子系统同时处于多个本征态的线性组合状态"},
  {cn:"量子纠缠",en:"Quantum Entanglement",domain:"qc",desc:"两个或多个量子系统间的非经典关联，测量一个即时影响另一个"},
  {cn:"量子门",en:"Quantum Gate",domain:"qc",desc:"对量子比特执行的酉变换操作"},
  {cn:"Hadamard门",en:"Hadamard Gate (H)",domain:"qc",desc:"创建叠加态的单比特量子门"},
  {cn:"CNOT门",en:"CNOT Gate",domain:"qc",desc:"两比特受控非门，创建纠缠的核心门"},
  {cn:"Pauli门",en:"Pauli Gates (X/Y/Z)",domain:"qc",desc:"三个基本单比特量子门，对应自旋旋转"},
  {cn:"Bloch球",en:"Bloch Sphere",domain:"qc",desc:"单量子比特态的几何表示，球面上每点对应一个纯态"},
  {cn:"量子线路",en:"Quantum Circuit",domain:"qc",desc:"量子门序列组成的计算模型"},
  {cn:"酉变换",en:"Unitary Transform",domain:"qc",desc:"保持范数不变的线性变换，所有量子演化都是酉的"},
  {cn:"量子测量",en:"Quantum Measurement",domain:"qc",desc:"量子态投影到本征态的随机过程，导致波函数坍缩"},
  {cn:"退相干",en:"Decoherence",domain:"qc",desc:"量子系统与环境耦合导致叠加态丧失的过程"},
  {cn:"量子纠错",en:"Quantum Error Correction (QEC)",domain:"qc",desc:"利用冗余编码保护量子信息免受噪声影响"},
  {cn:"表面码",en:"Surface Code",domain:"qc",desc:"在二维格点上实现的拓扑量子纠错码"},
  {cn:"容错量子计算",en:"Fault-Tolerant QC",domain:"qc",desc:"在元件有噪情况下仍能正确执行的量子计算架构"},
  {cn:"NISQ",en:"Noisy Intermediate-Scale Quantum",domain:"qc",desc:"含噪中等规模量子计算时代，100-1000比特无纠错"},
  {cn:"量子优势",en:"Quantum Advantage",domain:"qc",desc:"量子计算机在特定问题上超越经典计算机的能力"},
  {cn:"Shor算法",en:"Shor's Algorithm",domain:"qc",desc:"量子因数分解算法，指数级加速大数分解"},
  {cn:"Grover算法",en:"Grover's Algorithm",domain:"qc",desc:"量子搜索算法，提供√N加速"},
  {cn:"变分量子本征求解",en:"VQE",domain:"qc",desc:"混合量子-经典算法，用于化学分子基态计算"},
  {cn:"超导量子比特",en:"Superconducting Qubit",domain:"qc",desc:"基于超导电路的量子比特，代表路线为Transmon"},
  {cn:"离子阱",en:"Ion Trap",domain:"qc",desc:"利用电磁场囚禁离子的量子计算方案"},
  {cn:"光量子计算",en:"Photonic QC",domain:"qc",desc:"以光子为量子比特的计算路线"},
  {cn:"中性原子",en:"Neutral Atom",domain:"qc",desc:"用光镊囚禁中性原子的量子计算方案"},
  {cn:"量子退火",en:"Quantum Annealing",domain:"qc",desc:"利用量子隧穿效应求解组合优化问题"},
  {cn:"拓扑量子比特",en:"Topological Qubit",domain:"qc",desc:"基于马约拉纳费米子的拓扑保护比特"},
  {cn:"量子体积",en:"Quantum Volume",domain:"qc",desc:"衡量量子计算机综合性能的指标"},
  // QT
  {cn:"量子通信",en:"Quantum Communication",domain:"qt",desc:"利用量子力学原理实现安全信息传输"},
  {cn:"量子密钥分发",en:"QKD (Quantum Key Distribution)",domain:"qt",desc:"利用量子态实现无条件安全的密钥分发"},
  {cn:"BB84协议",en:"BB84 Protocol",domain:"qt",desc:"最早的QKD协议，由Bennett和Brassard提出"},
  {cn:"量子隐形传态",en:"Quantum Teleportation",domain:"qt",desc:"利用纠缠对和经典通信传输量子态"},
  {cn:"量子中继",en:"Quantum Repeater",domain:"qt",desc:"扩展量子通信距离的核心设备"},
  {cn:"量子网络",en:"Quantum Network",domain:"qt",desc:"连接量子节点的通信网络"},
  {cn:"量子互联网",en:"Quantum Internet",domain:"qt",desc:"全球量子网络互联的远景概念"},
  {cn:"纠缠交换",en:"Entanglement Swapping",domain:"qt",desc:"通过测量连接两个独立纠缠对"},
  {cn:"MDI-QKD",en:"Measurement-Device-Independent QKD",domain:"qt",desc:"免疫探测器侧信道攻击的QKD协议"},
  {cn:"TF-QKD",en:"Twin-Field QKD",domain:"qt",desc:"实现最长安全距离的QKD协议"},
  {cn:"DV-QKD",en:"Discrete-Variable QKD",domain:"qt",desc:"基于离散变量(偏振)编码的QKD"},
  {cn:"CV-QKD",en:"Continuous-Variable QKD",domain:"qt",desc:"基于连续变量(振幅/相位)编码的QKD"},
  {cn:"诱骗态",en:"Decoy State",domain:"qt",desc:"抵御光子数分裂攻击的QKD增强方法"},
  {cn:"后量子密码",en:"Post-Quantum Cryptography (PQC)",domain:"qt",desc:"抗量子计算机攻击的经典密码方案"},
  {cn:"量子存储",en:"Quantum Memory",domain:"qt",desc:"存储量子态的设备，量子中继的核心组件"},
  {cn:"光子数分裂攻击",en:"Photon Number Splitting Attack",domain:"qt",desc:"针对弱相干脉冲光源的QKD攻击"},
  {cn:"量子信道",en:"Quantum Channel",domain:"qt",desc:"传输量子信号的物理通道(如光纤)"},
  {cn:"量子比特错误率",en:"QBER",domain:"qt",desc:"量子密钥分发中的误码率指标"},
  // QM
  {cn:"量子传感",en:"Quantum Sensing",domain:"qm",desc:"利用量子相干性实现超高灵敏度测量"},
  {cn:"原子钟",en:"Atomic Clock",domain:"qm",desc:"利用原子跃迁定义时间标准的量子设备"},
  {cn:"NV色心",en:"NV Center",domain:"qm",desc:"金刚石中氮-空位缺陷，量子传感核心平台"},
  {cn:"冷原子",en:"Cold Atom",domain:"qm",desc:"激光冷却至微开尔文的原子，用于精密测量"},
  {cn:"量子雷达",en:"Quantum Radar",domain:"qm",desc:"利用量子效应提升探测性能的雷达技术"},
  {cn:"SQUID",en:"Superconducting Quantum Interference Device",domain:"qm",desc:"超导量子干涉器件，最灵敏磁力仪"},
  {cn:"光抽运磁力仪",en:"OPM (Optically Pumped Magnetometer)",domain:"qm",desc:"利用光抽运极化原子蒸汽的磁力仪"},
  {cn:"标准量子极限",en:"Standard Quantum Limit (SQL)",domain:"qm",desc:"由投影噪声决定的测量灵敏度极限"},
  {cn:"海森堡极限",en:"Heisenberg Limit",domain:"qm",desc:"量子力学允许的最高测量精度"},
  {cn:"光晶格钟",en:"Optical Lattice Clock",domain:"qm",desc:"用光频跃迁定义的精密原子钟"},
  {cn:"量子重力仪",en:"Quantum Gravimeter",domain:"qm",desc:"用冷原子干涉仪测量重力加速度"},
  {cn:"拉姆齐干涉",en:"Ramsey Interferometry",domain:"qm",desc:"原子钟的核心测量技术"},
  {cn:"自旋回声",en:"Spin Echo",domain:"qm",desc:"消除低频噪声延长相干时间的脉冲技术"},
  {cn:"ODMR",en:"Optically Detected Magnetic Resonance",domain:"qm",desc:"光学检测磁共振，NV色心核心方法"},
  {cn:"动态解耦",en:"Dynamic Decoupling",domain:"qm",desc:"脉冲序列延长量子传感器相干时间"},
  {cn:"投影噪声",en:"Quantum Projection Noise",domain:"qm",desc:"量子测量统计随机性产生的噪声"},
  {cn:"量子Fisher信息",en:"Quantum Fisher Information",domain:"qm",desc:"量子计量学中衡量传感精度的核心量"},
  {cn:"Allan偏差",en:"Allan Deviation",domain:"qm",desc:"评估频率稳定度的统计方法"},
];

function initGlossary() {
  const gl=$("#glSearchInput");
  const fb=$("#glFilterBar");
  if(gl) gl.addEventListener("input",()=>renderGlossary());
  if(fb) fb.addEventListener("click",(e)=>{
    const b=e.target.closest(".gl-filter-btn"); if(!b) return;
    $$(".gl-filter-btn").forEach(b2=>b2.classList.remove("active")); b.classList.add("active");
    State.glFilter=b.dataset.filter; renderGlossary();
  });
  renderGlossary();
}

function renderGlossary() {
  const c=$("#glResults"); if(!c) return;
  const q=($("#glSearchInput")?.value||"").trim().toLowerCase();
  let items=GLOSSARY_DATA;
  if(State.glFilter!=="all") items=items.filter(t=>t.domain===State.glFilter);
  if(q) items=items.filter(t=>t.cn.toLowerCase().includes(q)||t.en.toLowerCase().includes(q)||t.desc.toLowerCase().includes(q));
  if(items.length===0){c.innerHTML=`<div class="gl-empty">未找到匹配术语</div>`;return;}
  c.innerHTML=items.map(t=>`
    <div class="gl-item" data-domain="${t.domain}">
      <div class="gl-item-domain" style="background:${DOMAIN_COLORS[t.domain]}1a;color:${DOMAIN_COLORS[t.domain]}">${DOMAIN_NAMES[t.domain]}</div>
      <div class="gl-item-content">
        <div class="gl-item-cn">${t.cn}</div>
        <div class="gl-item-en">${t.en}</div>
        <div class="gl-item-desc">${t.desc}</div>
      </div>
    </div>`).join("");
}

// ===== Quantum Map =====
// 经纬度 → SVG坐标投影 (校准自SVG路径数据: Iceland≈(366,340)@(-19,65), Japan≈(709,426)@(138,36), Australia≈(673,609)@(133,-25), UK≈(401,368)@(-2,54))
function lonLatToXY(lon, lat) {
  const x = 413.8 + lon * 2.227;
  const y = 538.0 - lat * 3.010;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

const MAP_LOCATIONS=[
  // QC - North America
  {name:"IBM",country:"美国",city:"New York",domain:"qc",lon:-74.0,lat:40.7,desc:"超导量子计算领导者"},
  {name:"Google",country:"美国",city:"California",domain:"qc",lon:-122.1,lat:37.4,desc:"Sycamore处理器"},
  {name:"Microsoft",country:"美国",city:"Washington",domain:"qc",lon:-122.3,lat:47.6,desc:"拓扑量子计算"},
  {name:"IonQ",country:"美国",city:"Maryland",domain:"qc",lon:-76.9,lat:38.9,desc:"离子阱量子计算"},
  {name:"Quantinuum",country:"美国/英国",city:"Colorado",domain:"qc",lon:-105.0,lat:40.0,desc:"离子阱+量子软件"},
  {name:"PsiQuantum",country:"美国",city:"California",domain:"qc",lon:-121.9,lat:37.7,desc:"光量子计算"},
  {name:"D-Wave",country:"加拿大",city:"Vancouver",domain:"qc",lon:-123.1,lat:49.3,desc:"量子退火"},
  {name:"Rigetti",country:"美国",city:"California",domain:"qc",lon:-122.3,lat:37.8,desc:"超导量子云"},
  // QC - China
  {name:"中科大",country:"中国",city:"合肥",domain:"qc",lon:117.3,lat:31.8,desc:"九章/祖冲之"},
  {name:"本源量子",country:"中国",city:"合肥",domain:"qc",lon:117.3,lat:31.8,desc:"超导量子计算"},
  {name:"百度量子",country:"中国",city:"北京",domain:"qc",lon:116.4,lat:40.0,desc:"量子云平台"},
  {name:"图灵量子",country:"中国",city:"上海",domain:"qc",lon:121.5,lat:31.2,desc:"光量子计算"},
  // QT
  {name:"ID Quantique",country:"瑞士",city:"Geneva",domain:"qt",lon:6.1,lat:46.2,desc:"商用QKD"},
  {name:"国盾量子",country:"中国",city:"合肥",domain:"qt",lon:117.3,lat:31.8,desc:"量子通信设备"},
  {name:"量子CTek",country:"中国",city:"济南",domain:"qt",lon:117.0,lat:36.7,desc:"CV-QKD"},
  {name:"Toshiba",country:"日本",city:"Tokyo",domain:"qt",lon:139.7,lat:35.7,desc:"TF-QKD"},
  {name:"东芝欧洲",country:"英国",city:"Cambridge",domain:"qt",lon:0.1,lat:52.2,desc:"QKD研究"},
  {name:"中科大量子通信",country:"中国",city:"合肥",domain:"qt",lon:117.3,lat:31.8,desc:"墨子号/京沪干线"},
  {name:"NTT",country:"日本",city:"Tokyo",domain:"qt",lon:139.7,lat:35.7,desc:"量子网络"},
  {name:"CSTEC",country:"中国",city:"北京",domain:"qt",lon:116.4,lat:40.0,desc:"量子通信标准化"},
  // QM
  {name:"Microchip",country:"美国",city:"Northeast",domain:"qm",lon:-71.0,lat:42.4,desc:"原子钟市场"},
  {name:"国仪量子",country:"中国",city:"合肥",domain:"qm",lon:117.3,lat:31.8,desc:"NV色心传感"},
  {name:"Exail",country:"法国",city:"Paris",domain:"qm",lon:2.3,lat:48.9,desc:"冷原子传感"},
  {name:"AOSense",country:"美国",city:"California",domain:"qm",lon:-122.1,lat:37.4,desc:"冷原子重力仪"},
  {name:"QuSpin",country:"美国",city:"Colorado",domain:"qm",lon:-105.0,lat:40.0,desc:"OPM磁力仪"},
  {name:"成都天奥",country:"中国",city:"成都",domain:"qm",lon:104.1,lat:30.7,desc:"原子钟"},
  {name:"PTB",country:"德国",city:"Braunschweig",domain:"qm",lon:10.5,lat:52.3,desc:"国家计量院"},
  {name:"NIST",country:"美国",city:"Boulder",domain:"qm",lon:-105.3,lat:40.0,desc:"光钟研究"},
  {name:"电子科技集团",country:"中国",city:"北京",domain:"qm",lon:116.4,lat:40.0,desc:"量子雷达/原子钟"},
  {name:"Qnami",country:"瑞士",city:"Lausanne",domain:"qm",lon:6.6,lat:46.5,desc:"NV扫描探针"},
];

function initQuantumMap() {
  const fb=$("#mapFilterBar");
  if(fb) fb.addEventListener("click",(e)=>{
    const b=e.target.closest(".map-filter-btn"); if(!b) return;
    $$(".map-filter-btn").forEach(b2=>b2.classList.remove("active")); b.classList.add("active");
    State.mapDomain=b.dataset.domain; renderQuantumMap();
  });
  renderQuantumMap();
}

let _worldMapSVG = null; // cache for loaded SVG

async function renderQuantumMap() {
  const c=$("#mapContainer"); if(!c) return;
  const locs=State.mapDomain==="all"?MAP_LOCATIONS:MAP_LOCATIONS.filter(l=>l.domain===State.mapDomain);

  // Load real world map SVG (cached after first load)
  if (!_worldMapSVG) {
    try {
      const resp = await fetch('data/world-map.svg');
      const svgText = await resp.text();
      _worldMapSVG = svgText;
    } catch(e) {
      // Fallback: simple dark background
      _worldMapSVG = '<svg viewBox="30 241 785 459" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="241" width="785" height="459" fill="#0d1117" rx="12"/></svg>';
    }
  }

  // Parse the SVG and add pins on top
  const parser = new DOMParser();
  const doc = parser.parseFromString(_worldMapSVG, 'image/svg+xml');
  const svgEl = doc.documentElement;
  svgEl.setAttribute('class', 'quantum-map-svg');
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');

  // Style all country paths
  const ns = 'http://www.w3.org/2000/svg';
  const paths = svgEl.querySelectorAll('path');
  paths.forEach(p => {
    p.setAttribute('fill', '#e8edf2');
    p.setAttribute('stroke', '#cbd5e1');
    p.setAttribute('stroke-width', '0.5');
  });

  // Add country labels for regions with companies
  const COUNTRY_LABELS = [
    {label:"美国", lon:-98, lat:39},
    {label:"加拿大", lon:-95, lat:50},
    {label:"中国", lon:104, lat:36},
    {label:"日本", lon:138, lat:36},
    {label:"瑞士", lon:8, lat:46.5},
    {label:"英国", lon:-1.5, lat:52.5},
    {label:"法国", lon:2.3, lat:46.5},
    {label:"德国", lon:10, lat:51},
  ];
  for (const cl of COUNTRY_LABELS) {
    const {x, y} = lonLatToXY(cl.lon, cl.lat);
    const labelText = doc.createElementNS(ns, 'text');
    labelText.setAttribute('x', x);
    labelText.setAttribute('y', y);
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('fill', '#94a3b8');
    labelText.setAttribute('font-size', '12');
    labelText.setAttribute('font-weight', '600');
    labelText.setAttribute('style', 'pointer-events:none;text-transform:uppercase;letter-spacing:1px');
    labelText.textContent = cl.label;
    svgEl.appendChild(labelText);
  }

  // Add defs for glow filter
  const defs = doc.createElementNS(ns, 'defs');
  const filter = doc.createElementNS(ns, 'filter');
  filter.setAttribute('id', 'glow');
  const feBlur = doc.createElementNS(ns, 'feGaussianBlur');
  feBlur.setAttribute('stdDeviation', '2.5'); feBlur.setAttribute('result', 'b');
  const feMerge = doc.createElementNS(ns, 'feMerge');
  const feMerge1 = doc.createElementNS(ns, 'feMergeNode');
  feMerge1.setAttribute('in', 'b');
  const feMerge2 = doc.createElementNS(ns, 'feMergeNode');
  feMerge2.setAttribute('in', 'SourceGraphic');
  feMerge.appendChild(feMerge1); feMerge.appendChild(feMerge2);
  filter.appendChild(feBlur); filter.appendChild(feMerge);
  defs.appendChild(filter);
  svgEl.insertBefore(defs, svgEl.firstChild);

  // Add pin groups for each location
  for (const l of locs) {
    const {x, y} = lonLatToXY(l.lon, l.lat);
    const color = DOMAIN_COLORS[l.domain];
    const g = doc.createElementNS(ns, 'g');
    g.setAttribute('class', 'map-pin');
    g.setAttribute('data-domain', l.domain);
    g.setAttribute('data-name', l.name);
    g.setAttribute('style', 'cursor:pointer');

    // Outer pulse circle
    const c1 = doc.createElementNS(ns, 'circle');
    c1.setAttribute('cx', x); c1.setAttribute('cy', y);
    c1.setAttribute('r', '7'); c1.setAttribute('fill', color);
    c1.setAttribute('opacity', '0.25'); c1.setAttribute('filter', 'url(#glow)');
    const a1 = doc.createElementNS(ns, 'animate');
    a1.setAttribute('attributeName', 'r'); a1.setAttribute('values', '7;14;7');
    a1.setAttribute('dur', '2.5s'); a1.setAttribute('repeatCount', 'indefinite');
    const a2 = doc.createElementNS(ns, 'animate');
    a2.setAttribute('attributeName', 'opacity'); a2.setAttribute('values', '0.25;0.03;0.25');
    a2.setAttribute('dur', '2.5s'); a2.setAttribute('repeatCount', 'indefinite');
    c1.appendChild(a1); c1.appendChild(a2);
    g.appendChild(c1);

    // Solid circle
    const c2 = doc.createElementNS(ns, 'circle');
    c2.setAttribute('cx', x); c2.setAttribute('cy', y);
    c2.setAttribute('r', '4.5'); c2.setAttribute('fill', color);
    const a3 = doc.createElementNS(ns, 'animate');
    a3.setAttribute('attributeName', 'r'); a3.setAttribute('values', '4.5;5.5;4.5');
    a3.setAttribute('dur', '2s'); a3.setAttribute('repeatCount', 'indefinite');
    c2.appendChild(a3);
    g.appendChild(c2);

    // White center
    const c3 = doc.createElementNS(ns, 'circle');
    c3.setAttribute('cx', x); c3.setAttribute('cy', y);
    c3.setAttribute('r', '2'); c3.setAttribute('fill', '#fff');
    g.appendChild(c3);

    // Label
    const text = doc.createElementNS(ns, 'text');
    text.setAttribute('x', x + 10); text.setAttribute('y', y + 4);
    text.setAttribute('fill', color); text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '500'); text.setAttribute('opacity', '0.85');
    text.setAttribute('style', 'text-shadow:0 0 3px #fff,0 1px 2px rgba(0,0,0,0.2);pointer-events:none');
    text.textContent = l.name;
    g.appendChild(text);

    svgEl.appendChild(g);
  }

  // Serialize and inject as string (more reliable than appendChild cross-document)
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  c.innerHTML = svgString;

  // Attach click handlers after DOM insertion
  c.querySelectorAll('.map-pin').forEach(pin => {
    const name = pin.getAttribute('data-name');
    if (name) pin.addEventListener('click', () => showMapInfo(name));
  });

  const lg=$("#mapLegend"); if(lg) lg.innerHTML=`
    <div class="map-legend-item"><span class="map-legend-dot" style="background:${DOMAIN_COLORS.qc}"></span>量子计算 (${MAP_LOCATIONS.filter(l=>l.domain==="qc").length})</div>
    <div class="map-legend-item"><span class="map-legend-dot" style="background:${DOMAIN_COLORS.qt}"></span>量子通信 (${MAP_LOCATIONS.filter(l=>l.domain==="qt").length})</div>
    <div class="map-legend-item"><span class="map-legend-dot" style="background:${DOMAIN_COLORS.qm}"></span>量子精密测量 (${MAP_LOCATIONS.filter(l=>l.domain==="qm").length})</div>`;
}

window.showMapInfo=function(name) {
  const loc=MAP_LOCATIONS.find(l=>l.name===name); if(!loc) return;
  const c=$("#mapContainer"); if(!c) return;
  const info=c.querySelector(".map-info-box")||document.createElement("div");
  info.className="map-info-box";
  info.innerHTML=`<strong>${loc.name}</strong> — ${loc.city}, ${loc.country}<br><span style="color:${DOMAIN_COLORS[loc.domain]}">${DOMAIN_NAMES[loc.domain]}</span><br>${loc.desc}`;
  info.style.cssText="position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.95);padding:10px 14px;border-radius:8px;font-size:12px;border:1px solid "+DOMAIN_COLORS[loc.domain]+"44;max-width:200px;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.1)";
  if(!c.querySelector(".map-info-box")) c.appendChild(info);
  info.onclick=()=>info.remove();
};

// ===== Start =====
init();
