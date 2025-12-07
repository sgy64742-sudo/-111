import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { TreeScene } from './components/TreeScene';
import { visionService } from './services/visionService';
import { HandGestureState } from './types';

// Utils to interpret hand data
const calculateGesture = (landmarks: any[]): { isOpen: boolean, x: number, y: number } => {
  if (!landmarks || landmarks.length === 0) return { isOpen: false, x: 0, y: 0 };
  
  const hand = landmarks[0]; // Assume 1 hand
  
  // 1. Detect Open/Close based on Tip distance from Wrist/Palm
  const thumbTip = hand[4];
  const indexTip = hand[8];
  
  // Calculate Euclidean distance (simple 2D approximation is enough for this interaction)
  const distance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
  );

  // Threshold found by experiment (normalized coordinates)
  const isOpen = distance > 0.08; 

  // 2. Position (Centroid of hand or just wrist)
  // X needs to be inverted for mirror effect
  const x = (hand[9].x - 0.5) * 2; // Index 9 is middle finger knuckle (stable center)
  const y = (hand[9].y - 0.5) * 2;

  return { isOpen, x, y };
};

const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    const hand = landmarks[0];
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Connections: [start, end] indices
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17], [0, 17] // Palm
    ];

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00FF00'; // Green lines
    ctx.fillStyle = '#FFFF00'; // Yellow dots

    // Draw Lines
    ctx.beginPath();
    connections.forEach(([i, j]) => {
        const p1 = hand[i];
        const p2 = hand[j];
        // Mirror X coordinate: (1 - x)
        ctx.moveTo((1 - p1.x) * width, p1.y * height);
        ctx.lineTo((1 - p2.x) * width, p2.y * height);
    });
    ctx.stroke();

    // Draw Points
    hand.forEach((p: any) => {
        ctx.beginPath();
        ctx.arc((1 - p.x) * width, p.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [gestureState, setGestureState] = useState<HandGestureState>({
    isDetected: false,
    isOpen: false, // Default to tree form
    position: { x: 0, y: 0 }
  });
  const [cameraPermission, setCameraPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Initialize Vision
  useEffect(() => {
    const init = async () => {
        await visionService.initialize();
        setLoading(false);
    };
    init();
  }, []);

  // Detection Loop
  const detect = () => {
    if (
        webcamRef.current && 
        webcamRef.current.video && 
        webcamRef.current.video.readyState === 4
    ) {
        const video = webcamRef.current.video;
        const results = visionService.detect(video);
        
        // Handle Canvas sizing and drawing
        // Only update if we have a new result (results is not null)
        // This prevents flickering caused by clearing the canvas on frames where visionService skips processing
        if (canvasRef.current && results) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                if (results.landmarks && results.landmarks.length > 0) {
                    drawHandSkeleton(ctx, results.landmarks);
                } else {
                    // Only clear if we explicitly detected NO hand in a processed frame
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }
        }

        // State update only if new results available
        if (results) {
            if (results.landmarks && results.landmarks.length > 0) {
                const { isOpen, x, y } = calculateGesture(results.landmarks);
                setGestureState({
                    isDetected: true,
                    isOpen,
                    position: { x, y }
                });
            } else {
                setGestureState(prev => ({ ...prev, isDetected: false }));
            }
        }
    }
    requestRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    if (!loading && cameraPermission) {
        requestRef.current = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [loading, cameraPermission]);

  return (
    <div className="relative w-full h-full bg-black font-sans overflow-hidden">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <TreeScene gestureState={gestureState} />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-tighter drop-shadow-lg" style={{ fontFamily: 'serif' }}>
                Merry Christmas
            </h1>
            <p className="text-emerald-400 mt-2 text-lg drop-shadow-md">
                Interactive Magic Tree
            </p>
            <div className="mt-4 text-white/70 text-sm max-w-md space-y-2">
                <p>🎄 <span className="text-yellow-400 font-bold">Fist:</span> Form the Tree</p>
                <p>✨ <span className="text-yellow-400 font-bold">Open Hand:</span> Unleash the Magic</p>
                <p>👋 <span className="text-yellow-400 font-bold">Move Hand:</span> Rotate Camera</p>
            </div>
        </div>

        {/* Webcam Preview */}
        <div className="relative w-48 h-36 md:w-64 md:h-48 border-2 border-yellow-500/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(255,215,0,0.3)] bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-2">
                {!cameraPermission && (
                     <p className="text-white text-xs">Waiting for camera...</p>
                )}
            </div>
            {/* Video Feed */}
            <Webcam
                ref={webcamRef}
                mirrored
                onUserMedia={() => setCameraPermission(true)}
                className="absolute inset-0 w-full h-full object-cover z-10 opacity-80"
                videoConstraints={{
                    width: 320,
                    height: 240,
                    facingMode: "user"
                }}
            />
            {/* Canvas Overlay for Hand Skeleton */}
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
            />
            
            {/* Gesture Feedback Indicator */}
            <div className="absolute bottom-2 right-2 z-30 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${gestureState.isDetected ? 'bg-green-500 shadow-[0_0_10px_#00ff00]' : 'bg-red-500'}`}></span>
                <span className="text-[10px] text-white font-mono uppercase">
                    {gestureState.isDetected 
                        ? (gestureState.isOpen ? "UNLEASHED" : "ASSEMBLED") 
                        : "NO HAND"}
                </span>
            </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Loading Magic...</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;