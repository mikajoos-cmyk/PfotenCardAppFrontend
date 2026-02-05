import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query'; // NEU
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatConversation, User, View } from '../types';
import { MOCK_CONVERSATIONS_CUSTOMER, MOCK_MESSAGES_CUSTOMER, MOCK_CONVERSATIONS_ADMIN, MOCK_MESSAGES_ADMIN } from '../lib/mockData';
import Icon from '../components/ui/Icon';
import { getInitials, getAvatarColorClass } from '../lib/utils';
import InfoModal from '../components/modals/InfoModal';
import { ContextHelp } from '../components/ui/ContextHelp';

// NEU: Hook importieren
import { useChat } from '../hooks/queries/useChat';

interface ChatPageProps {
    user: User | any;
    token: string | null;
    setView: (view: View) => void;
    isPreviewMode?: boolean;
}

export const ChatPage: React.FC<ChatPageProps> = ({ user, token, setView, isPreviewMode }) => {
    const queryClient = useQueryClient();
    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    // --- NEU: CACHING FÜR KONTAKTE ---
    // Wir holen die Kontakte aus dem Cache. Durch das Prefetching in App.tsx sind sie sofort da.
    const { data: conversationsData } = useChat(token);

    // Fallback: Entweder Mock-Daten (Preview) oder Daten aus dem Cache oder leeres Array
    const conversations = isPreviewMode
        ? (isAdminOrStaff ? MOCK_CONVERSATIONS_ADMIN : MOCK_CONVERSATIONS_CUSTOMER)
        : (conversationsData || []);

    // State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Ref für das Textarea-Element für Auto-Resize
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Preview State
    const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Responsive State
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);

    // New Chat State
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [selectableUsers, setSelectableUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Responsive Detection
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 992);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- AUTO RESIZE EFFECT ---
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Höhe zurücksetzen, um Schrumpfen zu ermöglichen
            textarea.style.height = 'auto';
            // Neue Höhe basierend auf Inhalt setzen
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [newMessage]);

    // --- POLLING SETUP (Nur noch für Nachrichten) ---
    useEffect(() => {
        if (isPreviewMode) return;

        // loadConversations() entfernt, macht jetzt der Hook!

        if (selectedUser) {
            loadMessages(selectedUser.id);
        }

        const intervalId = setInterval(() => {
            // Wir aktualisieren nur noch die Nachrichten der offenen Unterhaltung
            // Die Kontaktliste links aktualisiert sich automatisch über den Hook (alle 5s)
            if (selectedUser) {
                loadMessages(selectedUser.id);
            }
        }, 4000);

        return () => clearInterval(intervalId);
    }, [token, selectedUser, isPreviewMode]);

    // --- RESET ON ROLE CHANGE (PREVIEW) ---
    useEffect(() => {
        if (isPreviewMode) {
            setSelectedUser(null);
            setMessages([]);
        }
    }, [isAdminOrStaff, isPreviewMode]);

    // --- AUTO READ MARKING ---
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender_id === Number(selectedUser.id)) {
                apiClient.markChatRead(parseInt(selectedUser.id), token).catch(console.error);
                // Cache invalidieren, damit Badge verschwindet
                queryClient.invalidateQueries({ queryKey: ['chat'] });
            }
        }
    }, [messages, selectedUser, token, queryClient]);

    // Responsive Handler
    useEffect(() => {
        if (selectedUser) {
            setIsMobileListVisible(false);
        } else {
            setIsMobileListVisible(true);
        }
    }, [selectedUser]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior });
            });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, selectedUser]);


    // --- DATA LOGIC ---

    const handleSelectUser = (chatPartner: User) => {
        if (selectedUser?.id === chatPartner.id) return;

        setSelectedUser(chatPartner);
        setMessages([]);
        loadMessages(chatPartner.id);

        apiClient.markChatRead(parseInt(chatPartner.id), token).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['chat'] }); // Update cache status
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
                if (apiClient.getStaff) {
                    usersToSelect = await apiClient.getStaff(token);
                } else {
                    usersToSelect = await apiClient.get('/api/users/staff', token);
                }
            }
            usersToSelect = usersToSelect.filter((u: User) => u.id !== user.id);
            setSelectableUsers(usersToSelect);
        } catch (e) {
            console.error("Fehler beim Laden der Kontakte", e);
            if (!isAdminOrStaff) {
                alert("Konnte Ansprechpartner nicht laden.");
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    const startNewChat = (partner: User) => {
        handleSelectUser(partner);
        setIsNewChatModalOpen(false);
    };

    const loadMessages = async (partnerId: string | number) => {
        if (!partnerId) return;
        if (isPreviewMode) {
            const mockSet = isAdminOrStaff ? MOCK_MESSAGES_ADMIN : MOCK_MESSAGES_CUSTOMER;
            setMessages(mockSet[partnerId] || []);
            return;
        }
        try {
            const data = await apiClient.getChatMessages(Number(partnerId), token);
            setMessages(prev => {
                if (prev.length !== data.length || (data.length > 0 && prev.length > 0 && (data[data.length - 1].id !== prev[prev.length - 1].id || data[data.length - 1].is_read !== prev[prev.length - 1].is_read))) {
                    return data;
                }
                return prev;
            });
        } catch (e) {
            console.error(e);
        }
    };

    // --- DOWNLOAD HELPER ---
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
            console.error('Download error:', error);
            window.open(url, '_blank');
        }
    };

    // --- FILE UPLOAD LOGIC ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedUser) return;

        const file = e.target.files[0];
        let fileType = 'document';
        if (file.type.startsWith('image/')) {
            fileType = 'image';
        } else if (file.type === 'application/pdf') {
            fileType = 'pdf';
        }

        const fileName = file.name;
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;

        setIsUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('chat-uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-uploads')
                .getPublicUrl(filePath);

            await apiClient.sendChatMessage({
                content: fileType === 'image' ? 'Bild gesendet' : 'Dokument gesendet',
                receiver_id: Number(selectedUser.id),
                file_url: publicUrl,
                file_type: fileType,
                file_name: fileName
            }, token);

            loadMessages(selectedUser.id);
            // Liste aktualisieren für "letzte Nachricht"
            queryClient.invalidateQueries({ queryKey: ['chat'] });

        } catch (error: any) {
            console.error("Upload Fehler:", error);
            alert(`Fehler beim Hochladen: ${error.message || 'Unbekannter Fehler'}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        const msgContent = newMessage;
        setNewMessage('');

        // Optimistic Update
        const tempMsg: ChatMessage = {
            id: Date.now(),
            tenant_id: user.tenant_id ? Number(user.tenant_id) : 0,
            sender_id: Number(user.id),
            receiver_id: Number(selectedUser.id),
            content: msgContent,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            if (!isPreviewMode) {
                await apiClient.sendChatMessage({
                    content: msgContent,
                    receiver_id: Number(selectedUser.id)
                }, token);
                loadMessages(selectedUser.id);
                // Liste sofort aktualisieren
                queryClient.invalidateQueries({ queryKey: ['chat'] });
            }
        } catch (e) {
            alert("Senden fehlgeschlagen");
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            setNewMessage(msgContent);
        }
    };

    // --- KEYDOWN HANDLER FÜR TEXTAREA ---
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    };

    const handleBackToList = () => {
        setSelectedUser(null);
        setIsMobileListVisible(true);
    };

    const navigateToCustomerProfile = () => {
        if (isAdminOrStaff && selectedUser) {
            setView({ page: 'customers', subPage: 'detail', customerId: selectedUser.id });
        }
    };

    // --- HELPER: Datum formatieren ---
    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / (1000 * 60 * 60 * 24));

        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Heute";
        if (isYesterday) return "Gestern";
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // --- GROUP MESSAGES BY DATE ---
    const groupedMessages = useMemo(() => {
        const groups: { dateStr: string; msgs: ChatMessage[] }[] = [];
        messages.forEach(msg => {
            const dateStr = new Date(msg.created_at).toDateString();
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.dateStr === dateStr) {
                lastGroup.msgs.push(msg);
            } else {
                groups.push({ dateStr, msgs: [msg] });
            }
        });
        return groups;
    }, [messages]);

    // --- HELPER: Nachricht rendern ---
    const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
        if (msg.file_url) {
            const fileName = msg.file_name || 'Datei';
            const isImage = msg.file_type === 'image';

            if (isImage) {
                return (
                    <div className="space-y-2">
                        <div
                            style={{
                                borderRadius: '0.5rem',
                                overflow: 'hidden',
                                border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                maxWidth: '300px'
                            }}
                            onClick={() => setPreviewFile({ url: msg.file_url!, type: 'image', name: fileName })}
                        >
                            <img
                                src={msg.file_url}
                                alt={fileName}
                                onLoad={() => scrollToBottom('smooth')}
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: '200px',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain',
                                    margin: '0 auto'
                                }}
                            />
                        </div>
                        {msg.content !== 'Bild gesendet' && <div className="text-sm">{msg.content}</div>}
                    </div>
                );
            } else {
                const textColor = isMe ? 'white' : 'var(--text-primary)';
                const iconColor = isMe ? 'rgba(255,255,255,0.9)' : 'var(--primary-color)';

                return (
                    <div className="space-x-1">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                maxWidth: '280px',
                                padding: '2px 0'
                            }}
                        >
                            <div
                                style={{ color: iconColor, cursor: 'pointer', flexShrink: 0, display: 'flex' }}
                                onClick={() => setPreviewFile({ url: msg.file_url!, type: msg.file_type || 'document', name: fileName })}
                            >
                                <Icon name="file" style={{ width: '24px', height: '24px' }} />
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    color: textColor,
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setPreviewFile({ url: msg.file_url!, type: msg.file_type || 'document', name: fileName })}
                                title={fileName}
                            >
                                {fileName}
                            </div>

                            <button
                                onClick={(e) => handleDownload(e, msg.file_url!, fileName)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    color: iconColor,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%'
                                }}
                                title="Herunterladen"
                            >
                                <Icon name="download" style={{ width: '20px', height: '20px' }} />
                            </button>
                        </div>

                        {msg.content !== 'Dokument gesendet' && (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.9 }}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                );
            }
        }

        return <div style={{ lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>;
    };

    const filteredUsers = selectableUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--background-color)',
            overscrollBehavior: 'none'
        }}>
            <div className="content-box" style={{
                flex: 1,
                display: 'flex',
                padding: 0,
                overflow: 'hidden',
                marginBottom: 0,
                height: '100%',
                position: 'relative',
                border: isDesktop ? '1px solid var(--border-color)' : 'none',
                borderRadius: isDesktop ? '1rem' : '0',
                backgroundColor: 'var(--card-background)',
                zIndex: 1,
                minHeight: 0
            }}>
                {/* LISTE DER CHATS */}
                <div style={{
                    width: isDesktop ? '320px' : '100%',
                    display: (isDesktop || isMobileListVisible) ? 'flex' : 'none',
                    flexDirection: 'column',
                    backgroundColor: 'var(--card-background)',
                    borderRight: isDesktop ? '1px solid var(--border-color)' : 'none',
                    height: '100%',
                    minHeight: 0
                }}>
                    <div style={{ padding: '0 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Nachrichten</span>
                        <button className="button button-primary" style={{ padding: '0.4rem', borderRadius: '50%', minWidth: 'auto', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleOpenNewChatModal}>
                            <Icon name="plus" style={{ width: '20px', height: '20px' }} />
                        </button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {conversations.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <p style={{ marginBottom: '0.5rem' }}>Keine aktiven Chats.</p>
                                <button className="button-as-link" onClick={handleOpenNewChatModal}>Jetzt starten</button>
                            </div>
                        ) : (
                            conversations.map(conv => {
                                const isSelected = selectedUser?.id === conv.user.id;
                                const nameParts = conv.user.name.split(' ');
                                const firstName = nameParts[0];
                                const lastName = nameParts.slice(1).join(' ');
                                return (
                                    <div key={conv.user.id} onClick={() => handleSelectUser(conv.user)} style={{
                                        padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                                        backgroundColor: isSelected ? 'var(--bg-accent-blue)' : 'transparent',
                                        display: 'flex', alignItems: 'center', gap: '0.75rem'
                                    }}>
                                        <div className={`initials-avatar small ${getAvatarColorClass(firstName)}`}>{getInitials(firstName, lastName)}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{conv.user.name}</span>
                                                {conv.last_message && <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{new Date(conv.last_message.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{conv.last_message ? conv.last_message.content : ''}</div>
                                                {conv.unread_count > 0 && <div style={{ backgroundColor: 'var(--brand-red)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: '0.5rem' }}>{conv.unread_count}</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* AKTUELLER CHAT */}
                <div style={{
                    flex: 1,
                    display: (isDesktop || !isMobileListVisible) ? 'flex' : 'none',
                    flexDirection: 'column',
                    backgroundColor: 'var(--background-color)',
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    minHeight: 0
                }}>
                    {selectedUser ? (
                        <>
                            {/* HEADER */}
                            <div style={{
                                padding: '0 1rem',
                                backgroundColor: isDesktop ? 'var(--card-background)' : 'var(--sidebar-bg)',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                height: '60px',
                                flexShrink: 0
                            }}>
                                <button className="button-icon" onClick={handleBackToList} style={{ display: isDesktop ? 'none' : 'flex', color: isDesktop ? 'var(--text-primary)' : 'var(--sidebar-text)' }}>
                                    <Icon name="arrow-left" />
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }} onClick={navigateToCustomerProfile}>
                                    <div className={`initials-avatar small ${getAvatarColorClass(selectedUser.name.split(' ')[0])}`}>
                                        {getInitials(selectedUser.name.split(' ')[0], selectedUser.name.split(' ').slice(1).join(' '))}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, color: isDesktop ? 'var(--text-primary)' : 'var(--sidebar-text-hover)' }}>{selectedUser.name}</span>
                                        {isAdminOrStaff && <span style={{ fontSize: '0.75rem', color: isDesktop ? 'var(--text-secondary)' : 'var(--sidebar-text)', opacity: 0.8 }}>Profil anzeigen</span>}
                                    </div>
                                </div>
                            </div>

                            {/* NACHRICHTEN */}
                            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--background-color)' }}>
                                {groupedMessages.map((group, groupIdx) => (
                                    <div key={groupIdx}>
                                        <div style={{ textAlign: 'center', margin: '1rem 0', opacity: 0.6, fontSize: '0.8rem' }}>
                                            <span style={{ backgroundColor: 'var(--background-secondary)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>{formatDateHeader(group.dateStr)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {group.msgs.map((msg) => {
                                                const isMe = msg.sender_id === Number(user.id);
                                                return (
                                                    <div key={msg.id} style={{
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                        maxWidth: '85%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: isMe ? 'flex-end' : 'flex-start'
                                                    }}>
                                                        <div style={{
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '1rem',
                                                            borderBottomRightRadius: isMe ? '0.25rem' : '1rem',
                                                            borderBottomLeftRadius: isMe ? '1rem' : '0.25rem',
                                                            backgroundColor: isMe ? 'var(--primary-color)' : 'var(--card-background)',
                                                            color: isMe ? 'white' : 'var(--text-primary)',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            border: isMe ? 'none' : '1px solid var(--border-color)',
                                                            position: 'relative'
                                                        }}>
                                                            {renderMessageContent(msg, isMe)}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.7rem',
                                                            marginTop: '0.25rem',
                                                            color: 'var(--text-light)',
                                                            padding: '0 0.5rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isMe && (
                                                                <Icon name="check" style={{ width: '12px', height: '12px', opacity: msg.is_read ? 1 : 0.5, color: msg.is_read ? 'var(--primary-color)' : 'currentColor' }} />
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

                            {/* INPUT AREA */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--card-background)',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '0.75rem',
                                minHeight: '80px'
                            }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    accept="image/*,.pdf,.doc,.docx"
                                />
                                <button
                                    className="button-icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    title="Datei anhängen"
                                    style={{ padding: '0.75rem', backgroundColor: 'var(--background-secondary)', borderRadius: '50%', color: 'var(--text-secondary)' }}
                                >
                                    {isUploading ? <Icon name="refresh" className="animate-spin" /> : <Icon name="plus" />}
                                </button>

                                <div style={{
                                    flex: 1,
                                    backgroundColor: 'var(--background-secondary)',
                                    borderRadius: '1.5rem',
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    border: '1px solid transparent',
                                    transition: 'border-color 0.2s'
                                }}>
                                    <textarea
                                        ref={textareaRef}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nachricht schreiben..."
                                        rows={1}
                                        style={{
                                            width: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            resize: 'none',
                                            maxHeight: '120px',
                                            padding: 0,
                                            lineHeight: '1.5',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>

                                <button
                                    className="button button-primary"
                                    onClick={handleSendMessage}
                                    disabled={(!newMessage.trim() && !isUploading)}
                                    style={{ padding: '0.75rem', borderRadius: '50%', minWidth: 'auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Icon name="send" style={{ marginLeft: '2px' }} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Icon name="message-circle" style={{ width: '40px', height: '40px', opacity: 0.5 }} />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Ihre Nachrichten</h3>
                            <p style={{ maxWidth: '300px' }}>Wählen Sie einen Chat aus der Liste oder starten Sie eine neue Unterhaltung.</p>
                            <button className="button button-primary" style={{ marginTop: '1.5rem' }} onClick={handleOpenNewChatModal}>
                                Neuen Chat starten
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW MODAL */}
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
                        ) : (
                            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', textAlign: 'center', minWidth: '300px' }}>
                                <Icon name="file" style={{ width: '48px', height: '48px', color: 'var(--primary-color)', marginBottom: '1rem' }} />
                                <h3 style={{ marginBottom: '1rem', wordBreak: 'break-all' }}>{previewFile.name}</h3>
                                <a href={previewFile.url} download={previewFile.name} className="button button-primary" target="_blank" rel="noopener noreferrer">
                                    <Icon name="download" /> Herunterladen
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NEW CHAT MODAL */}
            {isNewChatModalOpen && (
                <InfoModal title="Neuen Chat starten" onClose={() => setIsNewChatModalOpen(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Suchen..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loadingUsers ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Lade Kontakte...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Keine Kontakte gefunden.</div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u.id} onClick={() => startNewChat(u)} style={{
                                        padding: '0.75rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        transition: 'background 0.2s'
                                    }}
                                         onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--background-secondary)'}
                                         onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div className={`initials-avatar small ${getAvatarColorClass(u.name.split(' ')[0])}`}>
                                            {getInitials(u.name.split(' ')[0], u.name.split(' ').slice(1).join(' '))}
                                        </div>
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