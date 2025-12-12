import React from 'react';
import { Arrow, Text } from 'react-konva';
import type { State, Transition } from '../types';
import { groupTransitions } from '../utils';
import { STATE_RADIUS } from '../constants';

export interface TransitionArrowProps {
    fromState: State;
    toState: State;
    transition: Transition;
    allTransitions: Transition[];
    isHovered?: boolean;
    onHover?: (transition: Transition | null) => void;
    onDelete?: (transition: Transition) => void;
}

export const TransitionArrow: React.FC<TransitionArrowProps> = ({ 
    fromState, 
    toState, 
    transition, 
    allTransitions,
    isHovered = false,
    onHover,
    onDelete
}) => {
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
                    stroke={isHovered ? '#ff4444' : 'black'}
                    fill={isHovered ? '#ff4444' : 'black'}
                    strokeWidth={isHovered ? 3 : 2}
                    pointerLength={10}
                    pointerWidth={10}
                    tension={0.5}
                    onMouseEnter={() => onHover?.(transition)}
                    onMouseLeave={() => onHover?.(null)}
                    onContextMenu={(e) => {
                        e.evt.preventDefault();
                        if (onDelete && window.confirm(`Delete transition "${transition.symbol}"?`)) {
                            onDelete(transition);
                        }
                    }}
                />
                 <Text
                    x={centerX}
                    y={centerY - loopRadius - 5}
                    text={transition.symbol}
                    fontSize={14}
                    fill={isHovered ? '#ff4444' : 'black'}
                    offsetX={transition.symbol.length * 4}
                    listening={false}
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
                stroke={isHovered ? '#ff4444' : 'black'}
                fill={isHovered ? '#ff4444' : 'black'}
                strokeWidth={isHovered ? 3 : 2}
                pointerLength={10}
                pointerWidth={10}
                tension={0.5} // Makes the line a curve through the midpoint
                onMouseEnter={() => onHover?.(transition)}
                onMouseLeave={() => onHover?.(null)}
                onContextMenu={(e) => {
                    e.evt.preventDefault();
                    if (onDelete && window.confirm(`Delete transition "${transition.symbol}"?`)) {
                        onDelete(transition);
                    }
                }}
            />
            
            {/* Transition Label (Rendered near the midpoint) */}
            <Text
                x={midX}
                y={midY}
                text={transition.symbol}
                fontSize={16}
                fill={isHovered ? '#ff4444' : 'black'}
                // Offset slightly based on the angle so the text is not directly under the line
                offsetX={transition.symbol.length * 4}
                offsetY={angle > -Math.PI/2 && angle < Math.PI/2 ? 15 : -25}
                listening={false}
            />
        </React.Fragment>
    );
};

