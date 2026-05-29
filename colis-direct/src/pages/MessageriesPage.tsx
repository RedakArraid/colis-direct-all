import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Plus, X, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface MessageriesPageProps {
  onNavigate: (page: string) => void;
}

type ConversationStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';
type ConversationSender = 'client' | 'support' | 'system';

interface ConversationSummary {
  id: string;
  subject: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  last_response_at?: string | null;
  unread: boolean;
  support_ticket_id?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  last_message_from?: ConversationSender;
}

interface ConversationMessage {
  id: string;
  sender: ConversationSender;
  body: string;
  created_at: string;
  attachments?: any[];
}

interface ConversationDetail extends ConversationSummary {
  conversation: ConversationMessage[];
  channel?: string;
}

const sortConversations = (entries: ConversationSummary[]) =>
  [...entries].sort((a, b) => {
    const parse = (value?: string | null) => (value ? new Date(value).getTime() : 0);
    const aTime = parse(a.last_message_at) || parse(a.updated_at) || parse(a.created_at);
    const bTime = parse(b.last_message_at) || parse(b.updated_at) || parse(b.created_at);
    return bTime - aTime;
  });

function MessageriesPage({ onNavigate: _onNavigate }: MessageriesPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState({ subject: '', message: '' });
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length,
    [conversations]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('customer-messages-unread', { detail: unreadCount })
      );
    }
  }, [unreadCount]);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [activeConversation?.conversation.length]);

  useEffect(() => {
    setReplyText('');
    setReplyError(null);
  }, [activeConversation?.id]);

  const loadConversations = async (
    options: { selectId?: string; refreshDetail?: boolean; silent?: boolean } = {}
  ) => {
    const { silent } = options;
    if (!silent) {
      setListLoading(true);
      setListError(null);
    }

    try {
      const { data, error } = await api.getCustomerMessages();
      if (error) throw new Error(error);
      const items: ConversationSummary[] = Array.isArray(data) ? data : [];
      setConversations(sortConversations(items));

      if (items.length === 0) {
        setActiveConversation(null);
        setSelectedId(null);
        return;
      }

      const targetId =
        options.selectId ||
        selectedId ||
        items.find((item) => item.unread)?.id ||
        items[0]?.id ||
        null;

      if (!targetId) {
        return;
      }

      if (options.selectId || !selectedId || options.refreshDetail) {
        await openConversation(targetId);
      }
    } catch (err: any) {
      setListError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      if (!silent) {
        setListLoading(false);
      }
    }
  };

  const openConversation = async (id: string) => {
    try {
      setSelectedId(id);
      setDetailLoading(true);
      setDetailError(null);
      const { data, error } = await api.getCustomerMessage(id);
      if (error) throw new Error(error);
      const detail: ConversationDetail = data as ConversationDetail;
      setActiveConversation(detail);
      setDetailLoading(false);

      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== id) return conversation;
          const lastMessage = detail.conversation?.[detail.conversation.length - 1];
          return {
            ...conversation,
            unread: false,
            status: detail.status,
            last_response_at: detail.last_response_at,
            last_message_at: lastMessage?.created_at || conversation.last_message_at,
            last_message_preview: lastMessage?.body || conversation.last_message_preview,
            last_message_from: lastMessage?.sender || conversation.last_message_from,
          };
        })
      );
    } catch (err: any) {
      setDetailError(err.message || 'Impossible de charger la conversation');
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormError(null);
    setReplyError(null);

    try {
      if (!newMessage.subject.trim() || !newMessage.message.trim()) {
        throw new Error('Le sujet et le message sont requis');
      }

      const { data, error } = await api.createCustomerMessage({
        subject: newMessage.subject.trim(),
        message: newMessage.message.trim(),
      });

      if (error) throw new Error(error);

      setNewMessage({ subject: '', message: '' });
      setShowNewMessageForm(false);

      const created = data as ConversationSummary;
      await loadConversations({ selectId: created.id });
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!activeConversation) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError('Votre message est vide');
      return;
    }

    setSendingReply(true);
    setReplyError(null);

    try {
      const { data, error } = await api.replyToCustomerMessage(activeConversation.id, {
        message: trimmed,
      });
      if (error) throw new Error(error);

      const updatedDetail = data as ConversationDetail;
      setActiveConversation(updatedDetail);
      setSelectedId(updatedDetail.id);
      setReplyText('');

      const lastMessage =
        updatedDetail.conversation[updatedDetail.conversation.length - 1] ?? null;

      setConversations((prev) =>
        sortConversations([
          {
            id: updatedDetail.id,
            subject: updatedDetail.subject,
            status: updatedDetail.status,
            created_at: updatedDetail.created_at,
            updated_at: updatedDetail.updated_at,
            last_response_at: updatedDetail.last_response_at,
            unread: false,
            support_ticket_id: updatedDetail.support_ticket_id,
            last_message_at:
              lastMessage?.created_at ||
              updatedDetail.last_message_at ||
              updatedDetail.updated_at,
            last_message_preview:
              lastMessage?.body || updatedDetail.last_message_preview || '',
            last_message_from:
              lastMessage?.sender || updatedDetail.last_message_from || 'client',
          },
          ...prev.filter((conversation) => conversation.id !== updatedDetail.id),
        ])
      );
    } catch (err: any) {
      setReplyError(err.message || 'Impossible d\'envoyer la réponse');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReplyKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!sendingReply) {
        handleReplySubmit();
      }
    }
  };

  const getStatusBadge = (status: ConversationStatus) => {
    const statusConfig: Record<
      ConversationStatus,
      { label: string; icon: typeof Clock; color: string }
    > = {
      pending: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'En cours', icon: Loader, color: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Résolu', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      closed: { label: 'Fermé', icon: X, color: 'bg-[#F6F7F9] text-[#3A3A3A]' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1A1A] mb-1">Messageries</h1>
            <p className="text-[#6B7280]">Consultez vos échanges avec le support COLISDIRECT</p>
          </div>
          {!showNewMessageForm && (
            <button
              onClick={() => setShowNewMessageForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#E66100] transition-colors self-start sm:self-auto"
            >
              <Plus className="w-5 h-5" />
              Nouveau message
            </button>
          )}
        </div>

            {listError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{listError}</span>
              </div>
            )}

            {showNewMessageForm && (
              <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Nouveau message</h2>
                  <button
                    onClick={() => {
                      setShowNewMessageForm(false);
                      setNewMessage({ subject: '', message: '' });
                      setFormError(null);
                    }}
                    className="p-1 text-[#9CA3AF] hover:text-[#3A3A3A]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Sujet *</label>
                    <input
                      type="text"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                      placeholder="Ex: Problème avec mon colis"
                      required
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A3A3A] mb-2">Message *</label>
                    <textarea
                      value={newMessage.message}
                      onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00]"
                      placeholder="Décrivez votre situation..."
                      required
                      maxLength={2000}
                    />
                    <p className="text-xs text-[#6B7280] mt-1">{newMessage.message.length}/2000 caractères</p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMessageForm(false);
                        setNewMessage({ subject: '', message: '' });
                        setFormError(null);
                      }}
                      className="px-4 py-2 border border-[#E6E6E6] text-[#3A3A3A] rounded-lg hover:bg-[#F6F7F9] transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={sending || !newMessage.subject.trim() || !newMessage.message.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#E66100] transition-colors self-start sm:self-auto"
                    >
                      {sending ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
              <div className={`lg:w-80 flex-shrink-0 ${activeConversation ? 'hidden lg:block' : 'block'}`}>
                <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#F0F0F0] h-full">
                  <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#3A3A3A]">Mes conversations</span>
                    {listLoading && <Loader className="w-4 h-4 animate-spin text-orange-600" />}
                  </div>
                  {listLoading ? (
                    <div className="p-6 text-center text-sm text-[#6B7280]">
                      Chargement des conversations...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#6B7280]">
                      Aucune conversation pour le moment.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#F0F0F0] max-h-[520px] overflow-y-auto">
                      {conversations.map((conversation) => {
                        const isActive = selectedId === conversation.id;
                        return (
                          <li key={conversation.id}>
                            <button
                              onClick={() => openConversation(conversation.id)}
                              className={`w-full text-left px-4 py-3 transition-colors ${
                                isActive ? 'bg-orange-50' : 'hover:bg-[#F6F7F9]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-bold text-[#1A1A1A] line-clamp-1">
                                  {conversation.subject}
                                </span>
                                <span className="text-xs text-[#6B7280]">
                                  {conversation.last_message_at ? formatDate(conversation.last_message_at) : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(conversation.status)}
                                {conversation.unread && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Nouveau
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#6B7280] line-clamp-2">
                                {conversation.last_message_preview || '—'}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className={`flex-1 ${!activeConversation ? 'hidden lg:block' : 'block'}`}>
                <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#F0F0F0] h-full flex flex-col">
                  {detailLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#6B7280]">
                      <Loader className="w-6 h-6 animate-spin text-orange-600" />
                      <p className="text-sm">Ouverture de la conversation...</p>
                    </div>
                  ) : !activeConversation ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#6B7280]">
                      <MessageSquare className="w-10 h-10" />
                      <p className="text-sm text-center text-[#6B7280] px-6">
                        Sélectionnez une conversation pour afficher les échanges avec notre équipe support.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 sm:px-6 py-3 sm:py-5 border-b border-[#F0F0F0]">
                        <button
                          onClick={() => setActiveConversation(null)}
                          className="lg:hidden flex items-center gap-2 text-sm text-[#6B7280] mb-3 hover:text-[#1A1A1A]"
                        >
                          ← Retour aux conversations
                        </button>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-bold text-[#1A1A1A]">{activeConversation.subject}</h2>
                            <p className="text-xs text-[#6B7280] mt-1">
                              Ouverte le {formatDate(activeConversation.created_at)} · Canal :{' '}
                              {activeConversation.channel === 'email'
                                ? 'Email'
                                : activeConversation.channel === 'chatbot'
                                ? 'Chatbot'
                                : 'Formulaire client'}
                            </p>
                          </div>
                          {getStatusBadge(activeConversation.status)}
                        </div>
                      </div>

                      {detailError && (
                        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {detailError}
                        </div>
                      )}

                      <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#F6F7F9]"
                      >
                        {activeConversation.conversation.map((message) => {
                          const isSupport = message.sender === 'support';
                          const isSystem = message.sender === 'system';
                          const bubbleClasses = isSystem
                            ? 'mx-auto bg-white border border-dashed border-[#E6E6E6] text-[#6B7280]'
                            : isSupport
                            ? 'ml-auto bg-orange-600 text-white'
                            : 'mr-auto bg-white border border-[#E6E6E6] text-[#1A1A1A]';

                          const senderLabel = isSystem
                            ? 'Système'
                            : isSupport
                            ? 'Support COLISDIRECT'
                            : user?.first_name
                            ? `${user.first_name} ${user.last_name ?? ''}`.trim()
                            : 'Vous';

                          return (
                            <div key={message.id} className="flex flex-col gap-2">
                              <div className={`flex ${isSupport ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}>
                                <div className={`max-w-full sm:max-w-3xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}>
                                  <div className="text-xs uppercase tracking-wide font-semibold mb-1 opacity-70">
                                    {senderLabel}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                                  {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                                    <div className="mt-3 space-y-2 text-xs">
                                      {message.attachments.map((attachment: any, idx: number) => {
                                        const href =
                                          attachment.url ||
                                          attachment.dataUrl ||
                                          (attachment.base64
                                            ? `data:${attachment.type || 'application/octet-stream'};base64,${attachment.base64}`
                                            : null);
                                        if (!href) return null;
                                        const label = attachment.name || `Pièce jointe ${idx + 1}`;
                                        return (
                                          <a
                                            key={attachment.id || `${href}-${idx}`}
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={attachment.name || undefined}
                                            className={isSupport ? 'text-white underline' : 'text-orange-600 underline'}
                                          >
                                            📎 {label}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-[#9CA3AF] text-center">
                                {formatDate(message.created_at)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-[#F0F0F0] px-6 py-5 bg-white">
                        <div className="space-y-3">
                          {replyError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {replyError}
                            </div>
                          )}
                          <textarea
                            value={replyText}
                            onChange={(e) => {
                              setReplyText(e.target.value);
                              if (replyError) setReplyError(null);
                            }}
                            onKeyDown={handleReplyKeyDown}
                            rows={4}
                            placeholder="Écrire votre réponse au support..."
                            className="w-full px-3 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-[#FF6C00] text-sm"
                          />
                          <div className="flex items-center justify-between text-xs text-[#6B7280]">
                            <span>
                              Astuce : <strong>Ctrl + Entrée</strong> pour envoyer rapidement.
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleReplySubmit}
                                disabled={sendingReply || !replyText.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#E66100] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {sendingReply ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Envoi...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Envoyer ma réponse
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}

export default MessageriesPage;

