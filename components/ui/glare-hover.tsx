'use client';

import { useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlareHoverProps {
  children: ReactNode;
  className?: string;
  glareOpacity?: number;
  glareSize?: number;
  borderRadius?: string;
}

export function GlareHover({
  children,
  className,
  glareOpacity = 0.4,
  glareSize = 300,
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
      className={cn('relative overflow-hidden group', className)}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {/* Glare overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `
            radial-gradient(${glareSize}px circle at ${glarePosition.x}px ${glarePosition.y}px,
              rgba(255,255,255,${glareOpacity}) 0%,
              rgba(255,255,255,${glareOpacity * 0.5}) 25%,
              transparent 60%)
          `,
          borderRadius,
        }}
      />
      {/* Border glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 20px rgba(0,0,0,0.1)`,
          borderRadius,
        }}
      />
    </div>
  );
}
