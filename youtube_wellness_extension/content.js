const DEFAULT_CONFIG = {
  backendUrl: "http://localhost:5001/api/youtube/analyze-content",
  checkIntervalMs: 7000,
  reanalyzeIntervalMs: 7000,
  minTitleLength: 5,
  strict_mode: false,
  warning_limit: 4,
  allow_list_channels: [],
  blocked_topics: [],
  custom_block_keywords: [],
  emergency_alert_to: "",
  user_id: "",
};

const WARNING_STORE_KEY = "mindhealixRiskWarnings";

const STATE = {
  lastVideoId: null,
  lastSentSignature: null,
  lastAnalyzedAt: 0,
  lastResponse: null,
  warningDismissedForVideo: false,
  blockerIntervalId: null,
  mainIntervalId: null,
  warningLimit: 4,
};

function isExtensionContextValid() {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
  } catch (_e) {
    return false;
  }
}

function isRiskyLevel(level) {
  return level === "medium" || level === "high";
}

function shouldEscalateEmergency(result) {
  const level = String(result?.risk_level || "").toLowerCase();
  if (level === "high") return true;

  const signals = Array.isArray(result?.detected_signals) ? result.detected_signals : [];
  return signals.some((item) => {
    const label = String(item?.label || "").toLowerCase();
    return label === "self_harm" || label === "severe_depression" || label.includes("user_topic:self harm");
  });
}

function getWarningStore() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([WARNING_STORE_KEY], (result) => {
        if (chrome.runtime.lastError) { resolve({}); return; }
        const store = result[WARNING_STORE_KEY];
        resolve(store && typeof store === "object" ? store : {});
      });
    } catch (_e) {
      resolve({});
    }
  });
}

function saveWarningStore(store) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [WARNING_STORE_KEY]: store }, () => resolve());
    } catch (_e) {
      resolve();
    }
  });
}

async function applyRiskPolicy(videoId, level, warningLimit) {
  if (!videoId) {
    return { count: 0, blocked: false };
  }

  const store = await getWarningStore();
  const current = Number(store[videoId] || 0);

  if (!isRiskyLevel(level)) {
    return { count: current, blocked: current >= warningLimit };
  }

  const next = current + 1;
  store[videoId] = next;
  await saveWarningStore(store);

  return {
    count: next,
    blocked: next >= warningLimit,
  };
}

function stopBlockerEnforcementLoop() {
  if (STATE.blockerIntervalId) {
    clearInterval(STATE.blockerIntervalId);
    STATE.blockerIntervalId = null;
  }
}

function clearBlockerOverlay() {
  const blocker = document.getElementById("mindhealix-youtube-blocker");
  if (blocker) {
    blocker.remove();
  }
  stopBlockerEnforcementLoop();
}

function pauseActiveVideo() {
  const video = document.querySelector("video");
  if (video && !video.paused) {
    video.pause();
  }
}

function toReadableSignalLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return "Unknown signal";

  if (raw.startsWith("user_topic:")) {
    return `Matched topic: ${raw.replace("user_topic:", "").trim()}`;
  }

  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function summarizeBlockingReasons(result) {
  const signals = Array.isArray(result?.detected_signals) ? result.detected_signals : [];
  if (!signals.length) {
    return ["Risk score exceeded your safety rules."];
  }

  const reasons = signals
    .slice(0, 4)
    .map((item) => {
      const label = toReadableSignalLabel(item?.label);
      const matches = Number(item?.matches || 0);
      const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean).slice(0, 2) : [];
      const tagsText = tags.length ? ` (${tags.join(", ")})` : "";
      return matches > 0 ? `${label} x${matches}${tagsText}` : `${label}${tagsText}`;
    })
    .filter(Boolean);

  return reasons.length ? reasons : ["Risk score exceeded your safety rules."];
}

