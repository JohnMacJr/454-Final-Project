import type { Transition } from './types';

/**
 * Groups transitions by their (from, to) pair
 * Used to handle multiple transitions between the same states
 */
export const groupTransitions = (transitions: Transition[]) => {
    const groups = new Map<string, Transition[]>();
    for (const t of transitions) {
        const key = `${t.from},${t.to}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(t);
    }
    return groups;
};

