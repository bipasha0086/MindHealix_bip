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

  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-slate-900">Face Stress Check (Experimental)</h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-cyan-200 text-cyan-700">
          Camera frame + fallback signals
        </span>
      </div>

      <p className="text-sm text-slate-600 mb-3">
        The current camera frame is used for experimental stress classification. If the ML model is unavailable,
        expression-based fallback scoring is used.
      </p>

      <label className="flex items-start gap-2 text-sm text-slate-700 mb-3">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-1"
        />
        <span>I consent to temporary camera-based wellness analysis for this session.</span>
      </label>

      <div className="rounded-xl overflow-hidden border border-slate-200 bg-black/90 mb-3">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-56 object-cover" />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {!cameraOn ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={loadingModel}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {loadingModel ? 'Loading model...' : 'Start Camera'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold"
          >
            Stop Camera
          </button>
        )}

        <button
          type="button"
          onClick={analyzeFrame}
          disabled={!cameraOn || analyzing || loadingModel}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Current Frame'}
        </button>
      </div>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mb-2">{error}</div>}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-white p-3">
          <div className="text-sm text-slate-600">Facial Stress Estimate</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xl font-bold text-slate-900">{result.stress_level}</span>
            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
              Confidence {Math.round((result.confidence || 0) * 100)}%
            </span>
            <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-700">{result.prediction_source}</span>
          </div>
          {result.stress_label && <div className="text-xs text-slate-600 mt-2">Model label: {result.stress_label}</div>}
          {result.class_probabilities && (
            <div className="text-xs text-slate-600 mt-1">
              Probabilities:{' '}
              {Object.entries(result.class_probabilities)
                .map(([key, value]) => `${key} ${Math.round(Number(value) * 100)}%`)
                .join(' | ')}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            This is a wellness indicator, not a clinical diagnosis.
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceStressCheck;
