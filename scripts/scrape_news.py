#!/usr/bin/env python3
"""
量子行业资讯抓取脚本 — 覆盖量子计算/通信/精密测量三大量子领域
策略：多源RSS抓取 → 关键词过滤 → 质量评分 → 去重 → 分类 → 输出JSON

新闻源覆盖：
- 量子计算：arXiv quant-ph, IBM Research, HPC Wire, Quantum Computing Report, Inside Quantum Technology, Quantum Zeitgeist
- 量子通信：IEEE ComSoc, IACR ePrint, The Quantum Insider
- 量子精密测量：Nature Physics, Optica, Science Daily, IEEE Spectrum
- 综合科技媒体：MIT Technology Review, Physics World

分类逻辑：
- breakthrough: 技术突破（新芯片、纠错里程碑、量子优越性等）
- industry: 产业投资（融资、IPO、合作、市场规模、商业化）
- policy: 政策战略（国家规划、标准发布、监管政策）

质量评分维度：
- 来源权威性权重（Nature/arXiv=5, IEEE/Optica=4, 官方博客=4, 科技媒体=3, 聚合站=3）
- 关键词命中（"突破/里程碑/首次/记录"=+2, "融资/投资/市场"=+1）
- 标题与摘要的相关性
"""

import json
import re
import hashlib
import os
import sys
from datetime import datetime, timedelta
from urllib.parse import urlparse

import feedparser
import requests

# ===== 配置 =====

# RSS 新闻源
FEED_SOURCES = [
    # === 量子计算 ===
    # 学术前沿
    {
        "name": "arXiv quant-ph",
        "url": "http://export.arxiv.org/rss/quant-ph",
        "source_name": "arXiv",
        "authority": 5,
        "default_category": "breakthrough",
        "type": "academic"
    },
    # 权威科普
    {
        "name": "Physics World Quantum",
        "url": "https://physicsworld.com/feed/",
        "source_name": "Physics World",
        "authority": 4,
        "default_category": "breakthrough",
        "type": "media"
    },
    # 行业新闻聚合
    {
        "name": "The Quantum Insider",
        "url": "https://thequantuminsider.com/feed/",
        "source_name": "The Quantum Insider",
        "authority": 3,
        "default_category": "industry",
        "type": "media"
    },
    # 科技媒体
    {
        "name": "MIT Tech Review AI",
        "url": "https://www.technologyreview.com/feed/",
        "source_name": "MIT Technology Review",
        "authority": 4,
        "default_category": "industry",
        "type": "media"
    },
    # IBM Research
    {
        "name": "IBM Research Blog",
        "url": "https://research.ibm.com/blog/rss",
        "source_name": "IBM Research",
        "authority": 4,
        "default_category": "breakthrough",
        "type": "official"
    },
    # HPC Wire (量子计算板块)
    {
        "name": "HPC Wire Quantum",
        "url": "https://www.hpcwire.com/category/quantum-computing/feed/",
        "source_name": "HPC Wire",
        "authority": 3,
        "default_category": "industry",
        "type": "media"
    },
    # Quantum Computing Report
    {
        "name": "Quantum Computing Report",
        "url": "https://quantumcomputingreport.com/feed/",
        "source_name": "Quantum Computing Report",
        "authority": 3,
        "default_category": "industry",
        "type": "media"
    },
    # Inside Quantum Technology
    {
        "name": "Inside Quantum Technology",
        "url": "https://www.insidequantumtechnology.com/feed/",
        "source_name": "Inside Quantum Technology",
        "authority": 3,
        "default_category": "industry",
        "type": "media"
    },
    # Quantum Zeitgeist
    {
        "name": "Quantum Zeitgeist",
        "url": "https://quantumzeitgeist.com/feed/",
        "source_name": "Quantum Zeitgeist",
        "authority": 3,
        "default_category": "breakthrough",
        "type": "media"
    },
    # === 量子通信 ===
    # IEEE Communications Society
    {
        "name": "IEEE ComSoc",
        "url": "https://www.comsoc.org/rss",
        "source_name": "IEEE ComSoc",
        "authority": 4,
        "default_category": "policy",
        "type": "academic"
    },
    # IACR (密码学)
    {
        "name": "IACR ePrint",
        "url": "https://eprint.iacr.org/rss",
        "source_name": "IACR",
        "authority": 5,
        "default_category": "breakthrough",
        "type": "academic"
    },
    # === 量子精密测量 ===
    # Optica (原OSA)
    {
        "name": "Optica",
        "url": "https://www.optica.org/rss.xml",
        "source_name": "Optica",
        "authority": 4,
        "default_category": "breakthrough",
        "type": "academic"
    },
    # Nature Physics
    {
        "name": "Nature Physics",
        "url": "https://www.nature.com/physics.rss",
        "source_name": "Nature Physics",
        "authority": 5,
        "default_category": "breakthrough",
        "type": "academic"
    },
    # Science Daily Physics
    {
        "name": "Science Daily Physics",
        "url": "https://www.sciencedaily.com/rss/physics_math.xml",
        "source_name": "Science Daily",
        "authority": 4,
        "default_category": "breakthrough",
        "type": "media"
    },
    # IEEE Spectrum
    {
        "name": "IEEE Spectrum",
        "url": "https://spectrum.ieee.org/rss",
        "source_name": "IEEE Spectrum",
        "authority": 4,
        "default_category": "industry",
        "type": "media"
    },
]

