import { Vector3, MathUtils } from 'three';
import { ParticleData, OrnamentColor } from './types';

export const TREE_HEIGHT = 14; 
export const TREE_RADIUS = 7.5; 
export const PARTICLE_COUNT = 900; 

// ==========================================
// 📷 照片配置区域
// ==========================================

// 获取当前部署的基础路径 (解决 GitHub Pages 子目录问题)
// 使用安全的访问方式，防止 import.meta.env 未定义导致报错
const meta = import.meta as any;
const BASE_URL = (meta && meta.env && meta.env.BASE_URL) ? meta.env.BASE_URL : './';

// 定义照片文件名 (确保 public/photos 文件夹中有这些文件)
const PHOTO_FILENAMES = [
  "1.jpg",   
  "2.png",   
  "3.jpg",
  "4.jpg",
  // "5.jpg", 
];

// 自动构建完整路径: ./photos/1.jpg 或 /repo-name/photos/1.jpg
export const PHOTOS = PHOTO_FILENAMES.map(name => {
  // 处理 BASE_URL 结尾可能带 / 也可能不带的情况，避免双斜杠
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}photos/${name}`;
});

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

       // Unleashed: Ring / Ellipse Layout
       // Distribute in a ring facing the camera
       const ringAngle = Math.random() * Math.PI * 2;
       // Inner radius ~11, Outer ~16 (wide spread)
       const ringRadius = 11 + Math.random() * 5; 
       
       // Elliptical scaling: Wider X, slightly shorter Y to fit screen aspect
       randomPos = new Vector3(
         Math.cos(ringAngle) * ringRadius * 1.4, // Wider X
         Math.sin(ringAngle) * ringRadius * 0.9, // Height
         16 + (Math.random() - 0.5) * 4          // Z depth: Close to camera (camera is at 28)
       );

       // Randomize rotation but keep them mostly facing forward/inward
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