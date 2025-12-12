// src/App.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Arrow } from 'react-konva'; 
import Konva from 'konva';
import type { Automaton, Transition } from './types';
import { Grid } from './components/Grid';
import { StateNode } from './components/StateNode';
import { TransitionArrow } from './components/TransitionArrow';
import { GRID_SIZE, INITIAL_AUTOMATON } from './constants';
// Import your logic functions (assuming you will create/implement these files)
// import { runDFA, runNFA } from './automataLogic'; 

// =============================================================
//   MAIN APP COMPONENT
// =============================================================
function App() {
    const [automaton, setAutomaton] = useState<Automaton>(INITIAL_AUTOMATON);
    const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
    const [testInput, setTestInput] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [hoveredState, setHoveredState] = useState<string | null>(null);
    const [hoveredTransition, setHoveredTransition] = useState<Transition | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });


    const updateAutomaton = (updates: Partial<Automaton>) => {
        setAutomaton(prev => ({ ...prev, ...updates }));
    };

    // --- UTILITIES ---
    const findState = (id: string) => automaton.states.find(s => s.id === id);

    // --- DELETE HANDLERS ---
    const handleDeleteState = useCallback((stateId: string) => {
        if (window.confirm(`Delete state "${stateId}" and all its transitions?`)) {
            setAutomaton(prev => ({
                ...prev,
                states: prev.states.filter(s => s.id !== stateId),
                transitions: prev.transitions.filter(t => t.from !== stateId && t.to !== stateId)
            }));
            setSelectedState(null);
            setTransitionFrom(null);
        }
    }, []);

    const handleDeleteTransition = useCallback((transition: Transition) => {
        setAutomaton(prev => ({
            ...prev,
            transitions: prev.transitions.filter(t => 
                !(t.from === transition.from && t.to === transition.to && t.symbol === transition.symbol)
            )
        }));
        setHoveredTransition(null);
    }, []);

    // --- WINDOW RESIZE HANDLER ---
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete key - delete selected state or hovered transition
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedState) {
                    handleDeleteState(selectedState);
                } else if (hoveredTransition) {
                    handleDeleteTransition(hoveredTransition);
                }
            }
            
            // Escape key - cancel transition creation or clear selection
            if (e.key === 'Escape') {
                setTransitionFrom(null);
                setSelectedState(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedState, hoveredTransition, handleDeleteState, handleDeleteTransition]);


    // --- INTERACTION HANDLERS ---

    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, stateId: string) => {
        // Update state position in real-time during drag
        // onDragMove fires continuously as the node is dragged
        const node = e.target;
        const newX = node.x();
        const newY = node.y();
        
        setAutomaton(prev => ({
            ...prev,
            states: prev.states.map(s =>
                s.id === stateId ? { ...s, x: newX, y: newY } : s
            ),
        }));
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, stateId: string) => {
        // Final update when drag ends (ensures position is correct)
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

    const handleToggleFinal = (_e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
        updateAutomaton({
            states: automaton.states.map(s =>
                s.id === id ? { ...s, isFinalState: !s.isFinalState } : s
            )
        });
    };

    const handleClickOnState = (stateId: string, isRightClick: boolean = false) => {
        // Don't create transitions on right-click
        if (isRightClick) {
            return;
        }

        if (!transitionFrom) {
            // First click: select the source state for transition creation
            setTransitionFrom(stateId);
            setSelectedState(stateId);
            return;
        }

        // Second click: create transition to this state
        const from = transitionFrom;
        const to = stateId;

        // Use a more user-friendly input method
        const symbol = window.prompt(
            `Create transition from "${from}" to "${to}"\n\n` +
            `Enter symbol(s) (comma-separated for multiple):\n` +
            `Example: 0,1 or a,b or ε\n\n` +
            `(Click Cancel or press Escape to cancel)`
        );

        if (symbol && symbol.trim()) {
            const symbols = symbol.split(',').map(s => s.trim()).filter(s => s.length > 0);
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

        // Always clear selection after attempting to create transition
        setTransitionFrom(null);
        setSelectedState(null);
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target.getClassName() === 'Stage') {
            setTransitionFrom(null);
            setSelectedState(null);
        }
    };

    const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (transitionFrom && e.target.getClassName() === 'Stage') {
            const stage = e.target.getStage();
            if (stage) {
                const pointerPos = stage.getPointerPosition();
                if (pointerPos) {
                    setMousePos(pointerPos);
                }
            }
        } else {
            setMousePos(null);
        }
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
    const fromStateForPreview = transitionFrom ? findState(transitionFrom) : null;
    
    return (
        <div className="App" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* FULL-SCREEN GRAPH */}
            <div style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0
            }}>
                <Stage
                    ref={stageRef}
                    width={windowSize.width}
                    height={windowSize.height}
                    onDblClick={handleStageDblClick}
                    onClick={handleStageClick}
                    onMouseMove={handleStageMouseMove}
                    style={{ cursor: transitionFrom ? 'crosshair' : 'default' }}
                >
                    <Layer>
                        {/* GRID BACKGROUND */}
                        <Grid width={windowSize.width} height={windowSize.height} gridSize={GRID_SIZE} />
                        
                        {/* TRANSITION PREVIEW LINE */}
                        {transitionFrom && fromStateForPreview && mousePos && (
                            <Arrow
                                points={[
                                    fromStateForPreview.x,
                                    fromStateForPreview.y,
                                    mousePos.x,
                                    mousePos.y
                                ]}
                                stroke="#999"
                                fill="#999"
                                strokeWidth={2}
                                dash={[5, 5]}
                                pointerLength={10}
                                pointerWidth={10}
                                listening={false}
                            />
                        )}

                        {/* TRANSITIONS (Arrows) - Rendered first */}
                        {automaton.transitions.map((t, i) => {
                            const from = findState(t.from);
                            const to = findState(t.to);
                            
                            if (!from || !to) return null;

                            const isHovered = hoveredTransition?.from === t.from && 
                                            hoveredTransition?.to === t.to && 
                                            hoveredTransition?.symbol === t.symbol;

                            return (
                                <TransitionArrow
                                    key={`${t.from}-${t.to}-${t.symbol}-${i}`}
                                    fromState={from}
                                    toState={to}
                                    transition={t}
                                    allTransitions={automaton.transitions}
                                    isHovered={isHovered}
                                    onHover={setHoveredTransition}
                                    onDelete={handleDeleteTransition}
                                />
                            );
                        })}

                        {/* STATES (Nodes) - Rendered last */}
                        {automaton.states.map(state => (
                            <StateNode
                                key={state.id}
                                state={state}
                                onDragMove={(e) => handleDragMove(e, state.id)}
                                onDragEnd={(e) => handleDragEnd(e, state.id)}
                                onContextMenu={handleToggleFinal}
                                onClick={handleClickOnState}
                                isSelected={state.id === transitionFrom || state.id === selectedState}
                                isHovered={hoveredState === state.id}
                                onHover={setHoveredState}
                                onDelete={handleDeleteState}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>

            {/* TOOLBAR - OVERLAY */}
            <div style={{ 
                position: 'fixed',
                top: '10px',
                left: '10px',
                right: '10px',
                padding: '10px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flexWrap: 'wrap',
                zIndex: 1000,
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
                    Automaton Builder
                </div>
                <div style={{ 
                    padding: '5px 12px', 
                    backgroundColor: transitionFrom ? '#ffeb3b' : '#e3f2fd', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: transitionFrom ? '#f57f17' : '#1976d2'
                }}>
                    {transitionFrom ? `Creating transition from: ${transitionFrom}` : 'Mode: Click a state to start creating a transition'}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                    <div>💡 Tips: Double-click canvas to add state • Right-click state to toggle final/delete • Delete key to remove selected</div>
                </div>
            </div>
            
            {/* =======================================================
                 MEMBERSHIP TEST INTERFACE - OVERLAY
                 ======================================================= */}
            <div style={{ 
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                minWidth: '300px'
            }}>
                <h3 style={{ marginTop: '0', color: '#333' }}>Membership Test</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Enter string to test (e.g., 0110)"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleTestMembership();
                            }
                        }}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '14px',
                            minWidth: '200px'
                        }}
                    />
                    <button 
                        onClick={handleTestMembership} 
                        style={{ 
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: '1px solid #1976d2',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1565c0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1976d2';
                        }}
                    >
                        Run DFA/NFA
                    </button>
                    
                    {result && (
                        <div style={{ 
                            marginLeft: '10px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            backgroundColor: result.includes('ACCEPTED') ? '#e8f5e9' : '#ffebee',
                            color: result.includes('ACCEPTED') ? '#2e7d32' : '#c62828',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            {result}
                        </div>
                    )}
                </div>
            </div>

            {/* STATISTICS PANEL - OVERLAY */}
            <div style={{ 
                position: 'fixed',
                top: '70px',
                right: '10px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                minWidth: '200px'
            }}>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <strong>States:</strong> {automaton.states.length}
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <strong>Transitions:</strong> {automaton.transitions.length}
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <strong>Alphabet:</strong> {Array.from(automaton.alphabet).sort().join(', ') || 'None'}
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <strong>Start State:</strong> {automaton.states.find(s => s.isStartState)?.id || 'None'}
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <strong>Final States:</strong> {automaton.states.filter(s => s.isFinalState).map(s => s.id).join(', ') || 'None'}
                </div>
            </div>

            {/* DEBUG OUTPUT - Collapsible - OVERLAY */}
            <details style={{ 
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                maxWidth: '400px',
                maxHeight: '300px'
            }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#666' }}>
                    Debug Info (Click to expand)
                </summary>
                <pre style={{ 
                    fontSize: '11px', 
                    textAlign: 'left', 
                    maxHeight: '200px', 
                    overflowY: 'scroll',
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                }}>
                    <strong>Transitions:</strong>
                    {JSON.stringify(automaton.transitions, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default App;
