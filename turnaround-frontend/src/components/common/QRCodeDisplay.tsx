import React from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * Deterministic, crisp SVG QR Code matrix renderer with standard corner position locators
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  fgColor = '#250C77',
  bgColor = '#FFFFFF',
  className = ''
}) => {
  // Generate pseudo-random deterministic matrix (21x21 standard QR grid) based on hash of the value
  const gridSize = 21;
  
  const matrix = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const grid: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

    // Fill corner position detection patterns (7x7 squares)
    const setFinder = (startX: number, startY: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          if (
            y === 0 || y === 6 || x === 0 || x === 6 ||
            (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          ) {
            grid[startY + y][startX + x] = true;
          }
        }
      }
    };

    setFinder(0, 0);                 // Top-Left
    setFinder(gridSize - 7, 0);        // Top-Right
    setFinder(0, gridSize - 7);        // Bottom-Left

    // Timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Deterministic payload encoding fill
    let seed = Math.abs(hash);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Skip finder pattern zones
        const isFinderTopLeft = x < 8 && y < 8;
        const isFinderTopRight = x >= gridSize - 8 && y < 8;
        const isFinderBottomLeft = x < 8 && y >= gridSize - 8;
        const isTiming = (x === 6 && y >= 8 && y < gridSize - 8) || (y === 6 && x >= 8 && x < gridSize - 8);

        if (!isFinderTopLeft && !isFinderTopRight && !isFinderBottomLeft && !isTiming) {
          seed = (seed * 9301 + 49297) % 233280;
          const charCode = value.charCodeAt((x * y) % value.length) || 42;
          grid[y][x] = (seed + charCode) % 3 === 0 || (x + y) % 2 === 0;
        }
      }
    }

    return grid;
  }, [value]);

  const cellSize = size / gridSize;

  return (
    <div
      className={`inline-flex items-center justify-center p-3 rounded-2xl border shadow-inner ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges select-none"
      >
        <rect width={size} height={size} fill={bgColor} rx={8} />
        {matrix.map((row, y) =>
          row.map((cell, x) => {
            if (!cell) return null;
            return (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fgColor}
                rx={cellSize * 0.15}
              />
            );
          })
        )}
        {/* Center security logo badge */}
        <circle cx={size / 2} cy={size / 2} r={cellSize * 1.8} fill={bgColor} />
        <circle cx={size / 2} cy={size / 2} r={cellSize * 1.3} fill="#ED642B" />
        <rect
          x={size / 2 - cellSize * 0.6}
          y={size / 2 - cellSize * 0.6}
          width={cellSize * 1.2}
          height={cellSize * 1.2}
          fill="#FFFFFF"
          rx={2}
        />
      </svg>
    </div>
  );
};
