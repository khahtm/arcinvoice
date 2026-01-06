'use client';

import { useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlareHoverProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
  glareOpacity?: number;
  glareSize?: number;
  borderRadius?: string;
}

export function GlareHover({
  children,
  className,
  glareColor = 'white',
  glareOpacity = 0.3,
  glareSize = 200,
  borderRadius = '1rem',
}: GlareHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glarePosition, setGlarePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setGlarePosition({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${glareSize}px circle at ${glarePosition.x}px ${glarePosition.y}px, rgba(255,255,255,${glareOpacity}), transparent 50%)`,
          borderRadius,
        }}
      />
    </div>
  );
}
