// src/lib/utils.ts
import { LEVEL_REQUIREMENTS, DOGLICENSE_PREREQS, LEVELS } from './constants';

export const getInitials = (firstName: string, lastName: string = '') => {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
};

export const getAvatarColorClass = (name: string) => {
    const colors = ['blue', 'purple', 'green', 'orange', 'red'];
    if (!name) return 'avatar-gray';
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorIndex = Math.abs(charCodeSum) % colors.length;
    return `avatar-${colors[colorIndex]}`;
};

// --- Level Logic (Dynamisch & Statisch) ---

export const getPrereqProgress = (customer: any, untilDate?: Date) => {
    const progress: { [key: string]: number } = {};
    const prereqIds = new Set(DOGLICENSE_PREREQS.map(p => p.id));
    let achievementsToConsider = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    if (untilDate) {
        achievementsToConsider = achievementsToConsider.filter((ach: any) => new Date(ach.date_achieved) <= untilDate);
    }

    achievementsToConsider.forEach((ach: any) => {
        // Fallback für alte String-IDs
        if (ach.requirement_id && prereqIds.has(ach.requirement_id)) {
            progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
        }
    });
    return progress;
};

// Berechnet den Fortschritt basierend auf dynamischen Level-Daten ODER Konstanten
export const getProgressForLevel = (customer: any, levelId: number, dynamicLevels?: any[]) => {
    const progress: { [key: string]: number } = {};

    // 1. Anforderungen ermitteln (Dynamisch oder Statisch)
    let requirements: any[] = [];

    if (dynamicLevels && dynamicLevels.length > 0) {
        const level = dynamicLevels.find(l => l.id === levelId);
        if (level) requirements = level.requirements || [];
    } else {
        // Fallback auf Konstanten
        requirements = levelId === 5 ? DOGLICENSE_PREREQS : (LEVEL_REQUIREMENTS[levelId] || []);
    }

    if (requirements.length === 0) return progress;

    const unconsumedAchievements = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    unconsumedAchievements.forEach((ach: any) => {
        // Fall A: Dynamisches Backend (training_type_id ist Zahl)
        if (ach.training_type_id) {
            const key = String(ach.training_type_id);
            progress[key] = (progress[key] || 0) + 1;
        }
        // Fall B: Alte Mock-Daten (requirement_id ist String)
        if (ach.requirement_id) {
            progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
        }
    });

    return progress;
};

export const areLevelRequirementsMet = (customer: any, dynamicLevels?: any[]): boolean => {
    const currentLevelId = customer.level_id || 1;

    // 1. Dynamische Prüfung (Vorrangig)
    if (dynamicLevels && dynamicLevels.length > 0) {
        const currentLevel = dynamicLevels.find(l => l.id === currentLevelId);

        // Wenn Level nicht gefunden oder keine Anforderungen -> Level Up möglich (oder letztes Level)
        if (!currentLevel) return false;

        const requirements = currentLevel.requirements || [];
        if (requirements.length === 0) return true; // Keine Anforderungen = geschafft

        const progress = getProgressForLevel(customer, currentLevelId, dynamicLevels);

        return requirements.every((req: any) => {
            // Backend liefert training_type_id, wir nutzen das als Key
            const reqKey = String(req.training_type_id);
            const currentCount = progress[reqKey] || 0;
            return currentCount >= req.required_count;
        });
    }

    // 2. Statische Fallback-Logik (Legacy Code)
    // Fall 1: Level 5
    if (currentLevelId === 5) {
        const examReqs = LEVEL_REQUIREMENTS[5];
        const examProgress = getProgressForLevel(customer, 5);
        const prereqProgress = getPrereqProgress(customer); // Nutzt separate Logik für Zusatzkurse

        const examMet = examReqs.every(req => (examProgress[req.id] || 0) >= req.required);
        const prereqsMet = DOGLICENSE_PREREQS.every(req => (prereqProgress[req.id] || 0) >= req.required);

        return examMet && prereqsMet;
    }

    // Fall 2: Levels 1-4
    const requirements = LEVEL_REQUIREMENTS[currentLevelId];
    if (!requirements) return true;

    const progress = getProgressForLevel(customer, currentLevelId);

    const examRequirement = requirements.find(r => r.id === 'exam');
    if (examRequirement) {
        const otherRequirements = requirements.filter(r => r.id !== 'exam');
        const nonExamReqsMet = otherRequirements.every(req => (progress[req.id] || 0) >= req.required);
        return nonExamReqsMet && (progress['exam'] || 0) >= examRequirement.required;
    }

    return requirements.every(req => (progress[req.id] || 0) >= req.required);
};
