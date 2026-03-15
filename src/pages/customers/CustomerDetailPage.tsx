import React, { FC, useState, useEffect, useRef, ChangeEvent } from 'react';
import { View, DocumentFile, User } from '../../types';
import { LEVELS, VIP_LEVEL, EXPERT_LEVEL, LEVEL_REQUIREMENTS, DOGLICENSE_PREREQS } from '../../lib/constants';
import { getInitials, getAvatarColorClass, getProgressForLevel, areLevelRequirementsMet, formatDateDE, getLevelColor } from '../../lib/utils';
import { API_BASE_URL, apiClient } from '../../lib/api';
import { getFullImageUrl } from '../../App';
import { hasPermission } from '../../lib/permissions';
import { useHomework } from '../../hooks/queries/useHomework';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InfoModal from '../../components/modals/InfoModal';
import DocumentViewerModal from '../../components/modals/DocumentViewerModal';
import DeleteDocumentModal from '../../components/modals/DeleteDocumentModal';
import UpdateEmailModal from '../../components/modals/UpdateEmailModal';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../../components/ui/tooltip";

const getFileIcon = (fileName: string, type?: string) => {
    if (type === 'video') return 'video';
    if (type === 'image') return 'image';
    
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'file-text';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return 'image';
        case 'mp4':
        case 'mov':
        case 'avi': return 'video';
        default: return 'file';
    }
};

interface CustomerDetailPageProps {
    customer: any;
    transactions: any[];
    setView: (view: View) => void;
    handleLevelUp: (customerId: string, newLevelId: number, dogId?: number) => void;
    onSave: (user: any, dog: any) => Promise<void>;
    currentUser: any;
    users: any[];
    onUploadDocuments: (files: File[], customerId: string) => void;
    onDeleteDocument: (document: any) => void;
    fetchAppData: () => Promise<void>;
    authToken: string | null;
    onDeleteUserClick: (user: any) => void;
    onToggleVipStatus: (customer: any) => void;
    onToggleExpertStatus: (customer: any) => void;
    onUpdateStatus?: (userId: string, statusType: 'vip' | 'expert', value: boolean) => void;
    setDogFormModal: (modalState: { isOpen: boolean; dog: any | null }) => void;
    setDeletingDog: (dog: any | null) => void;
    levels?: any[];
    wording?: { level: string; vip: string };
    isDarkMode?: boolean;
    // NEU
    isPreviewMode?: boolean;
    activeModules?: string[];
    initialDogId?: number;
    onConfirmTransaction: (txData: {
        title: string;
        amount: number;
        type: 'topup' | 'debit';
        meta?: { requirementId?: string };
        baseAmount?: number;
        bonus?: number;
        dogId?: number | null;
        dogName?: string;
    }) => Promise<void>;
}

