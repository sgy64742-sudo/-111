import { Vector3, MathUtils } from 'three';
import { ParticleData, OrnamentColor } from './types';

export const TREE_HEIGHT = 14; 
export const TREE_RADIUS = 7.5; 
export const PARTICLE_COUNT = 900; 

// ==========================================
// 📷 照片配置区域 (本地文件模式)
// ==========================================
// 1. 请确保您的文件结构如下：
//    项目根目录
//    └── public
//        └── photos
//            ├── 1.jpg
//            ├── 2.png
//            └── ...
// 2. 注意：在该环境中，路径必须包含 "/public"
// ==========================================

export const PHOTOS = [
  "/photos/1.jpg",   
  "/photos/2.png",   
  "/photos/3.jpg",
  "/photos/4.jpg",
  // "/public/photos/5.jpg", 
];

export const generateTreeData = (): ParticleData[] => {
  const data: ParticleData[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 

  let photoIndex = 0;
  let lastPhotoIdx = -100;
  let lightCount = 0;
  const maxLights = 40; 

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

    let randomPos: Vector3;
    let randomRotation: Vector3;

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
       
       // Embed photos
       const normal = new Vector3(x, 0, z).normalize();
       const surfaceOffset = 0.35; 
       initialPos.add(normal.multiplyScalar(surfaceOffset));

       // Unleashed: Scatter in volume
       randomPos = new Vector3(
         (Math.random() - 0.5) * 32, 
         (Math.random() - 0.5) * 20, 
         5 + Math.random() * 19      
       );

       randomRotation = new Vector3(
           (Math.random() - 0.5) * 0.5, 
           (Math.random() - 0.5) * 0.5, 
           (Math.random() - 0.5) * 0.3 
       );

    } else if (Math.random() < lightChance && lightCount < maxLights) {
        type = 'light';
        color = '#FFFFFF'; 
        lightCount++;
        scale = 0.4; 

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