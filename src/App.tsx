import React, { useState, useRef } from 'react';
import heic2any from 'heic2any';
import { Upload, Image as ImageIcon, Download, Loader2, FileDown, Settings, AlertCircle, Trash2 } from 'lucide-react';

export default function App() {
  const [sourceImage, setSourceImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [garmentType, setGarmentType] = useState("Both");
  const [view, setView] = useState("Front");
  const [aspectRatio, setAspectRatio] = useState("Square");
  
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("PNG");
  
  const fileInputRef = useRef(null);

  const views = ["Front", "Back", "Front & Back"];
  const garmentTypes = ["Top", "Bottom", "Dress", "Both"];
  const aspectRatios = ["Square", "Portrait", "Landscape"];

  const handleImageUpload = async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Please select an image smaller than 10MB.");
      const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)/i.test(file.type);
      if (isHeic) {
        const converted = await heic2any({blob:file, toType:'image/jpeg',quality:0.92});
        file = new File([Array.isArray(converted)?converted[0]:converted], 'iphone-photo.jpg', {type:'image/jpeg'});
      }
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error("Supported formats: JPG, PNG, WebP, HEIC and HEIF.");
      const dataUrl = await new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error('Could not read your photo.'));
        reader.readAsDataURL(file);
      });
      setSourceImage({dataUrl,base64:dataUrl.split(',')[1],mimeType:file.type});
      setResults([]);
    } catch(err) {setError(err.message || 'Image upload failed.');}
    finally {setUploading(false);}
  };

  const removeImage = () => {
    setSourceImage(null);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateSingleSketch = async (systemPrompt) => {
    const aspectMap = { Square: '1:1', Portrait: '3:4', Landscape: '4:3' };
    const response = await fetch('/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({imageData:sourceImage.base64,mimeType:sourceImage.mimeType,prompt:systemPrompt,aspectRatio:aspectMap[aspectRatio]||'1:1'})
    });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(result.error || `Generation failed (HTTP ${response.status})`);
    return result.dataUrl;
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      setError("Please upload a source image first.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setResults([]);

    let systemPrompt = `You are an expert fashion technical designer. Convert the provided garment image into a precise, professional fashion flat sketch (technical drawing). 
    CRITICAL REQUIREMENTS:
    1. Background MUST be completely solid white (#FFFFFF).
    2. The sketch MUST be drawn using only clean, precise, solid black strokes (black and white line art). No shading, no 3D rendering, no photorealism.
    3. Maintain the EXACT design, proportions, and details of the original garment without any errors or alterations.
    4. Target Garment Type: ${garmentType}. Ensure the sketch accurately depicts this specific category.
    5. Required View: ${view} view. If requesting both views, show clear front and back side-by-side.
    6. Output MUST be a 2D technical flat sketch, NOT a realistic photo.
    `;

    if (prompt.trim()) {
      systemPrompt += `\nAdditional user instructions for refinement: ${prompt.trim()}`;
    }

    try {
      // Generate sequentially to prevent rate limits and allow for progressive UI updates
      for (let i = 0; i < count; i++) {
        const img = await generateSingleSketch(systemPrompt);
        setResults(prev => [...prev, img]);
      }
    } catch (err) {
      setError(err.message || "An error occurred while generating the sketches.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (dataUrl, index) => {
    const ext = downloadFormat.toLowerCase() === 'jpeg' ? 'jpg' : downloadFormat.toLowerCase();
    const mime = downloadFormat === 'JPEG' ? 'image/jpeg' : downloadFormat === 'WEBP' ? 'image/webp' : 'image/png';
    const picture = new Image();
    picture.src = dataUrl;
    await picture.decode();
    const canvas = document.createElement('canvas');
    canvas.width = picture.naturalWidth;
    canvas.height = picture.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (mime === 'image/jpeg') {ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height);}
    ctx.drawImage(picture,0,0);
    const converted = canvas.toDataURL(mime,0.95);
    const link = document.createElement('a');
    link.href = converted;
    link.download = `flat-sketch-${view.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}-${index + 1}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    for (let i = 0; i < results.length; i++) {
      await downloadImage(results[i], i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      
      <header className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
              <ImageIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Flat Sketch Generator</h1>
              <p className="text-xs text-red-600 font-medium">Standard MH Group | Design & Product Development</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end text-left sm:text-right hidden sm:flex">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">
              System exclusively designed by Fimoon Sunbi Ridoy
            </span>
            <div className="text-sm font-medium text-neutral-500">
              The Civil Engineers Woven Limited
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Upload size={16} /> Source Garment Image
            </h2>
            
            {!sourceImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-black transition-colors hover:bg-neutral-50 min-h-[256px]"
              >
                <div className="bg-white p-3 rounded-full shadow-sm border border-neutral-100 mb-3">
                  <ImageIcon className="text-neutral-400" size={24} />
                </div>
                <p className="text-sm font-medium">Click to upload an image</p>
                <p className="text-xs text-neutral-400 mt-1">JPG, PNG, WebP, iPhone HEIC/HEIF up to 10MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden group border border-neutral-200">
                <img 
                  src={sourceImage.dataUrl} 
                  alt="Source" 
                  className="w-full h-64 object-contain bg-neutral-100"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <button 
                    onClick={removeImage}
                    className="bg-white text-red-600 p-2 rounded-lg shadow-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 size={16} /> Remove Image
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*,.heic,.heif" 
              className="hidden" 
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-5 hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Settings size={16} /> Output Settings
            </h2>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Garment Type</label>
              <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg">
                {garmentTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setGarmentType(type)}
                    className={`flex-1 min-w-[70px] text-sm py-1.5 px-2 rounded-md font-medium transition-all ${
                      garmentType === type
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Garment View</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {views.map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`text-sm py-2 px-2 rounded-lg border transition-all truncate ${
                      view === v 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
              <div className="flex bg-neutral-100 p-1 rounded-lg">
                {aspectRatios.map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${
                      aspectRatio === ratio
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Download Format</label>
              <div className="flex gap-2">{['PNG','JPEG','WEBP'].map(fmt=><button key={fmt} onClick={()=>setDownloadFormat(fmt)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${downloadFormat===fmt?'bg-black text-white':'bg-white text-neutral-700'}`}>{fmt}</button>)}</div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Number of Images ({count})</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="4" 
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="flex-1 accent-black h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Refining Instructions (Optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Add a flap pocket on the left chest, highlight the topstitching..."
                className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none h-24 bg-neutral-50 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || uploading || !sourceImage}
            className="w-full bg-black text-white py-3.5 rounded-xl font-medium shadow-md hover:shadow-lg hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {uploading ? "Converting image..." : isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating Sketches...
              </>
            ) : (
              <>
                <ImageIcon size={18} />
                Generate {count > 1 ? `${count} Sketches` : 'Sketch'}
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 sm:p-6 min-h-[600px] h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Generated Sketches
              </h2>
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setResults([])}
                    disabled={isGenerating}
                    className="text-sm font-medium flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
                  </button>
                  <button 
                    onClick={downloadAll}
                    disabled={isGenerating}
                    className="text-sm font-medium flex items-center gap-2 text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown size={16} /> <span className="hidden sm:inline">Download All</span>
                  </button>
                </div>
              )}
            </div>

            {results.length === 0 && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
                <div className="w-20 h-20 mb-4 bg-white shadow-sm border border-neutral-100 rounded-2xl flex items-center justify-center">
                  <ImageIcon size={32} className="opacity-40" />
                </div>
                <h3 className="text-neutral-800 font-medium mb-1">No Sketches Yet</h3>
                <p className="text-sm max-w-xs">Upload a garment image, configure your settings, and hit generate to create technical flat sketches.</p>
              </div>
            ) : (
              <div className={`grid gap-4 flex-1 content-start ${count === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {/* Render already generated images */}
                {results.map((res, idx) => (
                  <div key={idx} className="group relative rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center p-4">
                    <img 
                      src={res} 
                      alt={`Generated sketch ${idx + 1}`} 
                      className={`w-full max-h-full object-contain bg-white shadow-sm rounded-lg ${
                        aspectRatio === 'Square' ? 'aspect-square' : 
                        aspectRatio === 'Portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                      }`}
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex gap-2">
                      <button 
                        onClick={() => downloadImage(res, idx)}
                        className="bg-black text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95 pointer-events-auto"
                        title="Download Sketch"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Render loading placeholders for the remaining requested images */}
                {isGenerating && Array.from({ length: Math.max(0, count - results.length) }).map((_, idx) => (
                  <div key={`loading-${idx}`} className={`rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 flex flex-col items-center justify-center p-8 min-h-[200px] space-y-4 ${
                        aspectRatio === 'Square' ? 'aspect-square' : 
                        aspectRatio === 'Portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                      }`}>
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-xs font-medium text-neutral-500 animate-pulse text-center">
                      Drafting sketch {results.length + idx + 1} of {count}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}