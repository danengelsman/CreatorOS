import React, { useState, useRef, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AppleCardProps {
  children?: React.ReactNode;
  backContent?: React.ReactNode;
  className?: string;
  isFlippable?: boolean;
  isDraggable?: boolean;
  tiltEnabled?: boolean;
  onClick?: () => void;
}

export default function AppleCard({
  children,
  backContent,
  className,
  isFlippable = false,
  isDraggable = false,
  tiltEnabled = true,
  onClick
}: AppleCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Tilt Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Lighting effect
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(mouseXSpring, [-0.5, 0.5], [0, 0.3]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || isFlipped) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleFlip = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isFlippable) {
      onClick?.();
      return;
    }
    // Prevent flip if dragging? Framer motion handles drag separately
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="perspective-1000 w-full h-full"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        ref={cardRef}
        drag={isDraggable ? true : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleFlip}
        style={{
          rotateX: isFlipped ? 0 : rotateX,
          rotateY: isFlipped ? 180 : rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          scale: 1,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          mass: 1
        }}
        className={cn(
          "relative w-full h-full cursor-pointer transition-shadow duration-500",
          isFlipped ? "" : "hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
          className
        )}
      >
        {/* Front Face */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[32px] overflow-hidden bg-premium-surface border border-premium-border"
          style={{ 
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transformStyle: "preserve-3d"
          }}
        >
          {children}
          
          {/* Glare Effect */}
          <motion.div 
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.4) 0%, transparent 80%)`,
              opacity: glareOpacity
            }}
          />
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[32px] overflow-hidden bg-premium-ink text-premium-bg p-8"
          style={{ 
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            transformStyle: "preserve-3d"
          }}
        >
          <div className="h-full flex flex-col" style={{ transform: "translateZ(1px)" }}>
            {backContent || (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <h4 className="text-xl font-bold">Details</h4>
                <p className="text-premium-bg/60 text-sm">Tap to flip back</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
