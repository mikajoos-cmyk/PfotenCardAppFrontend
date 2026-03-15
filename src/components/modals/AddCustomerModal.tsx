
import React, { FC, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddCustomerModalProps {
    onClose: () => void;
    onAddCustomer: (data: any) => void;
}

const AddCustomerModal: FC<AddCustomerModalProps> = ({ onClose, onAddCustomer }) => {
    const [page, setPage] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dogName, setDogName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [chip, setChip] = useState('');
    const [dogBreed, setDogBreed] = useState('');
    const [dogBirthDate, setDogBirthDate] = useState('');

    const handleSubmit = () => {
        if (!firstName || !lastName || !dogName) {
            alert("Bitte alle Pflichtfelder (Vorname, Nachname, Hundename) ausfüllen.");
            return;
        }
        onAddCustomer({ firstName, lastName, dogName, email, phone, chip, dogBreed, dogBirthDate });
        onClose();
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Neuen Kunden anlegen</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex items-center justify-center mb-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${page >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>1</div>
                        <div className="w-12 h-1 bg-muted mx-2">
                            <div className={`h-full bg-primary transition-all ${page >= 2 ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${page >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
                    </div>

                    {page === 1 ? (
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">Vorname *</Label>
                                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">Nachname *</Label>
                                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-Mail</Label>
                                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Telefon</Label>
                                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dogName">Name des Hundes *</Label>
                                <Input id="dogName" value={dogName} onChange={e => setDogName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dogBreed">Rasse</Label>
                                <Input id="dogBreed" value={dogBreed} onChange={e => setDogBreed(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dogBirthDate">Geburtsdatum</Label>
                                <Input id="dogBirthDate" type="date" value={dogBirthDate} onChange={e => setDogBirthDate(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="chip">Chipnummer</Label>
                                <Input id="chip" value={chip} onChange={e => setChip(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {page === 1 ? (
                        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                    ) : (
                        <Button variant="outline" onClick={() => setPage(1)}>Zurück</Button>
                    )}
                    {page === 1 ? (
                        <Button onClick={() => setPage(2)}>Weiter</Button>
                    ) : (
                        <Button onClick={handleSubmit}>Kunden anlegen</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddCustomerModal;
