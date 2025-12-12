import React from 'react';
import { Circle, Text, Arrow } from 'react-konva';
import Konva from 'konva';
import type { State } from '../types';
import { STATE_RADIUS, STATE_FILL_COLOR } from '../constants';

export interface StateNodeProps {
    state: State;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>, stateId: string) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>, stateId: string) => void;
    onClick: (stateId: string, isRightClick: boolean, isShiftClick?: boolean) => void;
    isSelected: boolean;
    isHovered?: boolean;
    onHover?: (stateId: string | null) => void;
    onDelete?: (stateId: string) => void;
}

export const StateNode: React.FC<StateNodeProps> = ({ 
    state, 
    onDragMove,
    onDragEnd, 
    onContextMenu, 
    onClick, 
    isSelected,
    isHovered = false,
    onHover,
    onDelete
}) => {
    const strokeColor = isSelected ? '#ef4444' : (isHovered ? '#f59e0b' : (state.isFinalState ? '#22c55e' : '#1f2937'));
    const strokeWidth = isSelected ? 2.5 : (isHovered ? 2 : 1.5);
    const fillColor = isHovered ? '#fef9c3' : STATE_FILL_COLOR;

    const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault();
        // Right-click toggles final state (don't trigger onClick)
        onContextMenu(e, state.id);
    };

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Only handle left-clicks, ignore right-clicks
        if (e.evt.button === 0 || e.evt.button === undefined) {
            // Check if Shift key is pressed for start state toggle
            const isShiftClick = e.evt.shiftKey;
            onClick(state.id, false, isShiftClick);
        }
    };

    return (
        <React.Fragment key={state.id}>
            
            {/* Start arrow */}
            {state.isStartState && (
                <Arrow
                    points={[state.x - 70, state.y, state.x - STATE_RADIUS, state.y]}
                    stroke="#1f2937"
                    fill="#1f2937"
                    strokeWidth={1.5}
                    pointerLength={8}
                    pointerWidth={8}
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
                    strokeWidth={1.5}
                    listening={false}
                />
            )}

            {/* Main state circle */}
            <Circle
                x={state.x}
                y={state.y}
                radius={STATE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                draggable
                onDragMove={(e) => onDragMove(e, state.id)}
                onDragEnd={onDragEnd}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
                onMouseEnter={() => onHover?.(state.id)}
                onMouseLeave={() => onHover?.(null)}
            />

            {/* Label */}
            <Text
                x={state.x}
                y={state.y}
                text={state.id}
                fontSize={14}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
                fontStyle="normal"
                fontWeight={500}
                fill="#0f172a"
                offsetX={state.id.length * 3.5}
                offsetY={7}
                listening={false}
            />
        </React.Fragment>
    );
};

