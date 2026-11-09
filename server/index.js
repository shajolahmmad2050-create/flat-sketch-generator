import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit: '24mb'}));
const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
app.post('/api/generate', async (req,res)=>{
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_google_ai_studio_api_key_here') return res.status(503).json({error:'Add GEMINI_API_KEY to your server environment before generating.'});
  const {imageData,mimeType,prompt,aspectRatio} = req.body || {};
  if (!imageData || typeof imageData !== 'string' || !['image/jpeg','image/png','image/webp'].includes(mimeType)) return res.status(400).json({error:'Upload a JPG, PNG, WebP or converted HEIC image.'});
  if (imageData.length > 20_000_000) return res.status(413).json({error:'Image is too large. Please use an image under 10MB.'});
  if (typeof prompt !== 'string' || prompt.length > 7000) return res.status(400).json({error:'Invalid prompt.'});
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:imageData}}]}],generationConfig:{responseModalities:['IMAGE'],imageConfig:{aspectRatio: ['1:1','3:4','4:3'].includes(aspectRatio)?aspectRatio:'1:1'}}}),
      signal:AbortSignal.timeout(120000)
    });
    const json = await r.json().catch(()=>({}));
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({error:json.error?.message || `Image API failed (${r.status})`});
    const inline = json.candidates?.[0]?.content?.parts?.find(p=>p.inlineData)?.inlineData;
    if (!inline?.data) return res.status(502).json({error:'No sketch was returned. Please try again.'});
    res.json({dataUrl:`data:${inline.mimeType||'image/png'};base64,${inline.data}`});
  } catch(err) {res.status(502).json({error:err.name==='TimeoutError'?'Generation timed out. Please retry.':'Cannot reach the image API. Check your connection and server logs.'});}
});
const dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(dirname,'../dist')));
app.get('*',(req,res)=>res.sendFile(path.resolve(dirname,'../dist/index.html')));
app.listen(Number(process.env.PORT)||3001,()=>console.log(`Flat Sketch Generator running on port ${process.env.PORT||3001}`));
