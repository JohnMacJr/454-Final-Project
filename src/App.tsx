// src/App.tsx

import React, { useState } from 'react';
import { Stage, Layer, Circle, Text, Arrow } from 'react-konva'; 
import Konva from 'konva';
import type { Automaton, State, Transition } from './types';
// Import your logic functions (assuming you will create/implement these files)
// import { runDFA, runNFA } from './automataLogic'; 

// Define Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const STATE_RADIUS = 30;
const STATE_FILL_COLOR = '#FFFFAA'; 

// --- INITIAL DATA ---
const INITIAL_AUTOMATON: Automaton = {
    states: [
        { id: 'q0', isStartState: true, isFinalState: false, x: 200, y: 300 },
    ],
    alphabet: new Set(['0', '1']),
    transitions: [],
};

// =============================================================
//   TRANSITION ARROWS HELPERS AND COMPONENT
// =============================================================

// Helper function to aggregate and group transitions by their (from, to) pair
const groupTransitions = (transitions: Transition[]) => {
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

interface TransitionArrowProps {
    fromState: State;
    toState: State;
    transition: Transition;
    allTransitions: Transition[]; 
}

const TransitionArrow: React.FC<TransitionArrowProps> = ({ fromState, toState, transition, allTransitions }) => {
    const isLoop = fromState.id === toState.id;
    const groups = groupTransitions(allTransitions);
    const key = `${fromState.id},${toState.id}`;
    
    // Transitions that share the same (from, to) pair
    const matchingTransitions = groups.get(key) || [];
    const count = matchingTransitions.length;
    const index = matchingTransitions.findIndex(t => t === transition);

    // Check for reverse transition (for bidirectional offset)
    const reverseKey = `${toState.id},${fromState.id}`;
    const reverseTransitionExists = groups.has(reverseKey);

    let curveOffset = 0;
    
    if (isLoop) {
        // ===== SELF LOOP ARROW (Draws a loop above the state) =====
        const loopRadius = STATE_RADIUS + 15 + index * 10; // Stagger loops if multiple
        const startAngle = -Math.PI / 2 + 0.1; 
        const endAngle = -Math.PI / 2 - 0.1; 
        const centerX = fromState.x;
        const centerY = fromState.y - loopRadius; 

        return (
            <React.Fragment key={key + index}>
                <Arrow
                    points={[
                        fromState.x + STATE_RADIUS * Math.cos(startAngle), fromState.y + STATE_RADIUS * Math.sin(startAngle),
                        centerX + loopRadius * Math.cos(-Math.PI * 0.4), centerY + loopRadius * Math.sin(-Math.PI * 0.4),
                        centerX + loopRadius * Math.cos(-Math.PI * 0.6), centerY + loopRadius * Math.sin(-Math.PI * 0.6),
                        fromState.x + STATE_RADIUS * Math.cos(endAngle), fromState.y + STATE_RADIUS * Math.sin(endAngle),
                    ]}
                    stroke="black"
                    fill="black"
                    strokeWidth={2}
                    pointerLength={10}
                    pointerWidth={10}
                    tension={0.5} 
                />
                 <Text
                    x={centerX}
                    y={centerY - loopRadius - 5}
                    text={transition.symbol}
                    fontSize={14}
                    fill="black"
                    offsetX={transition.symbol.length * 4}
                />
            </React.Fragment>
        );
    } 
    
    // ===== CURVED EDGES (Non-loops) =====
    
    // 1. Calculate Multi-Transition Offset
    if (count > 1) {
        const middle = (count - 1) / 2;
        curveOffset = (index - middle) * 15; // Offset each transition by 15px
    }

    // 2. Add Fixed Reverse Offset (The fix for parallel arrows)
    let totalOffset = curveOffset;
    if (reverseTransitionExists) {
        // If reverse exists, give it a fixed push away from the center line.
        // We ensure the curveOffset shifts it further outward if needed.
        totalOffset = curveOffset + (curveOffset >= 0 ? 15 : -15);
    }


    // 3. Geometry Calculations
    const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
    const startX = fromState.x + STATE_RADIUS * Math.cos(angle);
    const startY = fromState.y + STATE_RADIUS * Math.sin(angle);
    const endX = toState.x - STATE_RADIUS * Math.cos(angle);
    const endY = toState.y - STATE_RADIUS * Math.sin(angle);
    const perpAngle = angle - Math.PI / 2;

    // Midpoint applying the total offset
    const midX = (startX + endX) / 2 + Math.cos(perpAngle) * totalOffset;
    const midY = (startY + endY) / 2 + Math.sin(perpAngle) * totalOffset;
    
    return (
        <React.Fragment key={key + index}>
            <Arrow
                points={[startX, startY, midX, midY, endX, endY]}
                stroke="black"
                fill="black"
                strokeWidth={2}
                pointerLength={10}
                pointerWidth={10}
                tension={0.5} // Makes the line a curve through the midpoint
            />
            
            {/* Transition Label (Rendered near the midpoint) */}
            <Text
                x={midX}
                y={midY}
                text={transition.symbol}
                fontSize={16}
                fill="black"
                // Offset slightly based on the angle so the text is not directly under the line
                offsetX={transition.symbol.length * 4}
                offsetY={angle > -Math.PI/2 && angle < Math.PI/2 ? 15 : -25}
            />
        </React.Fragment>
    );
};


// =============================================================
//   STATE NODES
// =============================================================
interface StateNodeProps {
    state: State;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>, stateId: string) => void;
    onClick: (stateId: string) => void;
    isSelected: boolean;
}

