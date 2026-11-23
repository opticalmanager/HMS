"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Loader2,
  FileText,
  Lock,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DictationWorkspaceProps {
  onDictateAudio: (audioBlob: Blob) => Promise<void>;
  onDictateText: (text: string) => Promise<void>;
  isProcessing: boolean;
  statusMessage?: string;
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

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);

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
            setMicError("Microphone permission was denied by the browser.");
          }

          // Live reactive update when user toggles permission in browser address bar
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state);
            if (permissionStatus.state === "granted") {
              setMicError(null);
              setShowPermissionHelp(false);
            } else if (permissionStatus.state === "denied") {
              setMicError("Microphone permission was denied by the browser.");
            }
          };
        })
        .catch(() => {
          setMicPermission("unknown");
        });
    }
  }, []);

  // Visualizer loop for live audio waveform
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(37, 99, 235, ${Math.max(0.2, dataArray[i] / 255)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    };
    render();
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setIsRequestingPermission(true);

    try {
      // Check for secure context
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
      analyser.fftSize = 64;
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
      setIsRecording(true);
      setRecordingSeconds(0);

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
        setMicError("No microphone detected on this computer. Please plug in a microphone or headset.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setMicError("Microphone is currently locked by another application (e.g. Teams, Zoom, or Discord).");
      } else {
        setMicError(errMsg || "Could not access microphone. Please check browser permissions.");
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (micPermission === "denied") {
      setShowPermissionHelp(true);
      return;
    }

    startRecording();
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
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
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Native Clinical Voice Dictation (Gemini 3.5 Multimodal)
              </h2>
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

        {/* Mic Visualizer / Record Hero Area */}
        <div className="flex flex-col items-center justify-center py-4 px-3 bg-slate-50/60 rounded-xl border border-slate-200/80 mb-3">
          {isRecording ? (
            <div className="flex flex-col items-center space-y-3 w-full max-w-md">
              {/* Waveform Canvas */}
              <canvas
                ref={canvasRef}
                width={360}
                height={40}
                className="w-full h-10 rounded bg-white border border-slate-200"
              />

              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                </span>
                <span className="font-mono text-sm font-bold text-rose-600">
                  {formatTimer(recordingSeconds)} / 3:00
                </span>
              </div>

              <Button
                type="button"
                onClick={stopRecording}
                className="h-10 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-2 shadow-sm cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop & Extract Clinical Record
              </Button>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-center">
              <Loader2 className="h-7 w-7 text-[#2563EB] animate-spin" />
              <p className="text-xs font-semibold text-slate-800">
                {statusMessage || "Gemini 3.5 Multimodal Reasoning Pipeline Active..."}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Extracting clinical diagnosis, grounding medicines against pg_trgm catalog, and cross-checking allergies.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleMicButtonClick}
                  disabled={disabled || isRequestingPermission}
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 cursor-pointer",
                    disabled
                      ? "bg-slate-300 cursor-not-allowed"
                      : micPermission === "denied"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                      : "bg-[#2563EB] hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-500/20"
                  )}
                  title={
                    micPermission === "denied"
                      ? "Microphone access blocked - Click to see instructions"
                      : "Click to start dictating"
                  }
                >
                  {isRequestingPermission ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : micPermission === "denied" ? (
                    <MicOff className="h-7 w-7" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </button>

                {micPermission === "denied" && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-sm">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-700">
                {micPermission === "denied"
                  ? "Microphone access blocked in browser"
                  : isRequestingPermission
                  ? "Requesting microphone permission..."
                  : "Click microphone to start recording doctor dictation"}
              </span>
              <span className="text-[10px] text-slate-400 max-w-xs">
                Speaks Hindi, English & medical shorthand (OD, BD, TDS, SOS)
              </span>

              {isRequestingPermission && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-[11px] animate-pulse flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Please click <strong>&quot;Allow&quot;</strong> in your browser&apos;s permission popup to enable recording.</span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PRODUCTION PERMISSION RECOVERY & GUIDANCE CARD
             ========================================================================= */}
          {(showPermissionHelp || (micPermission === "denied" && !isRecording && !isProcessing)) && (
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
                      Click the <strong className="text-slate-900">Lock (🔒) or Settings icon</strong> in your browser&apos;s address bar (left of the URL).
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
                      onClick={startRecording}
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
              disabled={isProcessing || disabled}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!textInput.trim() || isProcessing || disabled}
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
