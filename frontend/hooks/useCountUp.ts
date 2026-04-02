import { useState, useEffect } from 'react';

/**
 * Custom hook to animate a number from 0 to a target value.
 * @param target - The final value to count up to.
 * @param duration - Duration of the animation in milliseconds.
 * @returns The current animated count.
 */
export function useCountUp(target: number, duration: number = 1500): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutExpo (fast start, then slows down)
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentCount = Math.floor(easedProgress * (target - startValue) + startValue);
      setCount(currentCount);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}
