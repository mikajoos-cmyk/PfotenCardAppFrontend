import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatConversation, User, View, Level } from '../types';
import { MOCK_CONVERSATIONS_CUSTOMER, MOCK_MESSAGES_CUSTOMER, MOCK_CONVERSATIONS_ADMIN, MOCK_MESSAGES_ADMIN } from '../lib/mockData';
import Icon from '../components/ui/Icon';
import { getInitials, getAvatarColorClass, getLevelColor } from '../lib/utils';
import InfoModal from '../components/modals/InfoModal';
import { useChat } from '../hooks/queries/useChat';
import { useChatMessages } from '../hooks/queries/useChatMessages';

interface ChatPageProps {
    user: User | any;
    token: string | null;
    setView: (view: View) => void;
    isPreviewMode?: boolean;
    initialChatPartnerId?: string;
    levels?: Level[];
}

export const ChatPage: React.FC<ChatPageProps> = ({ user, token, setView, isPreviewMode, initialChatPartnerId, levels }) => {
    const queryClient = useQueryClient();
    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    const { data: conversationsData } = useChat(token);
    const conversations = conversationsData || (isPreviewMode ? (isAdminOrStaff ? MOCK_CONVERSATIONS_ADMIN : MOCK_CONVERSATIONS_CUSTOMER) : []);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messagesState, setMessagesState] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    const { data: hookMessages } = useChatMessages(selectedUser ? (selectedUser.auth_id || selectedUser.id) : null, token);
    const messages = isPreviewMode ? (selectedUser ? (isAdminOrStaff ? MOCK_MESSAGES_ADMIN[selectedUser.id] : MOCK_MESSAGES_CUSTOMER[selectedUser.id]) : []) : (hookMessages || messagesState);

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [selectableUsers, setSelectableUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [conversationSearchTerm, setConversationSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 992);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (initialChatPartnerId && conversations.length > 0 && !selectedUser) {
            const partner = conversations.find(c => c.user.auth_id === initialChatPartnerId || String(c.user.id) === initialChatPartnerId);
            if (partner) {
                setSelectedUser(partner.user);
                setIsMobileListVisible(false);
            }
        }
    }, [initialChatPartnerId, conversations, selectedUser]);

    // Auto-Resize Textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [newMessage]);

    useEffect(() => {
        if (isPreviewMode) {
            setSelectedUser(null);
            setMessagesState([]);
        }
    }, [isAdminOrStaff, isPreviewMode]);

    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender_id === Number(selectedUser.id)) {
                apiClient.markChatRead(selectedUser.auth_id || selectedUser.id, token).catch(console.error);
                queryClient.invalidateQueries({ queryKey: ['chat'] });
            }
        }
    }, [messages, selectedUser, token, queryClient]);

    useEffect(() => {
        if (selectedUser) setIsMobileListVisible(false);
        else setIsMobileListVisible(true);
    }, [selectedUser]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior })), 100);
    };

    useEffect(() => scrollToBottom(), [messages.length, selectedUser]);

    const handleSelectUser = (chatPartner: User) => {
        if (selectedUser?.id === chatPartner.id) return;
        setSelectedUser(chatPartner);
        setMessagesState([]);
        const partnerId = chatPartner.auth_id || chatPartner.id;
        loadMessages(partnerId);
        apiClient.markChatRead(partnerId, token).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['chat'] });
    };

    const handleOpenNewChatModal = async () => {
        setLoadingUsers(true);
        setIsNewChatModalOpen(true);
        setSearchTerm('');
        try {
            let usersToSelect: User[] = [];
            if (isAdminOrStaff) {
                const allUsers = await apiClient.getUsers(token);
                usersToSelect = allUsers.filter((u: User) => u.role === 'customer' || u.role === 'kunde');
            } else {
                usersToSelect = await apiClient.get('/api/users/staff', token);
            }
            usersToSelect = usersToSelect.filter((u: User) => u.id !== user.id);
            setSelectableUsers(usersToSelect);
        } catch (e) {
            if (!isAdminOrStaff) alert("Konnte Ansprechpartner nicht laden.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const startNewChat = (partner: User) => {
        handleSelectUser(partner);
        setIsNewChatModalOpen(false);
    };

    const loadMessages = async (partnerIdentifier: string | number) => {
        if (!partnerIdentifier) return;
        if (isPreviewMode) {
            const mockSet = isAdminOrStaff ? MOCK_MESSAGES_ADMIN : MOCK_MESSAGES_CUSTOMER;
            setMessagesState(mockSet[partnerIdentifier] || []);
            return;
        }
        try {
            const data = await apiClient.getChatMessages(partnerIdentifier, token);
            setMessagesState(prev => {
                if (prev.length !== data.length || (data.length > 0 && prev.length > 0 && (data[data.length - 1].id !== prev[prev.length - 1].id || data[data.length - 1].is_read !== prev[prev.length - 1].is_read))) {
                    return data;
                }
                return prev;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            window.open(url, '_blank');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedUser) return;
        const file = e.target.files[0];
        let fileType = 'document';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type === 'application/pdf') fileType = 'pdf';

        const fileName = file.name;
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;

        setIsUploading(true);
        try {
            const { error: uploadError } = await supabase.storage.from('chat-uploads').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('chat-uploads').getPublicUrl(filePath);

            await apiClient.sendChatMessage({
                content: fileType === 'image' ? 'Bild gesendet' : 'Dokument gesendet',
                receiver_id: Number(selectedUser.id),
                file_url: publicUrl,
                file_type: fileType,
                file_name: fileName
            }, token);

            loadMessages(selectedUser.auth_id || selectedUser.id);
            queryClient.invalidateQueries({ queryKey: ['chat'] });
        } catch (error: any) {
            alert(`Fehler beim Hochladen: ${error.message || 'Unbekannter Fehler'}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !isUploading) return; // Prevent empty submit
        const msgContent = newMessage;
        setNewMessage('');

        const tempMsg: ChatMessage = {
            id: Date.now(),
            tenant_id: user.tenant_id ? Number(user.tenant_id) : 0,
            sender_id: Number(user.id),
            receiver_id: Number(selectedUser!.id),
            content: msgContent,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessagesState(prev => [...prev, tempMsg]);

        try {
            if (!isPreviewMode) {
                await apiClient.sendChatMessage({ content: msgContent, receiver_id: Number(selectedUser!.id) }, token);
                loadMessages(selectedUser!.auth_id || selectedUser!.id);
                queryClient.invalidateQueries({ queryKey: ['chat'] });
            }
        } catch (e) {
            alert("Senden fehlgeschlagen");
            setMessagesState(prev => prev.filter(m => m.id !== tempMsg.id));
            setNewMessage(msgContent);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    };

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Heute";
        if (isYesterday) return "Gestern";
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const groupedMessages = useMemo(() => {
        const groups: { dateStr: string; msgs: ChatMessage[] }[] = [];
        messages.forEach(msg => {
            const dateStr = new Date(msg.created_at).toDateString();
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.dateStr === dateStr) lastGroup.msgs.push(msg);
            else groups.push({ dateStr, msgs: [msg] });
        });
        return groups;
    }, [messages]);

    const filteredConversations = useMemo(() => {
        if (!conversationSearchTerm.trim()) return conversations;
        return conversations.filter(conv => conv.user.name.toLowerCase().includes(conversationSearchTerm.toLowerCase()));
    }, [conversations, conversationSearchTerm]);

    // Restore original file rendering logic
    const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
        if (msg.file_url) {
            const fileName = msg.file_name || 'Datei';
            if (msg.file_type === 'image') {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div
                            style={{ borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer', maxWidth: '250px', backgroundColor: 'rgba(0,0,0,0.1)' }}
                            onClick={() => setPreviewFile({ url: msg.file_url!, type: 'image', name: fileName })}
                        >
                            <img src={msg.file_url} alt={fileName} onLoad={() => scrollToBottom('smooth')} style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
                        </div>
                        {msg.content !== 'Bild gesendet' && <div>{msg.content}</div>}
                    </div>
                );
            } else {
                const textColor = isMe ? 'white' : 'var(--text-primary)';
                const iconColor = isMe ? 'rgba(255,255,255,0.9)' : 'var(--primary-color)';

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '280px', padding: '2px 0' }}>
                            <div style={{ color: iconColor, cursor: 'pointer', flexShrink: 0, display: 'flex' }} onClick={() => setPreviewFile({ url: msg.file_url!, type: msg.file_type || 'document', name: fileName })}>
                                <Icon name={msg.file_type === 'pdf' ? 'file-text' : 'file'} style={{ width: '24px', height: '24px' }} />
                            </div>
                            <span
                                style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', color: textColor }}
                                onClick={() => setPreviewFile({ url: msg.file_url!, type: msg.file_type || 'document', name: fileName })}
                                title={fileName}
                            >
                                {fileName}
                            </span>
                            <button onClick={(e) => handleDownload(e, msg.file_url!, fileName)} className="action-icon-btn" style={{ padding: '6px', color: iconColor }}>
                                <Icon name="download" size={20} />
                            </button>
                        </div>
                        {msg.content !== 'Dokument gesendet' && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.9 }}>{msg.content}</div>}
                    </div>
                );
            }
        }
        return <div style={{ lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>;
    };

    const filteredUsers = selectableUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--background-color)' }}>
            <div className="content-box" style={{ flex: 1, display: 'flex', padding: 0, overflow: 'hidden', border: isDesktop ? '1px solid var(--border-color)' : 'none', borderRadius: isDesktop ? '1rem' : '0', zIndex: 1, minHeight: 0 }}>

                {/* --- CHAT LISTE --- */}
                <div style={{ width: isDesktop ? '320px' : '100%', display: (isDesktop || isMobileListVisible) ? 'flex' : 'none', flexDirection: 'column', backgroundColor: 'var(--card-background)', borderRight: isDesktop ? '1px solid var(--border-color)' : 'none', minHeight: 0 }}>
                    <div style={{ padding: '0 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.25rem' }}>Chats</span>
                        <button className="button button-primary" style={{ padding: '0.5rem', borderRadius: '50%', minWidth: 'auto' }} onClick={handleOpenNewChatModal}>
                            <Icon name="plus" size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ position: 'relative' }}>
                            <Icon name="search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-light)', pointerEvents: 'none' }} />
                            <input type="text" className="form-input" placeholder="Suchen..." value={conversationSearchTerm} onChange={e => setConversationSearchTerm(e.target.value)} style={{ paddingLeft: '34px', borderRadius: '20px' }} />
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filteredConversations.length === 0 ? (
                            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Icon name="message-circle" size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                <p>{conversationSearchTerm ? 'Keine Treffer.' : 'Keine aktiven Chats.'}</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedUser?.id === conv.user.id;
                                const nameParts = conv.user.name.split(' ');
                                const levelId = conv.user.level_id || conv.user.current_level_id;
                                const levelColor = getLevelColor(levelId, levels);

                                return (
                                    <div key={conv.user.id} onClick={() => handleSelectUser(conv.user)} style={{
                                        padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                                        backgroundColor: isSelected ? 'var(--bg-accent-blue)' : 'transparent',
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background-color 0.2s'
                                    }} onMouseOver={e => e.currentTarget.style.backgroundColor = isSelected ? 'var(--bg-accent-blue)' : 'var(--background-secondary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = isSelected ? 'var(--bg-accent-blue)' : 'transparent'}>
                                        <div className={`initials-avatar small ${!levelColor ? getAvatarColorClass(nameParts[0]) : ''}`} style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}>
                                            {getInitials(nameParts[0], nameParts.slice(1).join(' '))}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.user.name}</span>
                                                {conv.last_message && <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{new Date(conv.last_message.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message ? conv.last_message.content : ''}</div>
                                                {conv.unread_count > 0 && <div style={{ backgroundColor: 'var(--brand-red)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '0 6px', borderRadius: '10px', marginLeft: '0.5rem' }}>{conv.unread_count}</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* --- CHAT VERLAUF --- */}
                <div style={{ flex: 1, display: (isDesktop || !isMobileListVisible) ? 'flex' : 'none', flexDirection: 'column', backgroundColor: 'var(--background-color)', minHeight: 0 }}>
                    {selectedUser ? (
                        <>
                            <div style={{ padding: '0 1.5rem', backgroundColor: 'var(--card-background)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', height: '70px', flexShrink: 0 }}>
                                <button className="button-icon" onClick={() => { setSelectedUser(null); setIsMobileListVisible(true); }} style={{ display: isDesktop ? 'none' : 'flex', color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0 }}>
                                    <Icon name="arrow-left" size={24} />
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: isAdminOrStaff ? 'pointer' : 'default' }} onClick={() => isAdminOrStaff && setView({ page: 'customers', subPage: 'detail', customerId: selectedUser.auth_id || String(selectedUser.id) })}>
                                    <div className={`initials-avatar small ${getAvatarColorClass(selectedUser.name.split(' ')[0])}`}>
                                        {getInitials(selectedUser.name.split(' ')[0], selectedUser.name.split(' ')[1])}
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{selectedUser.name}</span>
                                        {isAdminOrStaff && <span style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>Profil öffnen</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {groupedMessages.map((group, groupIdx) => (
                                    <div key={groupIdx}>
                                        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                                            <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>{formatDateHeader(group.dateStr)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {group.msgs.map(msg => {
                                                const isMe = msg.sender_id === Number(user.id);
                                                return (
                                                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <div style={{
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '1rem',
                                                            borderBottomRightRadius: isMe ? '0.25rem' : '1rem',
                                                            borderBottomLeftRadius: isMe ? '1rem' : '0.25rem',
                                                            backgroundColor: isMe ? 'var(--primary-color)' : 'var(--card-background)',
                                                            color: isMe ? 'white' : 'var(--text-primary)',
                                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                            border: isMe ? 'none' : '1px solid var(--border-color)'
                                                        }}>
                                                            {renderMessageContent(msg, isMe)}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.25rem' }}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {/* HIER DIE DOPPELTEN HAKEN WIEDERHERGESTELLT */}
                                                            {isMe && (
                                                                <span title={msg.is_read ? 'Gelesen' : 'Gesendet'} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
                                                                    {msg.is_read ? (
                                                                        <span style={{ position: 'relative', width: '16px', height: '12px' }}>
                                                                            <Icon name="check" style={{ width: '12px', height: '12px', color: 'var(--primary-color)', position: 'absolute', left: 0 }} />
                                                                            <Icon name="check" style={{ width: '12px', height: '12px', color: 'var(--primary-color)', position: 'absolute', left: 5 }} />
                                                                        </span>
                                                                    ) : (
                                                                        <Icon name="check" style={{ width: '12px', height: '12px', opacity: 0.5 }} />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--card-background)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" />
                                <button className="button-icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ padding: '0.75rem', backgroundColor: 'var(--background-color)', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                                    {isUploading ? <Icon name="refresh" className="animate-spin" /> : <Icon name="paperclip" />}
                                </button>
                                <div style={{ flex: 1, backgroundColor: 'var(--background-color)', borderRadius: '1.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                                    <textarea
                                        ref={textareaRef}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nachricht schreiben..."
                                        rows={1}
                                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'none', maxHeight: '120px', padding: 0, color: 'var(--text-primary)', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <button className="button button-primary" onClick={handleSendMessage} disabled={(!newMessage.trim() && !isUploading)} style={{ padding: '0.75rem', borderRadius: '50%', minWidth: 'auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="send" style={{ marginLeft: '2px' }} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Icon name="message-circle" size={40} style={{ opacity: 0.5 }} />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Pfotencard Chat</h3>
                            <p>Wähle einen Kontakt aus oder starte eine neue Unterhaltung.</p>
                            <button className="button button-primary" style={{ marginTop: '1.5rem' }} onClick={handleOpenNewChatModal}>Neuen Chat starten</button>
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW MODAL - RESTORED PDF IFRAME LOGIC */}
            {previewFile && (
                <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setPreviewFile(null)}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewFile(null)}
                            style={{
                                position: 'absolute', top: '-40px', right: 0,
                                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Icon name="x" />
                        </button>
                        {previewFile.type === 'image' ? (
                            <img src={previewFile.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '0.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                        ) : previewFile.type === 'pdf' ? (
                            <div style={{ backgroundColor: 'white', borderRadius: '1rem', overflow: 'hidden', width: '80vw', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{previewFile.name}</span>
                                    <a href={previewFile.url} download={previewFile.name} className="button-as-link" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)' }}>
                                        <Icon name="download" style={{ width: '14px', height: '14px' }} /> Speichern
                                    </a>
                                </div>
                                <iframe
                                    src={`${previewFile.url}#toolbar=0`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title={previewFile.name}
                                />
                            </div>
                        ) : (
                            <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '1rem', textAlign: 'center', minWidth: '300px' }}>
                                <Icon name="file" size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                                <h3 style={{ marginBottom: '1.5rem', wordBreak: 'break-all' }}>{previewFile.name}</h3>
                                <a href={previewFile.url} download={previewFile.name} className="button button-primary" target="_blank" rel="noopener noreferrer"><Icon name="download" /> Datei herunterladen</a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NEW CHAT MODAL */}
            {isNewChatModalOpen && (
                <InfoModal title="Neuen Chat starten" onClose={() => setIsNewChatModalOpen(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                        <div className="form-group">
                            <input type="text" className="form-input" placeholder="Nach Name suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                            {loadingUsers ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Lade Kontakte...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Keine Kontakte gefunden.</div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u.id} onClick={() => startNewChat(u)} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--background-secondary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <div className={`initials-avatar small ${getAvatarColorClass(u.name.split(' ')[0])}`}>{getInitials(u.name.split(' ')[0], u.name.split(' ').slice(1).join(' '))}</div>
                                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </InfoModal>
            )}
        </div>
    );
};