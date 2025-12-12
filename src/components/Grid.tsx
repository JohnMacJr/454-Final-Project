import React from 'react';
import { Line } from 'react-konva';

interface GridProps {
    width: number;
    height: number;
    gridSize: number;
}

export const Grid: React.FC<GridProps> = ({ width, height, gridSize }) => {
    const verticalLines: React.ReactNode[] = [];
    const horizontalLines: React.ReactNode[] = [];
    
    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
        verticalLines.push(
            <Line
                key={`v-${i}`}
                points={[i, 0, i, height]}
                stroke="#e0e0e0"
                strokeWidth={1}
                listening={false}
            />
        );
    }
    
    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
        horizontalLines.push(
            <Line
                key={`h-${i}`}
                points={[0, i, width, i]}
                stroke="#e0e0e0"
                strokeWidth={1}
                listening={false}
            />
        );
    }
    
    return (
        <React.Fragment>
            {verticalLines}
            {horizontalLines}
        </React.Fragment>
    );
};

