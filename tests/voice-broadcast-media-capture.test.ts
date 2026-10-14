import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  broadcastAudioManager,
  type AudioCaptureResult,
} from "@/lib/services/broadcast-audio-manager";
import {
  startVoiceBroadcast,
  toggleVoiceBroadcastMute,
  endVoiceBroadcast,
  getActiveVoiceBroadcast,
  getBroadcastHistory,
} from "@/lib/services/announcement-service";
import type { UserDTO } from "@/lib/domain";

describe("Part A — Login Page Credential Sanitization & Security", () => {
  it("ensures login page contains no visible demo passwords or auto-fill credentials", () => {
    const loginPagePath = resolve(process.cwd(), "src/app/login/page.tsx");
    const loginPageSource = readFileSync(loginPagePath, "utf-8");

    // Must not contain hardcoded demo passwords
    expect(loginPageSource).not.toContain("Sankeerth@80");
    expect(loginPageSource).not.toContain("Atc@1234");
    expect(loginPageSource).not.toContain("AoccDemo!2026");

    // Must not contain Quick Demo helper panel or buttons
    expect(loginPageSource).not.toContain("Quick Demo Staff Logins");
    expect(loginPageSource).not.toContain("Quick Authority Logins");
    expect(loginPageSource).not.toContain("Maryam Malik (atc9807@gmail.com)");

    // Must not leak passwords in error text or placeholders
    expect(loginPageSource).not.toContain("security key 'Atc@1234'");
    expect(loginPageSource).not.toContain("(Default:");
  });

  it("ensures password-change-modal contains no credential hints", () => {
    const modalPath = resolve(process.cwd(), "src/components/employee/password-change-modal.tsx");
    const modalSource = readFileSync(modalPath, "utf-8");

    expect(modalSource).not.toContain("Atc@1234");
  });

  it("ensures public README and DEPLOYMENT guides do not display plaintext administrator passwords", () => {
    const readmeSource = readFileSync(resolve(process.cwd(), "README.md"), "utf-8");
    const deploySource = readFileSync(resolve(process.cwd(), "DEPLOYMENT.md"), "utf-8");

    expect(readmeSource).not.toContain("All demo users use password `AoccDemo!2026`");
    expect(deploySource).not.toContain("| `ADMIN_BOOTSTRAP_PASSWORD` | `Sankeerth@80` |");
    expect(deploySource).toContain("<YOUR_SECURE_PASSWORD>");
  });
});

describe("Part B — Microphone Permissions Policy & Headers", () => {
  it("enforces Permissions-Policy: microphone=(self) in next.config.ts", () => {
    const nextConfigPath = resolve(process.cwd(), "next.config.ts");
    const nextConfigSource = readFileSync(nextConfigPath, "utf-8");

    // Must permit microphone for self while keeping others restricted
    expect(nextConfigSource).toContain('microphone=(self)');
    expect(nextConfigSource).not.toContain('microphone=()');
    expect(nextConfigSource).toContain('camera=()');
    expect(nextConfigSource).toContain('geolocation=()');
  });

  it("enforces Permissions-Policy: microphone=(self) in src/middleware.ts", () => {
    const middlewarePath = resolve(process.cwd(), "src/middleware.ts");
    const middlewareSource = readFileSync(middlewarePath, "utf-8");

    expect(middlewareSource).toContain('microphone=(self)');
    expect(middlewareSource).not.toContain('microphone=()');
    expect(middlewareSource).toContain('camera=()');
  });
});

