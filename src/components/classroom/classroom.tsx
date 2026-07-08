'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useClassroomSocket, type Participant, type ChatMessage, type Permission } from './use-classroom-socket'
import { Whiteboard } from './whiteboard'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { useApp } from '@/lib/store'
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PenLine, MessageSquare,
  Users, Hand, LogOut, Radio, Circle, Send, Crown, ShieldCheck, BookOpen, LayoutGrid, Lock,
  Mail, Trash2, ArrowRight, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { colorOf } from '@/lib/ui'

export function Classroom() {
  const { user, activeSessionId, exitClassroom } = useApp()
  const sessionId = activeSessionId!

  const cls = useClassroomSocket({ sessionId, user: { id: user!.id, name: user!.name, role: user!.role, avatar: user!.avatar } })

  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [stage, setStage] = useState<'video' | 'whiteboard'>('video')
  const [rightTab, setRightTab] = useState<'chat' | 'participants' | 'private'>('chat')
  const [chatInput, setChatInput] = useState('')
  const [privateInput, setPrivateInput] = useState('')
  const [activePrivateSocketId, setActivePrivateSocketId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const privateEndRef = useRef<HTMLDivElement>(null)

  const isTeacher = user!.role === 'TEACHER' || user!.role === 'ADMIN'
  const canDrawWhiteboard = isTeacher || cls.localState.allowWhiteboard

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}`).then((r) => r.json()).then((d) => {
      if (d.session) setSessionInfo(d.session)
    })
  }, [sessionId])

  useEffect(() => {
    const i = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [cls.messages])

  useEffect(() => {
    privateEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [cls.privateChats, activePrivateSocketId])

  // when opening a private chat, mark it read
  const markReadRef = useRef(cls.markPrivateRead)
  useEffect(() => { markReadRef.current = cls.markPrivateRead }, [cls.markPrivateRead])
  useEffect(() => {
    if (activePrivateSocketId) markReadRef.current(activePrivateSocketId)
  }, [activePrivateSocketId])

  useEffect(() => {
    if (cls.kicked) {
      toast.error('شما از کلاس اخراج شدید')
      setTimeout(() => exitClassroom(), 1500)
    }
  }, [cls.kicked, exitClassroom])

  useEffect(() => {
    if (cls.permissionToast) {
      toast(cls.permissionToast, { duration: 3000 })
      const t = setTimeout(() => cls.clearPermissionToast(), 100)
      return () => clearTimeout(t)
    }
  }, [cls.permissionToast, cls.clearPermissionToast])

  const onSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    cls.sendMessage(chatInput.trim())
    fetch(`/api/sessions/${sessionId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: chatInput.trim() }) })
    setChatInput('')
  }, [chatInput, cls, sessionId])

  const onSendPrivate = useCallback(() => {
    if (!privateInput.trim() || !activePrivateSocketId) return
    cls.sendPrivateMessage(activePrivateSocketId, privateInput.trim())
    setPrivateInput('')
  }, [privateInput, activePrivateSocketId, cls])

  const openPrivateChat = useCallback((socketId: string) => {
    setActivePrivateSocketId(socketId)
    setRightTab('private')
    cls.markPrivateRead(socketId)
  }, [cls])

  const handleClearChat = useCallback(() => {
    cls.clearMeetingChat()
    toast.success('چت پاک شد')
  }, [cls])

  const handleScreenShare = async () => {
    if (cls.screenStream) {
      cls.stopScreenShare()
    } else {
      const ok = await cls.startScreenShare()
      if (ok) toast.success('اشتراک صفحه شروع شد')
    }
  }

  const handleLeave = async () => {
    if (isTeacher && sessionInfo?.status === 'LIVE') {
      await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' })
    }
    exitClassroom()
  }

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
  }

  const screenSharer = cls.participants.find((p) => p.sharing)
  const spotlight = screenSharer || (pinnedId ? cls.participants.find((p) => p.socketId === pinnedId) : null) || cls.participants.find((p) => p.isSpeaking) || cls.participants.find((p) => p.isLocal) || cls.participants[0]
  const gridParticipants = cls.participants.filter((p) => p.socketId !== spotlight?.socketId)

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border/60 bg-card/60 backdrop-blur flex items-center justify-between px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('h-8 w-8 rounded-lg grid place-items-center shrink-0', colorOf(sessionInfo?.course?.color).bg)}>
            <BookOpen className={cn('h-4 w-4', colorOf(sessionInfo?.course?.color).text)} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate flex items-center gap-2">
              {sessionInfo?.title || 'کلاس زنده'}
              {sessionInfo?.status === 'LIVE' && (
                <Badge className="gap-1 bg-rose-500 hover:bg-rose-500 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-white rec-pulse" /> زنده</Badge>
              )}
              {cls.recording && (
                <Badge variant="outline" className="gap-1 text-rose-500 border-rose-500/40 text-xs"><Circle className="h-2.5 w-2.5 fill-rose-500 rec-pulse" /> ضبط</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">{sessionInfo?.course?.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
            <Radio className={cn('h-3.5 w-3.5', cls.connected ? 'text-emerald-500' : 'text-rose-500')} />
            {cls.connected ? 'متصل' : 'در حال اتصال…'}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-muted/50">
            {fmtTime(elapsed)}
          </div>
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/50">
            <Users className="h-3.5 w-3.5" /> {cls.participants.length}
          </div>
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleLeave}>
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage */}
        <div className="flex-1 flex flex-col min-w-0 p-2 sm:p-3 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant={stage === 'video' ? 'default' : 'outline'} className="gap-1.5" onClick={() => setStage('video')}>
              <LayoutGrid className="h-4 w-4" /> ویدیو
            </Button>
            <Button size="sm" variant={stage === 'whiteboard' ? 'default' : 'outline'} className="gap-1.5" onClick={() => setStage('whiteboard')}>
              <PenLine className="h-4 w-4" /> وایت‌برد
            </Button>
            {cls.screenStream && (
              <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/40">
                <ScreenShare className="h-3 w-3" /> در حال اشتراک صفحه
              </Badge>
            )}
            {!isTeacher && !cls.localState.allowMic && !cls.localState.allowCam && (
              <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/40">
                <Lock className="h-3 w-3" /> منتظر اجازه استاد
              </Badge>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {stage === 'video' ? (
              <VideoStage
                spotlight={spotlight}
                grid={gridParticipants}
                localStream={cls.localStream}
                screenStream={cls.screenStream}
                onPin={setPinnedId}
                pinnedId={pinnedId}
              />
            ) : (
              <Whiteboard
                enabled={canDrawWhiteboard}
                sendDraw={cls.sendDraw}
                sendClear={cls.sendClear}
                requestSync={cls.requestWhiteboardSync}
                onDraw={cls.onWhiteboardDraw}
                onClear={cls.onWhiteboardClear}
                onSync={cls.onWhiteboardSync}
                respondSync={cls.respondWhiteboardSync}
                onSyncRequest={cls.onWhiteboardSyncRequest}
              />
            )}
          </div>
        </div>

        {/* Right sidebar (in RTL this appears on the left visually) */}
        {sidebarOpen && (
          <aside className="w-full sm:w-80 shrink-0 border-r border-border/60 bg-card/60 backdrop-blur flex flex-col absolute sm:relative inset-y-0 right-0 z-20 sm:z-auto h-full sm:h-auto">
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as 'chat' | 'participants' | 'private')} className="flex flex-col h-full">
              <TabsList className="grid grid-cols-3 m-2">
                <TabsTrigger value="chat" className="gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" /> چت</TabsTrigger>
                <TabsTrigger value="participants" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" /> افراد</TabsTrigger>
                <TabsTrigger value="private" className="gap-1 text-xs relative">
                  <Mail className="h-3.5 w-3.5" /> خصوصی
                  {Object.values(cls.privateUnread).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                      {Object.values(cls.privateUnread).reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Chat tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 px-2 pb-2 mt-0">
                {isTeacher && (
                  <div className="flex justify-end pb-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={handleClearChat} disabled={cls.messages.length === 0}>
                      <Trash2 className="h-3.5 w-3.5" /> پاک کردن چت
                    </Button>
                  </div>
                )}
                <ScrollArea className="flex-1 min-h-0 scroll-thin">
                  <div className="space-y-3 p-1">
                    {cls.messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {cls.chatCleared ? 'چت توسط استاد پاک شد' : 'هنوز پیامی نیست. سلام کنید 👋'}
                      </p>
                    )}
                    {cls.messages.map((m) => (
                      <ChatBubble key={m.id} m={m} isMe={m.userId === user!.id} />
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2 p-1 pt-2 border-t border-border/60">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSendChat() }}
                    placeholder="پیام بنویسید…"
                    className="h-9"
                  />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={onSendChat} disabled={!chatInput.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </TabsContent>

              {/* Participants tab */}
              <TabsContent value="participants" className="flex-1 flex flex-col min-h-0 px-2 pb-2 mt-0">
                <ScrollArea className="flex-1 min-h-0 scroll-thin">
                  <div className="space-y-2 p-1">
                    {cls.participants.map((p) => (
                      <ParticipantRow
                        key={p.socketId}
                        p={p}
                        isTeacher={isTeacher}
                        onForceMute={cls.forceMute}
                        onKick={cls.kickUser}
                        onPin={setPinnedId}
                        onGrant={cls.grantPermission}
                        onRevoke={cls.revokePermission}
                        onPrivateChat={openPrivateChat}
                        privateUnread={cls.privateUnread[p.socketId] || 0}
                      />
                    ))}
                    {cls.participants.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">هنوز کسی اینجا نیست.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Private chat tab */}
              <TabsContent value="private" className="flex-1 flex flex-col min-h-0 px-2 pb-2 mt-0">
                {activePrivateSocketId ? (
                  <>
                    <PrivateChatHeader
                      participant={cls.participants.find((p) => p.socketId === activePrivateSocketId)}
                      onBack={() => setActivePrivateSocketId(null)}
                    />
                    <ScrollArea className="flex-1 min-h-0 scroll-thin">
                      <div className="space-y-2 p-1">
                        {(cls.privateChats[activePrivateSocketId] || []).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">پیامی نیست. اولین پیام خصوصی را بفرستید.</p>
                        )}
                        {(cls.privateChats[activePrivateSocketId] || []).map((m) => (
                          <PrivateChatBubble key={m.id} m={m} isMe={m.userId === user!.id} />
                        ))}
                        <div ref={privateEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2 p-1 pt-2 border-t border-border/60">
                      <Input
                        value={privateInput}
                        onChange={(e) => setPrivateInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSendPrivate() }}
                        placeholder="پیام خصوصی بنویسید…"
                        className="h-9"
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={onSendPrivate} disabled={!privateInput.trim()}><Send className="h-4 w-4" /></Button>
                    </div>
                  </>
                ) : (
                  <PrivateChatList
                    participants={cls.participants}
                    privateChats={cls.privateChats}
                    privateUnread={cls.privateUnread}
                    onOpen={openPrivateChat}
                  />
                )}
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>

      {/* Control bar */}
      <footer className="h-16 sm:h-20 shrink-0 border-t border-border/60 bg-card/80 backdrop-blur flex items-center justify-center gap-1.5 sm:gap-2 px-2">
        <ControlButton
          active={cls.localState.micOn}
          onClick={() => cls.toggleMic()}
          onLabel="قطع میکروفون"
          offLabel="وصل میکروفون"
          icon={cls.localState.micOn ? Mic : MicOff}
          danger={!cls.localState.micOn}
          disabled={!isTeacher && !cls.localState.allowMic}
          locked={!isTeacher && !cls.localState.allowMic}
        />
        <ControlButton
          active={cls.localState.camOn}
          onClick={() => cls.toggleCam()}
          onLabel="قطع ویدیو"
          offLabel="وصل ویدیو"
          icon={cls.localState.camOn ? Video : VideoOff}
          danger={!cls.localState.camOn}
          disabled={!isTeacher && !cls.localState.allowCam}
          locked={!isTeacher && !cls.localState.allowCam}
        />
        <ControlButton
          active={!!cls.screenStream}
          onClick={handleScreenShare}
          onLabel="توقف اشتراک"
          offLabel="اشتراک صفحه"
          icon={cls.screenStream ? ScreenShareOff : ScreenShare}
          accent={!!cls.screenStream}
          disabled={!isTeacher && !cls.localState.allowScreen}
          locked={!isTeacher && !cls.localState.allowScreen}
        />
        <ControlButton
          active={stage === 'whiteboard'}
          onClick={() => setStage(stage === 'whiteboard' ? 'video' : 'whiteboard')}
          onLabel="وایت‌برد"
          offLabel="وایت‌برد"
          icon={PenLine}
        />
        <ControlButton
          active={cls.localState.handRaised}
          onClick={() => cls.toggleHand()}
          onLabel="پایین دادن دست"
          offLabel="بلند کردن دست"
          icon={Hand}
          accent={cls.localState.handRaised}
        />
        {isTeacher && (
          <ControlButton
            active={cls.recording}
            onClick={() => { cls.toggleRecording(); toast.success(cls.recording ? 'ضبط متوقف شد' : 'ضبط شروع شد') }}
            onLabel="توقف ضبط"
            offLabel="ضبط"
            icon={Circle}
            danger={cls.recording}
          />
        )}
        <Button variant="ghost" size="icon" className="hidden sm:grid" onClick={() => setSidebarOpen((o) => !o)}>
          <MessageSquare className="h-5 w-5" />
        </Button>
      </footer>

      {!sidebarOpen && (
        <Button
          variant="default"
          size="icon"
          className="sm:hidden fixed bottom-24 left-4 z-30 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}

      {cls.forceMuted && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 rounded-full bg-rose-500 text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2">
          <MicOff className="h-3.5 w-3.5" /> استاد شما را بی‌صدا کرد
          <button onClick={cls.clearForceMute} className="ml-1 hover:opacity-70">✕</button>
        </div>
      )}
    </div>
  )
}

function ControlButton({ active, onClick, onLabel, offLabel, icon: Icon, danger, accent, disabled, locked }: {
  active: boolean; onClick: () => void; onLabel: string; offLabel: string; icon: React.ComponentType<{ className?: string }>; danger?: boolean; accent?: boolean; disabled?: boolean; locked?: boolean
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={danger ? 'destructive' : accent ? 'default' : 'outline'}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={cn('relative h-11 w-11 sm:h-12 sm:w-12 rounded-full', !danger && !accent && active && 'bg-primary text-primary-foreground')}
          >
            <Icon className="h-5 w-5" />
            {locked && <Lock className="absolute -top-0.5 -left-0.5 h-3.5 w-3.5 text-amber-500 bg-card rounded-full p-0.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{locked ? 'نیازمند اجازه استاد' : active ? onLabel : offLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function VideoTile({ p, large, onPin }: { p: Participant; large?: boolean; onPin?: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const stream = p.isLocal ? null : p.stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])
  useEffect(() => {
    if (p.isLocal && localRef.current && p.stream) {
      localRef.current.srcObject = p.stream
    }
  }, [p.isLocal, p.stream])

  const showVideo = (p.isLocal && p.camOn) || (!p.isLocal && p.stream && p.camOn)
  const RoleIcon = p.role === 'TEACHER' ? Crown : p.role === 'ADMIN' ? ShieldCheck : null

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-zinc-900 border-2 transition group',
        p.isSpeaking ? 'border-emerald-500 speaking-ring' : 'border-transparent',
        large ? 'h-full w-full' : 'aspect-video'
      )}
      onDoubleClick={() => onPin?.(p.socketId)}
    >
      {showVideo ? (
        p.isLocal ? (
          <video ref={localRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
        ) : (
          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <Avatar className={cn(large ? 'h-20 w-20' : 'h-12 w-12')}>
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-semibold">{p.avatar}</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className="absolute bottom-1.5 right-1.5 left-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur px-1.5 py-0.5 text-xs text-white max-w-[80%]">
          {RoleIcon && <RoleIcon className="h-3 w-3 shrink-0 text-amber-400" />}
          <span className="truncate">{p.name}{p.isLocal && ' (شما)'}</span>
        </div>
        <div className="flex items-center gap-1">
          {p.handRaised && <Hand className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
          <div className={cn('rounded-md p-1', p.micOn ? 'bg-black/60' : 'bg-rose-500')}>
            {p.micOn ? <Mic className="h-3 w-3 text-white" /> : <MicOff className="h-3 w-3 text-white" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function VideoStage({ spotlight, grid, localStream, screenStream, onPin, pinnedId }: {
  spotlight?: Participant; grid: Participant[]; localStream: MediaStream | null; screenStream: MediaStream | null; onPin: (id: string) => void; pinnedId: string | null
}) {
  const screenRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (screenRef.current && screenStream) screenRef.current.srcObject = screenStream
  }, [screenStream])

  if (screenStream) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex-1 rounded-xl overflow-hidden bg-black relative min-h-0">
          <video ref={screenRef} autoPlay playsInline className="h-full w-full object-contain" />
          <div className="absolute top-2 right-2 rounded-md bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-white flex items-center gap-1">
            <ScreenShare className="h-3 w-3" /> اشتراک صفحه
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
          {grid.map((p) => (
            <div key={p.socketId} className="w-40 shrink-0"><VideoTile p={p} onPin={onPin} /></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 auto-rows-fr content-start">
      {grid.map((p) => (
        <VideoTile key={p.socketId} p={p} onPin={onPin} />
      ))}
      {grid.length === 0 && spotlight && (
        <div className="col-span-full h-full"><VideoTile p={spotlight} large onPin={onPin} /></div>
      )}
    </div>
  )
}

function ChatBubble({ m, isMe }: { m: ChatMessage; isMe: boolean }) {
  if (m.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-0.5">{m.content}</span>
      </div>
    )
  }
  return (
    <div className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary/15 text-primary text-xs">{m.avatar || m.name[0]}</AvatarFallback>
      </Avatar>
      <div className={cn('flex-1 min-w-0', isMe && 'text-left')}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {!isMe && <span className="font-medium text-foreground">{m.name}</span>}
          {m.private && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">خصوصی</Badge>}
        </div>
        <div className={cn('inline-block rounded-lg px-2.5 py-1.5 text-sm break-words max-w-[90%]',
          isMe ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          {m.content}
        </div>
      </div>
    </div>
  )
}

function ParticipantRow({ p, isTeacher, onForceMute, onKick, onPin, onGrant, onRevoke, onPrivateChat, privateUnread }: {
  p: Participant; isTeacher: boolean; onForceMute: (id: string) => void; onKick: (id: string) => void; onPin: (id: string) => void;
  onGrant: (id: string, perm: Permission) => void; onRevoke: (id: string, perm: Permission) => void;
  onPrivateChat: (id: string) => void; privateUnread: number
}) {
  const RoleIcon = p.role === 'TEACHER' ? Crown : p.role === 'ADMIN' ? ShieldCheck : null
  const isStaffMember = p.role === 'TEACHER' || p.role === 'ADMIN'
  const [expanded, setExpanded] = useState(false)

  const perms: { key: Permission; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'mic', label: 'میکروفون', icon: Mic },
    { key: 'cam', label: 'وب‌کم', icon: Video },
    { key: 'screen', label: 'اشتراک صفحه', icon: ScreenShare },
    { key: 'whiteboard', label: 'وایت‌برد', icon: PenLine },
  ]

  return (
    <div className="rounded-lg border border-border/40 bg-card/40">
      <div className="flex items-center gap-2 p-2 hover:bg-accent/50 transition">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs">{p.avatar}</AvatarFallback>
          </Avatar>
          {p.isSpeaking && <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />}
          {privateUnread > 0 && (
            <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">{privateUnread}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium truncate">
            {RoleIcon && <RoleIcon className="h-3 w-3 text-amber-500" />}
            <span className="truncate">{p.name}{p.isLocal && ' (شما)'}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            {p.handRaised && <span className="text-amber-500 flex items-center gap-0.5"><Hand className="h-3 w-3" /> دست بلند</span>}
            {!p.micOn && <span className="text-rose-500">بی‌صدا</span>}
            {!p.camOn && p.micOn && <span>ویدیو خاموش</span>}
            {!isStaffMember && !p.allowMic && !p.allowCam && <span className="text-amber-500">محدود</span>}
          </div>
        </div>
        {/* Private message button — show for staff members (others can DM them) */}
        {!p.isLocal && isStaffMember && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPrivateChat(p.socketId)}>
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>پیام خصوصی</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {isTeacher && !p.isLocal && !isStaffMember && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'بستن' : 'دسترسی'}
          </Button>
        )}
      </div>
      {expanded && isTeacher && !p.isLocal && !isStaffMember && (
        <div className="px-2 pb-2 pt-1 border-t border-border/40 space-y-1.5">
          {perms.map((perm) => {
            const granted = (p as any)[`allow${perm.key.charAt(0).toUpperCase() + perm.key.slice(1)}`]
            return (
              <div key={perm.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs">
                  <perm.icon className="h-3.5 w-3.5" /> {perm.label}
                </span>
                <Switch
                  checked={!!granted}
                  onCheckedChange={(v) => v ? onGrant(p.socketId, perm.key) : onRevoke(p.socketId, perm.key)}
                />
              </div>
            )
          })}
          <div className="flex gap-1.5 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => onForceMute(p.socketId)}>
              <MicOff className="h-3 w-3" /> قطع صدا
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs flex-1 text-destructive gap-1" onClick={() => onKick(p.socketId)}>
              <LogOut className="h-3 w-3" /> اخراج
            </Button>
          </div>
        </div>
      )}
      {isTeacher && !p.isLocal && isStaffMember && (
        <div className="px-2 pb-1.5 pt-0.5 flex gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onPin(p.socketId)}>سنجاق</Button>
        </div>
      )}
    </div>
  )
}

// ---- Private chat helpers ----

function PrivateChatHeader({ participant, onBack }: { participant?: Participant; onBack: () => void }) {
  if (!participant) {
    return (
      <div className="p-2 border-b border-border/60 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onBack}>بازگشت</Button>
        <span className="text-xs text-muted-foreground">کاربر قطع شده است</span>
      </div>
    )
  }
  const RoleIcon = participant.role === 'TEACHER' ? Crown : participant.role === 'ADMIN' ? ShieldCheck : null
  return (
    <div className="p-2 border-b border-border/60 flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onBack}>
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت
      </Button>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/15 text-primary text-xs">{participant.avatar}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {RoleIcon && <RoleIcon className="h-3 w-3 text-amber-500" />}
        <span className="text-sm font-medium truncate">{participant.name}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{participant.role === 'ADMIN' ? 'مدیر' : 'استاد'}</Badge>
      </div>
    </div>
  )
}

function PrivateChatList({ participants, privateChats, privateUnread, onOpen }: {
  participants: Participant[]
  privateChats: Record<string, ChatMessage[]>
  privateUnread: Record<string, number>
  onOpen: (id: string) => void
}) {
  // Show staff members + anyone we already have a private chat with
  const staffIds = new Set(participants.filter((p) => p.role === 'TEACHER' || p.role === 'ADMIN').map((p) => p.socketId))
  const chatIds = new Set(Object.keys(privateChats))
  const allIds = new Set([...staffIds, ...chatIds])
  const list = participants.filter((p) => allIds.has(p.socketId) && !p.isLocal)

  if (list.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">هنوز گفتگوی خصوصی نیست.</p>
        <p className="text-xs text-muted-foreground mt-1">از تب «افراد» روی آیکون پیام یک استاد/مدیر کلیک کنید.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full scroll-thin">
      <div className="space-y-1 p-1">
        {list.map((p) => {
          const RoleIcon = p.role === 'TEACHER' ? Crown : p.role === 'ADMIN' ? ShieldCheck : null
          const msgs = privateChats[p.socketId] || []
          const last = msgs[msgs.length - 1]
          const unread = privateUnread[p.socketId] || 0
          return (
            <button
              key={p.socketId}
              onClick={() => onOpen(p.socketId)}
              className="w-full text-right rounded-lg p-2 hover:bg-accent/50 transition flex items-center gap-2.5"
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-sm">{p.avatar}</AvatarFallback>
                </Avatar>
                {unread > 0 && (
                  <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">{unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {RoleIcon && <RoleIcon className="h-3 w-3 text-amber-500" />}
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{p.role === 'ADMIN' ? 'مدیر' : 'استاد'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {last ? (last.userId === last.name.replace(' (شما)', '') ? '' : '') + last.content : 'گفتگو را شروع کنید'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function PrivateChatBubble({ m, isMe }: { m: ChatMessage; isMe: boolean }) {
  return (
    <div className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{m.avatar || m.name[0]}</AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[75%]', isMe && 'text-left')}>
        <div className={cn('inline-block rounded-2xl px-3 py-1.5 text-sm break-words',
          isMe ? 'bg-primary text-primary-foreground rounded-tl-sm' : 'bg-muted rounded-tr-sm')}>
          {m.content}
        </div>
      </div>
    </div>
  )
}
