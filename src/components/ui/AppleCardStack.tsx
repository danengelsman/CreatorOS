import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import AppleCard from './AppleCard';

interface StackItem {
  id: string | number;
  content: React.ReactNode;
  backContent?: React.ReactNode;
}

interface AppleCardStackProps {
  items: StackItem[];
  className?: string;
  onSwipe?: (item: StackItem) => void;
}

export default function AppleCardStack({ items: initialItems, className, onSwipe }: AppleCardStackProps) {
  const [items, setItems] = useState(initialItems);

  const handleDragEnd = (event: any, info: any, item: StackItem) => {
    // If dragged far enough, remove it (fling)
    const threshold = 150;
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.offset.y) > threshold) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onSwipe?.(item);
    }
  };

  return (
    <div className={cn("relative w-full h-[400px] flex items-center justify-center", className)}>
      <AnimatePresence>
        {items.map((item, index) => {
          const isTop = index === items.length - 1;
          const depth = items.length - 1 - index;
          
          return (
            <motion.div
              key={item.id}
              style={{
                zIndex: index,
                position: 'absolute',
                width: '100%',
                maxWidth: '340px',
                height: '100%',
              }}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1 - depth * 0.05, 
                opacity: 1 - depth * 0.2,
                y: depth * -15,
                rotate: depth * (index % 2 === 0 ? 1 : -1),
              }}
              exit={{ 
                x: 500, 
                opacity: 0, 
                rotate: 20,
                transition: { type: "spring", stiffness: 300, damping: 30 }
              }}
              drag={isTop ? true : false}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={(e, info) => handleDragEnd(e, info, item)}
              whileDrag={{ scale: 1.05, zIndex: 100 }}
            >
              <AppleCard 
                className="h-full shadow-2xl"
                isFlippable={isTop}
                tiltEnabled={isTop}
                backContent={item.backContent}
              >
                {item.content}
              </AppleCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {items.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-premium-muted font-medium text-sm"
        >
          All caught up.
        </motion.div>
      )}
    </div>
  );
}