const StateNode: React.FC<StateNodeProps> = ({ state, onDragEnd, onContextMenu, onClick, isSelected }) => {
    const strokeColor = isSelected ? 'red' : (state.isFinalState ? 'blue' : 'black');
    const strokeWidth = isSelected ? 4 : 2;

    const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault();
        onContextMenu(e, state.id);
    };

    return (
        <React.Fragment key={state.id}>
            
            {/* Start arrow */}
            {state.isStartState && (
                <Arrow
                    points={[state.x - 70, state.y, state.x - STATE_RADIUS, state.y]}
                    stroke="black"
                    fill="black"
                    strokeWidth={2}
                    pointerLength={10}
                    pointerWidth={10}
                    listening={false}
                />
            )}

            {/* Double circle for final state */}
            {state.isFinalState && (
                <Circle
                    x={state.x}
                    y={state.y}
                    radius={STATE_RADIUS + 5}
                    stroke={strokeColor}
                    strokeWidth={2}
                    listening={false}
                />
            )}

            {/* Main state circle */}
            <Circle
                x={state.x}
                y={state.y}
                radius={STATE_RADIUS}
                fill={STATE_FILL_COLOR}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                draggable
                onDragEnd={onDragEnd}
                onContextMenu={handleContextMenu}
                onClick={() => onClick(state.id)}
            />

            {/* Label */}
            <Text
                x={state.x}
                y={state.y}
                text={state.id}
                fontSize={16}
                fill="black"
                offsetX={state.id.length * 4}
                offsetY={8}
                listening={false}
            />
        </React.Fragment>
    );
};


