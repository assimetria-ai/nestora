import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  User,
  Home,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: number
  property_id: number
  guest_id: number
  host_id: number
  booking_id: number | null
  last_message_at: string
  property_title: string | null
  property_images: string | null
  guest_name: string
  guest_email: string
  host_name: string
  host_email: string
  last_message: string | null
  unread_count: number
}

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  body: string
  read_at: string | null
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(d: string): string {
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isSelected,
  onClick,
  currentUserId,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
  currentUserId: number
}) {
  const isHost = conv.host_id === currentUserId
  const otherName = isHost ? conv.guest_name : conv.host_name

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/40 transition-colors border-b border-border last:border-0 ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{otherName}</p>
          <span className="text-xs text-muted-foreground shrink-0">{fmtTime(conv.last_message_at)}</span>
        </div>
        {conv.property_title && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Home className="h-3 w-3 shrink-0" />
            <span className="truncate">{conv.property_title}</span>
          </p>
        )}
        {conv.last_message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
        )}
      </div>
      {conv.unread_count > 0 && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
          {conv.unread_count > 9 ? '9+' : conv.unread_count}
        </span>
      )}
    </button>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        }`}
      >
        {!isMine && (
          <p className="text-xs font-medium opacity-70 mb-1">{msg.sender_name}</p>
        )}
        <p className="leading-relaxed break-words">{msg.body}</p>
        <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'} text-right`}>
          {fmtTime(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/messages/conversations')
      setConversations(res.conversations)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (convId: number) => {
    setLoadingMessages(true)
    try {
      const res = await api.get<{ conversation: Conversation; messages: Message[] }>(
        `/messages/conversations/${convId}`
      )
      setMessages(res.messages)
      // Refresh unread counts
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, unread_count: 0 } : c))
      )
    } catch {
      // silently fail
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    // Get current user id from auth token stored by api lib
    api.get<{ user: { id: number } }>('/auth/me').then(res => {
      setCurrentUserId(res.user?.id ?? 0)
    }).catch(() => {})
  }, [fetchConversations])

  useEffect(() => {
    if (selectedConv) fetchMessages(selectedConv.id)
  }, [selectedConv, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv)
    setReplyBody('')
  }

  const handleSend = async () => {
    if (!selectedConv || !replyBody.trim() || sending) return
    setSending(true)
    try {
      await api.post(`/messages/conversations/${selectedConv.id}/reply`, { body: replyBody.trim() })
      setReplyBody('')
      await fetchMessages(selectedConv.id)
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConv.id
            ? { ...c, last_message: replyBody.trim(), last_message_at: new Date().toISOString() }
            : c
        )
      )
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <PageLayout>
      <Header />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chat with guests and hosts about your properties.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex h-full">
            {/* Sidebar: conversation list */}
            <div
              className={`flex-shrink-0 border-r border-border overflow-y-auto ${
                selectedConv ? 'hidden sm:block' : 'block'
              }`}
              style={{ width: '320px' }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4 text-center">
                  <MessageSquare className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1">Messages from guests will appear here</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isSelected={selectedConv?.id === conv.id}
                    onClick={() => handleSelectConv(conv)}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>

            {/* Message thread */}
            <div className="flex-1 flex flex-col min-w-0">
              {!selectedConv ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
                  <p className="text-sm">Select a conversation to start chatting</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="sm:hidden p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedConv.host_id === currentUserId
                          ? selectedConv.guest_name
                          : selectedConv.host_name}
                      </p>
                      {selectedConv.property_title && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {selectedConv.property_title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                        <p>No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isMine={msg.sender_id === currentUserId}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply input */}
                  <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
                    <textarea
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Enter to send)"
                      rows={1}
                      className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      style={{ maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!replyBody.trim() || sending}
                      className="flex-shrink-0 p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageLayout>
  )
}
