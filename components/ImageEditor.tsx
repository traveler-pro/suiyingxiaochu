import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorMode, DrawPath, Point, ImageDimensions } from '../types';
import { BrushIcon, HandIcon, UndoIcon, RefreshIcon, MagicIcon } from './Icons';

interface ImageEditorProps {
  imageSrc: string;
  onGenerate: (maskBase64: string) => void;
  isProcessing: boolean;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onGenerate, isProcessing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Editor State
  const [mode, setMode] = useState<EditorMode>(EditorMode.DRAW);
  const [brushSize, setBrushSize] = useState<number>(20);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  
  // Viewport State
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  // Initialize Image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      fitImageToContainer(img.width, img.height);
    };
  }, [imageSrc]);

  // Fit image to container initially
  const fitImageToContainer = (imgWidth: number, imgHeight: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    const scaleX = clientWidth / imgWidth;
    const scaleY = clientHeight / imgHeight;
    const initialScale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% fit
    
    setScale(initialScale);
    setOffset({
      x: (clientWidth - imgWidth * initialScale) / 2,
      y: (clientHeight - imgHeight * initialScale) / 2
    });
    
    // Reset paths when image loads/changes
    setPaths([]);
  };

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image dimensions
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw Masks (Red translucent)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw committed paths
    paths.forEach(path => {
      if (path.points.length < 1) return;
      ctx.beginPath();
      ctx.lineWidth = path.size;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Draw current path being drawn
    if (currentPath.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
    
    ctx.restore();

  }, [imageSrc, paths, currentPath, brushSize]);

  // Helper: Get coordinates relative to image
  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!containerRef.current || !imageRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Mouse relative to container
    const containerX = clientX - rect.left;
    const containerY = clientY - rect.top;

    // Mouse relative to transformed image origin
    const imageX = (containerX - offset.x) / scale;
    const imageY = (containerY - offset.y) / scale;

    return { x: imageX, y: imageY };
  };

  // Event Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isProcessing) return;
    
    if (mode === EditorMode.PAN) {
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setLastMousePos({ x: clientX, y: clientY });
    } else {
      const coords = getRelativeCoords(e);
      if (coords) {
        setIsDrawing(true);
        setCurrentPath([coords]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
     if (isProcessing) return;

    if (mode === EditorMode.PAN && isDragging) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: clientX, y: clientY });
    } else if (mode === EditorMode.DRAW && isDrawing) {
      const coords = getRelativeCoords(e);
      if (coords) {
        setCurrentPath(prev => [...prev, coords]);
      }
    }
  };

  const handleMouseUp = () => {
    if (mode === EditorMode.PAN) {
      setIsDragging(false);
    } else if (mode === EditorMode.DRAW && isDrawing) {
      setIsDrawing(false);
      if (currentPath.length > 0) {
        setPaths(prev => [...prev, { points: currentPath, size: brushSize }]);
        setCurrentPath([]);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newScale = Math.max(0.1, Math.min(5, scale - e.deltaY * 0.001));
    // Zoom towards center would be better, but simple zoom is acceptable for now
    setScale(newScale);
  };

  const generateMask = () => {
    if (!imageRef.current) return;
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageRef.current.width;
    maskCanvas.height = imageRef.current.height;
    const ctx = maskCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Fill black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Draw white paths
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paths.forEach(path => {
       if (path.points.length < 1) return;
       ctx.beginPath();
       ctx.lineWidth = path.size; // Same size as visual
       ctx.strokeStyle = '#FFFFFF';
       ctx.moveTo(path.points[0].x, path.points[0].y);
       path.points.forEach(p => ctx.lineTo(p.x, p.y));
       ctx.stroke();
    });

    const maskBase64 = maskCanvas.toDataURL('image/png');
    onGenerate(maskBase64);
  };

  const undo = () => {
    setPaths(prev => prev.slice(0, prev.length - 1));
  };

  const reset = () => {
    setPaths([]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 rounded-lg overflow-hidden shadow-sm border border-slate-200">
      
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${mode === EditorMode.PAN ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0 touch-none"
        />
        
        {/* Helper text if needed */}
        {paths.length === 0 && !isDrawing && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs pointer-events-none select-none backdrop-blur-sm">
             使用画笔涂抹水印区域
           </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Tools */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMode(EditorMode.DRAW)}
              className={`p-2 rounded-md transition-colors ${mode === EditorMode.DRAW ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="画笔工具"
            >
              <BrushIcon />
            </button>
            <button
              onClick={() => setMode(EditorMode.PAN)}
              className={`p-2 rounded-md transition-colors ${mode === EditorMode.PAN ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="抓手工具"
            >
              <HandIcon />
            </button>
          </div>

          {/* Middle: Brush Settings */}
          {mode === EditorMode.DRAW && (
            <div className="flex items-center gap-3 w-full max-w-xs px-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">笔刷大小</span>
              <input 
                type="range" 
                min="5" 
                max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-slate-500 w-6 text-right">{brushSize}</span>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
             <button
              onClick={undo}
              disabled={paths.length === 0 || isProcessing}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              title="撤销"
            >
              <UndoIcon />
            </button>
            <button
              onClick={reset}
              disabled={paths.length === 0 || isProcessing}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              title="重置"
            >
              <RefreshIcon />
            </button>
            
            <div className="w-px h-6 bg-slate-300 mx-2"></div>

            <button
              onClick={generateMask}
              disabled={paths.length === 0 || isProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all
                ${paths.length === 0 || isProcessing ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg active:translate-y-0.5'}
              `}
            >
               <MagicIcon />
               <span>开始去水印</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;