import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatConversation, User, View } from '../types';
import { MOCK_CONVERSATIONS_CUSTOMER, MOCK_MESSAGES_CUSTOMER, MOCK_CONVERSATIONS_ADMIN, MOCK_MESSAGES_ADMIN } from '../lib/mockData';
import Icon from '../components/ui/Icon';
import { getInitials, getAvatarColorClass } from '../lib/utils';
import InfoModal from '../components/modals/InfoModal';
// NEU: Importieren des Hooks
import { useVisualViewport } from '../hooks/useVisualViewport';

interface ChatPageProps {
    user: User | any;
    token: string | null;
    setView: (view: View) => void;
    isPreviewMode?: boolean;
}

export const ChatPage: React.FC<ChatPageProps> = ({ user, token, setView, isPreviewMode }) => {
    // NEU: Hook aufrufen
    useVisualViewport();

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    // State
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // --- POLLING SETUP ---
    useEffect(() => {
        if (isPreviewMode) {
            setConversations(isAdminOrStaff ? MOCK_CONVERSATIONS_ADMIN : MOCK_CONVERSATIONS_CUSTOMER);
            return;
        }

        loadConversations();
        if (selectedUser) {
            loadMessages(selectedUser.id);
        }

        const intervalId = setInterval(() => {
            loadConversations(false);
            if (selectedUser) {
                loadMessages(selectedUser.id);
            }
        }, 4000);

        return () => clearInterval(intervalId);
    }, [token, selectedUser, isPreviewMode, isAdminOrStaff]);

    // --- RESET ON ROLE CHANGE (PREVIEW) ---
    useEffect(() => {
        if (isPreviewMode) {
            setSelectedUser(null);
            setMessages([]);
            setConversations(isAdminOrStaff ? MOCK_CONVERSATIONS_ADMIN : MOCK_CONVERSATIONS_CUSTOMER);
        }
    }, [isAdminOrStaff, isPreviewMode]);

    // --- AUTO READ MARKING ---
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender_id === Number(selectedUser.id)) {
                apiClient.markChatRead(parseInt(selectedUser.id), token).catch(console.error);
                setConversations(prev => prev.map(c =>
                    c.user.id === selectedUser.id ? { ...c, unread_count: 0 } : c
                ));
            }
        }
    }, [messages, selectedUser, token]);

    // Responsive Handler
    useEffect(() => {
        if (selectedUser) {
            setIsMobileListVisible(false);
        } else {
            setIsMobileListVisible(true);
        }
    }, [selectedUser]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        // Kleine Verzögerung für Mobile Renderings
        setTimeout(() => {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior });
            });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, selectedUser]);

    // Responsive Detection
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 992);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // --- DATA LOGIC ---

    const loadConversations = async (showLoading = true) => {
        if (isPreviewMode) return;
        try {
            const data = await apiClient.getConversations(token);
            setConversations(data);
        } catch (e) {
            if (showLoading) console.error("Fehler beim Laden der Chats", e);
        }
    };

    const handleSelectUser = (chatPartner: User) => {
        if (selectedUser?.id === chatPartner.id) return;

        setSelectedUser(chatPartner);
        setMessages([]);
        loadMessages(chatPartner.id);

        apiClient.markChatRead(parseInt(chatPartner.id), token).catch(console.error);

        setConversations(prev => prev.map(c =>
            c.user.id === chatPartner.id ? { ...c, unread_count: 0 } : c
        ));
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
            loadConversations(false);

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
                loadConversations(false);
            }
        } catch (e) {
            alert("Senden fehlgeschlagen");
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            setNewMessage(msgContent);
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

        return <div style={{ lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.content}</div>;
    };

    const filteredUsers = selectableUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            // WICHTIG: Auf Mobile nutzen wir position fixed, um aus dem App-Layout "auszubrechen"
            // und die volle Höhe inkl. Keyboard-Berechnung zu nutzen.
            position: isDesktop ? 'relative' : 'fixed',
            inset: isDesktop ? 'auto' : 0,
            zIndex: isDesktop ? 'auto' : 50,
            height: isDesktop ? '100%' : 'var(--app-height, 100dvh)',
            overflow: 'hidden',
            backgroundColor: 'var(--background-color)'
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
                zIndex: 1
            }}>
                {/* LISTE DER CHATS (Links auf Desktop, Vollbild auf Mobile wenn kein Chat gewählt) */}
                <div style={{
                    width: isDesktop ? '320px' : '100%',
                    display: (isDesktop || isMobileListVisible) ? 'flex' : 'none',
                    flexDirection: 'column',
                    backgroundColor: 'var(--card-background)',
                    borderRight: isDesktop ? '1px solid var(--border-color)' : 'none',
                    height: '100%'
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

                {/* AKTUELLER CHAT (Rechts auf Desktop, Vollbild auf Mobile) */}
                <div style={{
                    flex: 1,
                    display: (isDesktop || !isMobileListVisible) ? 'flex' : 'none',
                    flexDirection: 'column',
                    backgroundColor: 'var(--background-color)',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                }}>
                    {selectedUser ? (
                        <>
                            {/* HEADER: ZURÜCK-BUTTON & PROFIL - Angepasst an Design-Mockup */}
                            <div style={{
                                padding: '0 1rem',
                                backgroundColor: isDesktop ? 'var(--card-background)' : 'var(--sidebar-bg)',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                height: '60px',
                                flexShrink: 0,
                                zIndex: 10
                            }}>
                                {/* Zurück-Pfeil: Nur auf Mobile sichtbar */}
                                {!isDesktop && (
                                    <button
                                        onClick={handleBackToList}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            color: 'white',
                                            marginLeft: '-0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Icon name="arrowLeft" style={{ width: '24px', height: '24px' }} />
                                    </button>
                                )}

                                <div className={`initials-avatar small ${getAvatarColorClass(selectedUser.name)}`} style={{ width: '38px', height: '38px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {getInitials(selectedUser.name)}
                                </div>
                                <div onClick={navigateToCustomerProfile} style={{ cursor: isAdminOrStaff ? 'pointer' : 'default', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        color: isDesktop ? 'var(--text-primary)' : 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {selectedUser.name.toLowerCase()}
                                        <Icon name="arrowRight" style={{ width: '16px', height: '16px', opacity: 0.6 }} />
                                    </span>
                                </div>
                            </div>

                            {/* NACHRICHTEN - Scrollbar */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                scrollBehavior: 'smooth'
                            }}>
                                {messages.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', opacity: 0.7 }}><p>Schreiben Sie die erste Nachricht...</p></div>}
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === Number(user?.id);
                                    const msgDate = new Date(msg.created_at).toDateString();
                                    const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
                                    const showDateSeparator = msgDate !== prevMsgDate;

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDateSeparator && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    margin: '1rem 0',
                                                    position: 'sticky',
                                                    top: '0',
                                                    zIndex: 5
                                                }}>
                                                    <span style={{
                                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '1rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        {formatDateHeader(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                <div style={{
                                                    maxWidth: '85%',
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '1rem',
                                                    borderBottomRightRadius: isMe ? '0' : '1rem',
                                                    borderBottomLeftRadius: !isMe ? '0' : '1rem',
                                                    backgroundColor: isMe ? 'var(--primary-color)' : 'var(--card-background)',
                                                    color: isMe ? 'white' : 'var(--text-primary)',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    border: isMe ? 'none' : '1px solid var(--border-color)'
                                                }}>
                                                    {renderMessageContent(msg, isMe)}
                                                    <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', textAlign: 'right', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMe && <Icon name="check" style={{ width: '12px', height: '12px', color: msg.is_read ? '#fff' : 'rgba(255,255,255,0.6)' }} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* EINGABEZEILE - Fixiert unten */}
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: 'var(--card-background)',
                                borderTop: '1px solid var(--border-color)',
                                flexShrink: 0
                            }}>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,application/pdf,.doc,.docx" />
                                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="button button-outline" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                        {isUploading ? <Icon name="refresh" className="animate-spin" style={{ width: '18px', height: '18px' }} /> : <Icon name="paperclip" style={{ width: '18px', height: '18px' }} />}
                                    </button>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Nachricht..."
                                        className="form-input"
                                        style={{ flex: 1, borderRadius: '99px', padding: '0.75rem 1rem' }}
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="button button-primary" style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon name="share" style={{ width: '20px', height: '20px', transform: 'rotate(0deg)' }} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
                            <Icon name="mail" style={{ width: '64px', height: '64px', marginBottom: '1rem', opacity: 0.2 }} />
                            <p>Wählen Sie einen Chat aus der Liste.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS HIER EINFÜGEN (PreviewFile & NewChatModal bleiben unverändert) */}
            {previewFile && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setPreviewFile(null)}>
                    {/* ... Preview Modal Content ... */}
                    <div style={{ backgroundColor: 'var(--card-background)', borderRadius: '1rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewFile.name}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={(e) => handleDownload(e, previewFile.url, previewFile.name)} className="button button-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Herunterladen"><Icon name="download" style={{ width: '18px', height: '18px' }} /></button>
                                <button onClick={() => setPreviewFile(null)} className="button button-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" style={{ width: '18px', height: '18px' }} /></button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-color)' }}>
                            {previewFile.type === 'image' ? (
                                <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '0.5rem' }} />
                            ) : previewFile.type === 'pdf' ? (
                                <iframe src={previewFile.url} title={previewFile.name} style={{ width: '100%', height: '100%', minHeight: '60vh', border: 'none', borderRadius: '0.5rem', backgroundColor: 'white' }} />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <Icon name="file" style={{ width: '64px', height: '64px', marginBottom: '1rem', opacity: 0.5 }} />
                                    <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Keine Vorschau verfügbar.</p>
                                    <button onClick={(e) => handleDownload(e, previewFile.url, previewFile.name)} className="button button-primary">Datei herunterladen</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isNewChatModalOpen && (
                <InfoModal title="Neuen Chat starten" onClose={() => setIsNewChatModalOpen(false)} color="blue">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', minHeight: '300px' }}>
                        <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-background)', zIndex: 10 }}>
                            <input type="text" placeholder={isAdminOrStaff ? "Kunden suchen..." : "Mitarbeiter suchen..."} className="form-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                        </div>
                        {loadingUsers ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Lade Kontakte...</div> : (
                            <ul className="info-modal-list" style={{ overflowY: 'auto' }}>
                                {filteredUsers.length === 0 ? <p className="text-gray-500 text-center py-4">Keine Einträge gefunden.</p> : filteredUsers.map(u => (
                                    <li key={u.id} onClick={() => startNewChat(u)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem' }}>
                                        <div className={`initials-avatar small ${getAvatarColorClass(u.name)}`}>{getInitials(u.name)}</div>
                                        <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.role === 'customer' || u.role === 'kunde' ? 'Kunde' : 'Mitarbeiter'}</div></div>
                                        <Icon name="arrowRight" style={{ marginLeft: 'auto', opacity: 0.5, width: '16px', height: '16px' }} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </InfoModal>
            )}
        </div>
    );
};