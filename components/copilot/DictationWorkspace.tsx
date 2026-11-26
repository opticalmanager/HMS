"use client";

import * as React from "react";
import {
  Mic,
  Square,
  Sparkles,
  Loader2,
  FileText,
  Lock,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  Volume2,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DictationWorkspaceProps {
  onDictateAudio: (audioBlob: Blob) => Promise<void>;
  onDictateText: (text: string) => Promise<void>;
  isProcessing: boolean;
  statusMessage?: string;
  hasPatient?: boolean;
  patientName?: string;
  disabled?: boolean;
}

const SAMPLE_HINGLISH_NOTE = `Patient Rajesh Kumar, 42 male, comes in with complaint of high grade bukhar since 3 days with chills, severe sir dard and badan dard. 
Provisional diagnosis is Acute Viral Fever with suspected Dengue.
Prescribing: Tab Dolo 650 TDS for 3 days khana khane ke baad, Tab Pantocid 40 OD subah khali pet for 5 days, Tab Augmentin 625 BD for 5 days.
Ordered complete blood count CBC and Dengue NS1 antigen test. Charge 250 for urgent sample collection.
Follow up after 3 days if fever does not subside.`;

export function DictationWorkspace({
  onDictateAudio,
  onDictateText,
  isProcessing,
  statusMessage,
  hasPatient = true,
  patientName,
  disabled = false,
}: DictationWorkspaceProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [textInput, setTextInput] = React.useState("");
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [micError, setMicError] = React.useState<string | null>(null);

  // Permission Lifecycle State: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'unknown'
  const [micPermission, setMicPermission] = React.useState<
    "granted" | "prompt" | "denied" | "unsupported" | "unknown"
  >("unknown");
  const [isRequestingPermission, setIsRequestingPermission] = React.useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = React.useState(false);
  const [showPermissionSuccess, setShowPermissionSuccess] = React.useState(false);
  const [noPatientWarning, setNoPatientWarning] = React.useState(false);
  const [audioVolume, setAudioVolume] = React.useState(0);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const frameCountRef = React.useRef(0);
  const isRecordingRef = React.useRef(false);

  // 3-minute hard ceiling (180s)
  const MAX_RECORDING_SECS = 180;

  // Cleanup audio context and tracks on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Check initial browser microphone permission state & listen for changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as any })
        .then((permissionStatus) => {
          setMicPermission(permissionStatus.state);
          if (permissionStatus.state === "granted") {
            setMicError(null);
            setShowPermissionHelp(false);
          } else if (permissionStatus.state === "denied") {
            setShowPermissionHelp(true);
          }

          // Live reactive update when user toggles permission in browser address bar
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state);
            if (permissionStatus.state === "granted") {
              setMicError(null);
              setShowPermissionHelp(false);
              setShowPermissionSuccess(true);
              setTimeout(() => setShowPermissionSuccess(false), 4500);
            } else if (permissionStatus.state === "denied") {
              setMicError("Microphone permission was denied by the browser.");
              setShowPermissionHelp(true);
            }
          };
        })
        .catch(() => {
          setMicPermission("unknown");
        });
    }
  }, []);

  // Visualizer loop for live audio waveform (mirrored glowing equalized soundwave)
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!isRecordingRef.current) return;
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Compute live decibel/volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const vol = Math.min(100, Math.round((avg / 255) * 100));

      // Throttled volume state update for badge & ripple (10 fps)
      frameCountRef.current++;
      if (frameCountRef.current % 6 === 0) {
        setAudioVolume(vol);
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle centerline guide
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, centerY);
      ctx.lineTo(width - 12, centerY);
      ctx.stroke();

      // Render 36 mirrored pill bars centered across the canvas
      const barCount = 36;
      const barWidth = 4;
      const gap = 4;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = Math.max(8, (width - totalWidth) / 2);

      // Linear gradient for bars: sky blue -> primary blue
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#38BDF8");
      gradient.addColorStop(0.5, "#60A5FA");
      gradient.addColorStop(1, "#2563EB");

      ctx.fillStyle = gradient;
      ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
      ctx.shadowBlur = 6;

      for (let i = 0; i < barCount; i++) {
        // Sample frequency spectrum
        const binIndex = Math.min(
          bufferLength - 1,
          Math.floor((i / barCount) * (bufferLength * 0.8))
        );
        const rawValue = dataArray[binIndex] || 0;
        const normalized = rawValue / 255;

        // Subtle dynamic rhythmic wave modulation
        const idlePulse = Math.sin(Date.now() / 250 + i * 0.35) * 1.5;
        const barHeight = Math.max(6, normalized * (height - 14) + idlePulse);

        const x = startX + i * (barWidth + gap);
        const y = centerY - barHeight / 2;

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(x, y, barWidth, barHeight, 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    };
    render();
  };

  // Direct user-gesture triggered permission request
  const requestMicPermission = async () => {
    setIsRequestingPermission(true);
    setMicError(null);

    try {
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        throw new Error(
          "Microphone recording requires a secure origin (HTTPS or localhost). Please access the clinic portal via HTTPS."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // User clicked "Allow" in browser native popup!
      stream.getTracks().forEach((track) => track.stop()); // close test hardware stream
      setMicPermission("granted");
      setShowPermissionHelp(false);
      setShowPermissionSuccess(true);
      setTimeout(() => setShowPermissionSuccess(false), 4500);
      setNoPatientWarning(false);
    } catch (err: any) {
      const errName = err?.name || "";
      const errMsg = err?.message || "";
      if (
        errName === "NotAllowedError" ||
        errName === "PermissionDeniedError" ||
        errMsg.toLowerCase().includes("permission denied")
      ) {
        setMicPermission("denied");
        setShowPermissionHelp(true);
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setMicError("No microphone detected. Please plug in a microphone or headset.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setMicError("Microphone is locked by another application (e.g. Teams, Zoom, Discord).");
      } else {
        setMicError(errMsg || "Could not access microphone.");
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setIsRequestingPermission(true);

    try {
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        throw new Error(
          "Microphone recording requires a secure origin (HTTPS or localhost). Please access the clinic portal via HTTPS."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Permission successfully granted!
      setMicPermission("granted");
      setShowPermissionHelp(false);
      setMicError(null);

      // Setup Web Audio API Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);

        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (fullBlob.size > 0) {
          await onDictateAudio(fullBlob);
        }
      };

      recorder.start(500); // 500ms chunks
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingSeconds(0);
      setAudioVolume(0);
      frameCountRef.current = 0;

      // Start waveform drawing
      drawWaveform();

      // Countdown timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECS) {
            stopRecording();
            return MAX_RECORDING_SECS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      const errName = err?.name || "";
      const errMsg = err?.message || "";

      if (
        errName === "NotAllowedError" ||
        errName === "PermissionDeniedError" ||
        errMsg.toLowerCase().includes("permission denied")
      ) {
        setMicPermission("denied");
        setMicError("Microphone permission was denied by your browser.");
        setShowPermissionHelp(true);
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setMicError("No microphone detected. Please plug in a microphone or headset.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setMicError("Microphone is currently locked by another application (e.g. Teams, Zoom, Discord).");
      } else {
        setMicError(errMsg || "Could not access microphone.");
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioVolume(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discardRecording = () => {
    isRecordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current) {
      try {
        // Detach onstop callback so it does not send audio to the AI API
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {}
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioVolume(0);
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    // 1. If mic permission has not yet been granted, request it directly via user gesture.
    // This triggers the native browser "Allow / Block" popup immediately.
    if (micPermission !== "granted") {
      requestMicPermission();
      return;
    }

    // 2. If mic is permitted, but no patient is selected, prompt clearly
    if (!hasPatient) {
      setNoPatientWarning(true);
      setShowPermissionSuccess(true);
      setTimeout(() => setShowPermissionSuccess(false), 4500);
      return;
    }

    // 3. Permitted and patient selected -> start recording
    setNoPatientWarning(false);
    startRecording();
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    if (!hasPatient) {
      setNoPatientWarning(true);
      return;
    }
    await onDictateText(textInput.trim());
  };

  const handleUseSampleHinglish = () => {
    setTextInput(SAMPLE_HINGLISH_NOTE);
    setShowTextInput(true);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border border-slate-200 shadow-xs bg-linear-to-b from-blue-50/40 via-white to-white mb-4 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {/* Top Header / Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Native Clinical Voice Dictation (Gemini 3.5 Multimodal)
                </h2>
                {hasPatient && patientName && (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active: {patientName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Dictate natural clinical notes in English or Hinglish. Automatically ground Rx & Bill.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseSampleHinglish}
              disabled={isRecording || isProcessing || disabled}
              className="h-7 text-[11px] gap-1 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              Load Sample Hinglish Visit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTextInput((v) => !v)}
              disabled={isRecording || isProcessing || disabled}
              className="h-7 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <FileText className="h-3 w-3 mr-1" />
              {showTextInput ? "Hide Text Fallback" : "Type / Paste Notes"}
            </Button>
          </div>
        </div>

        {/* =========================================================================
            1. PROACTIVE PERMISSION BANNER (Shown when browser has not yet been granted permission)
           ========================================================================= */}
        {micPermission !== "granted" && micPermission !== "denied" && (
          <div className="mb-3.5 p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                <Mic className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-bold text-blue-950 block text-xs">
                  Microphone Permission Required
                </span>
                <span className="text-[11px] text-blue-800">
                  Click &quot;Enable Microphone&quot; to prompt your browser to allow clinical voice recording.
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={requestMicPermission}
              disabled={isRequestingPermission}
              className="h-7 px-3 text-xs bg-[#2563EB] hover:bg-blue-700 text-white font-medium gap-1.5 cursor-pointer shadow-2xs"
            >
              {isRequestingPermission ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              Enable Microphone
            </Button>
          </div>
        )}

        {/* =========================================================================
            2. PERMISSION GRANTED CONFIRMATION (Temporary reassurance)
           ========================================================================= */}
        {showPermissionSuccess && (
          <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Microphone permission is enabled &amp; active! {hasPatient ? `Ready to dictate for ${patientName}.` : "Select a patient on the left to begin consultation dictation."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPermissionSuccess(false)}
              className="text-emerald-700 hover:text-emerald-950 text-xs cursor-pointer p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            3. NO PATIENT WARNING BANNER (When doctor clicks mic without active patient)
           ========================================================================= */}
        {noPatientWarning && !hasPatient && (
          <div className="mb-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Patient Selection Required</span>
                <span className="text-[11px] text-amber-800">
                  Microphone is active! Please select a patient from today&apos;s queue on the left (or click <strong>&quot;+ Quick Register Walk-in&quot;</strong>) to attach this clinical consultation.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNoPatientWarning(false)}
              className="text-amber-700 hover:text-amber-950 text-xs cursor-pointer p-0.5 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Mic Visualizer / Record Hero Area */}
        <div className="flex flex-col items-center justify-center py-4 px-3 bg-slate-50/60 rounded-xl border border-slate-200/80 mb-3">
          {isRecording ? (
            <div className="flex flex-col items-center space-y-3.5 w-full max-w-xl animate-in fade-in-50 duration-200">
              {/* Header: Live Volume Meter + Recording Timer */}
              <div className="flex items-center justify-between w-full px-2">
                {/* Voice Activity Indicator */}
                <div className="flex items-center gap-1.5">
                  {audioVolume > 10 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Speaking Detected ({audioVolume}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                      Listening (Speak into microphone)
                    </span>
                  )}
                </div>

                {/* Monospace Timer Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold tabular-nums shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                  </span>
                  <span>{formatTimer(recordingSeconds)}</span>
                  <span className="text-rose-400 text-[10px]">/ 3:00</span>
                </div>
              </div>

              {/* High-Definition Mirrored Waveform Viewport */}
              <div className="w-full relative px-1">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner p-1.5">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={64}
                    className="w-full h-16 block rounded-lg"
                  />
                </div>
              </div>

              {/* Action Buttons: Stop & Extract + Discard */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={discardRecording}
                  className="h-9 px-3.5 rounded-full text-slate-600 border-slate-300 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/70 active:scale-95 transition-all text-xs gap-1.5 cursor-pointer"
                  title="Discard this recording without processing"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Discard Note
                </Button>

                <div className="relative group">
                  {/* Dynamic Glowing Volume Aura */}
                  <div
                    className="absolute -inset-1 rounded-full bg-rose-500/30 blur-xs transition-opacity duration-150"
                    style={{
                      opacity: Math.max(0.3, Math.min(1, 0.3 + (audioVolume / 100) * 0.7)),
                    }}
                  />
                  <Button
                    type="button"
                    onClick={stopRecording}
                    className="relative h-10 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-2 shadow-md shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop & Extract Clinical Record
                  </Button>
                </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-5 space-y-3 text-center max-w-md mx-auto animate-in fade-in-50 duration-300">
              <div className="relative h-12 w-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative h-11 w-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  {statusMessage || "Gemini 3.5 Multimodal Reasoning Pipeline Active..."}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Transcribing audio notes, grounding drugs against pg_trgm catalog, and cross-checking allergies.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
                <span>HITL Guardrail: Generates draft only. You verify before final approval.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 text-center py-2 animate-in fade-in-50 duration-200">
              <div className="relative group">
                {/* Breathing ambient aura ring */}
                <div
                  className={cn(
                    "absolute -inset-2.5 rounded-full transition-all duration-300 blur-xs",
                    micPermission === "granted" && hasPatient
                      ? "bg-blue-500/15 group-hover:bg-blue-500/25 group-hover:scale-110"
                      : micPermission === "denied"
                      ? "bg-amber-500/15 group-hover:bg-amber-500/25"
                      : "bg-slate-400/10 group-hover:bg-blue-500/20"
                  )}
                />

                <button
                  type="button"
                  onClick={handleMicButtonClick}
                  disabled={isProcessing}
                  className={cn(
                    "relative h-16 w-16 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 cursor-pointer",
                    micPermission === "denied"
                      ? "bg-amber-600 hover:bg-amber-700 hover:scale-105 active:scale-95 shadow-amber-500/25"
                      : micPermission === "granted" && hasPatient
                      ? "bg-linear-to-b from-[#2563EB] to-[#1D4ED8] hover:from-blue-600 hover:to-blue-800 hover:scale-105 active:scale-95 shadow-blue-500/30"
                      : "bg-[#2563EB] hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-500/20"
                  )}
                  title={
                    micPermission !== "granted"
                      ? "Click to grant microphone permission"
                      : !hasPatient
                      ? "Click to test microphone or select a patient to dictate"
                      : "Click to start recording dictation"
                  }
                >
                  {isRequestingPermission ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Mic className="h-7 w-7 transition-transform group-hover:scale-110 duration-200" />
                  )}
                </button>

                {micPermission === "denied" && (
                  <span
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-sm border-2 border-white"
                    title="Microphone permission required"
                  >
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-800 block">
                  {isRequestingPermission
                    ? "Requesting microphone permission in browser..."
                    : micPermission === "denied"
                    ? "Microphone access blocked — Click to unblock in browser"
                    : micPermission !== "granted"
                    ? "Click microphone to enable browser audio access"
                    : hasPatient
                    ? `Click microphone to start dictating for ${patientName}`
                    : "Click microphone to test audio (Select patient on left to dictate)"}
                </span>
                <span className="text-[11px] text-slate-400 block max-w-sm mx-auto">
                  Speaks Hindi, English & medical shorthand (OD, BD, TDS, SOS)
                </span>
              </div>

              {isRequestingPermission && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-[11px] animate-pulse flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Please click <strong>&quot;Allow&quot;</strong> in your browser&apos;s permission popup to enable recording.</span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              4. PRODUCTION PERMISSION RECOVERY & GUIDANCE CARD (When browser policy denies)
             ========================================================================= */}
          {showPermissionHelp && micPermission === "denied" && !isRecording && !isProcessing && (
            <div className="w-full max-w-md mt-4 p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-slate-800 text-xs shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-amber-950 text-xs">
                      Microphone Permission Required
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPermissionHelp(false)}
                      className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer"
                      title="Dismiss notice"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                    Your browser has microphone access currently blocked for this site. To unblock it in 5 seconds:
                  </p>

                  <ol className="mt-2 space-y-1 text-[11px] text-slate-700 list-decimal list-inside bg-white/80 p-2.5 rounded-lg border border-amber-200/60 font-medium">
                    <li>
                      Click the <strong className="text-slate-900">Site Settings / Sliders (⚙/🎛) or Lock (🔒) icon</strong> in your browser&apos;s address bar (left of the URL).
                    </li>
                    <li>
                      Find <strong className="text-slate-900">Microphone</strong> and switch it from <em>Block</em> to <strong className="text-emerald-700">Allow</strong>.
                    </li>
                    <li>
                      Click the <strong className="text-blue-700">Re-check & Test</strong> button below.
                    </li>
                  </ol>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={requestMicPermission}
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Re-check & Test Microphone
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowTextInput(true);
                        setShowPermissionHelp(false);
                      }}
                      className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100/60 gap-1.5 cursor-pointer"
                    >
                      <FileText className="h-3 w-3" />
                      Use Text Note Fallback
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {micError && !showPermissionHelp && micPermission !== "denied" && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-2 text-center justify-center">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Microphone error: {micError}</span>
            </div>
          )}
        </div>

        {/* Text Fallback Section */}
        {showTextInput && (
          <form onSubmit={handleTextSubmit} className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Direct Clinical Transcription / Notes (Fallback)
              </label>
              {textInput && (
                <button
                  type="button"
                  onClick={() => setTextInput("")}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste or type consultation notes here (e.g. Patient Rajesh, 42M, complaints of fever 3 days. Rx: Tab Dolo 650 TDS, Pantocid 40 OD...)"
              rows={4}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-sans"
              disabled={isProcessing}
            />
            <div className="flex items-center justify-between">
              {!hasPatient ? (
                <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Select a patient on the left before extracting
                </span>
              ) : <span />}
              <Button
                type="submit"
                size="sm"
                disabled={!textInput.trim() || isProcessing}
                className="h-8 text-xs bg-[#2563EB] hover:bg-blue-700 text-white gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Extract Structured Rx & Bill
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
