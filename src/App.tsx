// src/App.tsx

import { useState, useRef, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RefreshCw } from 'lucide-react'; 

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
    const [automaton2, setAutomaton2] = useState<Automaton>({ ...INITIAL_AUTOMATON, states: [{ id: 'q0', isStartState: true, isFinalState: false, hasLoopOnAllInputs: false, x: 200, y: 300 }] });
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

    // Dialog state
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
    const [promptDialog, setPromptDialog] = useState<{ open: boolean; message: string; onConfirm: (value: string | null) => void }>({ open: false, message: '', onConfirm: () => {} });
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [promptValue, setPromptValue] = useState('');
    const [showTips, setShowTips] = useState(false);

    const windowSize = useWindowSize();
    const hasInitialized = useRef(false);

    // Initialize states at center of window vertically on mount
    useEffect(() => {
        if (!hasInitialized.current) {
            const centerY = windowSize.height / 2;
            
            // Update initial positions to center
            setAutomaton1(prev => ({
                ...prev,
                states: prev.states.map(s => ({ ...s, y: centerY }))
            }));
            
            setAutomaton2(prev => ({
                ...prev,
                states: prev.states.map(s => ({ ...s, y: centerY }))
            }));
            
            hasInitialized.current = true;
        }
    }, [windowSize.height]);

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
            setConfirmDialog({
                open: true,
                message: `Delete state "${stateId}" and all its transitions?`,
                onConfirm: () => {
                    setAutomaton(prev => ({
                        ...prev,
                        states: prev.states.filter(s => s.id !== stateId),
                        transitions: prev.transitions.filter(t => t.from !== stateId && t.to !== stateId)
                    }));
                    setSelectedState(null);
                    setTransitionFrom(null);
                    setConfirmDialog({ open: false, message: '', onConfirm: () => {} });
                }
            });
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
                    { id: newId, isStartState: false, isFinalState: false, hasLoopOnAllInputs: false, x, y }
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

        const handleToggleLoopOnAllInputs = (_e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
            setAutomaton(prev => ({
                ...prev,
                states: prev.states.map(s =>
                    s.id === id ? { ...s, hasLoopOnAllInputs: !s.hasLoopOnAllInputs } : s
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

            setPromptValue('');
            setPromptDialog({
                open: true,
                message: `Create transition from "${from}" to "${to}"\n\nEnter symbol(s) (comma-separated for multiple):\nExample: 0,1 or a,b or ε`,
                onConfirm: (symbol) => {
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
                    setPromptDialog({ open: false, message: '', onConfirm: () => {} });
                }
            });
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
            handleToggleLoopOnAllInputs,
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
                setAlertDialog({ open: true, message: 'Error loading automaton: Invalid JSON file.' });
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
                setAlertDialog({ open: true, message: 'Error loading automaton: Invalid JSON file.' });
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
                            onToggleLoopOnAllInputs={handlers.handleToggleLoopOnAllInputs}
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
            <div className="fixed top-2 left-2 right-2 z-[1000] flex flex-col gap-2">
                <Card className="backdrop-blur-md bg-white/95 shadow-sm rounded-md py-0 gap-0">
                    <CardContent className="p-1.5 flex items-center gap-2.5 flex-wrap">
                        <CardTitle className="text-sm font-semibold text-foreground m-0 tracking-tight">
                            Automaton Builder
                        </CardTitle>
                        <div className="ml-auto flex items-center gap-2">
                            <Badge 
                                variant={transitionFrom1 || transitionFrom2 ? "default" : "secondary"}
                                className={`text-xs px-2 py-0.5 ${transitionFrom1 || transitionFrom2 ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500" : ""}`}
                            >
                                {(transitionFrom1 || transitionFrom2) ? 
                                    `Creating transition from: ${transitionFrom1 || transitionFrom2}` : 
                                    'Mode: Click a state to start creating a transition'}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.location.reload()}
                                title="Refresh page"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* TIPS & CONTROLS BUTTON AND PANEL */}
                <div className="flex flex-col items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setShowTips(!showTips)}
                    >
                        {showTips ? 'Hide' : 'Show'} Tips & Controls
                    </Button>

                    {/* TIPS & CONTROLS PANEL */}
                    {showTips && (
                        <Card className="backdrop-blur-md bg-white/95 shadow-sm rounded-md py-0 gap-0 max-w-md w-full">
                        <CardContent className="p-3">
                            <CardTitle className="text-xs font-semibold mb-2">Tips & Controls</CardTitle>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="creating" className="border-0">
                                    <AccordionTrigger className="text-xs font-semibold py-1.5 px-0">
                                        Creating States & Transitions
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-2 text-xs space-y-1">
                                        <div><strong>Add State:</strong> Double-click anywhere on the canvas</div>
                                        <div><strong>Create Transition:</strong> Click a state, then click another state (or the same state for a self-loop)</div>
                                        <div><strong>Multiple Symbols:</strong> When creating a transition, enter comma-separated symbols (e.g., "0,1" or "a,b")</div>
                                        <div><strong>Epsilon (ε):</strong> Use "ε" as a symbol for epsilon transitions. Automata with epsilon transitions are automatically classified as NFAs.</div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="modifying" className="border-0">
                                    <AccordionTrigger className="text-xs font-semibold py-1.5 px-0">
                                        Modifying States
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-2 text-xs space-y-1">
                                        <div><strong>Toggle Start State:</strong> Shift + Click on a state</div>
                                        <div><strong>Toggle Final State:</strong> Right-click on a state</div>
                                        <div><strong>Loop on All Inputs (*):</strong> Ctrl+Right-click (Cmd+Right-click on Mac) on a state to toggle. States with this feature (marked with *) will loop on all input symbols that don't have explicit transitions.</div>
                                        <div><strong>Move State:</strong> Click and drag a state to reposition it</div>
                                        <div><strong>Delete State:</strong> Select a state and press Delete or Backspace</div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="transitions" className="border-0">
                                    <AccordionTrigger className="text-xs font-semibold py-1.5 px-0">
                                        Managing Transitions
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-2 text-xs space-y-1">
                                        <div><strong>Delete Transition:</strong> Hover over a transition and press Delete or Backspace, or right-click and confirm</div>
                                        <div><strong>Cancel Transition Creation:</strong> Press Escape or click on empty canvas</div>
                                        <div><strong>Multiple Transitions:</strong> Multiple transitions between the same states are automatically offset</div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="testing" className="border-0">
                                    <AccordionTrigger className="text-xs font-semibold py-1.5 px-0">
                                        Testing & Saving
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-2 text-xs space-y-1">
                                        <div><strong>Membership Test:</strong> Enter a string in the membership test box and click "Test"</div>
                                        <div><strong>Equivalence Test:</strong> Use the equivalence test to compare two DFAs</div>
                                        <div><strong>Save Automaton:</strong> Click "Save" in the stats panel to download as JSON</div>
                                        <div><strong>Load Automaton:</strong> Click "Load" in the stats panel to upload a saved automaton</div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="shortcuts" className="border-0">
                                    <AccordionTrigger className="text-xs font-semibold py-1.5 px-0">
                                        Keyboard Shortcuts
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-2 text-xs space-y-1">
                                        <div><strong>Delete / Backspace:</strong> Delete selected state or hovered transition</div>
                                        <div><strong>Escape:</strong> Cancel transition creation or clear selection</div>
                                        <div><strong>Shift + Click:</strong> Toggle start state</div>
                                        <div><strong>Ctrl+Right-click (Cmd+Right-click):</strong> Toggle loop on all inputs for a state</div>
                                        <div><strong>Enter:</strong> Submit input in membership test field</div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                    )}
                </div>
            </div>

            {/* EQUIVALENCE TEST - BOTTOM CENTER */}
            <Card className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[1001] backdrop-blur-md bg-white/98 shadow-lg min-w-[320px] border border-primary rounded-md py-0 gap-0">
                <CardHeader className="pb-1.5 px-3 pt-2">
                    <CardTitle className="m-0 text-xs font-semibold">Equivalence Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-2">
                    <Button 
                        onClick={handleTestEquivalence} 
                        size="sm"
                        className="w-full h-7 text-xs"
                    >
                        Test Equivalence
                    </Button>
                    
                    {equivalenceResult && (
                        <Badge 
                            variant={equivalenceResult.includes('EQUIVALENT') ? "default" : "destructive"}
                            className={`w-full justify-start p-1 text-xs font-medium rounded ${
                                equivalenceResult.includes('EQUIVALENT') 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }`}
                        >
                            {equivalenceResult}
                        </Badge>
                    )}
                </CardContent>
            </Card>
            
            {/* AUTOMATON 1 - MEMBERSHIP TEST - LEFT */}
            <Card className="fixed bottom-2 left-2 z-[1000] backdrop-blur-md bg-white/95 shadow-sm min-w-[260px] max-w-[380px] rounded-md py-0 gap-0">
                <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-semibold m-0">Automaton 1 - Membership Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-2">
                    <div className="flex gap-2 items-center flex-wrap">
                        <Input
                            type="text"
                            placeholder="Enter string to test"
                            value={testInput1}
                            onChange={(e) => setTestInput1(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleTestMembership1();
                                }
                            }}
                            className="flex-1 min-w-[140px] h-7 text-xs"
                        />
                        <Button 
                            onClick={handleTestMembership1}
                            size="sm"
                            className="h-7 text-xs px-3"
                        >
                            Test
                        </Button>
                    </div>
                    {result1 && (
                        <Badge 
                            variant={result1.includes('ACCEPTED') ? "default" : "destructive"}
                            className={`w-full justify-start p-1 text-xs font-medium rounded ${
                                result1.includes('ACCEPTED') 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }`}
                        >
                            {result1}
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* AUTOMATON 1 - STATISTICS - LEFT */}
            <Card className="fixed top-[60px] left-2 z-[1000] backdrop-blur-md bg-white/95 shadow-sm min-w-[160px] rounded-md py-0 gap-0">
                <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-semibold m-0">Automaton 1 Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5 text-xs px-3 pb-2">
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">States:</strong> {automaton1.states.length}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Transitions:</strong> {automaton1.transitions.length}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Alphabet:</strong> {Array.from(automaton1.alphabet).sort().join(', ') || 'None'}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Start:</strong> {automaton1.states.find(s => s.isStartState)?.id || 'None'}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Final:</strong> {automaton1.states.filter(s => s.isFinalState).map(s => s.id).join(', ') || 'None'}
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                        <Button 
                            onClick={handleSaveAutomaton1}
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[60px] h-7 text-xs bg-green-600 hover:bg-green-700 px-2"
                        >
                            Save
                        </Button>
                        <Button 
                            onClick={handleLoadAutomaton1}
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[60px] h-7 text-xs px-2"
                        >
                            Load
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* AUTOMATON 1 - DEBUG - LEFT */}
            <Card className="fixed bottom-2 left-[280px] z-[1000] backdrop-blur-md bg-white/95 shadow-sm max-w-[280px] max-h-[220px] rounded-md py-0 gap-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="debug1" className="border-0">
                        <AccordionTrigger className="text-xs font-semibold text-muted-foreground py-1 px-3">
                            Automaton 1 Debug
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-2">
                            <pre className="text-[10px] text-left max-h-[140px] overflow-y-scroll mt-1 p-1.5 bg-muted rounded text-foreground leading-tight">
                                {JSON.stringify(automaton1.transitions, null, 2)}
                            </pre>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            {/* AUTOMATON 2 - MEMBERSHIP TEST - RIGHT */}
            <Card className="fixed bottom-2 right-2 z-[1000] backdrop-blur-md bg-white/95 shadow-sm min-w-[260px] max-w-[380px] rounded-md py-0 gap-0">
                <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-semibold m-0">Automaton 2 - Membership Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-2">
                    <div className="flex gap-2 items-center flex-wrap">
                        <Input
                            type="text"
                            placeholder="Enter string to test"
                            value={testInput2}
                            onChange={(e) => setTestInput2(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleTestMembership2();
                                }
                            }}
                            className="flex-1 min-w-[140px] h-7 text-xs"
                        />
                        <Button 
                            onClick={handleTestMembership2}
                            size="sm"
                            className="h-7 text-xs px-3"
                        >
                            Test
                        </Button>
                    </div>
                    {result2 && (
                        <Badge 
                            variant={result2.includes('ACCEPTED') ? "default" : "destructive"}
                            className={`w-full justify-start p-1 text-xs font-medium rounded ${
                                result2.includes('ACCEPTED') 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }`}
                        >
                            {result2}
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* AUTOMATON 2 - STATISTICS - RIGHT */}
            <Card className="fixed top-[60px] right-2 z-[1000] backdrop-blur-md bg-white/95 shadow-sm min-w-[160px] rounded-md py-0 gap-0">
                <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-semibold m-0">Automaton 2 Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5 text-xs px-3 pb-2">
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">States:</strong> {automaton2.states.length}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Transitions:</strong> {automaton2.transitions.length}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Alphabet:</strong> {Array.from(automaton2.alphabet).sort().join(', ') || 'None'}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Start:</strong> {automaton2.states.find(s => s.isStartState)?.id || 'None'}
                    </div>
                    <div className="leading-tight py-0.5">
                        <strong className="font-medium">Final:</strong> {automaton2.states.filter(s => s.isFinalState).map(s => s.id).join(', ') || 'None'}
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                        <Button 
                            onClick={handleSaveAutomaton2}
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[60px] h-7 text-xs bg-green-600 hover:bg-green-700 px-2"
                        >
                            Save
                        </Button>
                        <Button 
                            onClick={handleLoadAutomaton2}
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[60px] h-7 text-xs px-2"
                        >
                            Load
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* AUTOMATON 2 - DEBUG - RIGHT */}
            <Card className="fixed bottom-2 right-[280px] z-[1000] backdrop-blur-md bg-white/95 shadow-sm max-w-[280px] max-h-[220px] rounded-md py-0 gap-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="debug2" className="border-0">
                        <AccordionTrigger className="text-xs font-semibold text-muted-foreground py-1 px-3">
                            Automaton 2 Debug
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-2">
                            <pre className="text-[10px] text-left max-h-[140px] overflow-y-scroll mt-1 p-1.5 bg-muted rounded text-foreground leading-tight">
                                {JSON.stringify(automaton2.transitions, null, 2)}
                            </pre>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            {/* CONFIRM DIALOG */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, message: '', onConfirm: () => {} })}>
                <DialogContent className="rounded-md">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-sm font-semibold">Confirm</DialogTitle>
                        <DialogDescription className="text-xs">{confirmDialog.message}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmDialog({ open: false, message: '', onConfirm: () => {} })}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={confirmDialog.onConfirm}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PROMPT DIALOG */}
            <Dialog open={promptDialog.open} onOpenChange={(open) => {
                if (!open) {
                    setPromptDialog({ open: false, message: '', onConfirm: () => {} });
                    setPromptValue('');
                }
            }}>
                <DialogContent className="rounded-md">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-sm font-semibold">Enter Symbol</DialogTitle>
                        <DialogDescription className="text-xs whitespace-pre-line">{promptDialog.message}</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            placeholder="e.g., 0,1 or a,b or ε"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    promptDialog.onConfirm(promptValue);
                                } else if (e.key === 'Escape') {
                                    promptDialog.onConfirm(null);
                                }
                            }}
                            className="h-8 text-xs"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => promptDialog.onConfirm(null)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={() => promptDialog.onConfirm(promptValue)}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ALERT DIALOG */}
            <Dialog open={alertDialog.open} onOpenChange={(open) => !open && setAlertDialog({ open: false, message: '' })}>
                <DialogContent className="rounded-md">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-sm font-semibold">Alert</DialogTitle>
                        <DialogDescription className="text-xs">{alertDialog.message}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button size="sm" className="h-8 text-xs" onClick={() => setAlertDialog({ open: false, message: '' })}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default App;
