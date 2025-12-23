import React, { FC, useState, useEffect, useRef, ChangeEvent } from 'react';
import { View, DocumentFile, User } from '../../types';
import { LEVELS, VIP_LEVEL, EXPERT_LEVEL, LEVEL_REQUIREMENTS, DOGLICENSE_PREREQS } from '../../lib/constants';
import { getInitials, getAvatarColorClass, getProgressForLevel, areLevelRequirementsMet } from '../../lib/utils';
import { API_BASE_URL } from '../../lib/api';
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
}

const CustomerDetailPage: FC<CustomerDetailPageProps> = ({
    customer, transactions, setView, handleLevelUp, onSave, currentUser, users,
    onUploadDocuments, onDeleteDocument, fetchAppData, onDeleteUserClick,
    onToggleVipStatus, onToggleExpertStatus, setDogFormModal, setDeletingDog, levels,
    wording, isDarkMode
}) => {

    const levelTerm = wording?.level || 'Level';
    const vipTerm = wording?.vip || 'VIP';

    const nameParts = customer.name ? customer.name.split(' ') : [''];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const dog = customer.dogs && customer.dogs.length > 0 ? customer.dogs[0] : null;
    const dogName = dog?.name || '-';

    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState({
        firstName: '', lastName: '', email: '', phone: '', dogName: '', chip: '', breed: '', birth_date: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<DocumentFile | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [previewLevelId, setPreviewLevelId] = useState<number>(customer.level_id || 1);

    useEffect(() => {
        if (customer.level_id) {
            setPreviewLevelId(customer.level_id);
        }
    }, [customer.level_id]);

    useEffect(() => {
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);

    const handleStartEditing = () => {
        setEditedData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || '',
            phone: customer.phone || '',
            dogName: dog?.name || '',
            chip: dog?.chip || '',
            breed: dog?.breed || '',
            birth_date: dog?.birth_date || ''
        });
        setIsEditing(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEditedData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCancelEdit = () => setIsEditing(false);

    const handleSave = () => {
        const userPayload = {
            ...customer,
            name: `${editedData.firstName} ${editedData.lastName}`.trim(),
            email: editedData.email,
            phone: editedData.phone
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
            setIsEditing(false);
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

    const levelsToUse = levels || LEVELS;
    const canLevelUp = areLevelRequirementsMet(customer, levelsToUse);
    const customerTransactions = transactions.filter(t => t.user_id === customer.id);
    const creator = users.find(u => u.id === customer.createdBy);
    const firstLevelId = levelsToUse.length > 0 ? levelsToUse[0].id : 1;
    const currentLevelId = customer.level_id || firstLevelId;
    const showLevelUpButton = canLevelUp && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && currentLevelId < 5;

    let displayLevel = levelsToUse.find((l: any) => l.id === currentLevelId) || levelsToUse[0];
    if (customer.is_vip) { displayLevel = { ...VIP_LEVEL, name: `${vipTerm}-Kunde` }; }
    if (customer.is_expert) { displayLevel = EXPERT_LEVEL; }

    const renderRequirement = (req: { id: string; name: string; required: number }, progressProvider: () => { [key: string]: number }) => {
        const progress = progressProvider();
        const currentCount = Math.min(progress[req.id] || 0, req.required);
        const isCompleted = currentCount >= req.required;
        return (
            <li key={req.id}>
                <div className={`req-icon ${isCompleted ? 'completed' : 'incomplete'}`}><Icon name={isCompleted ? "check" : "x"} /></div>
                <span className="req-text">{req.name}</span>
                <span className="req-progress">{currentCount} / {req.required}</span>
            </li>
        );
    };

    const LevelUpButtonComponent = ({ customerId, nextLevelId }: { customerId: string, nextLevelId: number }) => (
        <div className="level-up-button-container">
            <button className="button button-secondary" onClick={() => handleLevelUp(customerId, nextLevelId)}>
                <Icon name="trendingUp" /> In {levelTerm} {nextLevelId} freischalten
            </button>
        </div>
    );
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
                            {isEditing ? (
                                <>
                                    <button className="button button-outline" onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className="button button-secondary" onClick={handleSave}>Speichern</button>
                                </>
                            ) : (
                                <>
                                    <button className="button button-outline" onClick={handleStartEditing}>Stammdaten bearbeiten</button>
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
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Vorname</label>{isEditing ? <input type="text" name="firstName" value={editedData.firstName} onChange={handleInputChange} disabled /> : <p>{firstName}</p>}</div></div>
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Nachname</label>{isEditing ? <input type="text" name="lastName" value={editedData.lastName} onChange={handleInputChange} disabled /> : <p>{lastName}</p>}</div></div>

                                <div className="data-field">
                                    <Icon name="mail" />
                                    <div className="field-content">
                                        <label>E-Mail</label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                name="email"
                                                value={editedData.email}
                                                onChange={handleInputChange}
                                                disabled={currentUser.role !== 'admin'}
                                                style={currentUser.role !== 'admin' ? { color: 'var(--text-secondary)', cursor: 'not-allowed' } : {}}
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
                                        {isEditing ? <input type="tel" name="phone" value={editedData.phone} onChange={handleInputChange} /> : <p>{customer.phone || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="heart" />
                                    <div className="field-content">
                                        <label>Hund</label>
                                        {isEditing ? <input type="text" name="dogName" value={editedData.dogName} onChange={handleInputChange} /> : <p>{dogName}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <img src="/paw.png" alt="Paw" style={{ width: '24px', height: '24px' }} />
                                    <div className="field-content">
                                        <label>Rasse</label>
                                        {isEditing ? <input type="text" name="breed" value={editedData.breed} onChange={handleInputChange} /> : <p>{dog?.breed || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Geburtstag</label>
                                        {isEditing ? <input type="date" name="birth_date" value={editedData.birth_date} onChange={handleInputChange} /> : <p>{dog?.birth_date || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Chipnummer</label>
                                        {isEditing ? <input type="text" name="chip" value={editedData.chip} onChange={handleInputChange} /> : <p>{dog?.chip || '-'}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="content-box account-overview-box">
                        <h2>Konto-Übersicht</h2>
                        <div className="overview-tile-grid">
                            <div className="overview-tile balance"><div className="tile-content"><span className="label">Aktuelles Guthaben</span><span className="value">{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div></div>
                            <button className="overview-tile clickable transactions" onClick={() => setIsTxModalOpen(true)}><div className="tile-content"><span className="label">Transaktionen gesamt</span><span className="value">{customerTransactions.length}</span></div></button>
                            <div className="overview-tile level">
                                <div className="tile-content">
                                    <span className="label">{displayLevel?.name}</span>
                                    <span className="value">{`${levelTerm} ${customer.level_id || 1}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="level-progress-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>{levelTerm}-Fortschritt</h2>
                            {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                <div className="preview-selector" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vorschau:</span>
                                    <select
                                        value={previewLevelId}
                                        onChange={(e) => setPreviewLevelId(parseInt(e.target.value))}
                                        className="form-input"
                                        style={{ padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.875rem' }}
                                    >
                                        {levelsToUse.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="levels-accordion">
                            {(() => {
                                return levelsToUse.map((level: any, index: number) => {
                                    const isActive = previewLevelId === level.id;
                                    const isCompleted = previewLevelId > level.id;
                                    const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
                                    const colorIndex = (index % 5) + 1;
                                    const isFirst = index === 0;
                                    const isLast = index === levelsToUse.length - 1;

                                    const requirements = level.requirements || LEVEL_REQUIREMENTS[level.id] || [];

                                    // NEU: Nur "Haupt"-Anforderungen anzeigen (keine Zusatzleistungen)
                                    const mainRequirements = requirements.filter((r: any) => !r.is_additional);

                                    const requirementsMet = requirements.length > 0 && requirements.every((r: any) => {
                                        const progress = getProgressForLevel(customer, level.id, levelsToUse);
                                        const reqKey = r.id ? String(r.id) : String(r.training_type_id);
                                        const count = progress[reqKey] || 0;
                                        return count >= (r.required || r.required_count);
                                    });

                                    const canLevelUp = isActive && requirementsMet;
                                    const canBecomeExpert = isActive && level.id === 5 && requirementsMet;

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
                                                                    const reqId = r.id ? String(r.id) : String(r.training_type_id);
                                                                    const reqName = r.name || (r.training_type ? r.training_type.name : 'Anforderung');
                                                                    const requiredCount = r.required || r.required_count;
                                                                    const renderObj = { id: reqId, name: reqName, required: requiredCount };

                                                                    return renderRequirement(renderObj, () => getProgressForLevel(customer, level.id, levelsToUse));
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <p className="no-requirements">Keine besonderen Anforderungen in diesem {levelTerm}.</p>
                                                        )}

                                                        {canLevelUp && level.id < 5 && (
                                                            <div className="level-up-button-container" style={{ marginTop: '1rem' }}>
                                                                <button className="button button-primary" onClick={() => handleLevelUp(String(customer.id), level.id + 1)}>
                                                                    {levelTerm} Aufsteigen!
                                                                </button>
                                                            </div>
                                                        )}

                                                        {level.id === 5 && (canBecomeExpert || customer.is_expert) && (
                                                            <div className="level-up-button-container">
                                                                {customer.is_expert ? (
                                                                    <button className="button button-outline button-small" onClick={() => onToggleExpertStatus(customer)}>
                                                                        Experten-Status aberkennen
                                                                    </button>
                                                                ) : (
                                                                    <button className="button button-secondary button-small" onClick={() => onToggleExpertStatus(customer)}>
                                                                        Zum Experten ernennen
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* ZUSATZLEISTUNGEN SEKTION MIT HINWEIS */}
                    {levelsToUse.some(l => l.has_additional_requirements) && (
                        <div className="level-progress-container" style={{ marginTop: '1.5rem' }}>
                            <h2 style={{ marginBottom: '0.5rem' }}>Zusatz-Veranstaltungen</h2>


                            {levelsToUse.filter(l => l.has_additional_requirements).map(level => (
                                <div key={`additional-${level.id}`} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        für "{level.name}"
                                    </h3>
                                    <div className="level-content" style={{ padding: 0 }}>
                                        <ul>
                                            {level.requirements
                                                .filter((r: any) => r.is_additional)
                                                .map((r: any) => {
                                                    const reqId = r.id ? String(r.id) : String(r.training_type_id);
                                                    const reqName = r.name || (r.training_type ? r.training_type.name : 'Zusatzleistung');
                                                    const requiredCount = r.required || r.required_count;
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
                            <li><span className="label">Erstellt von</span><span className="value">{creator?.name || '-'}</span></li>
                        </ul>
                    </div>
                    <div className="side-card qr-code-container">
                        <h2>QR-Code</h2>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/customer/${customer.id}`}
                            alt="QR Code"
                            style={{
                                width: '100%',
                                maxWidth: '120px',
                                margin: '0.5rem auto',
                                borderRadius: '0.5rem',
                                // Invertiert die Farben (Schwarz->Weiß, Weiß->Schwarz)
                                filter: isDarkMode ? 'invert(1)' : 'none',
                                // "Screen" macht Schwarz transparent und lässt Weiß sichtbar -> Perfekt für Dark Mode
                                mixBlendMode: isDarkMode ? 'screen' : 'normal'
                            }}
                        />
                        <p>Scannen, um diese Kundenkarte schnell aufzurufen.</p>
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
                                        <div className="doc-info" onClick={() => {
                                            const docUrl = `${API_BASE_URL}/api/documents/${doc.id}`;
                                            setViewingDocument({ name: doc.file_name, type: doc.file_type, url: docUrl, id: doc.id, customerId: String(customer.id), size: 0 });
                                        }} role="button" tabIndex={0}>
                                            <div className="doc-name">{doc.file_name}</div>
                                            <div className="doc-size">{doc.file_type}</div>
                                        </div>
                                        <div className="doc-actions">
                                            <button className="action-icon-btn delete" onClick={() => onDeleteDocument(doc)} aria-label="Löschen"><Icon name="trash" /></button>
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
                    title={`Transaktionen für ${customer.firstName} ${customer.lastName}`}
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