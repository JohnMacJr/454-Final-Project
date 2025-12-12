import { useEffect } from 'react';
import type { Automaton, Transition } from '../types';

interface KeyboardShortcutsProps {
  selectedState1: string | null;
  selectedState2: string | null;
  hoveredTransition1: Transition | null;
  hoveredTransition2: Transition | null;
  setAutomaton1: React.Dispatch<React.SetStateAction<Automaton>>;
  setAutomaton2: React.Dispatch<React.SetStateAction<Automaton>>;
  setSelectedState1: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedState2: React.Dispatch<React.SetStateAction<string | null>>;
  setTransitionFrom1: React.Dispatch<React.SetStateAction<string | null>>;
  setTransitionFrom2: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredTransition1: React.Dispatch<React.SetStateAction<Transition | null>>;
  setHoveredTransition2: React.Dispatch<React.SetStateAction<Transition | null>>;
}

/**
 * Custom hook to handle keyboard shortcuts
 */
export const useKeyboardShortcuts = ({
  selectedState1,
  selectedState2,
  hoveredTransition1,
  hoveredTransition2,
  setAutomaton1,
  setAutomaton2,
  setSelectedState1,
  setSelectedState2,
  setTransitionFrom1,
  setTransitionFrom2,
  setHoveredTransition1,
  setHoveredTransition2,
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - delete selected state or hovered transition (check both automata)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedState1) {
          if (window.confirm(`Delete state "${selectedState1}" and all its transitions?`)) {
            setAutomaton1(prev => ({
              ...prev,
              states: prev.states.filter(s => s.id !== selectedState1),
              transitions: prev.transitions.filter(t => t.from !== selectedState1 && t.to !== selectedState1)
            }));
            setSelectedState1(null);
            setTransitionFrom1(null);
          }
        } else if (selectedState2) {
          if (window.confirm(`Delete state "${selectedState2}" and all its transitions?`)) {
            setAutomaton2(prev => ({
              ...prev,
              states: prev.states.filter(s => s.id !== selectedState2),
              transitions: prev.transitions.filter(t => t.from !== selectedState2 && t.to !== selectedState2)
            }));
            setSelectedState2(null);
            setTransitionFrom2(null);
          }
        } else if (hoveredTransition1) {
          setAutomaton1(prev => ({
            ...prev,
            transitions: prev.transitions.filter(t => 
              !(t.from === hoveredTransition1.from && t.to === hoveredTransition1.to && t.symbol === hoveredTransition1.symbol)
            )
          }));
          setHoveredTransition1(null);
        } else if (hoveredTransition2) {
          setAutomaton2(prev => ({
            ...prev,
            transitions: prev.transitions.filter(t => 
              !(t.from === hoveredTransition2.from && t.to === hoveredTransition2.to && t.symbol === hoveredTransition2.symbol)
            )
          }));
          setHoveredTransition2(null);
        }
      }
      
      // Escape key - cancel transition creation or clear selection
      if (e.key === 'Escape') {
        setTransitionFrom1(null);
        setSelectedState1(null);
        setTransitionFrom2(null);
        setSelectedState2(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedState1, selectedState2, hoveredTransition1, hoveredTransition2, 
      setAutomaton1, setAutomaton2, setSelectedState1, setSelectedState2, 
      setTransitionFrom1, setTransitionFrom2, setHoveredTransition1, setHoveredTransition2]);
};
