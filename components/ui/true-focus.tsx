'use client';

import { useRef, useCallback } from 'react';
import { gsap } from 'gsap';

interface TrueFocusProps {
  children: string;
  className?: string;
  blurAmount?: number;
  animationDuration?: number;
  delayBetweenWords?: number;
}

/**
 * TrueFocus - Text animation with blur-to-focus effect on hover
 * Inspired by reactbits.dev/text-animations/true-focus
 */
export function TrueFocus({
  children,
  className = '',
  blurAmount = 8,
  animationDuration = 0.4,
  delayBetweenWords = 0.1,
}: TrueFocusProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!containerRef.current) return;
    const words = containerRef.current.querySelectorAll('.focus-word');

    // Animate blur out (focus in)
    gsap.to(words, {
      filter: 'blur(0px)',
      opacity: 1,
      duration: animationDuration,
      stagger: delayBetweenWords,
      ease: 'power2.out',
    });
  }, [animationDuration, delayBetweenWords]);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current) return;
    const words = containerRef.current.querySelectorAll('.focus-word');

    // Animate blur back in
    gsap.to(words, {
      filter: `blur(${blurAmount}px)`,
      opacity: 0.6,
      duration: animationDuration,
      stagger: delayBetweenWords,
      ease: 'power2.in',
    });
  }, [blurAmount, animationDuration, delayBetweenWords]);

  // Split text into words
  const words = children.split(' ');

  return (
    <span
      ref={containerRef}
      className={`cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className="focus-word inline-block"
          style={{ filter: `blur(${blurAmount}px)`, opacity: 0.6 }}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </span>
  );
}
