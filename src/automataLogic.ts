// src/automataLogic.ts

// src/automataLogic.ts
import type { Automaton, State, Transition } from './types';

//
// DFA: Helper Function
//
const getNextDFAState = (
  transitions: Transition[],
  currentStateId: string,
  symbol: string
): string | undefined => {
  const t = transitions.find(
    tr => tr.from === currentStateId && tr.symbol === symbol
  );
  return t?.to;
};

//
// DFA: Membership
//
export const runDFA = (automaton: Automaton, inputString: string): boolean => {
  const startState = automaton.states.find(s => s.isStartState);

  if (!startState) {
    console.error("DFA has no start state.");
    return false;
  }

  let current = startState.id;

  for (const symbol of inputString) {
    if (!automaton.alphabet.has(symbol)) {
      return false;
    }

    const next = getNextDFAState(automaton.transitions, current, symbol);
    if (!next) return false;

    current = next;
  }

  const finalState = automaton.states.find(s => s.id === current);
  return finalState?.isFinalState ?? false;
};

//
// NFA: Epsilon Closure
//
const getEpsilonClosure = (
  transitions: Transition[],
  initialStateIds: Set<string>
): Set<string> => {
  const closure = new Set(initialStateIds);
  const stack = [...initialStateIds];

  while (stack.length > 0) {
    const state = stack.pop()!;
    for (const t of transitions) {
      if (t.from === state && t.symbol === 'ε' && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return closure;
};

//
// NFA: Membership
//
export const runNFA = (automaton: Automaton, inputString: string): boolean => {
  const startState = automaton.states.find(s => s.isStartState);
  if (!startState) {
    console.error("NFA has no start state.");
    return false;
  }

  let currentStates = getEpsilonClosure(
    automaton.transitions,
    new Set([startState.id])
  );

  for (const symbol of inputString) {
    if (!automaton.alphabet.has(symbol)) return false;

    const nextStates = new Set<string>();

    for (const state of currentStates) {
      for (const t of automaton.transitions) {
        if (t.from === state && t.symbol === symbol) {
          nextStates.add(t.to);
        }
      }
    }

    currentStates = getEpsilonClosure(automaton.transitions, nextStates);
    if (currentStates.size === 0) return false;
  }

  const acceptingStates = new Set(
    automaton.states.filter(s => s.isFinalState).map(s => s.id)
  );

  for (const st of currentStates) {
    if (acceptingStates.has(st)) return true;
  }

  return false;
};

const isTargetReachable = (
    transitions: Transition[],
    startStateId: string,
    targetStatesIds: Set<string>
): boolean => {
    // We use Breadth-First Search (BFS) for simplicity.
    const queue = [startStateId];
    const visited = new Set<string>([startStateId]);

    while (queue.length > 0) {
        const current = queue.shift()!; // Dequeue the first element

        // If we reach a disagreement state, the language is not empty.
        if (targetStatesIds.has(current)) {
            return true;
        }

        // Find all outgoing transitions from the current product state
        const outgoingTransitions = transitions.filter(t => t.from === current);

        for (const t of outgoingTransitions) {
            if (!visited.has(t.to)) {
                visited.add(t.to);
                queue.push(t.to); // Enqueue the new state
            }
        }
    }

    return false; // No disagreement state was reachable.
};

export const checkDFAEquivalence = (M1: Automaton, M2: Automaton): boolean => {
  const q0_1 = M1.states.find(s => s.isStartState)?.id;
  const q0_2 = M2.states.find(s => s.isStartState)?.id;

  if (!q0_1 || !q0_2) return false;

  const F1 = new Set(M1.states.filter(s => s.isFinalState).map(s => s.id));
  const F2 = new Set(M2.states.filter(s => s.isFinalState).map(s => s.id));

  const combinedAlphabet = new Set([...M1.alphabet, ...M2.alphabet]);

  const DEAD1 = "__DEAD1";
  const DEAD2 = "__DEAD2";

  const getNextOrDead1 = (q: string, a: string): string =>
    getNextDFAState(M1.transitions, q, a) ?? DEAD1;

  const getNextOrDead2 = (q: string, a: string): string =>
    getNextDFAState(M2.transitions, q, a) ?? DEAD2;

  const productTransitions: Transition[] = [];
  const disagreementStates = new Set<string>();

  const startPair = `${q0_1},${q0_2}`;
  const queue = [startPair];
  const visited = new Set<string>([startPair]);

  while (queue.length > 0) {
    const pair = queue.shift()!;
    const [p, q] = pair.split(',');

    const pFinal = F1.has(p);
    const qFinal = F2.has(q);

    if (pFinal !== qFinal) disagreementStates.add(pair);

    for (const sym of combinedAlphabet) {
      const nextP = getNextOrDead1(p, sym);
      const nextQ = getNextOrDead2(q, sym);

      const nextPair = `${nextP},${nextQ}`;

      productTransitions.push({
        from: pair,
        to: nextPair,
        symbol: sym
      });

      if (!visited.has(nextPair)) {
        visited.add(nextPair);
        queue.push(nextPair);
      }
    }
  }

  const reachableDisagreement = isTargetReachable(
    productTransitions,
    startPair,
    disagreementStates
  );

  return !reachableDisagreement;
};

