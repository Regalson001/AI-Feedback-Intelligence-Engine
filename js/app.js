const SAMPLE_REVIEWS = [
  "The automated document extraction saved our compliance team 12 hours this week! Super fast UI, though exporting to PDF takes a few seconds longer than expected.",
  "System crashed twice while uploading a 50MB audit report. Support hasn't replied in 24 hours and we have a regulatory deadline tomorrow!",
  "Onboarding was straightforward and the dashboard layout is clean. Looking forward to seeing dark mode and role-based access controls.",
  "Pricing is fair for mid-sized teams, and the risk detection accuracy is impressive compared to our legacy tool."
];

let sampleIndex = 0;
let feedbackRecords = [];

const POSITIVE_WORDS = [
  "fast", "saved", "great", "impressive", "clean", "love", "awesome",
  "excellent", "easy", "helpful", "accurate", "smooth", "best", "fair"
];

const NEGATIVE_WORDS = [
  "crash", "crashed", "slow", "bug", "error", "broken", "failed", "delay",
  "expensive", "frustrating", "bad", "issue", "problem", "hasn't replied", "terrible"
];

const URGENT_KEYWORDS = [
  "crash", "crashed", "deadline", "urgent", "security", "breach", "down", "broken", "refund"
];

const TOPIC_DICTIONARY = {
  "Performance & Speed": ["fast", "slow", "seconds", "performance", "lag", "crash", "crashed"],
  "UI / UX": ["ui", "dashboard", "layout", "dark mode", "onboarding", "clean", "design"],
  "Customer Support": ["support", "replied", "ticket", "help", "response", "service"],
  "Pricing & Billing": ["pricing", "cost", "expensive", "fair", "plan", "billing", "refund"],
  "AI Accuracy & Features": ["extraction", "accuracy", "risk", "detection", "pdf", "export", "access"]
};

function runIntelligenceEngine(text) {
  const lower = text.toLowerCase();
  let score = 0;

  POSITIVE_WORDS.forEach(w => { if (lower.includes(w)) score += 1; });
  NEGATIVE_WORDS.forEach(w => { if (lower.includes(w)) score -= 1.2; });

  let sentiment = "Neutral";
  if (score > 0.4) sentiment = "Positive";
  else if (score < -0.4) sentiment = "Negative";

  const confidence = Math.min(98, Math.max(68, Math.round(72 + Math.abs(score) * 8)));

  const detectedTopics = [];
  for (const [topic, keywords] of Object.entries(TOPIC_DICTIONARY)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detectedTopics.push(topic);
    }
  }
  if (detectedTopics.length === 0) detectedTopics.push("General Feedback");

  const isUrgent = URGENT_KEYWORDS.some(kw => lower.includes(kw)) || sentiment === "Negative";
  const urgency = isUrgent ? "High Priority" : "Normal";

  let recommendation = "Log insight into product roadmap and acknowledge customer.";
  if (sentiment === "Negative" && detectedTopics.includes("Performance & Speed")) {
    recommendation = "Escalate to Engineering: Inspect server logs for upload/latency bottlenecks.";
  } else if (sentiment === "Negative" && detectedTopics.includes("Customer Support")) {
    recommendation = "Trigger SLA Alert: Assign senior support specialist within 1 hour.";
  } else if (sentiment === "Negative") {
    recommendation = "Immediate outreach recommended to prevent churn and resolve blocker.";
  } else if (sentiment === "Positive") {
    recommendation = "Flag user as potential case-study advocate; share praise with product team.";
  }

  return {
    id: Date.now(),
    text,
    sentiment,
    confidence,
    urgency,
    topics: detectedTopics,
    recommendation,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function updateDashboard() {
  const total = feedbackRecords.length;
  const pos = feedbackRecords.filter(r => r.sentiment === "Positive").length;
  const neu = feedbackRecords.filter(r => r.sentiment === "Neutral").length;
  const neg = feedbackRecords.filter(r => r.sentiment === "Negative").length;
  const urgent = feedbackRecords.filter(r => r.urgency === "High Priority").length;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiUrgent").textContent = urgent;

  const netScore = total === 0 ? 0 : Math.round(((pos - neg) / total) * 100);
  const scoreEl = document.getElementById("kpiScore");
  scoreEl.textContent = `${netScore > 0 ? "+" : ""}${netScore}%`;
  scoreEl.style.color = netScore > 0 ? "var(--positive)" : netScore < 0 ? "var(--negative)" : "var(--text-primary)";

  document.getElementById("countPos").textContent = pos;
  document.getElementById("countNeu").textContent = neu;
  document.getElementById("countNeg").textContent = neg;

  document.getElementById("barPos").style.width = total ? `${(pos / total) * 100}%` : "0%";
  document.getElementById("barNeu").style.width = total ? `${(neu / total) * 100}%` : "0%";
  document.getElementById("barNeg").style.width = total ? `${(neg / total) * 100}%` : "0%";

  const themeCounts = {};
  feedbackRecords.forEach(r => {
    r.topics.forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1; });
  });
  const topTheme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("kpiTheme").textContent = topTheme ? topTheme[0] : "—";

  const feedList = document.getElementById("feedList");
  feedList.innerHTML = "";

  feedbackRecords.forEach(item => {
    const card = document.createElement("div");
    card.className = "feed-item";
    card.innerHTML = `
      <div class="feed-header">
        <div>
          <span class="tag tag-${item.sentiment}">${item.sentiment} (${item.confidence}%)</span>
          <span class="urgency-badge">${item.urgency}</span>
        </div>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${item.timestamp}</span>
      </div>
      <p class="feed-text">"${escapeHTML(item.text)}"</p>
      <div class="ai-insight-box">
        <strong>Next Best Action:</strong> ${item.recommendation}
      </div>
      <div class="topics">
        ${item.topics.map(t => `<span class="topic-pill"># ${t}</span>`).join("")}
      </div>
    `;
    feedList.appendChild(card);
  });
}

function processSubmission(text) {
  if (!text.trim()) return;
  const loader = document.getElementById("loader");
  loader.style.display = "flex";

  setTimeout(() => {
    const result = runIntelligenceEngine(text.trim());
    feedbackRecords.unshift(result);
    updateDashboard();
    loader.style.display = "none";
  }, 350);
}

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const input = document.getElementById("feedbackInput");
  processSubmission(input.value);
  input.value = "";
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  const sample = SAMPLE_REVIEWS[sampleIndex % SAMPLE_REVIEWS.length];
  sampleIndex++;
  document.getElementById("feedbackInput").value = sample;
});

document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("feedbackInput").value = "";
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbackRecords, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "ai-feedback-intelligence.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// Seed initial sample entries
SAMPLE_REVIEWS.slice(0, 2).forEach(text => {
  feedbackRecords.push(runIntelligenceEngine(text));
});
updateDashboard();
