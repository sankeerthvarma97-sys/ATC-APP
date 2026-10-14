import type {
  FlightCommandInput,
  FlightDTO,
  OperationsSnapshot,
  RadioMessageDTO,
  RadioMessageInput,
  AirportMetrics,
  OperationalEventDTO,
} from "@/lib/domain";

export const socketEvents = {
  snapshot: "operations:snapshot",
  positions: "flight:positions",
  command: "flight:command",
  commandAck: "flight:command:ack",
  radioMessage: "radio:message",
  emergencyDeclare: "emergency:declare",
  eventCreated: "operations:event",
  metricsUpdate: "metrics:update",
  notification: "notification",
} as const;

export interface ServerToClientEvents {
  [socketEvents.snapshot]: (snapshot: OperationsSnapshot) => void;
  [socketEvents.positions]: (flights: FlightDTO[]) => void;
  [socketEvents.commandAck]: (payload: { ok: boolean; command: FlightCommandInput; snapshot: OperationsSnapshot }) => void;
  [socketEvents.radioMessage]: (message: RadioMessageDTO) => void;
  [socketEvents.eventCreated]: (event: OperationalEventDTO) => void;
  [socketEvents.metricsUpdate]: (metrics: AirportMetrics) => void;
  [socketEvents.notification]: (payload: { severity: string; title: string; detail: string }) => void;
}

export interface ClientToServerEvents {
  [socketEvents.command]: (command: FlightCommandInput) => void;
  [socketEvents.radioMessage]: (message: RadioMessageInput) => void;
  [socketEvents.emergencyDeclare]: (payload: { flightId: string; note?: string }) => void;
}