function enforceBlockedVideo(videoId, riskLevel, warningCount, result) {
  const panel = document.getElementById("mindhealix-youtube-guard");
  if (panel) {
    panel.classList.add("mhx-hidden");
  }

  const activeVideoId = extractVideoId();
  if (videoId && activeVideoId === videoId) {
    pauseActiveVideo();
  }

  const reasonsHtml = summarizeBlockingReasons(result)
    .map((line) => `<li>${line}</li>`)
    .join("");

  let blocker = document.getElementById("mindhealix-youtube-blocker");
  if (!blocker) {
    blocker = document.createElement("div");
    blocker.id = "mindhealix-youtube-blocker";
    document.body.appendChild(blocker);
  }

  blocker.innerHTML = `
    <div class="mhx-blocker-card">
      <h2>Video Blocked By MindHealix Guard</h2>
      <p class="mhx-blocker-line">This video crossed your safety threshold after ${STATE.warningLimit} warnings.</p>
      <p class="mhx-blocker-line">Risk level: <strong>${String(riskLevel || "high").toUpperCase()}</strong></p>
      <p class="mhx-blocker-line">Warnings for this video: <strong>${warningCount}</strong></p>
      <p class="mhx-blocker-line"><strong>Why it was blocked:</strong></p>
      <ul class="mhx-blocker-reasons">${reasonsHtml}</ul>
      <div class="mhx-blocker-actions">
        <button id="mhx-go-home">Go To YouTube Home</button>
        <button id="mhx-go-back" class="mhx-secondary">Go Back</button>
      </div>
    </div>
  `;

  blocker.querySelector("#mhx-go-home").addEventListener("click", () => {
    window.location.href = "https://www.youtube.com/";
  });

  blocker.querySelector("#mhx-go-back").addEventListener("click", () => {
    window.history.back();
  });

  pauseActiveVideo();
  stopBlockerEnforcementLoop();
  STATE.blockerIntervalId = setInterval(() => {
    if (extractVideoId() !== videoId) {
      clearBlockerOverlay();
      return;
    }
    pauseActiveVideo();
  }, 800);
}

