import { LEVEL_REQUIREMENTS, DOGLICENSE_PREREQS } from './constants';

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

// Level Logic
export const getPrereqProgress = (customer: any, untilDate?: Date) => {
    const progress: { [key: string]: number } = {};
    const prereqIds = new Set(DOGLICENSE_PREREQS.map(p => p.id));
    let achievementsToConsider = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    if (untilDate) {
        achievementsToConsider = achievementsToConsider.filter((ach: any) => new Date(ach.date_achieved) <= untilDate);
    }

    achievementsToConsider.forEach((ach: any) => {
        if (prereqIds.has(ach.requirement_id)) {
            progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
        }
    });
    return progress;
};

export const getProgressForLevel = (customer: any, levelId: number) => {
    const progress: { [key: string]: number } = {};
    const requirements = levelId === 5 ? DOGLICENSE_PREREQS : (LEVEL_REQUIREMENTS[levelId] || []);
    if (requirements.length === 0) return progress;

    const unconsumedAchievements = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    unconsumedAchievements.forEach((ach: any) => {
        progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
    });

    return progress;
};

export const areLevelRequirementsMet = (customer: any): boolean => {
    const currentLevelId = customer.level_id || 1;

    // Fall 1: Level 5
    if (currentLevelId === 5) {
        const examReqs = LEVEL_REQUIREMENTS[5];
        const examProgress = getProgressForLevel(customer, 5);
        const prereqProgress = getProgressForLevel(customer, 5);

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
