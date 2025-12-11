// src/types.ts

export interface State {
  id: string;
  isStartState: boolean;
  isFinalState: boolean;
  x: number;
  y: number;
}

export interface Transition {
  from: string;
  to: string;
  symbol: string; // '0', '1', 'ε', etc.
}

export interface Automaton {
  states: State[];
  alphabet: Set<string>;
  transitions: Transition[];
}
