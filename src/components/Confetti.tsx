import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
}

export default function Confetti({ count = 50 }: { count?: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = ['#FFC700', '#FF0055', '#00E5FF', '#A300FF', '#00FF66'];
    const newPieces = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
    }));
    setPieces(newPieces);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            opacity: 1, 
            left: `${piece.x}%`, 
            top: `${piece.y}%`, 
            rotate: piece.rotation 
          }}
          animate={{ 
            opacity: [1, 1, 0], 
            top: '100%', 
            rotate: piece.rotation + 180 + Math.random() * 180 
          }}
          transition={{ 
            duration: piece.duration, 
            delay: piece.delay, 
            ease: "easeIn"
          }}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  );
}
