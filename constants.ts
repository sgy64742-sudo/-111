import { Vector3, MathUtils } from 'three';
import { ParticleData, OrnamentColor } from './types';

export const TREE_HEIGHT = 14; 
export const TREE_RADIUS = 7.5; 
export const PARTICLE_COUNT = 900; 

// ==========================================
// 📷 Config
// ==========================================

const PHOTO_FILENAMES = [
  "1.jpg",   
  "2.png",   
  "3.jpg",
  "4.jpg",
  // "5.jpg", 
];

// Use explicit relative paths with dot. 
// This ensures the browser looks relative to index.html in the current folder.
export const PHOTOS = PHOTO_FILENAMES.map(name => `./photos/${name}`);

export const generateTreeData = (): ParticleData[] => {
  const data: ParticleData[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 

  let photoIndex = 0;
  let lastPhotoIdx = -100;
  let lightCount = 0;
  const maxLights = 40; 
  
  // Track photo positions to prevent overlap in the unleashed state
  const placedPhotosUnleashed: Vector3[] = [];
  const MIN_PHOTO_DIST = 3.0; 

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = i / (PARTICLE_COUNT - 1);
    
    // UNIFORM SURFACE AREA DISTRIBUTION
    const hNorm = 1 - Math.sqrt(1 - t);
    const y = (hNorm * TREE_HEIGHT) - (TREE_HEIGHT / 2);

    // PURE CONE GEOMETRY
    const radius = TREE_RADIUS * (1 - hNorm);

    const theta = i * goldenAngle;

    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    const initialPos = new Vector3(x, y, z);

    // Determine Type & Color first
    let type: ParticleData['type'] = 'ornament';
    let color: string = OrnamentColor.GOLD;
    let photoUrl = undefined;
    
    let scale = Math.random() * 0.5 + 0.4; 

    let randomPos: Vector3 = new Vector3();
    let randomRotation: Vector3 = new Vector3();

    // Photo Probability
    const photoChance = 0.07; 
    const canSpawnPhoto = (i > 40) && (i < PARTICLE_COUNT - 40) && (i - lastPhotoIdx > 22);

    // Light Probability
    const lightChance = (maxLights - lightCount) / (PARTICLE_COUNT - i);

    if (canSpawnPhoto && Math.random() < photoChance) {
       type = 'photo';
       // Cycle through user photos safely
       if (PHOTOS.length > 0) {
           photoUrl = PHOTOS[photoIndex % PHOTOS.length];
           photoIndex++;
       }
       lastPhotoIdx = i;
       
       // Embed photos slightly on surface
       const normal = new Vector3(x, 0, z).normalize();
       const surfaceOffset = 0.35; 
       initialPos.add(normal.multiplyScalar(surfaceOffset));

       // ==================================================
       // 🎀 Unleashed: Equatorial Ribbon / Ring Layout
       // ==================================================
       let validPos = false;
       let attempts = 0;
       
       while (!validPos && attempts < 50) {
           // Ring Radius: 15 - 20 (Wide orbit)
           const rRing = 15 + Math.random() * 5;
           
           // Angle: 0 - 2PI (Full circle)
           const rTheta = Math.random() * Math.PI * 2;
           
           // Height: Flatter ribbon (Equator style). 
           // Range -3 to 3.
           const rY = (Math.random() - 0.5) * 6; 

           const pX = rRing * Math.cos(rTheta);
           const pZ = rRing * Math.sin(rTheta);
           const pY = rY;
           
           const candidate = new Vector3(pX, pY, pZ);

           // Check collision
           let collision = false;
           for (const p of placedPhotosUnleashed) {
               if (candidate.distanceTo(p) < MIN_PHOTO_DIST) {
                   collision = true;
                   break;
               }
           }

           if (!collision) {
               randomPos = candidate;
               placedPhotosUnleashed.push(candidate);
               validPos = true;
           }
           attempts++;
       }
       
       // Fallback if collision check failed repeatedly
       if (!validPos) {
           const rTheta = Math.random() * Math.PI * 2;
           randomPos = new Vector3(18 * Math.cos(rTheta), 0, 18 * Math.sin(rTheta));
       }

       // randomRotation is ignored for photos in Unleashed state (they lookAt camera)
       randomRotation = new Vector3(0, 0, 0);

    } else if (Math.random() < lightChance && lightCount < maxLights) {
        type = 'light';
        color = '#FFFFFF'; 
        lightCount++;
        scale = 0.4; 

        // Lights explode outwards spherically
        const rTheta = Math.random() * Math.PI * 2;
        const rPhi = Math.acos((Math.random() * 2) - 1);
        const rRadius = 15 + Math.random() * 20; 
        randomPos = new Vector3(
            rRadius * Math.sin(rPhi) * Math.cos(rTheta),
            rRadius * Math.sin(rPhi) * Math.sin(rTheta),
            rRadius * Math.cos(rPhi)
        );
        randomRotation = new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    } else {
        // Standard Ornament
        const rand = Math.random();
        if (rand > 0.60) {
            color = OrnamentColor.GOLD;
        } else if (rand > 0.20) {
            color = OrnamentColor.EMERALD;
            scale *= 1.1; 
        } else {
            color = OrnamentColor.RED;
        }

        // Ornaments explode outwards
        const rTheta = Math.random() * Math.PI * 2;
        const rPhi = Math.acos((Math.random() * 2) - 1);
        const rRadius = 12 + Math.random() * 15; 
        randomPos = new Vector3(
            rRadius * Math.sin(rPhi) * Math.cos(rTheta),
            rRadius * Math.sin(rPhi) * Math.sin(rTheta),
            rRadius * Math.cos(rPhi)
        );
        randomRotation = new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    }

    data.push({
      id: i,
      initialPos,
      randomPos,
      randomRotation,
      scale,
      color,
      type,
      photoUrl
    });
  }
  return data;
};
