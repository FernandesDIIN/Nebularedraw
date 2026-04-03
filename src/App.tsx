/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  SquareDashed, 
  RefreshCw, 
  Download, 
  Sparkles, 
  Layers, 
  Settings, 
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Hand,
  Maximize,
  Minimize,
  Check,
  Info,
  Key,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImage } from './lib/gemini';

type StylePreset = "Mangá P&B" | "Webtoon Colorido" | "Cenário Detalhado";
type Tool = "marquee" | "hand";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>("Mangá P&B");
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("marquee");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Auth & Model State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nebula_api_key') || '');
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');
  const [showSettings, setShowSettings] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  // Save API Key to local storage
  useEffect(() => {
    localStorage.setItem('nebula_api_key', apiKey);
  }, [apiKey]);

  // Initialize canvases
  useEffect(() => {
    if (image && canvasRef.current && maskCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
        originalImgRef.current = img;
        const canvas = canvasRef.current!;
        const maskCanvas = maskCanvasRef.current!;
        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');

        if (ctx && maskCtx) {
          // In a real UXP plugin, we'd match the panel width
          const panelWidth = window.innerWidth - 32;
          const scale = panelWidth / img.width;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          maskCanvas.width = canvas.width;
          maskCanvas.height = canvas.height;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setSelection(null);
          setResult(null);
        }
      };
      img.src = image;
    }
  }, [image]);

  // Simulated Photoshop Sync
  const syncFromPhotoshop = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImage(event.target?.result as string);
          setResult(null);
          setError(null);
          setSelection(null);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (maskCanvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (maskCanvasRef.current.height / rect.height)
    };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === "hand") {
      setIsPanning(true);
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
      lastPos.current = { x: clientX, y: clientY };
    } else if (activeTool === "marquee") {
      setIsSelecting(true);
      setResult(null); // Clear previous result when starting new selection
      startPos.current = getCoordinates(e);
      setSelection({ x: startPos.current.x, y: startPos.current.y, w: 0, h: 0 });
    }
  };

  const stopInteraction = () => {
    setIsSelecting(false);
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: clientX, y: clientY };
    } else if (isSelecting && activeTool === "marquee") {
      const currentPos = getCoordinates(e);
      const x = Math.min(startPos.current.x, currentPos.x);
      const y = Math.min(startPos.current.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.current.x);
      const h = Math.abs(currentPos.y - startPos.current.y);
      
      setSelection({ x, y, w, h });
      drawSelectionRect(x, y, w, h);
    }
  };

  const drawSelectionRect = (x: number, y: number, w: number, h: number) => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    
    // Darken outside
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    ctx.clearRect(x, y, w, h);

    // Draw dashed border
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  };

  const handleProcess = async () => {
    if (!image || !selection || selection.w === 0 || selection.h === 0 || !originalImgRef.current || !canvasRef.current) return;
    
    if (!apiKey.trim()) {
      setError("Por favor, insira sua API Key do Gemini nas configurações.");
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // Calculate actual crop coordinates based on original image scale
      const scaleX = originalImgRef.current.width / canvasRef.current.width;
      const scaleY = originalImgRef.current.height / canvasRef.current.height;

      const actualX = selection.x * scaleX;
      const actualY = selection.y * scaleY;
      const actualW = selection.w * scaleX;
      const actualH = selection.h * scaleY;

      // Create a temporary canvas to crop the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = actualW;
      tempCanvas.height = actualH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error("Failed to create crop context");

      ctx.drawImage(
        originalImgRef.current, 
        actualX, actualY, actualW, actualH, // Source rect
        0, 0, actualW, actualH // Dest rect
      );

      const croppedBase64 = tempCanvas.toDataURL('image/png');
      
      const processedImage = await processImage(croppedBase64, selectedStyle, apiKey.trim(), selectedModel);
      setResult(processedImage);
      
      // Clear the dark overlay but keep the selection box
      if (maskCanvasRef.current) {
        const maskCtx = maskCanvasRef.current.getContext('2d');
        maskCtx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        maskCtx!.strokeStyle = '#00ff00';
        maskCtx!.lineWidth = 2;
        maskCtx!.strokeRect(selection.x, selection.y, selection.w, selection.h);
      }

    } catch (err: any) {
      setError(err.message || "Failed to process.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen bg-[#323232] text-[#cccccc] font-sans flex flex-col overflow-hidden border-t border-[#444444]">
      {/* Panel Header */}
      <div className="h-9 bg-[#2d2d2d] border-b border-[#1a1a1a] flex items-center px-3 justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#eeeeee]">NebulaRedraw AI</span>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`p-1 rounded transition-colors ${showSettings ? 'bg-[#4a4a4a] text-white' : 'hover:bg-white/5 text-[#666666]'}`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings / Auth Panel (Collapsible) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#252525] border-b border-[#1a1a1a] overflow-hidden shrink-0"
          >
            <div className="p-3 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#999999] uppercase font-bold flex items-center gap-1.5">
                    <Key className="w-3 h-3" /> Gemini API Key
                  </label>
                  <button onClick={() => setShowApiInfo(true)} className="text-blue-400 hover:text-blue-300">
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua chave aqui..."
                  className="w-full bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#999999] uppercase font-bold">Modelo de IA</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="gemini-2.5-flash-image">Nano Banana (Rápido / Free Tier)</option>
                  <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Alta Qualidade / Pro)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col p-3 gap-4 overflow-y-auto custom-scrollbar">
        
        {/* Document Sync Section */}
        <div className="space-y-2 shrink-0">
          <button 
            onClick={syncFromPhotoshop}
            className="w-full py-2 bg-[#4a4a4a] hover:bg-[#555555] border border-[#555555] rounded text-[11px] font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync from Photoshop
          </button>
        </div>

        {/* Canvas Area (The "Preview/Marking" zone) */}
        <div className="relative aspect-[3/4] bg-[#1e1e1e] rounded border border-[#111111] overflow-hidden flex items-center justify-center shrink-0">
          {!image ? (
            <div className="text-center p-4">
              <ImageIcon className="w-8 h-8 text-[#444444] mx-auto mb-2" />
              <p className="text-[10px] text-[#666666]">No active document captured.</p>
            </div>
          ) : (
            <div 
              className="relative"
              style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: activeTool === "hand" ? (isPanning ? "grabbing" : "grab") : "crosshair"
              }}
            >
              <canvas ref={canvasRef} className="block" />
              <canvas 
                ref={maskCanvasRef}
                onMouseDown={startInteraction}
                onMouseMove={handleMouseMove}
                onMouseUp={stopInteraction}
                onMouseLeave={stopInteraction}
                className="absolute inset-0 z-10 touch-none"
              />
              <AnimatePresence>
                {result && selection && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="absolute z-20 pointer-events-none"
                    style={{
                      left: selection.x,
                      top: selection.y,
                      width: selection.w,
                      height: selection.h
                    }}
                  >
                    <img src={result} alt="Result" className="w-full h-full object-fill" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Floating Tool Overlay */}
          {image && (
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
              <button 
                onClick={() => setActiveTool("marquee")}
                className={`p-1.5 rounded border ${activeTool === "marquee" ? "bg-blue-600 border-blue-400" : "bg-[#2d2d2d] border-[#444444] hover:bg-[#3d3d3d]"}`}
                title="Marquee Selection"
              >
                <SquareDashed className="w-3.5 h-3.5 text-white" />
              </button>
              <button 
                onClick={() => setActiveTool("hand")}
                className={`p-1.5 rounded border ${activeTool === "hand" ? "bg-blue-600 border-blue-400" : "bg-[#2d2d2d] border-[#444444] hover:bg-[#3d3d3d]"}`}
                title="Hand Tool"
              >
                <Hand className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}

          {/* Zoom Controls Overlay */}
          {image && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-[#2d2d2d]/80 backdrop-blur px-2 py-1 rounded border border-[#444444] z-30">
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><Minimize className="w-3 h-3" /></button>
              <span className="text-[9px] font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.2))}><Maximize className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        {/* Style Selection */}
        <div className="space-y-2 shrink-0">
          <span className="text-[10px] text-[#999999] uppercase font-bold">Style Preset</span>
          <div className="grid grid-cols-1 gap-1">
            {(["Mangá P&B", "Webtoon Colorido", "Cenário Detalhado"] as StylePreset[]).map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`text-left px-3 py-1.5 text-[11px] rounded border transition-colors ${
                  selectedStyle === style 
                  ? "bg-[#4a4a4a] border-[#0078d4] text-white" 
                  : "bg-[#323232] border-transparent hover:bg-[#383838] text-[#999999]"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Main Actions */}
        <div className="mt-auto pt-4 space-y-2 shrink-0">
          <button
            onClick={handleProcess}
            disabled={!image || !selection || selection.w === 0 || isProcessing}
            className={`w-full py-2.5 rounded text-[11px] font-bold text-white transition-all flex items-center justify-center gap-2 ${
              !image || !selection || selection.w === 0 || isProcessing 
              ? "bg-[#444444] cursor-not-allowed opacity-50" 
              : "bg-[#0078d4] hover:bg-[#0086f0] shadow-lg shadow-blue-500/10"
            }`}
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isProcessing ? "Processing..." : "Clean & Redraw Selection"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {}} // In UXP: applyResultToPhotoshop(result, actualX, actualY)
              disabled={!result}
              className="py-2 bg-[#4a4a4a] hover:bg-[#555555] disabled:opacity-30 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1.5"
            >
              <Check className="w-3 h-3" /> Apply to Layer
            </button>
            <button 
              onClick={() => {
                const maskCtx = maskCanvasRef.current?.getContext('2d');
                maskCtx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
                setSelection(null);
                setResult(null);
              }}
              className="py-2 bg-[#3c3c3c] hover:bg-[#444444] text-[#999999] hover:text-white text-[10px] font-bold rounded"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-900/20 border border-red-900/50 rounded text-[10px] text-red-400 flex gap-2 shrink-0">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="h-6 bg-[#0078d4] flex items-center px-3 justify-between text-[9px] text-white select-none shrink-0">
        <span>Nebula Engine v1.0.2</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span>{apiKey ? 'API Ready' : 'API Missing'}</span>
        </div>
      </div>

      {/* API Info Modal */}
      <AnimatePresence>
        {showApiInfo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="bg-[#2d2d2d] border border-[#444444] rounded-lg p-4 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setShowApiInfo(false)} className="absolute top-2 right-2 p-1 text-[#999999] hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[13px] font-bold text-white mb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" /> O que é a API Key?
              </h3>
              <div className="text-[11px] text-[#cccccc] space-y-2 leading-relaxed">
                <p>Para usar o NebulaRedraw, você precisa de uma chave de acesso (API Key) do Google Gemini.</p>
                <p><strong>Como conseguir:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Acesse <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>.</li>
                  <li>Faça login com sua conta Google.</li>
                  <li>Clique em "Create API Key".</li>
                  <li>Copie o código gerado e cole nas configurações do plugin.</li>
                </ol>
                <p className="text-[#999999] mt-2 italic">Sua chave é salva localmente e nunca é compartilhada. Se você tiver o plano Gemini Advanced, selecione o modelo "Nano Banana 2" para maior qualidade.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
