import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { generateTreeData, TREE_HEIGHT } from '../constants';
import { HandGestureState, ParticleData } from '../types';

interface TreeSceneProps {
  gestureState: HandGestureState;
}

const StarTopper = () => {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        const points = 5;
        const outerRadius = 1.2;
        const innerRadius = 0.5;
        const startAngle = -Math.PI / 2;
        
        for (let i = 0; i < points * 2; i++) {
            const angle = startAngle + (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius; 
            if (i === 0) s.moveTo(x, y);
            else s.lineTo(x, y);
        }
        s.closePath();
        return s;
    }, []);

    const extrudeSettings = { 
        depth: 0.4, 
        bevelEnabled: true, 
        bevelThickness: 0.1, 
        bevelSize: 0.1, 
        bevelSegments: 2 
    };
    
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, TREE_HEIGHT / 2 + 0.8, 0]} rotation={[0, 0, Math.PI]}>
             <extrudeGeometry args={[shape, extrudeSettings]} />
             <meshStandardMaterial 
                color="#FFD700" 
                emissive="#FFD700" 
                emissiveIntensity={2} 
                toneMapped={false} 
             />
        </mesh>
    );
}

// A Safe Photo component that handles loading errors without crashing the app
const SafePhoto = ({ url }: { url: string }) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                setTexture(tex);
                setHasError(false);
            },
            undefined, // onProgress
            (err) => {
                console.warn(`Failed to load photo at ${url}. Please check if the file exists in public/photos/`, err);
                setHasError(true);
            }
        );
    }, [url]);

    return (
        <mesh position={[0, 0.15, 0.06]}>
            <planeGeometry args={[1.1, 1.1]} />
            {texture && !hasError ? (
                 <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
            ) : (
                 // Fallback placeholder if loading fails
                 <meshStandardMaterial color="#e0e0e0" roughness={0.8} />
            )}
        </mesh>
    );
};

const Particle = ({ data, isUnleashed }: { data: ParticleData; isUnleashed: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const positionRef = useRef(data.initialPos.clone());
  
  // Calculate specific rotation for photos to face outward correctly on the tree
  const initialRotation = useMemo(() => {
    if (data.type === 'photo') {
        const dummy = new THREE.Object3D();
        dummy.position.copy(data.initialPos);
        // Look at the center axis at the same height (0, y, 0)
        dummy.lookAt(0, data.initialPos.y, 0); 
        // Rotate 180 deg so Z (front) faces OUT
        dummy.rotateY(Math.PI);
        return dummy.rotation;
    }
    return new THREE.Euler(0, 0, 0);
  }, [data.initialPos, data.type]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetPos = isUnleashed ? data.randomPos : data.initialPos;
    
    // Smooth position interpolation
    positionRef.current.lerp(targetPos, delta * 3);
    meshRef.current.position.copy(positionRef.current);

    if (isUnleashed) {
       // When unleashed, interpolate towards the specific random rotation for that particle
       if (data.type === 'photo') {
           // Smooth damping to random rotation
           meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, data.randomRotation.x, delta * 2);
           meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, data.randomRotation.y, delta * 2);
           meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, data.randomRotation.z, delta * 2);
       } else {
           // Ornaments tumble
           meshRef.current.rotation.x += delta * 0.5;
           meshRef.current.rotation.y += delta * 0.5;
       }
    } else {
       // Return to tree alignment
       if (data.type === 'photo') {
          meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, initialRotation.x, delta * 4);
          meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, initialRotation.y, delta * 4);
          meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, initialRotation.z, delta * 4);
       } else {
          meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, delta * 3);
          meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, delta * 3);
          meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 3);
       }
    }
  });

  if (data.type === 'photo' && data.photoUrl) {
    return (
      <group ref={meshRef}>
        <group>
            {/* Polaroid Backing Frame */}
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[1.3, 1.6, 0.1]} />
                <meshStandardMaterial color="#eeeeee" roughness={0.9} />
            </mesh>
            {/* Photo Image - Uses SafePhoto to prevent crashes */}
            <SafePhoto url={data.photoUrl} />
        </group>
      </group>
    );
  }

  // Light Sphere (White LED)
  if (data.type === 'light') {
    return (
        <group ref={meshRef}>
            <mesh>
                <sphereGeometry args={[data.scale * 0.5, 24, 24]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={3.0}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
  }

  // Ornaments (Standard Spheres)
  return (
    <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[data.scale * 0.5, 24, 24]} />
          {/* Increased Shininess: Lower metalness allows white specular highlights, lower roughness makes them sharp */}
          <meshStandardMaterial 
            color={data.color} 
            metalness={0.6} 
            roughness={0.1}
            emissive={data.color}
            emissiveIntensity={0.2}
          />
        </mesh>
    </group>
  );
};

const TreeController = ({ gestureState }: { gestureState: HandGestureState }) => {
  const treeData = useMemo(() => generateTreeData(), []);
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (gestureState.isDetected) {
        const targetAzimuth = -gestureState.position.x * 1.5;
        const targetPolar = (gestureState.position.y * 0.5) + (Math.PI / 2);
        
        if (controlsRef.current) {
            const controls = controlsRef.current;
            controls.setAzimuthalAngle(THREE.MathUtils.lerp(controls.getAzimuthalAngle(), targetAzimuth, delta * 2));
            controls.setPolarAngle(THREE.MathUtils.lerp(controls.getPolarAngle(), targetPolar, delta * 2));
            controls.update();
        }
    } else {
        if (controlsRef.current) {
             controlsRef.current.autoRotate = true;
             controlsRef.current.autoRotateSpeed = 0.5;
        }
    }
  });

  return (
    <>
      {/* Moved up from -3 to -1.0 */}
      <group position={[0, -1.0, 0]}>
        {treeData.map((data) => (
          <Particle 
            key={data.id} 
            data={data} 
            isUnleashed={gestureState.isOpen} 
          />
        ))}
        <StarTopper />
      </group>

      <OrbitControls 
        ref={controlsRef} 
        enableZoom={true} 
        enablePan={false} 
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 4}
      />
    </>
  );
};

export const TreeScene: React.FC<TreeSceneProps> = ({ gestureState }) => {
  return (
    <Canvas 
      shadows 
      camera={{ position: [0, 0, 28], fov: 40 }}
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 }}
    >
      <color attach="background" args={['#020202']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 5, 10]} intensity={2} color="#ffaa00" distance={50} decay={2} />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#00ffaa" distance={50} decay={2} />
      
      {/* Spotlight on the tree */}
      <spotLight 
        position={[0, 30, 10]} 
        angle={0.3} 
        penumbra={0.5} 
        intensity={3} 
        color="#fff" 
        castShadow 
      />

      <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />

      <TreeController gestureState={gestureState} />

      <EffectComposer>
        <Bloom 
            luminanceThreshold={1} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
      </EffectComposer>
    </Canvas>
  );
};