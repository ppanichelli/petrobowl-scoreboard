import { useState } from 'react';

const MASCOTS = [
  '/assets/images/prospector.png',
  '/assets/images/miner_tiger_transparent.png',
];

export function useMascot() {
  const [src] = useState(() => MASCOTS[Math.floor(Math.random() * MASCOTS.length)]);
  return src;
}
