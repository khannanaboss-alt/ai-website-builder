const $ = id => document.getElementById(id);
let currentSite = null;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function addMsg(role, text) {
  const box = $("messages");
  const welcome = box.querySelector(".welcome");
  if (welcome) welcome.remove();
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.innerHTML = `<div class="role">${role === "user" ? "You" : "AI"}</div><div class="bubble"></div>`;
  el.querySelector(".bubble").textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function setPreview(site) {
  currentSite = site;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;color:#17181c}nav{height:64px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 7%;position:sticky;top:0;background:#ffffffed;backdrop-filter:blur(12px)}nav b{font-size:18px}nav a{margin-left:20px;color:#555;text-decoration:none;font-size:13px}main{min-height:calc(100vh - 64px)}.hero{padding:90px 8%;background:linear-gradient(135deg,#f7f3ff,#fff);text-align:center}.hero h1{font-size:clamp(38px,7vw,76px);line-height:.98;margin:0 auto 20px;max-width:900px}.hero p{max-width:650px;margin:auto;color:#69707c;line-height:1.7}.cta{display:inline-block;margin-top:25px;padding:13px 20px;border-radius:10px;background:#18191f;color:white;text-decoration:none;font-weight:700}.section{padding:70px 8%;max-width:1100px;margin:auto}.section h2{text-align:center;font-size:34px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:1px solid #e8e8ed;border-radius:18px;padding:25px;background:#fff;box-shadow:0 12px 30px #1111}.card h3{margin-top:0}.muted{color:#6e7581;line-height:1.6}@media(max-width:700px){.grid{grid-template-columns:1fr}nav a{margin-left:8px;font-size:11px}}</style></head><body>
  <nav><b>${esc(site.brand || "Your Brand")}</b><div>${(site.nav || ["Home", "Services", "About", "Contact"]).map(x => `<a href="#">${esc(x)}</a>`).join("")}</div></nav>
  <main><section class="hero"><h1>${esc(site.headline || "Build something people love.")}</h1><p>${esc(site.subheadline || "A polished website generated with AI.")}</p><a class="cta" href="#">${esc(site.cta || "Get Started")}</a></section>
  <section class="section"><h2>${esc(site.sectionTitle || "What we offer")}</h2><div class="grid">${(site.cards || [{title:"Strategy",text:"Clear plans built around your goals."},{title:"Design",text:"Modern responsive experiences."},{title:"Growth",text:"Practical systems designed to improve results."}]).map(c => `<div class="card"><h3>${esc(c.title)}</h3><p class="muted">${esc(c.text)}</p></div>`).join("")}</div></section></main></body></html>`;
  $("preview").srcdoc = html;
  $("previewState").textContent = "Updated";
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

function parseSite(text) {
  let clean = String(text || "").trim();
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

async function callGemini(key, prompt, current) {
  const system = `You are the AI engine inside a website builder. Return ONLY valid JSON, no markdown and no explanation. The JSON must have exactly these useful fields when possible: brand (string), headline (string), subheadline (string), cta (string), nav (array of strings), sectionTitle (string), cards (array of objects with title and text strings). Create or update a professional website based on the user's request. If current website data is supplied, modify it according to the request instead of starting over. Keep all values concise and suitable for a real website.`;
  const user = `Request: ${prompt}\n\nCurrent website JSON: ${JSON.stringify(current || {})}`;
  const response = await fetch(GEMINI_URL + `?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
      generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
    })
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) { throw new Error("Gemini returned an invalid response."); }
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (HTTP ${response.status})`);
  const text = extractGeminiText(data);
  if (!text) throw new Error("Gemini returned no content.");
  return parseSite(text);
}

async function generate() {
  const prompt = $("prompt").value.trim();
  if (!prompt) return;
  const key = localStorage.getItem("ai_builder_gemini_key");
  if (!key) return;

  addMsg("user", prompt);
  $("prompt").value = "";
  $("send").disabled = true;
  $("statusDot").classList.add("busy");
  $("previewState").textContent = "Thinking…";
  addMsg("ai", "Thinking…");

  try {
    const site = await callGemini(key, prompt, currentSite);
    const last = $("messages").lastElementChild?.querySelector(".bubble");
    if (last) last.textContent = "Website updated successfully.";
    setPreview(site);
  } catch (e) {
    const last = $("messages").lastElementChild?.querySelector(".bubble");
    if (last) last.textContent = "Error: " + e.message;
  } finally {
    $("send").disabled = false;
    $("statusDot").classList.remove("busy");
    $("previewState").textContent = "Ready";
  }
}

$("send").onclick = generate;
$("prompt").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); }
});

$("connect").onclick = async () => {
  const key = $("apiKey").value.trim();
  const st = $("setupStatus");
  if (!key) { st.textContent = "Paste your Gemini API key first."; st.className = "err"; return; }
  $("connect").disabled = true;
  st.textContent = "Connecting to Gemini…";
  st.className = "";
  try {
    await callGemini(key, "Return a simple default website object for a digital agency.", null);
    localStorage.setItem("ai_builder_gemini_key", key);
    st.textContent = "✓ Gemini connected successfully";
    st.className = "ok";
    setTimeout(() => { $("setup").classList.add("hidden"); $("builder").classList.remove("hidden"); }, 500);
  } catch (e) {
    st.textContent = "Connection failed: " + e.message;
    st.className = "err";
    $("connect").disabled = false;
  }
};

$("clearKey").onclick = () => { localStorage.removeItem("ai_builder_gemini_key"); location.reload(); };
$("openPreview").onclick = () => { const w = window.open(); if (w) { w.document.write($("preview").srcdoc || ""); w.document.close(); } };

if (localStorage.getItem("ai_builder_gemini_key")) {
  $("setup").classList.add("hidden");
  $("builder").classList.remove("hidden");
}
