'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PenLine, Eraser, Trash2, Square, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; size: number; tool: 'pen' | 'eraser' }

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#ffffff', '#111827']

export function Whiteboard({
  enabled,
  sendDraw,
  sendClear,
  requestSync,
  onDraw,
  onClear,
  onSync,
  respondSync,
  onSyncRequest,
}: {
  enabled: boolean
  sendDraw: (stroke: Stroke) => void
  sendClear: () => void
  requestSync: () => void
  onDraw: (cb: (stroke: Stroke) => void) => () => void
  onClear: (cb: () => void) => () => void
  onSync: (cb: (imageData: string) => void) => () => void
  respondSync: (toSocketId: string, imageData: string) => void
  onSyncRequest: (cb: () => void) => () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [color, setColor] = useState('#10b981')
  const [size, setSize] = useState(3)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  // setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      // preserve existing drawing
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width
      tmp.height = canvas.height
      tmp.getContext('2d')?.drawImage(canvas, 0, 0)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
      ctx.drawImage(tmp, 0, 0, w, h)
    }
    resize()
    window.addEventListener('resize', resize)
    // request sync from existing participants
    requestSync()
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getPos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const drawStroke = useCallback((stroke: Stroke) => {
    const ctx = ctxRef.current
    if (!ctx || stroke.points.length < 1) return
    ctx.save()
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled) return
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const p = getPos(e)
    currentStrokeRef.current = { points: [p], color, size, tool }
    // dot for single click
    const ctx = ctxRef.current!
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current) return
    const p = getPos(e)
    currentStrokeRef.current.points.push(p)
    // draw incrementally
    const ctx = ctxRef.current!
    const pts = currentStrokeRef.current.points
    const prev = pts[pts.length - 2]
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.restore()
  }

  const onPointerUp = () => {
    if (!drawingRef.current || !currentStrokeRef.current) return
    drawingRef.current = false
    const stroke = currentStrokeRef.current
    currentStrokeRef.current = null
    sendDraw(stroke)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    sendClear()
  }

  // socket listeners
  useEffect(() => {
    const off1 = onDraw((stroke) => drawStroke(stroke))
    const off2 = onClear(() => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    const off3 = onSync((imageData) => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight)
      }
      img.src = imageData
    })
    const off4 = onSyncRequest(() => {
      // someone joined, send them our canvas
      const canvas = canvasRef.current
      if (!canvas) return
      // we don't know toSocketId here directly; the server relays whiteboard-sync-request
      // respondSync needs a target; server picks first participant and asks them.
      // The server's whiteboard-sync will carry toSocketId. We respond with full canvas.
      const dataUrl = canvas.toDataURL('image/png')
      // server expects respondSync(toSocketId, imageData). But we don't have toSocketId from the request event.
      // The server emits whiteboard-sync-request without target; we respond to the socket that the server will route.
      // Simplify: emit back via respondSync with the requester info captured by server. We'll use a wildcard by sending to socket server.
      respondSync('__requester__', dataUrl)
    })
    return () => { off1(); off2(); off3(); off4() }
  }, [drawStroke])

  return (
    <div className="relative h-full w-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg overflow-hidden" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border/60 bg-background/60 backdrop-blur flex-wrap">
        <div className="flex items-center gap-1">
          <Button size="icon" variant={tool === 'pen' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => setTool('pen')} disabled={!enabled}><PenLine className="h-4 w-4" /></Button>
          <Button size="icon" variant={tool === 'eraser' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => setTool('eraser')} disabled={!enabled}><Eraser className="h-4 w-4" /></Button>
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool('pen') }} disabled={!enabled}
              className={cn('h-6 w-6 rounded-full border-2 transition', color === c ? 'border-foreground scale-110' : 'border-transparent')}
              style={{ backgroundColor: c }} aria-label={c} />
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          {[2, 4, 8, 14].map((s) => (
            <button key={s} onClick={() => setSize(s)} disabled={!enabled}
              className={cn('h-8 w-8 rounded-md grid place-items-center transition', size === s ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
              <span className="rounded-full bg-current" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
        </div>
        <div className="mr-auto">
          <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={clearCanvas} disabled={!enabled}><Trash2 className="h-4 w-4" /> پاک کردن</Button>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 wb-cursor touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!enabled && (
          <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
            <div className="text-center">
              <PenLine className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">وایت‌برد برای شما فقط مشاهده است</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