function extractVideoId() {
  const url = new URL(window.location.href);
  const watchId = url.searchParams.get("v");
  if (watchId) return watchId;

  // Support YouTube Shorts URLs like /shorts/<id>
  const match = url.pathname.match(/^\/shorts\/([^/?#]+)/);
  return match ? String(match[1]) : "";
}

function readText(selector) {
  const el = document.querySelector(selector);
  return (el && el.textContent ? el.textContent : "").trim();
}

function readMetaContent(selector) {
  const el = document.querySelector(selector);
  const content = el ? el.getAttribute("content") : "";
  return String(content || "").trim();
}

function normalizeYoutubeTitle(rawTitle) {
  const title = String(rawTitle || "").trim();
  if (!title) return "";
  return title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
}

function collectVideoData() {
  const title =
    readText("h1.ytd-watch-metadata yt-formatted-string") ||
    readText("h1.title") ||
    readMetaContent('meta[property="og:title"]') ||
    readMetaContent('meta[name="title"]') ||
    normalizeYoutubeTitle(document.title);

  const channel =
    readText("ytd-channel-name a") ||
    readText("#channel-name a") ||
    readMetaContent('meta[itemprop="author"]') ||
    readMetaContent('meta[name="author"]');

  const description =
    readText("#description-inline-expander") ||
    readText("#description") ||
    readMetaContent('meta[property="og:description"]') ||
    readMetaContent('meta[name="description"]');

  const pageUrl = window.location.href;

  return {
    title,
    channel,
    description,
    page_url: pageUrl,
    video_id: extractVideoId(),
  };
}

function signatureForPayload(payload) {
  return [payload.video_id, payload.title, payload.channel].join("::");
}

function ensurePanel() {
  let panel = document.getElementById("mindhealix-youtube-guard");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "mindhealix-youtube-guard";
  panel.innerHTML = `
    <div class="mhx-header">MindHealix Wellness Guard</div>
    <div class="mhx-status">Analyzing video wellness signals...</div>
    <div class="mhx-message"></div>
    <ul class="mhx-list"></ul>
    <div class="mhx-actions">
      <button class="mhx-btn mhx-btn-muted" id="mhx-dismiss">Continue Anyway</button>
      <button class="mhx-btn" id="mhx-refresh">Recheck</button>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector("#mhx-dismiss").addEventListener("click", () => {
    STATE.warningDismissedForVideo = true;
    panel.classList.add("mhx-hidden");
  });

  panel.querySelector("#mhx-refresh").addEventListener("click", () => {
    STATE.warningDismissedForVideo = false;
    runAnalysis(true);
  });

  return panel;
}

function renderResult(result) {
  const panel = ensurePanel();
  const status = panel.querySelector(".mhx-status");
  const message = panel.querySelector(".mhx-message");
  const list = panel.querySelector(".mhx-list");

  panel.classList.remove("mhx-low", "mhx-medium", "mhx-high", "mhx-hidden");

  const level = result.risk_level || "low";
  panel.classList.add(`mhx-${level}`);

  const warningInfo = result.warning_count
    ? ` | warning ${Math.min(result.warning_count, STATE.warningLimit)}/${STATE.warningLimit}`
    : "";
  status.textContent = `Risk level: ${String(level).toUpperCase()} (${result.risk_score || 0}/100)${warningInfo}`;
  message.textContent = result.message || "No suggestion available.";

  list.innerHTML = "";
  const alternatives = Array.isArray(result.alternatives) ? result.alternatives : [];
  alternatives.slice(0, 4).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });

  if (level === "low") {
    setTimeout(() => panel.classList.add("mhx-hidden"), 1500);
  }

  if (STATE.warningDismissedForVideo && level !== "high") {
    panel.classList.add("mhx-hidden");
  }
}

function renderError(errorText) {
  const panel = ensurePanel();
  panel.classList.remove("mhx-hidden");
  panel.classList.add("mhx-medium");
  panel.querySelector(".mhx-status").textContent = "Wellness guard status";
  panel.querySelector(".mhx-message").textContent = errorText;
}

function renderContextInvalidated() {
  const panel = document.getElementById("mindhealix-youtube-guard") || ensurePanel();
  panel.classList.remove("mhx-hidden", "mhx-low", "mhx-medium", "mhx-high");
  panel.classList.add("mhx-medium");
  panel.querySelector(".mhx-status").textContent = "Extension Reloaded";
  panel.querySelector(".mhx-message").textContent =
    "MindHealix was updated or reloaded. Refresh this tab to restore wellness protection.";
  panel.querySelector(".mhx-list").innerHTML = "";
  const actions = panel.querySelector(".mhx-actions");
  if (actions && !actions.querySelector("#mhx-ctx-refresh")) {
    actions.innerHTML = "";
    const btn = document.createElement("button");
    btn.id = "mhx-ctx-refresh";
    btn.className = "mhx-btn";
    btn.textContent = "Refresh Tab";
    btn.addEventListener("click", () => window.location.reload());
    actions.appendChild(btn);
  }
}

async function loadConfig() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(["mindhealixConfig"], (result) => {
        if (chrome.runtime.lastError) { resolve({ ...DEFAULT_CONFIG }); return; }
        const saved = result.mindhealixConfig || {};
        resolve({ ...DEFAULT_CONFIG, ...saved });
      });
    } catch (_e) {
      resolve({ ...DEFAULT_CONFIG });
    }
  });
}

async function analyzeWithBackend(payload, config) {
  const targets = [config.backendUrl];
  if (String(config.backendUrl).includes(":5001/")) {
    targets.push(String(config.backendUrl).replace(":5001/", ":5000/"));
  }

  let lastError = null;

  for (const url of targets) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Backend unavailable");
}

function buildNotifyEndpoint(backendUrl) {
  try {
    const parsed = new URL(String(backendUrl || ""));
    parsed.pathname = "/api/youtube/notify-threshold";
    return parsed.toString();
  } catch (_error) {
    return "http://localhost:5001/api/youtube/notify-threshold";
  }
}

async function notifyThresholdExceeded(payload, result, warningCount, config, eventType) {
  const endpoint = buildNotifyEndpoint(config.backendUrl);
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        channel: payload.channel,
        page_url: payload.page_url,
        video_id: payload.video_id,
        user_id: String(config?.user_id || "").trim(),
        risk_level: result.risk_level,
        warning_count: warningCount,
        warning_limit: STATE.warningLimit,
        alert_to: String(config?.emergency_alert_to || "").trim(),
        event_type: eventType || "blocked",
      }),
    });
  } catch (_error) {
    // Notification failures should not break blocking flow.
  }
}

async function runAnalysis(force = false) {
  if (!isExtensionContextValid()) {
    renderContextInvalidated();
    if (STATE.mainIntervalId) {
      clearInterval(STATE.mainIntervalId);
      STATE.mainIntervalId = null;
    }
    return;
  }

  const isWatchPage = location.pathname.startsWith("/watch") || location.pathname.startsWith("/shorts/");
  if (!isWatchPage) {
    const panel = document.getElementById("mindhealix-youtube-guard");
    if (panel) panel.classList.add("mhx-hidden");
    clearBlockerOverlay();
    return;
  }

  const payload = collectVideoData();
  if (!payload.title || payload.title.length < DEFAULT_CONFIG.minTitleLength) {
    return;
  }

  const currentVideoId = payload.video_id;
  if (STATE.lastVideoId !== currentVideoId) {
    const isFreshPageLoad = STATE.lastVideoId === null;
    STATE.warningDismissedForVideo = false;
    STATE.lastVideoId = currentVideoId;
    clearBlockerOverlay();
    // On a page refresh (fresh content script load), reset the warning counter for this video
    if (isFreshPageLoad && currentVideoId) {
      getWarningStore().then((store) => {
        if (store[currentVideoId] !== undefined) {
          delete store[currentVideoId];
          saveWarningStore(store);
        }
      });
    }
  }

  const signature = signatureForPayload(payload);
  try {
    const config = await loadConfig();
    const reanalyzeIntervalMs = Math.max(
      Number(config.reanalyzeIntervalMs || DEFAULT_CONFIG.reanalyzeIntervalMs),
      3000
    );
    const sameSignature = STATE.lastSentSignature === signature;
    const now = Date.now();
    const elapsed = now - Number(STATE.lastAnalyzedAt || 0);

    if (!force && sameSignature && elapsed < reanalyzeIntervalMs) {
      return;
    }

    STATE.lastSentSignature = signature;
    STATE.lastAnalyzedAt = now;
    STATE.warningLimit = Math.max(4, Math.min(10, Number(config.warning_limit || DEFAULT_CONFIG.warning_limit)));
    const composedPayload = {
      ...payload,
      user_id: config.user_id || "",
      rule_profile: {
        strict_mode: Boolean(config.strict_mode),
        allow_list_channels: Array.isArray(config.allow_list_channels) ? config.allow_list_channels : [],
        blocked_topics: Array.isArray(config.blocked_topics) ? config.blocked_topics : [],
        custom_block_keywords: Array.isArray(config.custom_block_keywords) ? config.custom_block_keywords : [],
      },
    };
    const result = await analyzeWithBackend(composedPayload, config);
    STATE.lastResponse = result;
    const policy = await applyRiskPolicy(payload.video_id, result.risk_level || "low", STATE.warningLimit);

    if (isRiskyLevel(result.risk_level || "low") && policy.count > 0) {
      const reachedAlertThreshold = policy.count === STATE.warningLimit;
      if (reachedAlertThreshold && shouldEscalateEmergency(result)) {
        // Send emergency notification once, exactly on the 4th (or configured) risky hit.
        notifyThresholdExceeded(payload, result, policy.count, config, "blocked");
      }
    }

    if (policy.blocked) {
      enforceBlockedVideo(payload.video_id, result.risk_level, policy.count, result);
      return;
    }

    if (isRiskyLevel(result.risk_level || "low")) {
      result.warning_count = policy.count;
      result.message = `${result.message || "Potentially harmful content detected."} This is warning ${Math.min(policy.count, STATE.warningLimit)} of ${STATE.warningLimit}.`;
    }

    renderResult(result);
  } catch (error) {
    const msg = String(error.message || "");
    if (
      msg.includes("Extension context invalidated") ||
      msg.includes("Cannot read properties of undefined") ||
      !isExtensionContextValid()
    ) {
      renderContextInvalidated();
      if (STATE.mainIntervalId) {
        clearInterval(STATE.mainIntervalId);
        STATE.mainIntervalId = null;
      }
      return;
    }
    renderError(`Cannot reach backend: ${msg}. Start Flask server to enable analysis.`);
  }
}

function installNavigationHooks() {
  document.addEventListener("yt-navigate-finish", () => {
    STATE.lastSentSignature = null;
    runAnalysis(true);
  });

  const observer = new MutationObserver(() => {
    runAnalysis(false);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function init() {
  ensurePanel();
  runAnalysis(true);
  installNavigationHooks();
  STATE.mainIntervalId = setInterval(() => {
    if (!isExtensionContextValid()) {
      clearInterval(STATE.mainIntervalId);
      STATE.mainIntervalId = null;
      renderContextInvalidated();
      return;
    }
    runAnalysis(false);
  }, DEFAULT_CONFIG.checkIntervalMs);
}

init();
