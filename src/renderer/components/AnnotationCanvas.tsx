/**
 * Annotation Canvas Component
 * Provides drawing, highlighting, and note-taking tools for images
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Pencil,
  Highlighter,
  Square,
  Circle,
  Type,
  Eraser,
  Undo,
  Redo,
  Download,
  Trash2,
  Save,
  Palette,
  StickyNote,
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'draw' | 'highlight' | 'rectangle' | 'circle' | 'text' | 'note';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
}

interface AnnotationCanvasProps {
  imageUrl: string;
  fileName: string;
  onSave?: (annotations: Annotation[], dataUrl: string) => void;
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#000000', // black
  '#ffffff', // white
];

const HIGHLIGHT_COLORS = [
  'rgba(255, 255, 0, 0.4)', // yellow
  'rgba(0, 255, 0, 0.4)', // green
  'rgba(255, 165, 0, 0.4)', // orange
  'rgba(255, 192, 203, 0.4)', // pink
  'rgba(0, 255, 255, 0.4)', // cyan
];

type Tool = 'draw' | 'highlight' | 'rectangle' | 'circle' | 'text' | 'note' | 'eraser';

export default function AnnotationCanvas({
  imageUrl,
  fileName,
  onSave,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [notePosition, setNotePosition] = useState({ x: 0, y: 0 });

  // Load image and set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxWidth = container.clientWidth - 40;
      const maxHeight = 500;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageLoaded(true);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas with annotations
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw image
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw all annotations
      annotations.forEach((ann) => {
        ctx.strokeStyle = ann.color;
        ctx.fillStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (ann.type) {
          case 'draw':
          case 'highlight':
            if (ann.points && ann.points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(ann.points[0].x, ann.points[0].y);
              ann.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
            }
            break;
          case 'rectangle':
            if (ann.x !== undefined && ann.y !== undefined && ann.width && ann.height) {
              ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
            }
            break;
          case 'circle':
            if (ann.x !== undefined && ann.y !== undefined && ann.width) {
              ctx.beginPath();
              ctx.arc(ann.x, ann.y, ann.width / 2, 0, Math.PI * 2);
              ctx.stroke();
            }
            break;
          case 'text':
          case 'note':
            if (ann.x !== undefined && ann.y !== undefined && ann.text) {
              ctx.font = `${ann.strokeWidth * 4}px sans-serif`;
              ctx.fillText(ann.text, ann.x, ann.y);
            }
            break;
        }
      });
    };
    img.src = imageUrl;
  }, [annotations, imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [annotations, imageLoaded, redrawCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'note') {
      const pos = getMousePos(e);
      setNotePosition(pos);
      setShowNoteInput(true);
      return;
    }

    setIsDrawing(true);
    const pos = getMousePos(e);

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: tool === 'eraser' ? 'draw' : tool as Annotation['type'],
      color: tool === 'highlight' ? HIGHLIGHT_COLORS[0] : color,
      strokeWidth: tool === 'highlight' ? 20 : strokeWidth,
      points: tool === 'draw' || tool === 'highlight' ? [pos] : undefined,
      x: tool === 'rectangle' || tool === 'circle' || tool === 'text' ? pos.x : undefined,
      y: tool === 'rectangle' || tool === 'circle' || tool === 'text' ? pos.y : undefined,
    };

    setCurrentAnnotation(newAnnotation);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;

    const pos = getMousePos(e);

    if (tool === 'draw' || tool === 'highlight') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), pos],
      });
    } else if (tool === 'rectangle' || tool === 'circle') {
      const startX = currentAnnotation.x || 0;
      const startY = currentAnnotation.y || 0;
      setCurrentAnnotation({
        ...currentAnnotation,
        width: pos.x - startX,
        height: pos.y - startY,
      });
    }

    // Draw current annotation in real-time
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && currentAnnotation) {
      redrawCanvas();
      ctx.strokeStyle = currentAnnotation.color;
      ctx.fillStyle = currentAnnotation.color;
      ctx.lineWidth = currentAnnotation.strokeWidth;
      ctx.lineCap = 'round';

      if (tool === 'draw' || tool === 'highlight') {
        const points = [...(currentAnnotation.points || []), pos];
        if (points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach((point) => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
      } else if (tool === 'rectangle') {
        ctx.strokeRect(
          currentAnnotation.x || 0,
          currentAnnotation.y || 0,
          pos.x - (currentAnnotation.x || 0),
          pos.y - (currentAnnotation.y || 0)
        );
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - (currentAnnotation.x || 0), 2) +
          Math.pow(pos.y - (currentAnnotation.y || 0), 2)
        );
        ctx.beginPath();
        ctx.arc(currentAnnotation.x || 0, currentAnnotation.y || 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentAnnotation) {
      const newAnnotations = [...annotations, currentAnnotation];
      setAnnotations(newAnnotations);
      
      // Update history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const addNote = () => {
    if (!noteText.trim()) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'note',
      x: notePosition.x,
      y: notePosition.y,
      text: noteText,
      color: color,
      strokeWidth: strokeWidth,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setNoteText('');
    setShowNoteInput(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const clearAll = () => {
    setAnnotations([]);
    const newHistory = [...history, []];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    redrawCanvas();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(annotations, dataUrl);
    toast.success('Annotations saved!');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `annotated-${fileName}`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Image downloaded!');
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={tool === 'draw' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('draw')}
            title="Draw"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'highlight' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('rectangle')}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'circle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('circle')}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'note' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('note')}
            title="Add Note"
          >
            <StickyNote className="w-4 h-4" />
          </Button>
        </div>

        {/* Color Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: color }}
              />
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded border-2 ${
                    color === c ? 'border-blue-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Stroke Width */}
        <div className="flex items-center gap-2 min-w-24">
          <Slider
            value={[strokeWidth]}
            onValueChange={(v) => setStrokeWidth(v[0])}
            min={1}
            max={10}
            step={1}
            className="flex-1"
          />
          <span className="text-xs w-4">{strokeWidth}</span>
        </div>

        {/* History Controls */}
        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Save/Download */}
        <div className="flex items-center gap-1 border-l pl-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1">
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair max-w-full"
        />

        {/* Note Input Popup */}
        {showNoteInput && (
          <div
            className="absolute bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border z-10"
            style={{ left: notePosition.x, top: notePosition.y }}
          >
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note..."
              className="min-w-48 min-h-16 text-sm"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={addNote}>
                Add Note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500">
        {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} added
      </p>
    </div>
  );
}
