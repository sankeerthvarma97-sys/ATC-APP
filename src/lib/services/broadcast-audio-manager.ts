"use client";

import type { Socket } from "socket.io-client";

export type AudioCaptureErrorStage =
  | "SECURE_CONTEXT_REQUIRED"
  | "API_UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "POLICY_DISALLOWED"
  | "DEVICE_NOT_FOUND"
  | "DEVICE_BUSY"
  | "OVERCONSTRAINED"
  | "AUDIO_CONTEXT_FAILED"
  | "UNKNOWN_CAPTURE_ERROR";

export type AudioCaptureResult =
  | { ok: true; stream: MediaStream }
  | {
      ok: false;
      stage: AudioCaptureErrorStage;
      errorName: string;
      userMessage: string;
      technicalDetail?: string;
      referenceId: string;
    };

class BroadcastAudioManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isBroadcasting = false;
  private isMuted = false;
  private volume = 0.85;

  // Receiver playback queue
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingQueue = false;
  private currentSource: AudioBufferSourceNode | null = null;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  public isAudioUnlocked(): boolean {
    return Boolean(this.audioCtx && this.audioCtx.state === "running");
  }

  public async unlockAudio(): Promise<boolean> {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      this.ensureNodes();
      return this.audioCtx.state === "running";
    } catch (err) {
      console.warn("Failed to unlock audio context:", err);
      return false;
    }
  }

  private ensureNodes() {
    if (!this.audioCtx) return;
    if (!this.gainNode) {
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (!this.analyser) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.connect(this.gainNode);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Synthesize high-quality airport announcement two-tone chime (587Hz -> 880Hz)
   */
  public async playAirportChime(priority: "NORMAL" | "HIGH" | "URGENT" = "NORMAL") {
    await this.unlockAudio();
    if (!this.audioCtx || !this.gainNode) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const chimeGain = this.audioCtx.createGain();

      chimeGain.connect(this.analyser || this.gainNode);

      if (priority === "URGENT") {
        // Urgent Emergency alert chime: High 880Hz -> 1174Hz pulse
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.setValueAtTime(1174.66, now + 0.15);
      } else {
        // Standard pleasant aviation airport chime: D5 (587.33Hz) -> A5 (880Hz)
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.setValueAtTime(880, now + 0.2);
      }

      osc1.type = "sine";
      chimeGain.gain.setValueAtTime(0, now);
      chimeGain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(chimeGain);
      osc1.start(now);
      osc1.stop(now + 0.7);
    } catch (e) {
      console.warn("Chime generation skipped", e);
    }
  }


  // ============================================
  // ADMIN MICROPHONE CAPTURE & STREAMING
  // ============================================

  public async startMicrophoneCapture(
    socket: Socket,
    sessionId: string,
    onAnalyserReady?: (analyser: AnalyserNode) => void,
    onTrackEnded?: () => void,
  ): Promise<AudioCaptureResult> {
    const refId = `MIC-${Date.now().toString(36).toUpperCase()}`;

    // 1. Verify Browser Secure Context
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return {
        ok: false,
        stage: "SECURE_CONTEXT_REQUIRED",
        errorName: "InsecureContextError",
        userMessage: "Microphone access requires a secure connection (HTTPS or localhost). Please reload using HTTPS.",
        referenceId: refId,
      };
    }

    // 2. Verify mediaDevices API support
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      return {
        ok: false,
        stage: "API_UNSUPPORTED",
        errorName: "NotSupportedError",
        userMessage: "Your browser does not support audio capture via MediaDevices API. Please use Chrome, Edge, Firefox, or Safari.",
        referenceId: refId,
      };
    }

    try {
      await this.unlockAudio();
    } catch (audioCtxErr) {
      console.warn("AudioContext unlock deferred or failed:", audioCtxErr);
    }

    let stream: MediaStream | null = null;

    // 3. Progressive Constraint Acquisition with Automatic Fallback
    try {
      // Primary: High-fidelity speech constraints (without strict sampleRate lock to prevent hardware refusal)
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (primaryErr) {
      const errName = primaryErr instanceof Error ? primaryErr.name : "";
      if (errName === "OverconstrainedError" || errName === "TypeError") {
        console.warn("Primary audio constraints overconstrained; retrying with basic audio constraints...");
        try {
          // Secondary Fallback: Standard unconditional audio
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (fallbackErr) {
          return this.handleCaptureError(fallbackErr, refId);
        }
      } else {
        return this.handleCaptureError(primaryErr, refId);
      }
    }

    if (!stream) {
      return {
        ok: false,
        stage: "UNKNOWN_CAPTURE_ERROR",
        errorName: "NullStreamError",
        userMessage: "Unable to initialize audio stream. Please reconnect your microphone.",
        referenceId: refId,
      };
    }

    try {
      this.mediaStream = stream;
      this.isBroadcasting = true;
      this.isMuted = false;

      // Handle external device disconnect or user revoking track
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn("Microphone hardware disconnected or stream ended");
          this.stopCapture();
          if (onTrackEnded) onTrackEnded();
        };
      });

      if (this.audioCtx) {
        const source = this.audioCtx.createMediaStreamSource(stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.75;
        source.connect(this.analyser);
        // Do not connect mic source to audio destination on admin side to prevent acoustic loopback
        if (onAnalyserReady) onAnalyserReady(this.analyser);
      }

      // Check MediaRecorder mimeType support
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const selectedMime = mimeTypes.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";

      let seq = 0;
      const recorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime } : undefined,
      );
      this.mediaRecorder = recorder;

      recorder.ondataavailable = async (e) => {
        if (!this.isBroadcasting || e.data.size === 0 || this.isMuted) return;

        try {
          const buffer = await e.data.arrayBuffer();
          socket.emit("broadcast:voice:chunk", {
            sessionId,
            chunk: buffer,
            seq: seq++,
            mimeType: selectedMime || e.data.type,
          });
        } catch (err) {
          console.warn("Audio chunk serialization error", err);
        }
      };

      // 180ms timeslices for low-latency live streaming
      recorder.start(180);
      return { ok: true, stream };
    } catch (setupErr) {
      console.error("Audio recording setup failure:", setupErr);
      this.stopCapture();
      return this.handleCaptureError(setupErr, refId);
    }
  }

  private handleCaptureError(err: unknown, refId: string): AudioCaptureResult {
    this.stopCapture();
    const errName = err instanceof Error ? err.name : "UnknownError";
    const errMsg = err instanceof Error ? err.message : String(err);

    if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
      const isPolicy =
        errMsg.toLowerCase().includes("permissions policy") ||
        errMsg.toLowerCase().includes("feature policy") ||
        errMsg.toLowerCase().includes("disallowed by permissions policy");

      return {
        ok: false,
        stage: isPolicy ? "POLICY_DISALLOWED" : "PERMISSION_DENIED",
        errorName: errName,
        userMessage: isPolicy
          ? "Microphone access is restricted by document security policy. Ensure application is accessed on an authorized domain."
          : "Microphone permission was denied. Please allow microphone access in your browser address bar (lock icon) and retry.",
        technicalDetail: errMsg,
        referenceId: refId,
      };
    }

    if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
      return {
        ok: false,
        stage: "DEVICE_NOT_FOUND",
        errorName: errName,
        userMessage: "No microphone detected. Please plug in or connect an audio input device and retry.",
        technicalDetail: errMsg,
        referenceId: refId,
      };
    }

    if (errName === "NotReadableError" || errName === "TrackStartError") {
      return {
        ok: false,
        stage: "DEVICE_BUSY",
        errorName: errName,
        userMessage: "Microphone hardware is busy or in use by another application. Please close other voice or video apps and retry.",
        technicalDetail: errMsg,
        referenceId: refId,
      };
    }

    if (errName === "OverconstrainedError") {
      return {
        ok: false,
        stage: "OVERCONSTRAINED",
        errorName: errName,
        userMessage: "Audio input device cannot satisfy the requested audio constraints. Please use default microphone settings.",
        technicalDetail: errMsg,
        referenceId: refId,
      };
    }

    return {
      ok: false,
      stage: "UNKNOWN_CAPTURE_ERROR",
      errorName: errName,
      userMessage: `Unable to access microphone: ${errMsg || "Unknown hardware error"}. (Ref: ${refId})`,
      technicalDetail: errMsg,
      referenceId: refId,
    };
  }

  public setMuteMicrophone(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public stopCapture() {
    this.isBroadcasting = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
  }

  public dispose() {
    this.stopCapture();
    this.stopPlayback();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  // ============================================
  // STAFF AUDIO RECEPTION & PLAYBACK
  // ============================================

  public async receiveAudioChunk(chunkBuffer: ArrayBuffer) {
    await this.unlockAudio();
    if (!this.audioCtx || !this.gainNode) return;

    this.audioQueue.push(chunkBuffer);
    if (!this.isPlayingQueue) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0 || !this.audioCtx) {
      this.isPlayingQueue = false;
      return;
    }

    this.isPlayingQueue = true;
    const chunk = this.audioQueue.shift()!;

    try {
      // Decode audio chunk using browser AudioContext
      const audioBuffer = await this.audioCtx.decodeAudioData(chunk.slice(0));
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      this.currentSource = source;

      this.ensureNodes();
      source.connect(this.analyser || this.gainNode!);

      source.onended = () => {
        this.playNextChunk();
      };

      source.start();
    } catch {
      // Silently discard malformed chunk and continue queue
      this.playNextChunk();
    }
  }

  public stopPlayback() {
    this.audioQueue = [];
    this.isPlayingQueue = false;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {}
      this.currentSource = null;
    }
  }
}

export const broadcastAudioManager = new BroadcastAudioManager();
