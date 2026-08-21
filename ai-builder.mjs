export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed",{status:405});
  try {
    const input=await req.json();
    const key=String(input.apiKey||"").trim();
    if(!key) return Response.json({error:"Gemini API key is missing."},{status:400});

    const model="gemini-2.5-flash";
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    if(input.keyTest){
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
        body:JSON.stringify({contents:[{role:"user",parts:[{text:"Reply with OK"}]}],generationConfig:{maxOutputTokens:5}})});
      const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){d={}};
      if(!r.ok)return Response.json({error:d?.error?.message||"Gemini connection failed."},{status:502});
      return Response.json({ok:true});
    }

    const prompt=String(input.prompt||"").trim();
    const current=input.current||{};
    const system=`You are a website builder. Return ONLY valid JSON, no markdown.
Schema:
{"brand":"string","headline":"string","subheadline":"string","cta":"string","nav":["string"],"sectionTitle":"string","cards":[{"title":"string","text":"string"}]}
Create or update the website according to the user's prompt. Keep existing fields unless the user asks to change them.`;
    const user=JSON.stringify({instruction:prompt,current});
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],
      generationConfig:{responseMimeType:"application/json",temperature:0.7,maxOutputTokens:2000}})});
    const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){return Response.json({error:"Gemini returned an invalid response."},{status:502})}
    if(!r.ok)return Response.json({error:d?.error?.message||"Gemini request failed."},{status:502});
    const text=d?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    let site; try{site=JSON.parse(text)}catch{site=current}
    return Response.json({site});
  } catch(e){return Response.json({error:e.message||"Server error"},{status:500})}
};