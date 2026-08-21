const $=id=>document.getElementById(id);
let currentSite=null;

function addMsg(role,text){
  const box=$("messages");
  const welcome=box.querySelector(".welcome"); if(welcome) welcome.remove();
  const el=document.createElement("div"); el.className="msg "+role;
  el.innerHTML=`<div class="role">${role==="user"?"You":"AI"}</div><div class="bubble"></div>`;
  el.querySelector(".bubble").textContent=text; box.appendChild(el); box.scrollTop=box.scrollHeight;
}
function setPreview(site){
  currentSite=site;
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;color:#17181c}nav{height:64px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 7%;position:sticky;top:0;background:#ffffffed;backdrop-filter:blur(12px)}nav b{font-size:18px}nav a{margin-left:20px;color:#555;text-decoration:none;font-size:13px}main{min-height:calc(100vh - 64px)}.hero{padding:90px 8%;background:linear-gradient(135deg,#f7f3ff,#fff);text-align:center}.hero h1{font-size:clamp(38px,7vw,76px);line-height:.98;margin:0 auto 20px;max-width:900px}.hero p{max-width:650px;margin:auto;color:#69707c;line-height:1.7}.cta{display:inline-block;margin-top:25px;padding:13px 20px;border-radius:10px;background:#18191f;color:white;text-decoration:none;font-weight:700}.section{padding:70px 8%;max-width:1100px;margin:auto}.section h2{text-align:center;font-size:34px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:1px solid #e8e8ed;border-radius:18px;padding:25px;background:#fff;box-shadow:0 12px 30px #1111}.card h3{margin-top:0}.muted{color:#6e7581;line-height:1.6}@media(max-width:700px){.grid{grid-template-columns:1fr}nav a{margin-left:8px;font-size:11px}}</style></head><body>
  <nav><b>${esc(site.brand||"Your Brand")}</b><div>${(site.nav||["Home","Services","About","Contact"]).map(x=>`<a href="#">${esc(x)}</a>`).join("")}</div></nav>
  <main><section class="hero"><h1>${esc(site.headline||"Build something people love.")}</h1><p>${esc(site.subheadline||"A polished website generated with AI.")}</p><a class="cta" href="#">${esc(site.cta||"Get Started")}</a></section>
  <section class="section"><h2>${esc(site.sectionTitle||"What we offer")}</h2><div class="grid">${(site.cards||[{title:"Strategy",text:"Clear plans built around your goals."},{title:"Design",text:"Modern responsive experiences."},{title:"Growth",text:"Practical systems designed to improve results."}]).map(c=>`<div class="card"><h3>${esc(c.title)}</h3><p class="muted">${esc(c.text)}</p></div>`).join("")}</div></section></main></body></html>`;
  $("preview").srcdoc=html; $("previewState").textContent="Updated";
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

async function generate(){
 const prompt=$("prompt").value.trim(); if(!prompt)return;
 const key=localStorage.getItem("ai_builder_gemini_key"); if(!key)return;
 addMsg("user",prompt); $("prompt").value=""; $("send").disabled=true; $("statusDot").classList.add("busy"); $("previewState").textContent="Thinking…";
 addMsg("ai","Thinking…");
 try{
  const r=await fetch("/.netlify/functions/ai-builder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:key,prompt,current:currentSite})});
  const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){throw Error("Netlify function returned an invalid response. Redeploy the fixed ZIP.");} if(!r.ok)throw Error(d.error||("AI request failed (HTTP "+r.status+")"));
  const last=$("messages").lastElementChild?.querySelector(".bubble"); if(last)last.textContent="Website updated successfully.";
  setPreview(d.site||d); 
 }catch(e){addMsg("ai","Error: "+e.message)}
 finally{$("send").disabled=false;$("statusDot").classList.remove("busy");$("previewState").textContent="Ready"}
}
$("send").onclick=generate;
$("prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generate()}});

$("connect").onclick=async()=>{
 const key=$("apiKey").value.trim(), st=$("setupStatus");
 if(!key){st.textContent="Paste your Gemini API key first.";st.className="err";return}
 $("connect").disabled=true;st.textContent="Connecting to Gemini…";st.className="";
 try{
  const r=await fetch("/.netlify/functions/ai-builder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:key,keyTest:true})});
  const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){throw Error("Netlify function returned an invalid response. Redeploy the fixed ZIP.");} if(!r.ok)throw Error(d.error||("Connection failed (HTTP "+r.status+")"));
  localStorage.setItem("ai_builder_gemini_key",key);st.textContent="✓ API connected successfully";st.className="ok";
  setTimeout(()=>{$("setup").classList.add("hidden");$("builder").classList.remove("hidden")},500);
 }catch(e){st.textContent="Connection failed: "+e.message;st.className="err";$("connect").disabled=false}
};
$("clearKey").onclick=()=>{localStorage.removeItem("ai_builder_gemini_key");location.reload()};
$("openPreview").onclick=()=>{const w=window.open();w.document.write($("preview").srcdoc||"")};

if(localStorage.getItem("ai_builder_gemini_key")){$("setup").classList.add("hidden");$("builder").classList.remove("hidden")}
