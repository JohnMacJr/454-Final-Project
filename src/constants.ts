import type { Automaton } from './types';

// Canvas dimensions
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// State styling
export const STATE_RADIUS = 30;
export const STATE_FILL_COLOR = '#FFFFAA';

// Grid settings
export const GRID_SIZE = 20;

// Initial automaton data
export const INITIAL_AUTOMATON: Automaton = {
    states: [
        { id: 'q0', isStartState: true, isFinalState: false, x: 200, y: 300 },
    ],
    alphabet: new Set(['0', '1']),
    transitions: [],
};

