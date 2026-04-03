/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Eraser, 
  Brush, 
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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImage } from './lib/gemini';

type StylePreset = "Mangá P&B" | "Webtoon Colorido" | "Cenário Detalhado";
type Tool = "brush" | "eraser" | "hand";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>("Mangá P&B");
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Initialize canvases
  useEffect(() => {
    if (image && canvasRef.current && maskCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
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
        }
      };
      img.src = image;
    }
  }, [image]);

  // Simulated Photoshop Sync
  const syncFromPhotoshop = () => {
    // In UXP: const base64 = await getActiveDocumentAsBase64();
    // For now, we'll use a placeholder or prompt for a file to simulate the "active document"
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
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;

    if (activeTool === "hand") {
      setIsPanning(true);
      lastPos.current = { x: clientX, y: clientY };
    } else {
      setIsDrawing(true);
      draw(e);
    }
  };

  const stopInteraction = () => {
    setIsDrawing(false);
    setIsPanning(false);
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    maskCtx?.beginPath();
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: clientX, y: clientY };
    } else if (isDrawing) {
      draw(e);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!maskCanvasRef.current || activeTool === "hand") return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleProcess = async () => {
    if (!image || !maskCanvasRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const maskBase64 = maskCanvasRef.current.toDataURL('image/png');
      const apiKey = process.env.GEMINI_API_KEY || "";
      const processedImage = await processImage(image, maskBase64, selectedStyle, apiKey);
      setResult(processedImage);
    } catch (err: any) {
      setError(err.message || "Failed to process.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen bg-[#323232] text-[#cccccc] font-sans flex flex-col overflow-hidden border-t border-[#444444]">
      {/* Panel Header */}
      <div className="h-9 bg-[#2d2d2d] border-b border-[#1a1a1a] flex items-center px-3 justify-between select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#eeeeee]">NebulaRedraw AI</span>
        </div>
        <button onClick={() => {}} className="p-1 hover:bg-white/5 rounded">
          <Settings className="w-3.5 h-3.5 text-[#666666]" />
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col p-3 gap-4 overflow-y-auto custom-scrollbar">
        
        {/* Document Sync Section */}
        <div className="space-y-2">
          <button 
            onClick={syncFromPhotoshop}
            className="w-full py-2 bg-[#4a4a4a] hover:bg-[#555555] border border-[#555555] rounded text-[11px] font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync from Photoshop
          </button>
        </div>

        {/* Canvas Area (The "Preview/Marking" zone) */}
        <div className="relative aspect-[3/4] bg-[#1e1e1e] rounded border border-[#111111] overflow-hidden flex items-center justify-center">
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
                {result && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 pointer-events-none">
                    <img src={result} alt="Result" className="w-full h-full object-contain" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Floating Tool Overlay */}
          {image && (
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
              <button 
                onClick={() => setActiveTool("brush")}
                className={`p-1.5 rounded border ${activeTool === "brush" ? "bg-blue-600 border-blue-400" : "bg-[#2d2d2d] border-[#444444] hover:bg-[#3d3d3d]"}`}
              >
                <Brush className="w-3.5 h-3.5 text-white" />
              </button>
              <button 
                onClick={() => setActiveTool("eraser")}
                className={`p-1.5 rounded border ${activeTool === "eraser" ? "bg-blue-600 border-blue-400" : "bg-[#2d2d2d] border-[#444444] hover:bg-[#3d3d3d]"}`}
              >
                <Eraser className="w-3.5 h-3.5 text-white" />
              </button>
              <button 
                onClick={() => setActiveTool("hand")}
                className={`p-1.5 rounded border ${activeTool === "hand" ? "bg-blue-600 border-blue-400" : "bg-[#2d2d2d] border-[#444444] hover:bg-[#3d3d3d]"}`}
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

        {/* Tool Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#999999] uppercase font-bold">Brush Size</span>
            <span className="text-[10px] font-mono text-blue-400">{brushSize}px</span>
          </div>
          <input 
            type="range" min="1" max="100" value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-1 bg-[#1a1a1a] rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
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
        <div className="mt-auto pt-4 space-y-2">
          <button
            onClick={handleProcess}
            disabled={!image || isProcessing}
            className={`w-full py-2.5 rounded text-[11px] font-bold text-white transition-all flex items-center justify-center gap-2 ${
              !image || isProcessing 
              ? "bg-[#444444] cursor-not-allowed opacity-50" 
              : "bg-[#0078d4] hover:bg-[#0086f0] shadow-lg shadow-blue-500/10"
            }`}
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isProcessing ? "Processing..." : "Clean & Redraw Area"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {}} // In UXP: applyResultToPhotoshop(result)
              disabled={!result}
              className="py-2 bg-[#4a4a4a] hover:bg-[#555555] disabled:opacity-30 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1.5"
            >
              <Check className="w-3 h-3" /> Apply to PS
            </button>
            <button 
              onClick={() => {
                const maskCtx = maskCanvasRef.current?.getContext('2d');
                maskCtx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
                setResult(null);
              }}
              className="py-2 bg-[#3c3c3c] hover:bg-[#444444] text-[#999999] hover:text-white text-[10px] font-bold rounded"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-900/20 border border-red-900/50 rounded text-[10px] text-red-400 flex gap-2">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="h-6 bg-[#0078d4] flex items-center px-3 justify-between text-[9px] text-white select-none">
        <span>Nebula Engine v1.0.2</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>Gemini AI Connected</span>
        </div>
      </div>
    </div>
  );
}
