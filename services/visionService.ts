import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Singleton to manage the model
class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async initialize() {
    if (this.handLandmarker) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      console.log("HandLandmarker initialized");
    } catch (error) {
      console.error("Failed to initialize HandLandmarker:", error);
    }
  }

  detect(video: HTMLVideoElement) {
    if (!this.handLandmarker) return null;

    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const results = this.handLandmarker.detectForVideo(video, performance.now());
      return results;
    }
    return null;
  }
}

export const visionService = new VisionService();
