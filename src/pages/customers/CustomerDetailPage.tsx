import React, { FC, useState, useEffect, useRef, ChangeEvent } from 'react';
import { View, DocumentFile, User } from '../../types';
import { LEVELS, VIP_LEVEL, EXPERT_LEVEL, LEVEL_REQUIREMENTS, DOGLICENSE_PREREQS } from '../../lib/constants';
import { getInitials, getAvatarColorClass, getProgressForLevel, areLevelRequirementsMet } from '../../lib/utils';
import { API_BASE_URL, apiClient } from '../../lib/api';
import Icon from '../../components/ui/Icon';
import InfoModal from '../../components/modals/InfoModal';
import DocumentViewerModal from '../../components/modals/DocumentViewerModal';
import DeleteDocumentModal from '../../components/modals/DeleteDocumentModal';

interface CustomerDetailPageProps {
    customer: any;
    transactions: any[];
    setView: (view: View) => void;
    handleLevelUp: (customerId: string, newLevelId: number) => void;
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
}

const CustomerDetailPage: FC<CustomerDetailPageProps> = ({
    customer, transactions, setView, handleLevelUp, onSave, currentUser, users,
    onUploadDocuments, onDeleteDocument, fetchAppData, authToken, onDeleteUserClick,
    onToggleVipStatus, onToggleExpertStatus, setDogFormModal, setDeletingDog, levels,
    wording, isDarkMode, isPreviewMode
}) => {

    const levelTerm = wording?.level || 'Level';
    const vipTerm = wording?.vip || 'VIP';

    const nameParts = customer.name ? customer.name.split(' ') : [''];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const dog = customer.dogs && customer.dogs.length > 0 ? customer.dogs[0] : null;
    const dogName = dog?.name || '-';

    // Levels laden oder Mock nutzen
    const levelsToUse = levels || LEVELS;

    // FIX: Initiales Level bestimmen (vermeidet Fehler, wenn ID 1 nicht existiert)
    const getInitialLevelId = () => {
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

    const [editingSection, setEditingSection] = useState<'personal' | 'balance' | 'level' | null>(null);
    const isEditing = editingSection !== null;
    const [editedData, setEditedData] = useState({
        firstName: '', lastName: '', email: '', phone: '', dogName: '', chip: '', breed: '', birth_date: '',
        balance: 0, levelId: 0
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<DocumentFile | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [canShare, setCanShare] = useState(false);

    // Initialisiere mit korrekter Logik
    const [previewLevelId, setPreviewLevelId] = useState<number>(getInitialLevelId());

    // Update wenn sich der Kunde ändert (z.B. nach echtem Level-Up)
    useEffect(() => {
        setPreviewLevelId(getInitialLevelId());
    }, [customer.level_id, customer.current_level_id, levelsToUse]);

    useEffect(() => {
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);

    const handleStartEditing = (section: 'personal' | 'balance' | 'level') => {
        setEditedData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || '',
            phone: customer.phone || '',
            dogName: dog?.name || '',
            chip: dog?.chip || '',
            breed: dog?.breed || '',
            birth_date: dog?.birth_date || '',
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

    const handleSave = () => {
        const userPayload = {
            ...customer,
            name: `${editedData.firstName} ${editedData.lastName}`.trim(),
            email: editedData.email,
            phone: editedData.phone,
            balance: editedData.balance,
            level_id: editedData.levelId
        };

        let dogPayload = null;
        if (editedData.dogName) {
            if (dog) {
                dogPayload = { ...dog, name: editedData.dogName, chip: editedData.chip, breed: editedData.breed, birth_date: editedData.birth_date };
            } else {
                dogPayload = { name: editedData.dogName, chip: editedData.chip, breed: editedData.breed, birth_date: editedData.birth_date };
            }
        }

        onSave(userPayload, dogPayload).then(() => {
            setEditingSection(null);
        });
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const filesArray = Array.from(event.target.files);
            onUploadDocuments(filesArray, String(customer.id));
            event.target.value = '';
        }
    };

    // Helper Vars
    const canLevelUp = areLevelRequirementsMet(customer, levelsToUse);
    const customerTransactions = transactions.filter(t => t.user_id === customer.id);
    const creator = users.find(u => u.id === customer.createdBy);
    const currentLevelId = customer.level_id || customer.current_level_id || getInitialLevelId();

    // Button nur anzeigen wenn möglich und nicht das letzte Level
    const lastLevel = levelsToUse[levelsToUse.length - 1];
    const showLevelUpButton = canLevelUp && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (currentLevelId !== lastLevel?.id);

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
                                    <button className="button button-outline" onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className="button button-primary" onClick={handleSave}>Speichern</button>
                                </>
                            ) : (
                                <>
                                    <button className="button button-outline" onClick={() => handleStartEditing('personal')}>Stammdaten bearbeiten</button>
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
                                            <button
                                                className="button button-outline"
                                                style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }}
                                                onClick={() => onDeleteUserClick(customer)}>
                                                Kunde löschen
                                            </button>
                                            <button className="button button-primary" onClick={() => setView({ page: 'customers', subPage: 'transactions', customerId: String(customer.id) })}>Guthaben verwalten</button>
                                        </>
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
                        <h2 style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>Persönliche Daten</h2>
                        <div className="personal-data-container">
                            <div className={`personal-data-avatar ${getAvatarColorClass(firstName)}`}>
                                {getInitials(firstName, lastName)}
                            </div>
                            <div className="personal-data-fields">
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Vorname</label>{editingSection === 'personal' ? <input type="text" name="firstName" value={editedData.firstName} onChange={handleInputChange} disabled /> : <p>{firstName}</p>}</div></div>
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Nachname</label>{editingSection === 'personal' ? <input type="text" name="lastName" value={editedData.lastName} onChange={handleInputChange} disabled /> : <p>{lastName}</p>}</div></div>

                                <div className="data-field">
                                    <Icon name="mail" />
                                    <div className="field-content">
                                        <label>E-Mail</label>
                                        {editingSection === 'personal' ? (
                                            <input
                                                type="email"
                                                name="email"
                                                value={editedData.email}
                                                onChange={handleInputChange}
                                                disabled
                                                style={{ color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                            />
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
                                        {editingSection === 'personal' ? <input type="text" name="breed" value={editedData.breed} onChange={handleInputChange} /> : <p>{dog?.breed || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Geburtstag</label>
                                        {editingSection === 'personal' ? <input type="date" name="birth_date" value={editedData.birth_date} onChange={handleInputChange} /> : <p>{dog?.birth_date || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Chipnummer</label>
                                        {editingSection === 'personal' ? <input type="text" name="chip" value={editedData.chip} onChange={handleInputChange} /> : <p>{dog?.chip || '-'}</p>}
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
                                        {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
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
                                        <span className="value">{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    )}
                                </div>
                            </div>
                            <button className="overview-tile clickable transactions" onClick={() => setIsTxModalOpen(true)}><div className="tile-content"><span className="label">Transaktionen gesamt</span><span className="value">{customerTransactions.length}</span></div></button>
                            <div className="overview-tile level">
                                <div className="tile-content">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="label">{displayLevel?.name}</span>
                                        {editingSection === null && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
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
                                        <span className="value">{`${levelTerm} ${(customer.level_id || customer.current_level_id) ? levelsToUse.findIndex((l: any) => l.id === (customer.level_id || customer.current_level_id)) + 1 : 1}`}</span>
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

                                // Prüfen ob Anforderungen erfüllt für Aufstieg
                                const requirementsMet = requirements.length > 0 && requirements.every((r: any) => {
                                    const progress = getProgressForLevel(customer, level.id, levelsToUse);
                                    // Wir prüfen sowohl die ID als String als auch als Zahl
                                    const reqKey = r.training_type_id ? String(r.training_type_id) : String(r.id);
                                    const count = progress[reqKey] || 0;
                                    return count >= (r.required || r.required_count);
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

                                                                return renderRequirement(renderObj, () => getProgressForLevel(customer, level.id, levelsToUse));
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="no-requirements">Keine besonderen Anforderungen in diesem {levelTerm}.</p>
                                                    )}

                                                    {canDoLevelUp && !isLast && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                                        <div className="level-up-button-container" style={{ marginTop: '1rem' }}>
                                                            {/* Nimm die ID des nächsten Levels aus dem Array */}
                                                            <button className="button button-primary" onClick={() => handleLevelUp(String(customer.id), levelsToUse[index + 1].id)}>
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
                            <h2 style={{ marginBottom: '0.5rem' }}>Zusatz-Veranstaltungen</h2>
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
                    <div className="side-card status-card">
                        {(displayLevel?.badgeImage || displayLevel?.icon_url || displayLevel?.imageUrl) && (
                            <img
                                src={displayLevel.badgeImage || displayLevel.icon_url || displayLevel.imageUrl}
                                alt={displayLevel.name}
                                style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1rem' }}
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
                            Dokumentenverwaltung
                            <button onClick={handleUploadClick} className="button-as-link" aria-label="Dokument hochladen">
                                + Hochladen
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
                                        {new Date(t.date as any).toLocaleDateString('de-DE')} - {t.description}
                                    </span>
                                    <span style={{ fontWeight: 600, color: t.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                        € {t.amount.toLocaleString('de-DE')}
                                    </span>
                                </li>
                            ))
                        }
                    </ul>
                </InfoModal>
            )}
        </>
    );
};

export default CustomerDetailPage;