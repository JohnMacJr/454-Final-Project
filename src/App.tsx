// src/App.tsx

import { useState, useRef } from 'react';
import { Stage, Layer, Arrow } from 'react-konva'; 
import Konva from 'konva';
import type { Automaton, Transition } from './types';
import { Grid } from './components/Grid';
import { StateNode } from './components/StateNode';
import { TransitionArrow } from './components/TransitionArrow';
import { GRID_SIZE, INITIAL_AUTOMATON } from './constants';
import { runDFA, runNFA, checkDFAEquivalence, isNFA } from './automataLogic';
import { findState } from './utils';
import { saveAutomatonToFile, loadAutomatonFromFile, testMembership } from './helpers/automatonHelpers';
import { useWindowSize } from './hooks/useWindowSize';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'; 

// =============================================================
//   MAIN APP COMPONENT
// =============================================================
function App() {
    // Automaton 1 state
    const [automaton1, setAutomaton1] = useState<Automaton>(INITIAL_AUTOMATON);
    const [transitionFrom1, setTransitionFrom1] = useState<string | null>(null);
    const [testInput1, setTestInput1] = useState('');
    const [result1, setResult1] = useState<string | null>(null);
    const [hoveredState1, setHoveredState1] = useState<string | null>(null);
    const [hoveredTransition1, setHoveredTransition1] = useState<Transition | null>(null);
    const [mousePos1, setMousePos1] = useState<{ x: number; y: number } | null>(null);
    const [selectedState1, setSelectedState1] = useState<string | null>(null);
    const stageRef1 = useRef<Konva.Stage>(null);

    // Automaton 2 state
    const [automaton2, setAutomaton2] = useState<Automaton>({ ...INITIAL_AUTOMATON, states: [{ id: 'q0', isStartState: false, isFinalState: false, x: 200, y: 300 }] });
    const [transitionFrom2, setTransitionFrom2] = useState<string | null>(null);
    const [testInput2, setTestInput2] = useState('');
    const [result2, setResult2] = useState<string | null>(null);
    const [hoveredState2, setHoveredState2] = useState<string | null>(null);
    const [hoveredTransition2, setHoveredTransition2] = useState<Transition | null>(null);
    const [mousePos2, setMousePos2] = useState<{ x: number; y: number } | null>(null);
    const [selectedState2, setSelectedState2] = useState<string | null>(null);
    const stageRef2 = useRef<Konva.Stage>(null);

    // Equivalence test state
    const [equivalenceResult, setEquivalenceResult] = useState<string | null>(null);

    const windowSize = useWindowSize();

    // --- CREATE HANDLERS FOR SPECIFIC AUTOMATON ---
    const createHandlers = (automatonNum: 1 | 2) => {
        const automaton = automatonNum === 1 ? automaton1 : automaton2;
        const setAutomaton = automatonNum === 1 ? setAutomaton1 : setAutomaton2;
        const transitionFrom = automatonNum === 1 ? transitionFrom1 : transitionFrom2;
        const setTransitionFrom = automatonNum === 1 ? setTransitionFrom1 : setTransitionFrom2;
        const selectedState = automatonNum === 1 ? selectedState1 : selectedState2;
        const setSelectedState = automatonNum === 1 ? setSelectedState1 : setSelectedState2;
        const setHoveredState = automatonNum === 1 ? setHoveredState1 : setHoveredState2;
        const setHoveredTransition = automatonNum === 1 ? setHoveredTransition1 : setHoveredTransition2;
        const setMousePos = automatonNum === 1 ? setMousePos1 : setMousePos2;
        const hoveredState = automatonNum === 1 ? hoveredState1 : hoveredState2;
        const hoveredTransition = automatonNum === 1 ? hoveredTransition1 : hoveredTransition2;
        const mousePos = automatonNum === 1 ? mousePos1 : mousePos2;

        const handleDeleteState = (stateId: string) => {
            if (window.confirm(`Delete state "${stateId}" and all its transitions?`)) {
                setAutomaton(prev => ({
                    ...prev,
                    states: prev.states.filter(s => s.id !== stateId),
                    transitions: prev.transitions.filter(t => t.from !== stateId && t.to !== stateId)
                }));
                setSelectedState(null);
                setTransitionFrom(null);
            }
        };

        const handleDeleteTransition = (transition: Transition) => {
            setAutomaton(prev => ({
                ...prev,
                transitions: prev.transitions.filter(t => 
                    !(t.from === transition.from && t.to === transition.to && t.symbol === transition.symbol)
                )
            }));
            setHoveredTransition(null);
        };

        const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, stateId: string) => {
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

        const handleDragEnd = (stateId: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            setAutomaton(prev => ({
                ...prev,
                states: prev.states.map(s =>
                    s.id === stateId ? { ...s, x: node.x(), y: node.y() } : s
                ),
            }));
        };

        const handleStageDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
            if (e.target.getClassName() !== 'Stage') return;

            const x = e.evt.layerX;
            const y = e.evt.layerY;
            const newId = `q${automaton.states.length}`;

            setAutomaton(prev => ({
                ...prev,
                states: [
                    ...prev.states,
                    { id: newId, isStartState: false, isFinalState: false, x, y }
                ],
            }));
        };

        const handleToggleFinal = (_e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
            setAutomaton(prev => ({
                ...prev,
                states: prev.states.map(s =>
                    s.id === id ? { ...s, isFinalState: !s.isFinalState } : s
                )
            }));
        };

        const handleToggleStart = (stateId: string) => {
            const currentState = findState(automaton, stateId);
            if (!currentState) return;

            if (currentState.isStartState) {
                setAutomaton(prev => ({
                    ...prev,
                    states: prev.states.map(s =>
                        s.id === stateId ? { ...s, isStartState: false } : s
                    )
                }));
            } else {
                setAutomaton(prev => ({
                    ...prev,
                    states: prev.states.map(s =>
                        s.id === stateId ? { ...s, isStartState: true } : 
                        s.isStartState ? { ...s, isStartState: false } : s
                    )
                }));
            }
        };

        const handleClickOnState = (stateId: string, isRightClick: boolean = false, isShiftClick: boolean = false) => {
            if (isShiftClick) {
                handleToggleStart(stateId);
                return;
            }

            if (isRightClick) {
                return;
            }

            if (!transitionFrom) {
                setTransitionFrom(stateId);
                setSelectedState(stateId);
                return;
            }

            const from = transitionFrom;
            const to = stateId;

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

                setAutomaton(prev => ({
                    ...prev,
                    transitions: [...prev.transitions, ...newTransitions]
                }));

                setAutomaton(prev => {
                    const newAlphabet = new Set(prev.alphabet);
                    symbols.forEach(s => {
                        const trimmedSymbol = s;
                        if (trimmedSymbol !== 'ε' && trimmedSymbol.length > 0) newAlphabet.add(trimmedSymbol);
                    });
                    return { ...prev, alphabet: newAlphabet };
                });
            }

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

        return {
            handleDeleteState,
            handleDeleteTransition,
            handleDragMove,
            handleDragEnd,
            handleStageDblClick,
            handleToggleFinal,
            handleToggleStart,
            handleClickOnState,
            handleStageClick,
            handleStageMouseMove,
            automaton,
            transitionFrom,
            selectedState,
            hoveredState,
            hoveredTransition,
            mousePos,
            setHoveredState,
            setHoveredTransition
        };
    };

    // Create handlers - these will be recreated on each render with latest state
    const handlers1 = createHandlers(1);
    const handlers2 = createHandlers(2);

    // --- KEYBOARD SHORTCUTS ---
    useKeyboardShortcuts({
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
    });



    // --- MEMBERSHIP TEST HANDLERS ---
    const handleTestMembership1 = () => {
        const result = testMembership(automaton1, testInput1, isNFA, runDFA, runNFA);
        setResult1(result);
    };

    const handleTestMembership2 = () => {
        const result = testMembership(automaton2, testInput2, isNFA, runDFA, runNFA);
        setResult2(result);
    };

    // --- SAVE/LOAD HANDLERS ---
    const handleSaveAutomaton1 = () => {
        saveAutomatonToFile(automaton1, 'automaton1.json');
    };

    const handleSaveAutomaton2 = () => {
        saveAutomatonToFile(automaton2, 'automaton2.json');
    };

    const handleLoadAutomaton1 = () => {
        loadAutomatonFromFile(
            (automaton) => {
                setAutomaton1(automaton);
                setResult1(null);
                setTransitionFrom1(null);
                setSelectedState1(null);
            },
            (error) => {
                alert('Error loading automaton: Invalid JSON file.');
                console.error('Load error:', error);
            }
        );
    };

    const handleLoadAutomaton2 = () => {
        loadAutomatonFromFile(
            (automaton) => {
                setAutomaton2(automaton);
                setResult2(null);
                setTransitionFrom2(null);
                setSelectedState2(null);
            },
            (error) => {
                alert('Error loading automaton: Invalid JSON file.');
                console.error('Load error:', error);
            }
        );
    };

    // --- EQUIVALENCE TEST HANDLER ---
    const handleTestEquivalence = () => {
        const startState1 = automaton1.states.find(s => s.isStartState);
        const startState2 = automaton2.states.find(s => s.isStartState);

        if (!startState1) {
            setEquivalenceResult("Error: Automaton 1 has no start state.");
            return;
        }

        if (!startState2) {
            setEquivalenceResult("Error: Automaton 2 has no start state.");
            return;
        }

        // Check if both are DFAs (for now, only DFA equivalence is implemented)
        const nfa1 = isNFA(automaton1);
        const nfa2 = isNFA(automaton2);

        if (nfa1 || nfa2) {
            setEquivalenceResult("Note: Equivalence testing currently only supports DFAs. Please convert NFAs to DFAs first.");
            return;
        }

        const isEquivalent = checkDFAEquivalence(automaton1, automaton2);
        
        if (isEquivalent) {
            setEquivalenceResult("The two DFAs are EQUIVALENT (accept the same language).");
        } else {
            setEquivalenceResult("The two DFAs are NOT EQUIVALENT (accept different languages).");
        }
    };


    // --- RENDER ---
    const canvasWidth = windowSize.width / 2;
    const canvasHeight = windowSize.height;

    const renderAutomaton = (handlers: ReturnType<typeof createHandlers>, stageRef: React.RefObject<Konva.Stage | null>) => {
        const fromStateForPreview = handlers.transitionFrom ? findState(handlers.automaton, handlers.transitionFrom) : null;
        
        return (
            <Stage
                ref={stageRef}
                width={canvasWidth}
                height={canvasHeight}
                onDblClick={handlers.handleStageDblClick}
                onClick={handlers.handleStageClick}
                onMouseMove={handlers.handleStageMouseMove}
                style={{ cursor: handlers.transitionFrom ? 'crosshair' : 'default' }}
            >
                <Layer>
                    {/* GRID BACKGROUND */}
                    <Grid width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />
                    
                    {/* TRANSITION PREVIEW LINE */}
                    {handlers.transitionFrom && fromStateForPreview && handlers.mousePos && (
                        <Arrow
                            points={[
                                fromStateForPreview.x,
                                fromStateForPreview.y,
                                handlers.mousePos.x,
                                handlers.mousePos.y
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
                    {handlers.automaton.transitions.map((t, i) => {
                        const from = findState(handlers.automaton, t.from);
                        const to = findState(handlers.automaton, t.to);
                        
                        if (!from || !to) return null;

                        const isHovered = handlers.hoveredTransition?.from === t.from && 
                                        handlers.hoveredTransition?.to === t.to && 
                                        handlers.hoveredTransition?.symbol === t.symbol;

                        return (
                            <TransitionArrow
                                key={`${t.from}-${t.to}-${t.symbol}-${i}`}
                                fromState={from}
                                toState={to}
                                transition={t}
                                allTransitions={handlers.automaton.transitions}
                                isHovered={isHovered}
                                onHover={handlers.setHoveredTransition}
                                onDelete={handlers.handleDeleteTransition}
                            />
                        );
                    })}

                    {/* STATES (Nodes) - Rendered last */}
                    {handlers.automaton.states.map(state => (
                        <StateNode
                            key={state.id}
                            state={state}
                            onDragMove={(e) => handlers.handleDragMove(e, state.id)}
                            onDragEnd={handlers.handleDragEnd(state.id)}
                            onContextMenu={handlers.handleToggleFinal}
                            onClick={handlers.handleClickOnState}
                            isSelected={state.id === handlers.transitionFrom || state.id === handlers.selectedState}
                            isHovered={handlers.hoveredState === state.id}
                            onHover={handlers.setHoveredState}
                            onDelete={handlers.handleDeleteState}
                        />
                    ))}
                </Layer>
            </Stage>
        );
    };
    
    return (
        <div className="App" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* SIDE-BY-SIDE CANVASES */}
            <div style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                display: 'flex'
            }}>
                {/* AUTOMATON 1 - LEFT */}
                <div style={{ width: 'calc(50% - 1.5px)', height: '100vh', position: 'relative' }}>
                    {renderAutomaton(handlers1, stageRef1 as React.RefObject<Konva.Stage>)}
                </div>
                
                {/* DIVIDER */}
                <div style={{
                    width: '3px',
                    height: '100vh',
                    backgroundColor: '#666',
                    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                    zIndex: 1,
                    position: 'relative',
                    flexShrink: 0
                }} />
                
                {/* AUTOMATON 2 - RIGHT */}
                <div style={{ width: 'calc(50% - 1.5px)', height: '100vh', position: 'relative' }}>
                    {renderAutomaton(handlers2, stageRef2 as React.RefObject<Konva.Stage>)}
                </div>
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
                    backgroundColor: (transitionFrom1 || transitionFrom2) ? '#ffeb3b' : '#e3f2fd', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: (transitionFrom1 || transitionFrom2) ? '#f57f17' : '#1976d2'
                }}>
                    {(transitionFrom1 || transitionFrom2) ? 
                        `Creating transition from: ${transitionFrom1 || transitionFrom2}` : 
                        'Mode: Click a state to start creating a transition'}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                    <div>Tips: Double-click canvas to add state • Shift+click state to toggle start • Right-click state to toggle final • Delete key to remove selected</div>
                </div>
            </div>

            {/* EQUIVALENCE TEST - CENTER OVERLAY */}
            <div style={{ 
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '20px', 
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                zIndex: 1001,
                backdropFilter: 'blur(10px)',
                minWidth: '350px',
                border: '2px solid #1976d2'
            }}>
                <h3 style={{ marginTop: '0', color: '#333', marginBottom: '15px' }}>Equivalence Test</h3>
                <button 
                    onClick={handleTestEquivalence} 
                    style={{ 
                        padding: '10px 20px',
                        borderRadius: '4px',
                        border: '1px solid #1976d2',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        width: '100%',
                        marginBottom: '10px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1565c0';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1976d2';
                    }}
                >
                    Test Equivalence
                </button>
                
                {equivalenceResult && (
                    <div style={{ 
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: equivalenceResult.includes('EQUIVALENT') ? '#e8f5e9' : '#ffebee',
                        color: equivalenceResult.includes('EQUIVALENT') ? '#2e7d32' : '#c62828',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginTop: '10px'
                    }}>
                        {equivalenceResult}
                    </div>
                )}
            </div>
            
            {/* AUTOMATON 1 - MEMBERSHIP TEST - LEFT */}
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
                minWidth: '280px',
                maxWidth: '400px'
            }}>
                <h3 style={{ marginTop: '0', color: '#333', fontSize: '16px' }}>Automaton 1 - Membership Test</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Enter string to test"
                        value={testInput1}
                        onChange={(e) => setTestInput1(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleTestMembership1();
                            }
                        }}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '14px',
                            flex: 1,
                            minWidth: '150px'
                        }}
                    />
                    <button 
                        onClick={handleTestMembership1} 
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
                        Test
                    </button>
                </div>
                {result1 && (
                    <div style={{ 
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        backgroundColor: result1.includes('ACCEPTED') ? '#e8f5e9' : '#ffebee',
                        color: result1.includes('ACCEPTED') ? '#2e7d32' : '#c62828',
                        fontWeight: 'bold',
                        fontSize: '13px'
                    }}>
                        {result1}
                    </div>
                )}
            </div>

            {/* AUTOMATON 1 - STATISTICS - LEFT */}
            <div style={{ 
                position: 'fixed',
                top: '70px',
                left: '10px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                minWidth: '180px'
            }}>
                <div style={{ fontSize: '13px', color: '#333', fontWeight: 'bold', marginBottom: '5px' }}>
                    Automaton 1 Stats
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>States:</strong> {automaton1.states.length}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Transitions:</strong> {automaton1.transitions.length}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Alphabet:</strong> {Array.from(automaton1.alphabet).sort().join(', ') || 'None'}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Start:</strong> {automaton1.states.find(s => s.isStartState)?.id || 'None'}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Final:</strong> {automaton1.states.filter(s => s.isFinalState).map(s => s.id).join(', ') || 'None'}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleSaveAutomaton1}
                        style={{ 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #4caf50',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            flex: 1,
                            minWidth: '70px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#45a049';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#4caf50';
                        }}
                    >
                        Save
                    </button>
                    <button 
                        onClick={handleLoadAutomaton1}
                        style={{ 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #2196f3',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            flex: 1,
                            minWidth: '70px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1976d2';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#2196f3';
                        }}
                    >
                        Load
                    </button>
                </div>
            </div>

            {/* AUTOMATON 1 - DEBUG - LEFT */}
            <details style={{ 
                position: 'fixed',
                bottom: '10px',
                left: '310px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                maxWidth: '300px',
                maxHeight: '250px'
            }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#666', fontSize: '13px' }}>
                    Automaton 1 Debug
                </summary>
                <pre style={{ 
                    fontSize: '10px', 
                    textAlign: 'left', 
                    maxHeight: '150px', 
                    overflowY: 'scroll',
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    color: '#333'
                }}>
                    {JSON.stringify(automaton1.transitions, null, 2)}
                </pre>
            </details>

            {/* AUTOMATON 2 - MEMBERSHIP TEST - RIGHT */}
            <div style={{ 
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                minWidth: '280px',
                maxWidth: '400px'
            }}>
                <h3 style={{ marginTop: '0', color: '#333', fontSize: '16px' }}>Automaton 2 - Membership Test</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Enter string to test"
                        value={testInput2}
                        onChange={(e) => setTestInput2(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleTestMembership2();
                            }
                        }}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '14px',
                            flex: 1,
                            minWidth: '150px'
                        }}
                    />
                    <button 
                        onClick={handleTestMembership2} 
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
                        Test
                    </button>
                </div>
                {result2 && (
                    <div style={{ 
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        backgroundColor: result2.includes('ACCEPTED') ? '#e8f5e9' : '#ffebee',
                        color: result2.includes('ACCEPTED') ? '#2e7d32' : '#c62828',
                        fontWeight: 'bold',
                        fontSize: '13px'
                    }}>
                        {result2}
                    </div>
                )}
            </div>

            {/* AUTOMATON 2 - STATISTICS - RIGHT */}
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
                gap: '8px',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                minWidth: '180px'
            }}>
                <div style={{ fontSize: '13px', color: '#333', fontWeight: 'bold', marginBottom: '5px' }}>
                    Automaton 2 Stats
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>States:</strong> {automaton2.states.length}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Transitions:</strong> {automaton2.transitions.length}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Alphabet:</strong> {Array.from(automaton2.alphabet).sort().join(', ') || 'None'}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Start:</strong> {automaton2.states.find(s => s.isStartState)?.id || 'None'}
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                    <strong>Final:</strong> {automaton2.states.filter(s => s.isFinalState).map(s => s.id).join(', ') || 'None'}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleSaveAutomaton2}
                        style={{ 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #4caf50',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            flex: 1,
                            minWidth: '70px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#45a049';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#4caf50';
                        }}
                    >
                        Save
                    </button>
                    <button 
                        onClick={handleLoadAutomaton2}
                        style={{ 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #2196f3',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            flex: 1,
                            minWidth: '70px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1976d2';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#2196f3';
                        }}
                    >
                        Load
                    </button>
                </div>
            </div>

            {/* AUTOMATON 2 - DEBUG - RIGHT */}
            <details style={{ 
                position: 'fixed',
                bottom: '10px',
                right: '310px',
                padding: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                maxWidth: '300px',
                maxHeight: '250px'
            }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#666', fontSize: '13px' }}>
                    Automaton 2 Debug
                </summary>
                <pre style={{ 
                    fontSize: '10px', 
                    textAlign: 'left', 
                    maxHeight: '150px', 
                    overflowY: 'scroll',
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    color: '#333'
                }}>
                    {JSON.stringify(automaton2.transitions, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default App;