# 量子关键词（覆盖量子计算+通信+精密测量，用于过滤无关新闻）
QUANTUM_KEYWORDS = [
    # 量子计算
    "quantum computing", "quantum computer", "quantum bit", "qubit",
    "quantum algorithm", "quantum error correction", "quantum supremacy",
    "quantum advantage", "quantum annealing", "quantum circuit",
    "quantum gate", "quantum entanglement", "quantum teleportation",
    "quantum simulation", "quantum machine learning",
    "Shor", "Grover", "VQE", "QAOA", "NISQ",
    "superconducting qubit", "ion trap", "photonic quantum", "neutral atom",
    "topological quantum", "Bloch sphere", "logical qubit",
    # 量子通信
    "quantum communication", "quantum cryptography", "quantum key distribution",
    "quantum internet", "quantum network", "quantum repeater", "quantum relay",
    "QKD", "BB84", "E91", "DV-QKD", "CV-QKD", "MDI-QKD",
    "post-quantum", "post-quantum cryptography", "PQC",
    "quantum secure direct communication", "quantum teleportation",
    "entanglement swapping", "device-independent",
    # 量子精密测量
    "quantum sensor", "quantum sensing", "quantum metrology",
    "quantum radar", "quantum magnetometer", "quantum gravimeter",
    "atomic clock", "atom interferometer", "cold atom",
    "NV center", "nitrogen-vacancy", "SQUID", "optical clock",
    "quantum imaging", "quantum enhanced measurement",
    "spin qubit sensor", "quantum gyroscope", "quantum thermometer",
    # 中文关键词 — 量子计算
    "量子计算", "量子比特", "量子算法", "量子纠错", "量子优越",
    "量子霸权", "量子退火", "量子门", "量子纠缠", "量子模拟",
    "量子机器学习", "超导量子", "离子阱", "光量子", "中性原子",
    "拓扑量子", "逻辑量子比特",
    # 中文关键词 — 量子通信
    "量子通信", "量子密钥", "量子密钥分发", "量子互联网", "量子网络",
    "量子中继", "量子保密通信", "量子隐形传态", "后量子密码",
    "量子密码", "抗量子", "京沪干线", "量子纠缠交换",
    # 中文关键词 — 量子精密测量
    "量子精密测量", "量子传感", "量子计量", "量子雷达",
    "原子钟", "冷原子", "NV色心", "金刚石量子", "量子磁力仪",
    "量子重力仪", "量子陀螺仪", "光晶格钟", "量子成像",
]

