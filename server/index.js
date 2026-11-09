import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit: '24mb'}));
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
app.post('/api/generate', async (req,res)=>{
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here') return res.status(503).json({error:'Add OPENAI_API_KEY to the server environment before generating.'});
  const {imageData,mimeType,prompt,aspectRatio} = req.body || {};
  if (!imageData || typeof imageData !== 'string' || !['image/jpeg','image/png','image/webp'].includes(mimeType)) return res.status(400).json({error:'Upload a JPG, PNG, WebP or converted HEIC image.'});
  if (imageData.length > 20_000_000) return res.status(413).json({error:'Image is too large. Please use an image under 10MB.'});
  if (typeof prompt !== 'string' || prompt.length > 7000) return res.status(400).json({error:'Invalid prompt.'});
  try {
    const bytes = Buffer.from(imageData,'base64');
    const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mimeType];
    const form = new FormData();
    form.append('model',model);
    form.append('prompt',prompt);
    form.append('size',({'1:1':'1024x1024','3:4':'1024x1536','4:3':'1536x1024'})[aspectRatio]||'1024x1024');
    form.append('image',new Blob([bytes],{type:mimeType}),`garment.${ext}`);
    const r = await fetch('https://api.openai.com/v1/images/edits',{
      method:'POST',headers:{'Authorization':`Bearer ${key}`},body:form,signal:AbortSignal.timeout(180000)
    });
    const json = await r.json().catch(()=>({}));
    if (!r.ok) return res.status(r.status===429?429:502).json({error:json.error?.message || `OpenAI image API failed (${r.status})`});
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({error:'No sketch was returned by OpenAI. Please try again.'});
    res.json({dataUrl:`data:image/png;base64,${b64}`});
  } catch(err) {res.status(502).json({error:err.name==='TimeoutError'?'Generation timed out. Please retry.':'Cannot reach OpenAI. Check your connection and server logs.'});}
});
const dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(dirname,'../dist')));
app.get('*',(req,res)=>res.sendFile(path.resolve(dirname,'../dist/index.html')));
app.listen(Number(process.env.PORT)||3001,()=>console.log(`Flat Sketch Generator running on port ${process.env.PORT||3001}`));
