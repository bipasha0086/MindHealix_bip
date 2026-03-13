import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { moodAPI } from '../services/api';

const MEDIAPIPE_VERSION = '0.10.32';

const scoreMap = (categories = []) => {
  const map = {};
  categories.forEach((item) => {
    map[item.categoryName] = item.score;
  });
  return map;
};

const FaceStressCheck = ({ onResult }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const canvasRef = useRef(null);

  const [consented, setConsented] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setLoadingModel(true);
    setError('');

    try {
      const vision = await FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
      );

      const createWithDelegate = async (delegate) =>
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate,
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'IMAGE',
          numFaces: 1,
        });

      let faceLandmarker;
      try {
        faceLandmarker = await createWithDelegate('GPU');
      } catch (_gpuError) {
        faceLandmarker = await createWithDelegate('CPU');
      }

      landmarkerRef.current = faceLandmarker;
      return faceLandmarker;
    } catch (initError) {
      setError('Unable to load face model. Please try again.');
      throw initError;
    } finally {
      setLoadingModel(false);
    }
  };

  const startCamera = async () => {
    setError('');

    if (!consented) {
      setError('Please enable camera consent first.');
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setError('Camera API is not available in this browser/session. Try Chrome/Edge on localhost.');
      return;
    }

    try {
      try {
        await initLandmarker();
      } catch (_landmarkerError) {
        setError('Camera started without local landmark analysis. Server-side image prediction will be used if available.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch (_cameraError) {
      setError('Camera access failed. Check permissions and HTTPS/localhost context.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current) {
      setError('Camera frame is not ready yet.');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const imageData = captureCurrentFrame();
      if (!imageData) {
        setError('Could not capture the current frame. Try again.');
        setAnalyzing(false);
        return;
      }

      const detection = landmarkerRef.current ? landmarkerRef.current.detect(videoRef.current) : null;
      const blendshapeList = detection?.faceBlendshapes?.[0]?.categories || [];

      const b = scoreMap(blendshapeList);
      const payload = {
        image_data: imageData,
        smile_score: Number((b.mouthSmileLeft || 0) + (b.mouthSmileRight || 0)) / 2,
        brow_tension_score: Number((b.browDownLeft || 0) + (b.browDownRight || 0)) / 2,
        eye_blink_score: Number((b.eyeBlinkLeft || 0) + (b.eyeBlinkRight || 0)) / 2,
        jaw_tension_score: Number(b.jawOpen || 0),
        confidence: 0.75,
      };

      const response = await moodAPI.predictStressFace(payload);
      const parsed = response?.data?.prediction || null;
      setResult(parsed);
      if (parsed && onResult) onResult(parsed);
    } catch (_analysisError) {
      setError('Facial analysis failed. Please retry.');
    } finally {
      setAnalyzing(false);
    }
  };

  const stressColor = (level) => {
    if (!level) return { bg: 'bg-slate-200', text: 'text-slate-600', bar: 'bg-slate-400' };
    const l = String(level).toLowerCase();
    if (l === 'low')    return { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' };
    if (l === 'medium') return { bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-500' };
    return                     { bg: 'bg-rose-100',    text: 'text-rose-700',    bar: 'bg-rose-500' };
  };

  const probEntries = result?.class_probabilities ? Object.entries(result.class_probabilities) : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-sky-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📷</span>
          <h3 className="text-sm font-bold text-slate-800">Face Stress Check</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium border border-cyan-200">Experimental</span>
        </div>
        {cameraOn && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Square camera viewport */}
        <div className="relative mx-auto mb-4" style={{ width: '100%', maxWidth: '220px', aspectRatio: '1 / 1' }}>
          <div className="absolute inset-0 rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: cameraOn ? 'block' : 'none', width: '100%', height: '100%' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Placeholder when camera is off */}
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                  <span className="text-3xl opacity-60">🧑</span>
                </div>
                <p className="text-xs text-slate-500 text-center px-4">Camera preview will appear here</p>
              </div>
            )}

            {/* Analyzing overlay */}
            {analyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span className="text-xs text-white font-semibold">Analyzing…</span>
              </div>
            )}

            {/* Corner brackets for a modern scanner look */}
            {cameraOn && !analyzing && (
              <>
                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-sm pointer-events-none" />
              </>
            )}
          </div>
        </div>

        {/* Consent */}
        <label className="flex items-start gap-2 text-xs text-slate-600 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 accent-cyan-600"
          />
          <span>I consent to temporary camera-based wellness analysis for this session only.</span>
        </label>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {!cameraOn ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={loadingModel || !consented}
              className="col-span-1 px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-sky-700 transition-colors"
            >
              {loadingModel ? '⏳ Loading…' : '▶ Start Camera'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="col-span-1 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              ⏹ Stop
            </button>
          )}
          <button
            type="button"
            onClick={analyzeFrame}
            disabled={!cameraOn || analyzing || loadingModel}
            className="col-span-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
          >
            {analyzing ? '⌛ Scanning…' : '🔍 Analyze Frame'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</div>
        )}

        {/* Result */}
        {result && (() => {
          const sc = stressColor(result.stress_level);
          return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Facial Stress Estimate</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${sc.bg} ${sc.text}`}>
                  {result.stress_level}
                </span>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Confidence</span>
                  <span className="font-semibold">{Math.round((result.confidence || 0) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${sc.bar} transition-all duration-500`}
                    style={{ width: `${Math.round((result.confidence || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Probability bars */}
              {probEntries.length > 0 && (
                <div className="space-y-1.5">
                  {probEntries.map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                        <span className="capitalize">{key}</span>
                        <span>{Math.round(Number(val) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${stressColor(key).bar}`}
                          style={{ width: `${Math.round(Number(val) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700 font-medium">{result.prediction_source}</span>
                {result.stress_label && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">{result.stress_label}</span>
                )}
              </div>

              <p className="text-xs text-slate-400">Wellness indicator only — not a clinical diagnosis.</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default FaceStressCheck;