// =============================================================
//   MAIN APP COMPONENT
// =============================================================
function App() {
    const [automaton, setAutomaton] = useState<Automaton>(INITIAL_AUTOMATON);
    const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
    const [testInput, setTestInput] = useState('');
    const [result, setResult] = useState<string | null>(null);


    const updateAutomaton = (updates: Partial<Automaton>) => {
        setAutomaton(prev => ({ ...prev, ...updates }));
    };

    // --- UTILITIES ---
    const findState = (id: string) => automaton.states.find(s => s.id === id);


    // --- INTERACTION HANDLERS ---

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, stateId: string) => {
        updateAutomaton({
            states: automaton.states.map(s =>
                s.id === stateId ? { ...s, x: e.target.x(), y: e.target.y() } : s
            ),
        });
    };

    const handleStageDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target.getClassName() !== 'Stage') return;

        const x = e.evt.layerX;
        const y = e.evt.layerY;
        const newId = `q${automaton.states.length}`;

        updateAutomaton({
            states: [
                ...automaton.states,
                { id: newId, isStartState: false, isFinalState: false, x, y }
            ],
        });
    };

    const handleToggleFinal = (_e: any, id: string) => {
        updateAutomaton({
            states: automaton.states.map(s =>
                s.id === id ? { ...s, isFinalState: !s.isFinalState } : s
            )
        });
    };

    const handleClickOnState = (stateId: string) => {
        if (!transitionFrom) {
            setTransitionFrom(stateId);
            return;
        }

        const from = transitionFrom;
        const to = stateId;

        const symbol = prompt(`Enter symbol(s) for transition ${from} → ${to} (comma-separated):`);

        if (symbol) {
            const symbols = symbol.split(',').map(s => s.trim());
            const newTransitions = symbols.map(sym => ({
                from, to, symbol: sym
            }));

            updateAutomaton({
                transitions: [...automaton.transitions, ...newTransitions]
            });

            const newAlphabet = new Set(automaton.alphabet);
            symbols.forEach(s => {
                const trimmedSymbol = s;
                if (trimmedSymbol !== 'ε' && trimmedSymbol.length > 0) newAlphabet.add(trimmedSymbol);
            });
            updateAutomaton({ alphabet: newAlphabet });
        }

        setTransitionFrom(null);
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target.getClassName() === 'Stage') setTransitionFrom(null);
    };

    // --- MEMBERSHIP TEST HANDLER ---
    const handleTestMembership = () => {
        if (testInput.length === 0) {
            setResult("Please enter an input string.");
            return;
        }
        
        // **IMPORTANT:** Placeholder call until runNFA/runDFA is implemented.
        // You will replace this with: const isAccepted = runNFA(automaton, testInput);
        const isAccepted = testInput.length % 2 === 0; // Simple dummy logic for testing the UI

        if (isAccepted) {
            setResult(`String "${testInput}" is ACCEPTED.`);
        } else {
            setResult(`String "${testInput}" is REJECTED.`);
        }
    };


    // --- RENDER ---
    return (
        <div className="App">
            <Stage
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onDblClick={handleStageDblClick}
                onClick={handleStageClick}
                style={{ border: '1px solid #333' }}
            >
                <Layer fill="white">
                    {/* TRANSITIONS (Arrows) - Rendered first */}
                    {automaton.transitions.map((t, i) => {
                        const from = findState(t.from);
                        const to = findState(t.to);
                        
                        if (!from || !to) return null;

                        return (
                            <TransitionArrow
                                key={i}
                                fromState={from}
                                toState={to}
                                transition={t}
                                allTransitions={automaton.transitions} 
                            />
                        );
                    })}

                    {/* STATES (Nodes) - Rendered last */}
                    {automaton.states.map(state => (
                        <StateNode
                            key={state.id}
                            state={state}
                            onDragEnd={(e) => handleDragEnd(e, state.id)}
                            onContextMenu={handleToggleFinal}
                            onClick={handleClickOnState}
                            isSelected={state.id === transitionFrom}
                        />
                    ))}
                </Layer>
            </Stage>
            
            {/* =======================================================
                 MEMBERSHIP TEST INTERFACE
                 ======================================================= */}
            <div style={{ padding: '15px', borderTop: '1px solid #ccc', margin: '15px 0' }}>
                <h3>Membership Test</h3>
                <input
                    type="text"
                    placeholder="Enter string to test (e.g., 0110)"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    style={{ marginRight: '10px', padding: '5px' }}
                />
                <button onClick={handleTestMembership} style={{ padding: '5px 10px' }}>
                    Run DFA/NFA
                </button>
                
                {result && <p style={{ marginTop: '10px', fontWeight: 'bold', color: result.includes('ACCEPTED') ? 'green' : 'red' }}>Result: {result}</p>}
            </div>


            {/* DEBUG OUTPUT */}
            <pre style={{ fontSize: '10px', textAlign: 'left', maxHeight: '200px', overflowY: 'scroll' }}>
                <h3 style={{ margin: '5px 0' }}>Transitions (Debug):</h3>
                {JSON.stringify(automaton.transitions, null, 2)}
            </pre>
        </div>
    );
}

export default App;