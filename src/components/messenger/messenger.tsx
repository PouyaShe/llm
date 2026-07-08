'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { useDmSocket, type DMConversation, type DMMessage } from './use-dm-socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MessageSquare, Send, Plus, Lock, Unlock, Trash2, Search, X, Crown, ShieldCheck, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/ui'

export function Messenger() {
  const { user } = useApp()
  const userId = user!.id
  const dm = useDmSocket(userId)

  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [input, setInput] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dmUsers, setDmUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typingFrom, setTypingFrom] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<any>(null)

  const active = conversations.find((c) => c.id === activeId) || null

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/dm/conversations')
    if (res.ok) setConversations((await res.json()).conversations)
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/dm/conversations/${id}`)
    if (res.ok) {
      const d = await res.json()
      setMessages(d.messages)
      setActiveId(id)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    // poll fallback every 15s in case socket misses
    const i = setInterval(loadConversations, 15000)
    return () => clearInterval(i)
  }, [loadConversations])

  // socket receive
  useEffect(() => {
    dm.onReceive((m: DMMessage) => {
      // if it belongs to the active conversation, append
      if (m.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.find((p) => p.id === m.id)) return prev
          return [...prev, m]
        })
        // mark as read
        fetch(`/api/dm/conversations/${activeId}/messages`, { method: 'GET' }).catch(() => {})
      }
      // bump conversation list (last message + unread)
      loadConversations()
    })
    dm.onTyping(({ conversationId, name }) => {
      if (conversationId === activeId) {
        setTypingFrom(name)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTypingFrom(null), 3000)
      }
    })
    dm.onConvChanged(({ conversationId, action }) => {
      if (action === 'delete') {
        if (conversationId === activeId) {
          setActiveId(null)
          setMessages([])
          toast('گفتگو توسط طرف مقابل حذف شد')
        }
        loadConversations()
      } else {
        loadConversations()
        if (conversationId === activeId) {
          if (action === 'close') toast('گفتگو توسط طرف مقابل بسته شد')
          if (action === 'reopen') toast('گفتگو توسط طرف مقابل باز شد')
        }
      }
    })
  }, [dm, activeId, loadConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openNewDialog() {
    const res = await fetch('/api/dm/users')
    if (res.ok) setDmUsers((await res.json()).users)
    setNewOpen(true)
  }

  async function startConversation(otherId: string) {
    const res = await fetch('/api/dm/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: otherId }),
    })
    if (res.ok) {
      const { conversation } = await res.json()
      setNewOpen(false)
      await loadConversations()
      loadMessages(conversation.id)
    }
  }

  const onSend = useCallback(async () => {
    if (!input.trim() || !active) return
    if (active.closedAt) {
      toast.error('این گفتگو بسته شده است')
      return
    }
    const content = input.trim()
    setInput('')
    const res = await fetch(`/api/dm/conversations/${active.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const { message, toUserId } = await res.json()
      setMessages((prev) => [...prev, message])
      // deliver via socket in real-time
      dm.sendMessage(toUserId, message)
      loadConversations()
    } else {
      const d = await res.json()
      toast.error(d.error || 'خطا در ارسال')
      setInput(content)
    }
  }, [input, active, dm, loadConversations])

  const onTypingLocal = useCallback(() => {
    if (!active) return
    dm.sendTyping(active.other.id, active.id, user!.name)
  }, [active, dm, user])

  async function toggleClose(c: DMConversation) {
    const action = c.closedAt ? 'reopen' : 'close'
    const res = await fetch(`/api/dm/conversations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      dm.notifyConvChanged(c.other.id, c.id, action as any)
      loadConversations()
      toast.success(action === 'close' ? 'گفتگو بسته شد' : 'گفتگو باز شد')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    const c = conversations.find((x) => x.id === deleteId)
    const res = await fetch(`/api/dm/conversations/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      if (c) dm.notifyConvChanged(c.other.id, deleteId, 'delete')
      if (deleteId === activeId) {
        setActiveId(null)
        setMessages([])
      }
      setDeleteId(null)
      loadConversations()
      toast.success('گفتگو حذف شد')
    }
  }

  const filteredUsers = dmUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  const filteredConvs = conversations.filter((c) => c.other.name.toLowerCase().includes(search.toLowerCase()))

  const roleLabel = (r: string) => (r === 'ADMIN' ? 'مدیر' : r === 'TEACHER' ? 'استاد' : 'دانشجو')
  const RoleIcon = (r: string) => (r === 'ADMIN' ? ShieldCheck : r === 'TEACHER' ? Crown : null)

  return (
    <div className="animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            پیام‌رسان خصوصی
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            گفتگوی خصوصی بین مدیر و اساتید
            <span className={cn('mr-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded', dm.connected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
              <Circle className={cn('h-2 w-2', dm.connected ? 'fill-emerald-500' : 'fill-muted-foreground')} />
              {dm.connected ? 'متصل' : 'غیرفعال'}
            </span>
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus className="h-4 w-4" /> گفتگوی جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-16rem)] min-h-[500px]">
        {/* Conversation list */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 h-9" />
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0 scroll-thin">
            <div className="p-1.5 space-y-1">
              {filteredConvs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">هنوز گفتگویی نیست.<br />«گفتگوی جدید» را بزنید.</p>
              )}
              {filteredConvs.map((c) => {
                const RI = RoleIcon(c.other.role)
                return (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c.id)}
                    className={cn(
                      'w-full text-right rounded-lg p-2.5 transition flex items-start gap-2.5',
                      activeId === c.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/50',
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">{c.other.avatar || c.other.name[0]}</AvatarFallback>
                      </Avatar>
                      {(c.unread || 0) > 0 && (
                        <span className="absolute -top-1 -left-1 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">{c.unread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {RI && <RI className="h-3 w-3 text-amber-500 shrink-0" />}
                        <span className="text-sm font-medium truncate">{c.other.name}</span>
                        {c.closedAt && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.lastMessage ? (c.lastMessage.senderId === userId ? 'شما: ' : '') + c.lastMessage.content : 'گفتگو شروع شد'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : timeAgo(c.createdAt)}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{roleLabel(c.other.role)}</Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat view */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-center p-8">
              <div>
                <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">یک گفتگو را انتخاب کنید یا گفتگوی جدید شروع کنید</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border/60 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">{active.other.avatar || active.other.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {(() => { const RI = RoleIcon(active.other.role); return RI ? <RI className="h-3.5 w-3.5 text-amber-500" /> : null })()}
                    <span className="font-medium text-sm truncate">{active.other.name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{roleLabel(active.other.role)}</Badge>
                    {active.closedAt && <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 text-amber-500 border-amber-500/40"><Lock className="h-2.5 w-2.5" /> بسته</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{active.other.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleClose(active)}>
                          {active.closedAt ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{active.closedAt ? 'باز کردن گفتگو' : 'بستن گفتگو'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(active.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>حذف گفتگو</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 scroll-thin">
                <div className="p-4 space-y-3">
                  {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">پیامی نیست. اولین پیام را بفرستید.</p>}
                  {messages.map((m) => {
                    const mine = m.senderId === userId
                    return (
                      <div key={m.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : '')}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs">{m.senderAvatar || m.senderName[0]}</AvatarFallback>
                        </Avatar>
                        <div className={cn('max-w-[75%]', mine ? 'text-left' : '')}>
                          {!mine && <div className="text-xs text-muted-foreground mb-0.5">{m.senderName}</div>}
                          <div className={cn('inline-block rounded-2xl px-3 py-2 text-sm break-words', mine ? 'bg-primary text-primary-foreground rounded-tl-sm' : 'bg-muted rounded-tr-sm')}>
                            {m.content}
                          </div>
                          <div className={cn('text-[10px] text-muted-foreground mt-0.5', mine ? 'text-left' : 'text-right')}>{timeAgo(m.createdAt)}</div>
                        </div>
                      </div>
                    )
                  })}
                  {typingFrom && (
                    <div className="flex gap-2">
                      <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-primary/15 text-primary text-xs">{active.other.avatar || active.other.name[0]}</AvatarFallback></Avatar>
                      <div className="bg-muted rounded-2xl rounded-tr-sm px-3 py-2.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border/60">
                {active.closedAt ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 py-2">
                    <Lock className="h-4 w-4" /> این گفتگو بسته شده است
                    <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => toggleClose(active)}>
                      <Unlock className="h-3.5 w-3.5" /> باز کردن
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => { setInput(e.target.value); onTypingLocal() }}
                      onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
                      placeholder="پیام بنویسید…"
                      className="h-10"
                    />
                    <Button size="icon" className="h-10 w-10 shrink-0" onClick={onSend} disabled={!input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* New conversation dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>شروع گفتگوی جدید</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="جستجوی کاربر..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <ScrollArea className="max-h-80 scroll-thin -mx-2 px-2">
            <div className="space-y-1">
              {filteredUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">کاربری یافت نشد.</p>}
              {filteredUsers.map((u) => {
                const RI = RoleIcon(u.role)
                return (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-accent/50 transition text-right"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-primary text-sm">{u.avatar || u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {RI && <RI className="h-3 w-3 text-amber-500" />}
                        <span className="text-sm font-medium truncate">{u.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{roleLabel(u.role)}</Badge>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف گفتگو</AlertDialogTitle>
            <AlertDialogDescription>آیا مطمئنید؟ تمام پیام‌ها برای هر دو طرف حذف می‌شوند. این عمل قابل بازگشت نیست.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لغو</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-border/60 bg-card overflow-hidden', className)}>{children}</div>
}