# 突破类关键词
BREAKTHROUGH_KEYWORDS = [
    "breakthrough", "milestone", "first", "record", "demonstrate",
    "achieve", "surpass", "below threshold", "error correction",
    "突破", "里程碑", "首次", "记录", "实现", "超越",
    "new chip", "quantum processor", "logical qubit",
]

# 产业类关键词
INDUSTRY_KEYWORDS = [
    "funding", "investment", "market", "commercialize", "startup",
    "IPO", "merger", "acquisition", "partnership", "launch",
    "融资", "投资", "市场", "商业化", "合作", "发布",
]

# 政策类关键词
POLICY_KEYWORDS = [
    "policy", "regulation", "standard", "government", "national",
    "strategy", "initiative", "NIST", "decree", "plan",
    "政策", "标准", "政府", "国家", "战略", "规划", "部署",
]

# 排除关键词（噪音过滤）
EXCLUDE_KEYWORDS = [
    "crypto scam", "quantum healing", "quantum mysticism",
    "quantum manifestation", "quantum touch",
]

# ===== 工具函数 =====

def fetch_feed(source):
    """抓取RSS源"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Quantum News Bot) AppleWebKit/537.36"
        }
        resp = requests.get(source["url"], headers=headers, timeout=15)
        feed = feedparser.parse(resp.content)
        return feed.entries
    except Exception as e:
        print(f"  [WARN] 抓取 {source['name']} 失败: {e}")
        return []

def clean_html(text):
    """清理HTML标签"""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def is_quantum_related(title, summary):
    """检查是否量子计算相关"""
    text = (title + " " + summary).lower()
    # 排除噪音
    for kw in EXCLUDE_KEYWORDS:
        if kw in text:
            return False
    # 检查量子关键词
    for kw in QUANTUM_KEYWORDS:
        if kw.lower() in text:
            return True
    return False

def classify(title, summary, default_cat):
    """分类新闻"""
    text = (title + " " + summary).lower()
    
    # 计算各分类得分
    scores = {"breakthrough": 0, "industry": 0, "policy": 0}
    
    for kw in BREAKTHROUGH_KEYWORDS:
        if kw.lower() in text:
            scores["breakthrough"] += 2
    
    for kw in INDUSTRY_KEYWORDS:
        if kw.lower() in text:
            scores["industry"] += 2
    
    for kw in POLICY_KEYWORDS:
        if kw.lower() in text:
            scores["policy"] += 2
    
    # 选择最高分分类
    max_cat = max(scores, key=scores.get)
    if scores[max_cat] == 0:
        return default_cat
    return max_cat

def calculate_quality(title, summary, source):
    """计算新闻质量分数"""
    score = source["authority"] * 10
    text = (title + " " + summary).lower()
    
    # 突破性关键词加分
    for kw in BREAKTHROUGH_KEYWORDS:
        if kw.lower() in text:
            score += 5
    
    # 标题长度适中加分
    if 20 <= len(title) <= 120:
        score += 3
    
    # 有URL加分
    score += 2
    
    return score

def generate_id(title, date):
    """生成唯一ID"""
    raw = title + date
    return "n" + hashlib.md5(raw.encode()).hexdigest()[:6]

def parse_date(entry, source):
    """解析发布日期"""
    for attr in ["published_parsed", "updated_parsed", "created_parsed"]:
        t = getattr(entry, attr, None) if hasattr(entry, attr) else entry.get(attr)
        if t:
            try:
                dt = datetime(*t[:6])
                return dt.strftime("%Y-%m-%d")
            except:
                pass
    
    # 尝试字符串解析
    for attr in ["published", "updated", "date"]:
        val = getattr(entry, attr, None) if hasattr(entry, attr) else entry.get(attr)
        if val:
            try:
                dt = datetime.strptime(val[:10], "%Y-%m-%d")
                return dt.strftime("%Y-%m-%d")
            except:
                try:
                    dt = datetime.strptime(val[:10], "%a, %d %b %Y")
                    return dt.strftime("%Y-%m-%d")
                except:
                    pass
    return datetime.now().strftime("%Y-%m-%d")

# ===== 主流程 =====

def load_existing():
    """加载已有新闻"""
    news_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "news-data.json")
    try:
        with open(news_path, "r", encoding="utf-8") as f:
            return json.load(f), news_path
    except FileNotFoundError:
        return {"lastUpdated": "", "items": []}, news_path

def main():
    print("=" * 60)
    print("量子计算行业资讯抓取脚本")
    print(f"运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    existing_data, news_path = load_existing()
    existing_ids = set()
    existing_titles = set()
    
    for item in existing_data.get("items", []):
        existing_ids.add(item.get("id", ""))
        existing_titles.add(item.get("title", "")[:50].lower())
    
    new_items = []
    
    for source in FEED_SOURCES:
        print(f"\n[抓取] {source['name']} ...")
        entries = fetch_feed(source)
        print(f"  获取到 {len(entries)} 条RSS条目")
        
        count = 0
        for entry in entries:
            title = entry.get("title", "") if hasattr(entry, 'get') else getattr(entry, 'title', '')
            title = clean_html(title)
            
            summary = ""
            if hasattr(entry, 'summary'):
                summary = entry.summary
            elif hasattr(entry, 'get'):
                summary = entry.get("summary", "")
            summary = clean_html(summary)
            
            if not title:
                continue
            
            # 量子相关性过滤
            if not is_quantum_related(title, summary):
                continue
            
            # 去重
            title_key = title[:50].lower()
            if title_key in existing_titles:
                continue
            
            # 解析日期
            date = parse_date(entry, source)
            
            # 过滤太老的新闻（只保留180天内的）
            try:
                news_date = datetime.strptime(date, "%Y-%m-%d")
                if (datetime.now() - news_date).days > 180:
                    continue
            except:
                pass
            
            # 分类
            category = classify(title, summary, source["default_category"])
            
            # 质量评分
            quality = calculate_quality(title, summary, source)
            
            # 生成ID
            item_id = generate_id(title, date)
            if item_id in existing_ids:
                continue
            
            # 获取URL
            url = ""
            if hasattr(entry, 'link'):
                url = entry.link
            elif hasattr(entry, 'get'):
                url = entry.get("link", "")
            
            new_item = {
                "id": item_id,
                "title": title[:200],
                "summary": summary[:300] if summary else "",
                "date": date,
                "category": category,
                "source": source["source_name"],
                "url": url,
                "isKey": quality >= 25,
                "qualityScore": quality
            }
            
            new_items.append(new_item)
            existing_ids.add(item_id)
            existing_titles.add(title_key)
            count += 1
        
        print(f"  筛选后新增: {count} 条")
    
    # 合并新旧数据
    all_items = new_items + existing_data.get("items", [])
    
    # 按日期排序
    all_items.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # 限制总量（保留最近200条 + 所有重点新闻）
    recent = all_items[:200]
    key_items = [i for i in all_items if i.get("isKey") and i not in recent]
    final_items = recent + key_items
    
    # 清理qualityScore（不需要在前端展示）
    for item in final_items:
        item.pop("qualityScore", None)
    
    # 更新数据
    output = {
        "lastUpdated": datetime.now().strftime("%Y-%m-%d"),
        "lastScraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "description": "量子行业资讯 — 每3天自动更新（量子计算/通信/精密测量）",
        "items": final_items
    }
    
    # 写入文件
    with open(news_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"抓取完成！")
    print(f"  新增新闻: {len(new_items)} 条")
    print(f"  总新闻数: {len(final_items)} 条")
    print(f"  重点新闻: {sum(1 for i in final_items if i.get('isKey'))} 条")
    print(f"  输出文件: {news_path}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
