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
                // console.warn(`Failed to load photo at ${url}`, err); 
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
                 <meshStandardMaterial color="#e0e0e0" roughness={0.8} />
            )}
        </mesh>
    );
};

const Particle = ({ data, isUnleashed }: { data: ParticleData; isUnleashed: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const positionRef = useRef(data.initialPos.clone());
  
  const initialRotation = useMemo(() => {
    if (data.type === 'photo') {
        const dummy = new THREE.Object3D();
        dummy.position.copy(data.initialPos);
        dummy.lookAt(0, data.initialPos.y, 0); 
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
       if (data.type === 'photo') {
           // BILLBOARD EFFECT
           const dummy = new THREE.Object3D();
           dummy.position.copy(meshRef.current.position);
           dummy.lookAt(state.camera.position);
           meshRef.current.quaternion.slerp(dummy.quaternion, delta * 5);
       } else {
           meshRef.current.rotation.x += delta * 0.5;
           meshRef.current.rotation.y += delta * 0.5;
       }
    } else {
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
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[1.3, 1.6, 0.1]} />
                <meshStandardMaterial color="#eeeeee" roughness={0.9} />
            </mesh>
            <SafePhoto url={data.photoUrl} />
        </group>
      </group>
    );
  }

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

  return (
    <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[data.scale, 32, 32]} />
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
    const groupRef = useRef<THREE.Group>(null);
    const data = useMemo(() => generateTreeData(), []);
    
    useFrame((state, delta) => {
        if (!groupRef.current) return;
        
        // Hand rotation control (smooth lerp)
        const targetRotationY = gestureState.isDetected ? gestureState.position.x * 2 : 0;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, delta * 2);
    });

    return (
        <group ref={groupRef} position={[0, 1.5, 0]}>
            <StarTopper />
            {data.map((p) => (
                <Particle key={p.id} data={p} isUnleashed={gestureState.isDetected && gestureState.isOpen} />
            ))}
        </group>
    );
};

export const TreeScene = ({ gestureState }: TreeSceneProps) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 32], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#050505']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={1.0} color="#ffaa00" />
      <spotLight position={[0, 20, 0]} angle={0.5} penumbra={1} intensity={2} castShadow />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <TreeController gestureState={gestureState} />
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={10} 
        maxDistance={60}
        autoRotate={!gestureState.isDetected}
        autoRotateSpeed={0.5}
      />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1.2} mipmapBlur intensity={1.2} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
};