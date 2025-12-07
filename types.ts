import { Vector3 } from 'three';

export interface ParticleData {
  id: number;
  initialPos: Vector3;
  randomPos: Vector3;
  randomRotation: Vector3; // Target rotation for unleashed state
  scale: number;
  color: string;
  type: 'ornament' | 'light' | 'photo';
  photoUrl?: string;
}

export interface HandGestureState {
  isDetected: boolean;
  isOpen: boolean; // true = open palm (explode), false = fist (tree)
  position: { x: number; y: number }; // Normalized -1 to 1
}

export enum OrnamentColor {
  GOLD = '#D4AF37',   // Less saturated, metallic gold
  EMERALD = '#1B4D3E', // Darker, desaturated forest green
  RED = '#8F332D',     // Muted deep red
  SILVER = '#A0A0A0',
}