const CustomerDetailPage: FC<CustomerDetailPageProps> = ({
    customer, transactions, setView, handleLevelUp, onSave, currentUser, users,
    onUploadDocuments, onDeleteDocument, fetchAppData, authToken, onDeleteUserClick,
    onToggleVipStatus, onToggleExpertStatus, setDogFormModal, setDeletingDog, levels,
    wording, isDarkMode, isPreviewMode, activeModules, initialDogId, onConfirmTransaction
}) => {

    const levelTerm = wording?.level || 'Level';
    const vipTerm = wording?.vip || 'VIP';

    const canEditCustomers = hasPermission(currentUser, 'can_edit_customers') || String(currentUser?.id) === String(customer?.id);

    const firstName = customer.vorname || customer.firstName || (customer.name ? customer.name.split(' ')[0] : '');
    const lastName = customer.nachname || customer.lastName || (customer.name ? customer.name.split(' ').slice(1).join(' ') : '');

    // NEU: Dog-Tab Logik
    const dogs = customer.dogs || [];
    const [activeDogId, setActiveDogId] = useState<number | null>(() => {
        if (initialDogId) return initialDogId;
        return dogs.length > 0 ? dogs[0].id : null;
    });

    const activeDog = dogs.find((d: any) => d.id === activeDogId) || (dogs.length > 0 ? dogs[0] : null);
    const dogName = activeDog?.name || '-';

    // Levels laden oder Mock nutzen
    const levelsToUse = levels || LEVELS;

    // FIX: Initiales Level bestimmen (vermeidet Fehler, wenn ID 1 nicht existiert)
    const getInitialLevelId = (targetDog: any = null) => {
        const dogToUse = targetDog || activeDog;
        if (dogToUse?.current_level_id) return dogToUse.current_level_id;
        if (customer.level_id) return customer.level_id;
        if (customer.current_level_id) return customer.current_level_id;
        // Wenn kein Level gesetzt ist, nimm das mit dem niedrigsten Rang (Standard: Level 1)
        if (levelsToUse.length > 0) {
            // Sortiere sicherheitshalber nach Rang
            const sortedLevels = [...levelsToUse].sort((a: any, b: any) => (a.rank_order || a.id) - (b.rank_order || b.id));
            return sortedLevels[0].id;
        }
        return 1; // Fallback
    };

    const [editingSection, setEditingSection] = useState<'personal' | 'balance' | 'level' | 'additional' | null>(null);
    const isEditing = editingSection !== null;
    const [editedData, setEditedData] = useState({
        firstName: '', lastName: '', email: '', phone: '', dogName: '', chip: '', breed: '', birth_date: '',
        balance: 0, levelId: 0
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<DocumentFile | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
    const [customerBookings, setCustomerBookings] = useState<any[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [canShare, setCanShare] = useState(false);

    // --- HAUSAUFGABEN ---
    const { templates, userHomework, assignHomework, uploadFiles } = useHomework(authToken);
    const homework = userHomework(customer.id);
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
    const [isCreatingCustomHomework, setIsCreatingCustomHomework] = useState(false);
    const [isUploadingHomeworkFile, setIsUploadingHomeworkFile] = useState(false);
    const homeworkFileInputRef = useRef<HTMLInputElement>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [customHomework, setCustomHomework] = useState<{
        title: string;
        description: string;
        video_url: string;
        file_url: string;
        file_name: string;
        attachments: { file_url: string; file_name: string; type: string; }[];
    }>({ 
        title: '', 
        description: '', 
        video_url: '', 
        file_url: '', 
        file_name: '',
        attachments: [] 
    });

    const handleHomeworkFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        try {
            setIsUploadingHomeworkFile(true);
            const filesArray = Array.from(selectedFiles);
            const res = await uploadFiles.mutateAsync(filesArray);
            
            const newAttachments = res.all_files.map((f: any) => ({
                file_url: f.file_url,
                file_name: f.file_name,
                type: f.type
            }));

            setCustomHomework(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...newAttachments]
            }));
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploadingHomeworkFile(false);
        }
    };

    const handleAssignHomework = async () => {
        const data = selectedTemplate ? {
            user_id: customer.id,
            dog_id: activeDogId,
            template_id: selectedTemplate.id,
            title: selectedTemplate.title,
            description: selectedTemplate.description,
            video_url: selectedTemplate.video_url,
            file_url: selectedTemplate.file_url,
            file_name: selectedTemplate.file_name,
            attachments: selectedTemplate.attachments || []
        } : {
            user_id: customer.id,
            dog_id: activeDogId,
            ...customHomework
        };

        try {
            await assignHomework.mutateAsync(data);
            setIsHomeworkModalOpen(false);
            setIsCreatingCustomHomework(false);
            setSelectedTemplate(null);
            setCustomHomework({ title: '', description: '', video_url: '', file_url: '', file_name: '', attachments: [] });
        } catch (error) {
            console.error("Assignment failed", error);
        }
    };

    // Hilfsfunktionen für das Modal (kopiert von AppointmentsPage)
    const formatDate = (date: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
    const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
    
    const getCategoryColor = (event: any, colorRules?: any[]): string => {
        if (colorRules && colorRules.length > 0) {
            const serviceRule = colorRules.find(r => r.type === 'service' && r.target_ids.includes(event.training_type_id || -1));
            if (serviceRule) return serviceRule.color;
            if (event.target_levels && event.target_levels.length > 0) {
                const levelIds = event.target_levels.map((l: any) => l.id);
                const levelRule = colorRules.find(r => {
                    if (r.type !== 'level') return false;
                    return r.match_all ? r.target_ids.every((id: any) => levelIds.includes(id)) : r.target_ids.some((id: any) => levelIds.includes(id));
                });
                if (levelRule) return levelRule.color;
            }
        }
        const t = (event.title || "").toLowerCase();
        if (t.includes('welpe')) return 'orchid';
        if (t.includes('grund') || t.includes('basis') || t.includes('level 2')) return 'limegreen';
        if (t.includes('fort') || t.includes('level 3')) return 'skyblue';
        if (t.includes('master') || t.includes('level 4')) return 'peru';
        if (t.includes('prüfung')) return 'tomato';
        if (t.includes('theorie') || t.includes('vortrag')) return 'khaki';
        if (t.includes('workshop') || t.includes('special')) return 'darkkhaki';
        return 'gold';
    };

    // Initialisiere mit korrekter Logik
    const [previewLevelId, setPreviewLevelId] = useState<number>(getInitialLevelId());
    const [isSaving, setIsSaving] = useState(false);

    const fetchCustomerBookings = async () => {
        setIsLoadingBookings(true);
        try {
            const bookings = await apiClient.getUserBookings(customer.id, authToken);
            setCustomerBookings(bookings);
        } catch (error) {
            console.error("Fehler beim Laden der Buchungen:", error);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    useEffect(() => {
        if (isAppointmentsModalOpen) {
            fetchCustomerBookings();
        }
    }, [isAppointmentsModalOpen]);

    // Update wenn sich der Kunde oder der aktive Hund ändert (z.B. nach echtem Level-Up)
    useEffect(() => {
        setPreviewLevelId(getInitialLevelId());
    }, [activeDogId, activeDog?.current_level_id, customer.level_id, customer.current_level_id, levelsToUse]);

    useEffect(() => {
        if (!initialDogId) return;
        if (dogs.some((d: any) => d.id === initialDogId)) {
            setActiveDogId(initialDogId);
        }
    }, [initialDogId, dogs]);

    useEffect(() => {
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);

    const handleStartEditing = (section: 'personal' | 'balance' | 'level' | 'additional') => {
        setEditedData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || '',
            phone: customer.phone || '',
            dogName: activeDog?.name || '',
            chip: activeDog?.chip || '',
            breed: activeDog?.breed || '',
            birth_date: activeDog?.birth_date || '',
            balance: customer.balance || 0,
            levelId: currentLevelId
        });
        setEditingSection(section);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setEditedData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleCancelEdit = () => setEditingSection(null);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        
        const userPayload = {
            ...customer,
            name: `${editedData.firstName} ${editedData.lastName}`.trim(),
            vorname: editedData.firstName,
            nachname: editedData.lastName,
            // email: editedData.email, // E-Mail wird separat über UpdateEmailModal geändert
            phone: editedData.phone,
            balance: editedData.balance,
            level_id: editedData.levelId
        };

        let dogPayload = null;
        if (editedData.dogName) {
            if (activeDog) {
                dogPayload = { ...activeDog, name: editedData.dogName, chip: editedData.chip, breed: editedData.breed, birth_date: editedData.birth_date, current_level_id: editedData.levelId };
            } else {
                dogPayload = { name: editedData.dogName, chip: editedData.chip, breed: editedData.breed, birth_date: editedData.birth_date };
            }
        }

        console.log('Speichere Kundendaten (Optimistic UI)...', { userPayload, dogPayload });
        
        // --- OPTIMISTIC UI: Bearbeitungsmodus sofort verlassen ---
        const currentEditingSection = editingSection;
        setEditingSection(null);

        // Zurück zur Kundenliste, wenn wir Stammdaten bearbeitet haben (für Admins/Mitarbeiter)
        if (currentEditingSection === 'personal' && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter')) {
            setView({ page: 'customers' });
        }

        try {
            await onSave(userPayload, dogPayload);
            console.log('Speichern erfolgreich');
        } catch (err: any) {
            console.error('Speichern fehlgeschlagen:', err);
            // Bei Fehler: Bearbeitungsmodus wiederherstellen, falls gewünscht
            setEditingSection(currentEditingSection);
            alert('Fehler beim Speichern: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const filesArray = Array.from(event.target.files);
            onUploadDocuments(filesArray, String(customer.id));
            event.target.value = '';
        }
    };

    const customerTransactions = transactions.filter(t => t.user_id === customer.id);
    const lastLevel = levelsToUse[levelsToUse.length - 1];
    const currentLevelId = activeDog?.current_level_id || customer.level_id || customer.current_level_id || getInitialLevelId();
    const currentLevelColor = getLevelColor(currentLevelId, levelsToUse);
    const canDoLevelUpCurrent = areLevelRequirementsMet(customer, levelsToUse, activeDogId || undefined);

    const showLevelUpButton = canDoLevelUpCurrent && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (currentLevelId !== lastLevel?.id);

    let displayLevel = levelsToUse.find((l: any) => l.id === currentLevelId) || levelsToUse[0];
    if (customer.is_vip) { displayLevel = { ...VIP_LEVEL, name: `${vipTerm}-Kunde` }; }
    if (customer.is_expert) { displayLevel = EXPERT_LEVEL; }

    const renderRequirement = (req: { id: string; name: string; required: number }, progressProvider: () => { [key: string]: number }) => {
        const progress = progressProvider();
        // Hier nutzen wir String-Konvertierung für den Key-Zugriff, da IDs aus der DB ints sind
        const currentCount = Math.min(progress[String(req.id)] || progress[req.id] || 0, req.required);
        const isCompleted = currentCount >= req.required;
        return (
            <li key={req.id}>
                <div className={`req-icon ${isCompleted ? 'completed' : 'incomplete'}`}><Icon name={isCompleted ? "check" : "x"} /></div>
                <span className="req-text">{req.name}</span>
                <span className="req-progress">{currentCount} / {req.required}</span>
            </li>
        );

    };

    const handleToggleAdditionalService = async (req: any, levelId: number) => {
        // Prüfen ob bereits erledigt
        const progress = getProgressForLevel(customer, levelId, levelsToUse);
        const reqKey = req.training_type_id ? String(req.training_type_id) : String(req.id);
        const currentCount = progress[reqKey] || 0;
        const isCompleted = currentCount >= (req.required_count || req.required || 1);

        if (isCompleted) {
            // Optional: Löschen/Rückgängig machen (aktuell nicht gefordert, aber hier Platzhalter)
            // alert("Bereits erledigt.");
            return;
        }

        // Neue 0€ Transaktion anlegen
        await onConfirmTransaction({
            title: `Zusatzleistung: ${req.name || 'Unbekannt'}`,
            amount: 0,
            type: 'debit', // oder 'info' wenn unterstützt, aber debit 0€ ist ok
            meta: { requirementId: reqKey },
            dogId: activeDogId
        });
    };

    const customerDocuments = customer.documents || [];

    return (
        <>
            <header className="detail-header">
                {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
                    <button className="back-button" onClick={() => setView({ page: 'customers' })}><Icon name="arrowLeft" /></button>
                }
                <div className="detail-header-info">
                    <h1>{firstName} {lastName}</h1>
                    <p>Kundendetails & Übersicht</p>
                </div>
                <div className="header-actions" style={{ marginLeft: 'auto' }}>
                    {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter' || currentUser.id === customer.id) &&
                        <>
                            {editingSection === 'personal' ? (
                                <>
                                    <button className="button button-outline" onClick={handleCancelEdit} disabled={isSaving}>Abbrechen</button>
                                    <button className="button button-primary" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? 'Speichert...' : 'Speichern'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {canEditCustomers && (
                                        <button className="button button-outline" onClick={() => handleStartEditing('personal')}>Stammdaten bearbeiten</button>
                                    )}
                                    {currentUser.role === 'admin' && (
                                        customer.is_vip ? (
                                            <button className="button button-outline" onClick={() => onToggleVipStatus(customer)}>
                                                {vipTerm}-Status aberkennen
                                            </button>
                                        ) : (
                                            <button className="button button-secondary" onClick={() => onToggleVipStatus(customer)}>
                                                Zum {vipTerm} ernennen
                                            </button>
                                        )
                                    )}
                                    {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                        <>
                                            {hasPermission(currentUser, 'can_delete_customers') && (
                                                <button
                                                    className="button button-outline"
                                                    style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }}
                                                    onClick={() => onDeleteUserClick(customer)}>
                                                    Kunde löschen
                                                </button>
                                            )}
                                            <button className="button button-primary" onClick={() => setView({ page: 'customers', subPage: 'transactions', customerId: customer.auth_id || String(customer.id), dogId: activeDogId || undefined })}>Guthaben verwalten</button>
                                        </>
                                    )}
                                    {String(currentUser.id) === String(customer.id) && (currentUser.role === 'customer' || currentUser.role === 'kunde') && activeModules?.includes('balance_topup') && (
                                        <button className="button button-primary" onClick={() => setView({ page: 'customers', subPage: 'transactions', customerId: customer.auth_id || String(customer.id), dogId: activeDogId || undefined })}>Guthaben aufladen</button>
                                    )}
                                </>
                            )}
                        </>
                    }
                </div>
            </header>

            <div className="detail-grid">
                <div className="main-col">
                    <div className="content-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                            <h2>Persönliche Daten</h2>
                            <div className="dog-tabs" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                {dogs.map((d: any) => (
                                    <div key={d.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <button
                                            className={`tab-button ${activeDogId === d.id ? 'active' : ''}`}
                                            onClick={() => setActiveDogId(d.id)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                paddingRight: (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') ? '2rem' : '0.8rem',
                                                fontSize: '0.8rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--border-color)',
                                                background: activeDogId === d.id ? 'var(--primary-color)' : 'transparent',
                                                color: activeDogId === d.id ? 'white' : 'var(--text-primary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {d.name}
                                        </button>
                                        {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                            <button
                                                className="delete-dog-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingDog(d);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    right: '0.4rem',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: activeDogId === d.id ? 'rgba(255,255,255,0.8)' : 'var(--brand-red)',
                                                    cursor: 'pointer',
                                                    padding: '0.2rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Hund löschen"
                                            >
                                                <Icon name="trash" width={14} height={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    className="tab-button"
                                    onClick={() => setDogFormModal({ isOpen: true, dog: null })}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '0.5rem',
                                        border: '1px dashed var(--border-color)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="personal-data-container" data-editing={editingSection}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div 
                                    className={`personal-data-avatar ${!currentLevelColor ? getAvatarColorClass(firstName) : ''}`}
                                    style={currentLevelColor ? { backgroundColor: currentLevelColor, color: 'white' } : {}}
                                >
                                    {getInitials(firstName, lastName)}
                                </div>
                                <div 
                                    className={`dog-image-container ${!activeDog?.image_url ? 'no-image' : ''}`}
                                    data-editing={editingSection}
                                    onClick={editingSection === 'personal' ? () => setDogFormModal({ isOpen: true, dog: activeDog }) : undefined}
                                    style={currentLevelColor ? { borderColor: currentLevelColor } : {}}
                                >
                                    {activeDog?.image_url ? (
                                        <img 
                                            src={getFullImageUrl(activeDog.image_url) || ''} 
                                            alt={dogName} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: editingSection === 'personal' ? 0.6 : 1 }} 
                                        />
                                    ) : (
                                        <Icon name="heart" color={currentLevelColor || undefined} />
                                    )}
                                    {editingSection === 'personal' && (
                                        <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.3)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon name="edit" width={24} height={24} color="white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="personal-data-fields">
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Vorname</label>{editingSection === 'personal' ? <input type="text" name="firstName" value={editedData.firstName} onChange={handleInputChange} /> : <p>{firstName}</p>}</div></div>
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Nachname</label>{editingSection === 'personal' ? <input type="text" name="lastName" value={editedData.lastName} onChange={handleInputChange} /> : <p>{lastName}</p>}</div></div>

                                <div className="data-field">
                                    <Icon name="mail" />
                                    <div className="field-content">
                                        <label>E-Mail</label>
                                        {editingSection === 'personal' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={editedData.email}
                                                    onChange={handleInputChange}
                                                    disabled
                                                    style={{ color: 'var(--text-secondary)', cursor: 'not-allowed', flex: 1 }}
                                                />
                                                <button 
                                                    type="button"
                                                    className="action-icon-btn" 
                                                    onClick={() => setIsEmailModalOpen(true)}
                                                    title="E-Mail ändern"
                                                    style={{ padding: '0.4rem', borderRadius: '0.4rem', background: 'var(--bg-secondary)' }}
                                                >
                                                    <Icon name="edit" width={18} height={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <p>{customer.email || '-'}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="phone" />
                                    <div className="field-content">
                                        <label>Telefon</label>
                                        {editingSection === 'personal' ? <input type="tel" name="phone" value={editedData.phone} onChange={handleInputChange} /> : <p>{customer.phone || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="heart" />
                                    <div className="field-content">
                                        <label>Hund</label>
                                        {editingSection === 'personal' ? <input type="text" name="dogName" value={editedData.dogName} onChange={handleInputChange} /> : <p>{dogName}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="paw" />
                                    <div className="field-content">
                                        <label>Rasse</label>
                                        {editingSection === 'personal' ? <input type="text" name="breed" value={editedData.breed} onChange={handleInputChange} /> : <p>{activeDog?.breed || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Geburtstag</label>
                                        {editingSection === 'personal' ? <input type="date" name="birth_date" value={editedData.birth_date} onChange={handleInputChange} /> : <p>{formatDateDE(activeDog?.birth_date)}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Chipnummer</label>
                                        {editingSection === 'personal' ? <input type="text" name="chip" value={editedData.chip} onChange={handleInputChange} /> : <p>{activeDog?.chip || '-'}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="content-box account-overview-box">
                        <h2>Konto-Übersicht</h2>
                        <div className="overview-tile-grid">
                            <div className="overview-tile balance">
                                <div className="tile-content">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="label">Aktuelles Guthaben</span>
                                        {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && canEditCustomers && (
                                            <button className="button-as-link" onClick={() => handleStartEditing('balance')} style={{ padding: 0, height: 'auto' }}>
                                                <Icon name="edit" width={14} height={14} />
                                            </button>
                                        )}
                                        {editingSection === 'balance' && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="button-as-link" onClick={handleSave} style={{ padding: 0, height: 'auto', color: 'var(--success-color)' }}>
                                                    <Icon name="check" width={16} height={16} />
                                                </button>
                                                <button className="button-as-link" onClick={handleCancelEdit} style={{ padding: 0, height: 'auto', color: 'var(--error-color)' }}>
                                                    <Icon name="close" width={16} height={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {editingSection === 'balance' && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <input
                                                type="number"
                                                name="balance"
                                                value={editedData.balance}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '1rem', width: '100px' }}
                                            />
                                            <span style={{ fontWeight: 600 }}>€</span>
                                        </div>
                                    ) : (
                                        <span className="value">{(customer.balance ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    )}
                                </div>
                            </div>
                            <button className="overview-tile clickable transactions" onClick={() => setIsTxModalOpen(true)}><div className="tile-content"><span className="label">Transaktionen gesamt</span><span className="value">{customerTransactions.length}</span></div></button>
                            <div className={`overview-tile level level-${(levelsToUse.findIndex((l: any) => l.id === currentLevelId) % 5) + 1}`}>
                                <div className="tile-content">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="label">{displayLevel?.name}</span>
                                        {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && canEditCustomers && (
                                            <button className="button-as-link" onClick={() => handleStartEditing('level')} style={{ padding: 0, height: 'auto' }}>
                                                <Icon name="edit" width={14} height={14} />
                                            </button>
                                        )}
                                        {editingSection === 'level' && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="button-as-link" onClick={handleSave} style={{ padding: 0, height: 'auto', color: 'var(--success-color)' }}>
                                                    <Icon name="check" width={16} height={16} />
                                                </button>
                                                <button className="button-as-link" onClick={handleCancelEdit} style={{ padding: 0, height: 'auto', color: 'var(--error-color)' }}>
                                                    <Icon name="close" width={16} height={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {editingSection === 'level' && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') ? (
                                        <select
                                            name="levelId"
                                            value={editedData.levelId}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: 'auto' }}
                                        >
                                            {levelsToUse.map((l: any, idx: number) => (
                                                <option key={l.id} value={l.id}>{levelTerm} {idx + 1}: {l.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="value">{`${levelTerm} ${currentLevelId ? levelsToUse.findIndex((l: any) => l.id === currentLevelId) + 1 : 1}`}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="level-progress-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>{levelTerm}-Fortschritt</h2>
                            {/* FIX: Dropdown nur im Preview Mode anzeigen */}
                            {isPreviewMode && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                <div className="preview-selector" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vorschau:</span>
                                    <select
                                        value={previewLevelId}
                                        onChange={(e) => setPreviewLevelId(parseInt(e.target.value))}
                                        className="form-input"
                                        style={{ padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.875rem' }}
                                    >
                                        {levelsToUse.map((l: any) => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="levels-accordion">
                            {levelsToUse.map((level: any, index: number) => {
                                // Nutze previewLevelId für Anzeige (entspricht customer.level_id im Live-Mode)
                                const isActive = previewLevelId === level.id;
                                // Prüfe ob Level erledigt ist, indem wir den Index im Array vergleichen (sicherer als IDs)
                                const currentLevelIndex = levelsToUse.findIndex((l: any) => l.id === previewLevelId);
                                const isCompleted = currentLevelIndex > index;

                                const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
                                const colorIndex = (index % 5) + 1;
                                const isFirst = index === 0;
                                const isLast = index === levelsToUse.length - 1;

                                const requirements = level.requirements || [];
                                const mainRequirements = requirements.filter((r: any) => !r.is_additional);

                                // Prüfen ob Anforderungen erfüllt für Aufstieg (nur Pflicht-Anforderungen)
                                const currentProgress = getProgressForLevel(customer, level.id, levelsToUse, activeDogId || undefined);
                                const requirementsMet = mainRequirements.every((r: any) => {
                                    // Wir prüfen sowohl die ID als String als auch als Zahl
                                    const reqKey = r.training_type_id ? String(r.training_type_id) : String(r.id);
                                    const count = currentProgress[reqKey] || 0;
                                    const target = r.required || r.required_count || 1;
                                    return count >= target;
                                });

                                const canDoLevelUp = isActive && requirementsMet;

                                return (
                                    <React.Fragment key={level.id}>
                                        <div className={`level-item state-${state} ${isFirst ? 'is-first' : ''} ${isLast ? 'is-last' : ''}`}>
                                            <div className={`level-header header-level-${colorIndex}`}>
                                                <div className={`level-number level-${colorIndex}`}>{index + 1}</div>
                                                <div className="level-title">{level.name}</div>
                                                <span className="level-status-badge">{isCompleted ? 'Abgeschlossen' : isActive ? 'Aktuell' : 'Gesperrt'}</span>
                                            </div>

                                            {isActive && (
                                                <div className="level-content">
                                                    {mainRequirements.length > 0 ? (
                                                        <ul>
                                                            {mainRequirements.map((r: any) => {
                                                                const reqId = r.training_type_id || r.id;
                                                                const reqName = r.name || (r.training_type ? r.training_type.name : 'Anforderung');
                                                                const requiredCount = r.required_count || r.required;
                                                                const renderObj = { id: reqId, name: reqName, required: requiredCount };

                                                                return renderRequirement(renderObj, () => getProgressForLevel(customer, level.id, levelsToUse, activeDogId || undefined));
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="no-requirements">Keine besonderen Anforderungen in diesem {levelTerm}.</p>
                                                    )}

                                                    {canDoLevelUp && !isLast && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                                        <div className="level-up-button-container" style={{ marginTop: '1rem' }}>
                                                            {/* Nimm die ID des nächsten Levels aus dem Array */}
                                                            <button className="button button-primary" onClick={() => {
                                                                const nextLevel = levelsToUse[index + 1];
                                                                handleLevelUp(String(customer.id), nextLevel.id, activeDogId || undefined);
                                                                setPreviewLevelId(nextLevel.id);
                                                            }}>
                                                                {levelTerm} Aufsteigen!
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* ZUSATZLEISTUNGEN SEKTION MIT HINWEIS */}
                    {levelsToUse.some((l: any) => l.has_additional_requirements) && (
                        <div className="level-progress-container" style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h2>Zusatz-Veranstaltungen</h2>
                                {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && canEditCustomers && (
                                    <button className="button-as-link" onClick={() => handleStartEditing('additional')} style={{ padding: 0, height: 'auto' }}>
                                        <Icon name="edit" width={14} height={14} />
                                    </button>
                                )}
                                {editingSection === 'additional' && (
                                    <button className="button-as-link" onClick={handleCancelEdit} style={{ padding: 0, height: 'auto', color: 'var(--success-color)' }}>
                                        <Icon name="check" width={16} height={16} />
                                    </button>
                                )}
                            </div>
                            {levelsToUse.filter((l: any) => l.has_additional_requirements).map((level: any) => (
                                <div key={`additional-${level.id}`} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        für "{level.name}"
                                    </h3>
                                    <div className="level-content" style={{ padding: 0 }}>
                                        <ul>
                                            {level.requirements
                                                .filter((r: any) => r.is_additional)
                                                .map((r: any) => {
                                                    const reqId = r.training_type_id || r.id;
                                                    const reqName = r.name || (r.training_type ? r.training_type.name : 'Zusatzleistung');
                                                    const requiredCount = r.required_count || r.required;
                                                    const renderObj = { id: reqId, name: reqName, required: requiredCount };

                                                    if (editingSection === 'additional' && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter')) {
                                                        const progress = getProgressForLevel(customer, level.id, levelsToUse);
                                                        const currentCount = Math.min(progress[String(reqId)] || 0, requiredCount);
                                                        const isCompleted = currentCount >= requiredCount;

                                                        return (
                                                            <li key={reqId} style={{ cursor: 'pointer' }} onClick={() => handleToggleAdditionalService(r, level.id)}>
                                                                <div className={`req-icon ${isCompleted ? 'completed' : 'incomplete'}`}>
                                                                    {isCompleted ? <Icon name="check" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--text-secondary)' }}></div>}
                                                                </div>
                                                                <span className="req-text">{reqName}</span>
                                                            </li>
                                                        );
                                                    }

                                                    return renderRequirement(renderObj, () => getProgressForLevel(customer, level.id, levelsToUse));
                                                })
                                            }
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="side-col">
                    <div 
                        className="side-card status-card"
                        style={currentLevelColor ? { borderColor: currentLevelColor, background: `${currentLevelColor}08` } : {}}
                    >
                        {(displayLevel?.badgeImage || displayLevel?.icon_url || displayLevel?.imageUrl) && (
                            <img
                                src={displayLevel.badgeImage || displayLevel.icon_url || displayLevel.imageUrl}
                                alt={displayLevel.name}
                                style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    objectFit: 'contain', 
                                    marginBottom: '1rem',
                                    filter: currentLevelColor ? `drop-shadow(0 0 10px ${currentLevelColor}44)` : 'none'
                                }}
                            />
                        )}
                        <h3>{displayLevel?.name}</h3>
                        <p>Aktueller Status des Kunden</p>
                    </div>
                    <div className="side-card">
                        <h2>Konto-Übersicht</h2>
                        <ul className="info-list">
                            <li><span className="label">Guthaben</span><span className="value">€ {Math.floor(customer.balance).toLocaleString('de-DE')}</span></li>
                            <li><span className="label">Transaktionen</span><span className="value">{customerTransactions.length}</span></li>
                            <li><span className="label">Kunde seit</span><span className="value">{new Date(customer.customer_since as any).toLocaleDateString('de-DE')}</span></li>
                            <li><span className="label">Kundennummer</span><span className="value">{customer.id || '-'}</span></li>
                        </ul>
                        {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                            <button 
                                className="button button-secondary" 
                                onClick={() => setIsAppointmentsModalOpen(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                            >
                                <Icon name="calendar" width={18} height={18} />
                                Gebuchte Termine
                            </button>
                        )}
                    </div>
                    <div className="side-card qr-code-container">
                        <h2>QR-Code</h2>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/customer/${customer.auth_id}`}
                            alt="QR Code"
                            style={{
                                width: '100%',
                                maxWidth: '120px',
                                margin: '0.5rem auto',
                                borderRadius: '0.5rem',
                                display: 'block',
                                // Invertiert die Farben (Schwarz->Weiß, Weiß->Schwarz)
                                filter: isDarkMode ? 'invert(1)' : 'none',
                                // "Screen" macht Schwarz transparent und lässt Weiß sichtbar -> Perfekt für Dark Mode
                                mixBlendMode: isDarkMode ? 'screen' : 'normal'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
                            Scannen um Kundenprofil direkt aufzurufen.
                        </p>
                    </div>
                    <div className="side-card">
                        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Trainingsplan
                            {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                <button 
                                    onClick={() => setIsHomeworkModalOpen(true)} 
                                    className="button-as-link"
                                    style={{ color: 'var(--primary-color)', padding: '4px' }}
                                    title="Hausaufgabe zuweisen"
                                >
                                    <Icon name="plus" size={20} />
                                </button>
                            )}
                            {(currentUser.role === 'customer' || currentUser.role === 'kunde') && (
                                <button 
                                    onClick={() => setView({ page: 'homework' })} 
                                    className="button button-primary"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}
                                >
                                    Alle ansehen
                                </button>
                            )}
                        </h2>
                        {homework.isLoading ? <LoadingSpinner message="Hausaufgaben werden geladen..." /> : (
                            <TooltipProvider>
                                <ul className="document-list">
                                    {homework.data?.length > 0 ? homework.data.map((hw: any) => (
                                        <li key={hw.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Icon name={hw.is_completed ? "check" : "calendar"} style={{ color: hw.is_completed ? 'var(--brand-green)' : 'var(--text-secondary)' }} />
                                                    <span style={{ fontWeight: 500 }}>{hw.title}</span>
                                                </div>
                                                {hw.is_completed && <span className="badge badge-green">Erledigt</span>}
                                            </div>
                                            {hw.description && (
                                                <div className="text-sm text-gray-600 mt-1" style={{ paddingLeft: '1.75rem' }}>
                                                    {hw.description}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.75rem', paddingLeft: '1.75rem', marginTop: '0.25rem' }}>
                                                {hw.video_url && (
                                                    <a href={hw.video_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                                                        <Icon name="video" size={16} />
                                                    </a>
                                                )}
                                                {hw.file_url && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <a href={hw.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                                                                <Icon name={getFileIcon(hw.file_name)} size={16} />
                                                            </a>
                                                        </TooltipTrigger>
                                                        <TooltipContent aria-label={hw.file_name || 'Datei öffnen'}>
                                                            <p>{hw.file_name || 'Datei öffnen'}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {hw.attachments?.map((att: any, idx: number) => (
                                                    <Tooltip key={idx}>
                                                        <TooltipTrigger asChild>
                                                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                                                                <Icon name={getFileIcon(att.file_name, att.type)} size={16} />
                                                            </a>
                                                        </TooltipTrigger>
                                                        <TooltipContent aria-label={att.file_name || 'Datei öffnen'}>
                                                            <p>{att.file_name || 'Datei öffnen'}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                            {hw.client_feedback && (
                                                <div className="text-sm italic text-gray-500 mt-1" style={{ paddingLeft: '1.75rem', borderLeft: '2px solid #eee' }}>
                                                    "{hw.client_feedback}"
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400" style={{ paddingLeft: '1.75rem' }}>
                                                Zugewiesen am {new Date(hw.created_at).toLocaleDateString('de-DE')}
                                            </div>
                                        </li>
                                    )) : (
                                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Keine Hausaufgaben zugewiesen.</p>
                                    )}
                                </ul>
                            </TooltipProvider>
                        )}
                    </div>

                    <div className="side-card">
                        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Dokumentenverwaltung
                            <button 
                                onClick={handleUploadClick} 
                                className="button-as-link" 
                                aria-label="Dokument hochladen"
                                style={{ color: 'var(--primary-color)', padding: '4px' }}
                                title="Dokument hochladen"
                            >
                                <Icon name="plus" size={20} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                multiple
                                accept="image/*,.pdf"
                            />
                        </h2>
                        {customerDocuments.length > 0 ? (
                            <ul className="document-list">
                                {customerDocuments.map((doc: any) => (
                                    <li key={doc.id}>
                                        <Icon name="file" className="doc-icon" />
                                        <div className="doc-info" onClick={async () => {
                                            try {
                                                // 1. Hole die signierte URL vom Backend (mit Auth-Token!)
                                                const response: any = await apiClient.get(`/api/documents/${doc.id}`, authToken);

                                                // 2. Setze die echte Supabase-URL in den Viewer
                                                setViewingDocument({
                                                    name: doc.file_name,
                                                    type: doc.file_type,
                                                    url: response.url, // Hier nutzen wir die URL aus der JSON-Antwort
                                                    id: doc.id,
                                                    customerId: String(customer.id),
                                                    size: 0
                                                });
                                            } catch (e) {
                                                console.error("Fehler beim Laden des Dokuments", e);
                                                alert("Dokument konnte nicht geladen werden.");
                                            }
                                        }} role="button" tabIndex={0}>
                                            <div className="doc-name">{doc.file_name}</div>
                                            <div className="doc-size">{doc.file_type}</div>
                                        </div>
                                        <div className="doc-actions">
                                            <button className="action-icon-btn delete" onClick={() => setDeletingDocument(doc)} aria-label="Löschen"><Icon name="trash" /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Keine Dokumente vorhanden.</p>
                        )}
                    </div>
                </div>
            </div>
            {viewingDocument && <DocumentViewerModal document={viewingDocument} onClose={() => setViewingDocument(null)} />}
            {deletingDocument && (
                <DeleteDocumentModal
                    document={deletingDocument}
                    onClose={() => setDeletingDocument(null)}
                    onConfirm={() => {
                        onDeleteDocument(deletingDocument.id);
                        setDeletingDocument(null);
                    }}
                />
            )}
            {isTxModalOpen && (
                <InfoModal
                    title={`Transaktionen für ${firstName} ${lastName}`}
                    color="blue"
                    onClose={() => setIsTxModalOpen(false)}
                >
                    <ul className="info-modal-list">
                        {customerTransactions
                            .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())
                            .map(t => (
                                <li key={t.id}>
                                    <span>
                                        {new Date(t.date as any).toLocaleDateString('de-DE')} - {t.description?.split(' (Termin-ID:')[0]}
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontWeight: 600, color: t.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                            € {t.amount.toLocaleString('de-DE')}
                                        </span>
                                        {t.amount > 0 && t.bonus > 0 && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--brand-green)', marginTop: '-2px' }}>
                                                + € {t.bonus.toLocaleString('de-DE')} Bonus
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))
                        }
                    </ul>
                </InfoModal>
            )}

            {isHomeworkModalOpen && (
                <div className="modal-overlay" onClick={() => setIsHomeworkModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header blue">
                            <h2>Hausaufgabe zuweisen</h2>
                            <button className="close-button" onClick={() => {
                                setIsHomeworkModalOpen(false);
                                setIsCreatingCustomHomework(false);
                                setSelectedTemplate(null);
                            }}>
                                <Icon name="x" />
                            </button>
                        </div>
                        <div className="modal-body">

                            {/* Segmented Tabs für den sauberen Wechsel */}
                            <div className="segmented-tabs" style={{ marginBottom: '1.5rem' }}>
                                <button
                                    type="button"
                                    className={`segmented-tab-btn ${!isCreatingCustomHomework ? 'active' : ''}`}
                                    onClick={() => setIsCreatingCustomHomework(false)}
                                >
                                    <Icon name="book-open" size={18} /> Aus Katalog
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-tab-btn ${isCreatingCustomHomework ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsCreatingCustomHomework(true);
                                        setSelectedTemplate(null);
                                    }}
                                >
                                    <Icon name="edit" size={18} /> Individuell erstellen
                                </button>
                            </div>

                            {!isCreatingCustomHomework ? (
                                <div style={{ animation: 'slideIn 0.2s ease-out' }}>
                                    <div className="form-group">
                                        <label>Vorlage auswählen</label>
                                        <select
                                            className="form-input"
                                            value={selectedTemplate?.id || ''}
                                            onChange={e => {
                                                const t = templates.data?.find((x: any) => x.id === parseInt(e.target.value));
                                                setSelectedTemplate(t || null);
                                            }}
                                            style={{ fontSize: '1rem', padding: '0.75rem' }}
                                        >
                                            <option value="" disabled>-- Bitte wählen --</option>
                                            {templates.data?.map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedTemplate ? (
                                        <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--background-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedTemplate.title}</h3>
                                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                {selectedTemplate.description || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Keine Beschreibung hinterlegt.</span>}
                                            </p>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {selectedTemplate.video_url && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--brand-blue)', backgroundColor: 'var(--bg-accent-blue)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                                                        <Icon name="video" size={16} /> Video verknüpft
                                                    </div>
                                                )}
                                                {(selectedTemplate.file_url || (selectedTemplate.attachments && selectedTemplate.attachments.length > 0)) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--brand-green)', backgroundColor: 'var(--bg-accent-green)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                                                        <Icon name="file" size={16} /> Datei(en) verknüpft
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem', marginTop: '1.5rem' }}>
                                            <Icon name="book-open" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Wähle eine Vorlage aus dem Dropdown.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ animation: 'slideIn 0.2s ease-out', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Titel der Übung *</label>
                                        <input
                                            className="form-input"
                                            placeholder="z.B. Rückruftraining im Park"
                                            value={customHomework.title}
                                            onChange={e => setCustomHomework(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Beschreibung / Anleitung</label>
                                        <textarea
                                            className="form-input"
                                            placeholder="Schreibe hier die Schritte der Übung auf..."
                                            rows={4}
                                            value={customHomework.description}
                                            onChange={e => setCustomHomework(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Video-Link (YouTube / Vimeo)</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>
                                                <Icon name="video" size={18} />
                                            </div>
                                            <input
                                                className="form-input"
                                                style={{ paddingLeft: '2.5rem' }}
                                                placeholder="https://youtube.com/watch?v=..."
                                                value={customHomework.video_url}
                                                onChange={e => setCustomHomework(prev => ({ ...prev, video_url: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Dateien & Materialien anhängen</label>

                                        {/* Liste der bereits hochgeladenen Dateien */}
                                        {customHomework.attachments && customHomework.attachments.length > 0 && (
                                            <ul className="document-list" style={{ marginTop: '0', marginBottom: '1rem' }}>
                                                {customHomework.attachments.map((att, idx) => (
                                                    <li key={idx} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--background-secondary)', border: '1px solid var(--border-color)' }}>
                                                        <Icon name={att.type === 'video' ? 'video' : 'file-text'} className="doc-icon" style={{ color: 'var(--primary-color)' }} />
                                                        <div className="doc-info">
                                                            <div className="doc-name">{att.file_name}</div>
                                                        </div>
                                                        <div className="doc-actions">
                                                            <button
                                                                className="action-icon-btn delete"
                                                                onClick={() => setCustomHomework(prev => ({
                                                                    ...prev,
                                                                    attachments: prev.attachments.filter((_, i) => i !== idx)
                                                                }))}
                                                                title="Entfernen"
                                                            >
                                                                <Icon name="trash" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Upload Button Area */}
                                        <div
                                            onClick={() => !isUploadingHomeworkFile && homeworkFileInputRef.current?.click()}
                                            style={{
                                                border: '2px dashed var(--border-color)',
                                                padding: '1.5rem',
                                                textAlign: 'center',
                                                borderRadius: '0.75rem',
                                                backgroundColor: 'var(--background-secondary)',
                                                cursor: isUploadingHomeworkFile ? 'wait' : 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseOver={(e) => { if(!isUploadingHomeworkFile) e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                                            onMouseOut={(e) => { if(!isUploadingHomeworkFile) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                        >
                                            {isUploadingHomeworkFile ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                                    <Icon name="refresh" className="animate-spin" size={24} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Lädt hoch...</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                                        <Icon name="upload" size={20} />
                                                    </div>
                                                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Weiteren Anhang hinzufügen</span>
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Bilder, PDFs oder Videos</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={homeworkFileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleHomeworkFileUpload}
                                            accept="image/*,.pdf,.pptx,.ppt,.docx,video/*"
                                            multiple
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="button button-outline" onClick={() => setIsHomeworkModalOpen(false)}>Abbrechen</button>
                            <button
                                className="button button-primary"
                                onClick={handleAssignHomework}
                                disabled={assignHomework.isPending || (!isCreatingCustomHomework && !selectedTemplate) || (isCreatingCustomHomework && !customHomework.title)}
                                style={{ minWidth: '140px' }}
                            >
                                {assignHomework.isPending ? 'Weist zu...' : 'Zuweisen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isAppointmentsModalOpen && (
                <CustomerAppointmentsModal
                    isOpen={isAppointmentsModalOpen}
                    onClose={() => setIsAppointmentsModalOpen(false)}
                    bookings={customerBookings}
                    isLoading={isLoadingBookings}
                    isDarkMode={isDarkMode}
                    firstName={firstName}
                    lastName={lastName}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    getCategoryColor={getCategoryColor}
                    colorRules={levelsToUse} // Wir nutzen hier die Levels als ColorRules (vereinfacht) oder falls vorhanden echte ColorRules
                />
            )}
            <UpdateEmailModal 
                isOpen={isEmailModalOpen} 
                onClose={() => {
                    setIsEmailModalOpen(false);
                    setEditingSection(null);
                }} 
                currentEmail={customer.email || ''} 
                onSuccess={(newEmail) => {
                    // Die E-Mail im UI vorübergehend aktualisieren, damit der Nutzer sieht, dass die Änderung angefordert wurde
                    setEditedData(prev => ({ ...prev, email: newEmail }));
                }} 
            />
        </>
    );
};

const CustomerAppointmentsModal = ({ 
    isOpen, onClose, bookings, isLoading, isDarkMode, firstName, lastName, formatDate, formatTime, getCategoryColor, colorRules 
}: { 
    isOpen: boolean, onClose: () => void, bookings: any[], isLoading: boolean, isDarkMode?: boolean, firstName: string, lastName: string, formatDate: any, formatTime: any, getCategoryColor: any, colorRules?: any[] 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState<'future' | 'past'>('future');

    if (!isOpen) return null;

    const now = new Date();

    const filteredBookings = (bookings || [])
        .filter(b => {
            const a = b.appointment;
            if (!a) return false;
            const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || a.location?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            const startTime = new Date(a.start_time).getTime();
            if (timeFilter === 'future') {
                return startTime >= now.getTime();
            } else {
                return startTime < now.getTime();
            }
        })
        .sort((a, b) => {
            const timeA = new Date(a.appointment.start_time).getTime();
            const timeB = new Date(b.appointment.start_time).getTime();
            
            if (timeFilter === 'future') {
                return timeA - timeB;
            } else {
                return timeB - timeA;
            }
        });

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header blue">
                    <div>
                        <h2 style={{ margin: 0 }}>Gebuchte Termine</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
                            {firstName} {lastName}
                        </p>
                    </div>
                    <button className="close-button" onClick={onClose} aria-label="Schließen">
                        <Icon name="x" />
                    </button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nach Titel oder Ort suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                        <button
                            className={`button ${timeFilter === 'future' ? 'button-primary' : 'button-outline'}`}
                            style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                            onClick={() => setTimeFilter('future')}
                        >
                            Anstehend
                        </button>
                        <button
                            className={`button ${timeFilter === 'past' ? 'button-primary' : 'button-outline'}`}
                            style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                            onClick={() => setTimeFilter('past')}
                        >
                            Vergangen
                        </button>
                    </div>

                    <div className="event-list-container" style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '1rem', paddingRight: '0.5rem' }}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <div className="loading-spinner"></div>
                                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Lade Termine...</p>
                            </div>
                        ) : filteredBookings.length > 0 ? (
                            <ul className="event-list-styled">
                                {filteredBookings.map((booking) => {
                                    const a = booking.appointment;
                                    const date = new Date(a.start_time);
                                    const eventColor = getCategoryColor(a, colorRules);
                                    
                                    return (
                                        <li
                                            key={booking.id}
                                            className="event-item-styled template-item"
                                            style={{ position: 'relative', overflow: 'hidden', cursor: 'default', marginBottom: '0.75rem' }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: '12px',
                                                backgroundColor: eventColor
                                            }} />
                                            
                                            <div className="event-details" style={{ paddingLeft: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span className="event-title" style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</span>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <div className={`status-badge ${booking.status === 'confirmed' ? 'status-confirmed' : 'status-waitlist'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                                            {booking.status === 'confirmed' ? 'Bestätigt' : 'Warteliste'}
                                                        </div>
                                                        {booking.attended && (
                                                            <div className="status-badge status-attended" style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'var(--brand-green)', color: 'white' }}>
                                                                Teilgenommen
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="event-line-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Icon name="calendar" size={12} style={{ opacity: 0.7 }} />
                                                        {formatDate(date)}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Icon name="clock" size={12} style={{ opacity: 0.7 }} />
                                                        {formatTime(date)}
                                                    </span>
                                                    {a.location && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <Icon name="map-pin" size={12} style={{ opacity: 0.7 }} />
                                                            {a.location}
                                                        </span>
                                                    )}
                                                    {booking.dog && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <Icon name="dog" size={12} style={{ opacity: 0.7 }} />
                                                            {booking.dog.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <Icon name="calendar" width={48} height={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-secondary)' }}>Keine Buchungen für diesen Zeitraum gefunden.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="button button-secondary" onClick={onClose}>Schließen</button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailPage;
