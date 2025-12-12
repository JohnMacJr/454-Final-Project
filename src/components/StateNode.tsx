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
    onClick: (stateId: string, isRightClick: boolean) => void;
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
    const strokeColor = isSelected ? '#ff0000' : (isHovered ? '#ff8800' : (state.isFinalState ? '#0066cc' : '#333333'));
    const strokeWidth = isSelected ? 4 : (isHovered ? 3 : 2);
    const fillColor = isHovered ? '#ffffcc' : STATE_FILL_COLOR;

    const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault();
        // Right-click toggles final state (don't trigger onClick)
        onContextMenu(e, state.id);
    };

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Only handle left-clicks, ignore right-clicks
        if (e.evt.button === 0 || e.evt.button === undefined) {
            onClick(state.id, false);
        }
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
                fontSize={16}
                fill="black"
                offsetX={state.id.length * 4}
                offsetY={8}
                listening={false}
            />
        </React.Fragment>
    );
};