describe("Part B — BroadcastAudioManager Acquisition & Error Diagnostics", () => {
  const origWindow = globalThis.window;
  const origNavigator = globalThis.navigator;

  function mockEnv(windowObj: unknown, navigatorObj: unknown) {
    Object.defineProperty(globalThis, "window", {
      value: windowObj,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: navigatorObj,
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    broadcastAudioManager.stopCapture();
    mockEnv(origWindow, origNavigator);
    vi.restoreAllMocks();
  });

  it("detects insecure HTTP context and returns SECURE_CONTEXT_REQUIRED", async () => {
    mockEnv({ isSecureContext: false }, {});

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result: AudioCaptureResult = await broadcastAudioManager.startMicrophoneCapture(
      mockSocket,
      "test-session-1"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("SECURE_CONTEXT_REQUIRED");
      expect(result.userMessage).toContain("secure connection");
    }
  });

  it("detects missing mediaDevices and returns API_UNSUPPORTED", async () => {
    mockEnv({ isSecureContext: true }, {});

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result: AudioCaptureResult = await broadcastAudioManager.startMicrophoneCapture(
      mockSocket,
      "test-session-2"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("API_UNSUPPORTED");
      expect(result.userMessage).toContain("MediaDevices API");
    }
  });

  it("identifies NotAllowedError caused by document Permissions-Policy (POLICY_DISALLOWED)", async () => {
    const policyErr = new Error("Access to the feature 'microphone' is disallowed by permissions policy");
    policyErr.name = "NotAllowedError";

    mockEnv(
      { isSecureContext: true },
      {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(policyErr),
        },
      }
    );

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result = await broadcastAudioManager.startMicrophoneCapture(mockSocket, "test-session-3");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("POLICY_DISALLOWED");
      expect(result.userMessage).toContain("security policy");
    }
  });

  it("identifies user NotAllowedError (PERMISSION_DENIED)", async () => {
    const permErr = new Error("Permission denied by user");
    permErr.name = "NotAllowedError";

    mockEnv(
      { isSecureContext: true },
      {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(permErr),
        },
      }
    );

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result = await broadcastAudioManager.startMicrophoneCapture(mockSocket, "test-session-4");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("PERMISSION_DENIED");
      expect(result.userMessage).toContain("address bar");
    }
  });

  it("identifies NotFoundError when no microphone is connected (DEVICE_NOT_FOUND)", async () => {
    const notFoundErr = new Error("Requested device not found");
    notFoundErr.name = "NotFoundError";

    mockEnv(
      { isSecureContext: true },
      {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(notFoundErr),
        },
      }
    );

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result = await broadcastAudioManager.startMicrophoneCapture(mockSocket, "test-session-5");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("DEVICE_NOT_FOUND");
      expect(result.userMessage).toContain("No microphone detected");
    }
  });

  it("identifies NotReadableError when microphone is busy (DEVICE_BUSY)", async () => {
    const busyErr = new Error("Device in use by another application");
    busyErr.name = "NotReadableError";

    mockEnv(
      { isSecureContext: true },
      {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(busyErr),
        },
      }
    );

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result = await broadcastAudioManager.startMicrophoneCapture(mockSocket, "test-session-6");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("DEVICE_BUSY");
      expect(result.userMessage).toContain("busy or in use");
    }
  });

  it("gracefully falls back to { audio: true } when preferred constraints throw OverconstrainedError", async () => {
    const overconstrainedErr = new Error("sampleRate cannot be satisfied");
    overconstrainedErr.name = "OverconstrainedError";

    const mockStop = vi.fn();
    const mockTrack = { stop: mockStop, onended: null, enabled: true };
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockTrack]),
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    };

    const getUserMediaMock = vi.fn()
      .mockRejectedValueOnce(overconstrainedErr) // Primary fails
      .mockResolvedValueOnce(mockStream);         // Fallback succeeds

    const winMock = {
      isSecureContext: true,
      AudioContext: class {
        state = "running";
        currentTime = 0;
        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
        createAnalyser() {
          return {
            connect: vi.fn(),
            fftSize: 256,
            smoothingTimeConstant: 0.75,
          };
        }
      },
    };

    mockEnv(winMock, {
      mediaDevices: {
        getUserMedia: getUserMediaMock,
      },
    });

    // Mock global MediaRecorder
    // @ts-expect-error test mock
    globalThis.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
      ondataavailable = null;
      state = "recording";
      start = vi.fn();
      stop = vi.fn();
    };

    const mockSocket = { emit: vi.fn() } as unknown as import("socket.io-client").Socket;
    const result = await broadcastAudioManager.startMicrophoneCapture(mockSocket, "test-session-7");

    // Fallback was attempted
    expect(getUserMediaMock).toHaveBeenCalledTimes(2);
    expect(getUserMediaMock).toHaveBeenNthCalledWith(2, { audio: true });
    expect(result.ok).toBe(true);

    // Teardown stops tracks cleanly
    broadcastAudioManager.stopCapture();
    expect(mockStop).toHaveBeenCalled();
  });
});

describe("Part B — Backend Voice Broadcast Session Authorization & Lifecycle", () => {
  const superAdminUser: UserDTO = {
    id: "usr-admin-1",
    email: "admin@aocc.test",
    name: "Command Authority Admin",
    role: "SUPER_ADMIN",
  };

  const staffController: UserDTO = {
    id: "usr-staff-atc-1",
    email: "atc@aocc.test",
    name: "Tower Controller",
    role: "ATC",
  };

  it("authorizes SUPER_ADMIN to initiate a live voice broadcast", async () => {
    const session = await startVoiceBroadcast({
      admin: superAdminUser,
      targetAudienceType: "ALL_STAFF",
    });

    expect(session).toBeDefined();
    expect(session.adminId).toBe(superAdminUser.id);
    expect(session.status).toBe("TRANSMITTING");

    const active = getActiveVoiceBroadcast();
    expect(active?.id).toBe(session.id);
  });

  it("rejects unauthorized staff roles (ATC, PILOT, etc.) from starting a live broadcast", async () => {
    await expect(
      startVoiceBroadcast({
        admin: staffController,
        targetAudienceType: "ALL_STAFF",
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("supports mute, resume, and cleanly ends voice broadcast", async () => {
    const active = getActiveVoiceBroadcast();
    expect(active).not.toBeNull();
    if (!active) return;

    // Mute
    const muted = await toggleVoiceBroadcastMute(active.id, true, superAdminUser.id);
    expect(muted?.status).toBe("MUTED");

    // Resume
    const resumed = await toggleVoiceBroadcastMute(active.id, false, superAdminUser.id);
    expect(resumed?.status).toBe("TRANSMITTING");

    // End
    const ended = await endVoiceBroadcast(active.id, superAdminUser.id);
    expect(ended?.status).toBe("ENDED");
    expect(getActiveVoiceBroadcast()).toBeNull();

    // Verify in audit history
    const history = getBroadcastHistory();
    expect(history.some((h) => h.id === active.id)).toBe(true);
  });
});
