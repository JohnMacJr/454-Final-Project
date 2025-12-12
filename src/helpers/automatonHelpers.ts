import type { Automaton } from '../types';

/**
 * Saves an automaton to a JSON file
 */
export const saveAutomatonToFile = (automaton: Automaton, filename: string) => {
  const automatonToSave = {
    ...automaton,
    alphabet: Array.from(automaton.alphabet)
  };
  const json = JSON.stringify(automatonToSave, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Loads an automaton from a JSON file
 */
export const loadAutomatonFromFile = (
  onLoad: (automaton: Automaton) => void,
  onError?: (error: Error) => void
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const loaded = JSON.parse(json);
        
        // Convert alphabet array back to Set and ensure states have all required fields
        const automaton: Automaton = {
          ...loaded,
          alphabet: new Set(loaded.alphabet || []),
          states: (loaded.states || []).map((state: any) => ({
            ...state,
            hasLoopOnAllInputs: state.hasLoopOnAllInputs ?? false
          }))
        };
        
        onLoad(automaton);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Invalid JSON file');
        if (onError) {
          onError(err);
        } else {
          alert('Error loading automaton: Invalid JSON file.');
          console.error('Load error:', error);
        }
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

/**
 * Tests membership of a string in an automaton
 */
export const testMembership = (
  automaton: Automaton,
  inputString: string,
  isNFA: (automaton: Automaton) => boolean,
  runDFA: (automaton: Automaton, input: string) => boolean,
  runNFA: (automaton: Automaton, input: string) => boolean
): string => {
  if (inputString.length === 0) {
    return "Please enter an input string.";
  }

  const startState = automaton.states.find(s => s.isStartState);
  if (!startState) {
    return "Error: No start state defined. Please mark a state as the start state.";
  }

  const nfa = isNFA(automaton);
  const isAccepted = nfa ? runNFA(automaton, inputString) : runDFA(automaton, inputString);
  const automatonType = nfa ? 'NFA' : 'DFA';

  if (isAccepted) {
    return `[${automatonType}] String "${inputString}" is ACCEPTED.`;
  } else {
    return `[${automatonType}] String "${inputString}" is REJECTED.`;
  }
};
