import { useEffect, useState } from 'react';

/**
 * 인덱스 기반 재생 루프. 1x = 초당 1슬롯(5분).
 * 끝에 도달하면 자동 정지한다.
 */
export function usePlayback(length: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing || length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, length]);

  const seek = (i: number) => setIndex(Math.max(0, Math.min(length - 1, i)));

  const togglePlay = () => {
    if (!playing && index >= length - 1) setIndex(0);
    setPlaying((p) => !p);
  };

  const reset = () => {
    setPlaying(false);
    setIndex(0);
    setSpeed(1);
  };

  return { index, seek, playing, togglePlay, speed, setSpeed, reset };
}
