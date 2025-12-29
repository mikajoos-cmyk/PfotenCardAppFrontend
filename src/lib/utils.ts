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

export const getProgressForLevel = (customer: any, levelId: number, dynamicLevels?: any[]) => {
    const progress: { [key: string]: number } = {};
    let requirements: any[] = [];

    // 1. Versuche dynamische Daten zu nutzen
    if (dynamicLevels && dynamicLevels.length > 0) {
        const level = dynamicLevels.find(l => l.id === levelId);
        if (level) {
            // Wir betrachten ALLE Requirements dieses Levels (auch Zusatzleistungen)
            requirements = level.requirements || [];
        }
    } else {
        // Fallback (Legacy)
        requirements = LEVEL_REQUIREMENTS[levelId] || [];
        // Sonderfall Level 5 alt
        if (levelId === 5) requirements = [...requirements, ...DOGLICENSE_PREREQS];
    }

    if (requirements.length === 0) return progress;

    // Nur ungenutzte Achievements zählen für den Fortschritt
    const unconsumedAchievements = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    const fullAchievementCounts: { [key: string]: number } = {};
    unconsumedAchievements.forEach((ach: any) => {
        if (ach.training_type_id) {
            const key = String(ach.training_type_id);
            fullAchievementCounts[key] = (fullAchievementCounts[key] || 0) + 1;
        }
        if (ach.requirement_id) {
            fullAchievementCounts[ach.requirement_id] = (fullAchievementCounts[ach.requirement_id] || 0) + 1;
        }
    });

    // Split requirements into exam and non-exam
    const examReqs = requirements.filter((r: any) => (r.training_type?.category || r.category) === 'exam');
    const nonExamReqs = requirements.filter((r: any) => (r.training_type?.category || r.category) !== 'exam');

    // 1. Count non-exam requirements first
    let allNonExamMet = true;
    nonExamReqs.forEach((req: any) => {
        const reqKey = req.training_type_id ? String(req.training_type_id) : String(req.id);
        const count = fullAchievementCounts[reqKey] || 0;
        const target = req.required_count || req.required || 1;
        progress[reqKey] = count;
        if (count < target) allNonExamMet = false;
    });

    // 2. Only count exams if all non-exam requirements are met
    examReqs.forEach((req: any) => {
        const reqKey = req.training_type_id ? String(req.training_type_id) : String(req.id);
        if (allNonExamMet) {
            progress[reqKey] = fullAchievementCounts[reqKey] || 0;
        } else {
            progress[reqKey] = 0; // Show 0 if not eligible to count exams yet
        }
    });

    return progress;
};

export const areLevelRequirementsMet = (customer: any, dynamicLevels?: any[]): boolean => {
    const currentLevelId = customer.level_id || customer.current_level_id || 1;

    if (dynamicLevels && dynamicLevels.length > 0) {
        const currentLevel = dynamicLevels.find(l => l.id === currentLevelId);
        // Wenn kein Level da oder keine Anforderungen -> Level Up möglich
        if (!currentLevel) return false;

        // Filtere nur die PFLICHT-Anforderungen (is_additional == false)
        const requirements = (currentLevel.requirements || []).filter((r: any) => !r.is_additional);

        if (requirements.length === 0) return true;

        const progress = getProgressForLevel(customer, currentLevelId, dynamicLevels);

        return requirements.every((req: any) => {
            const reqKey = req.training_type_id ? String(req.training_type_id) : String(req.id);
            const currentCount = progress[reqKey] || 0;
            const targetCount = req.required_count || req.required || 1;
            return currentCount >= targetCount;
        });
    }

    // Legacy Fallback (falls Config nicht geladen)
    return false;
};

export const getContrastColor = (hexColor: string) => {
    if (!hexColor) return '#0F172A';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#0F172A';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0F172A' : '#FFFFFF';
};

export const getAdjustedColor = (hex: string, percent: number) => {
    let hexClean = hex.replace('#', '');
    if (hexClean.length !== 6) hexClean = 'FFFFFF';
    const num = parseInt(hexClean, 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
};

export const isDarkColor = (hexColor: string) => {
    if (!hexColor) return false;
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance <= 0.5;
};
