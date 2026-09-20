import type {
  FlightCommandInput,
  FlightDTO,
  OperationsSnapshot,
  RadioMessageInput,
  UserDTO,
} from "@/lib/domain";
import {
  airport,
  createInitialEvents,
  createInitialFlights,
  createInitialMessages,
  createInitialResources,
  demoUsers,
  educationalDisclaimer,
} from "@/lib/data/mock";
import {
  advanceFlights,
  applyFlightCommand,
  capFeed,
  commandToEvent,
  computeMetrics,
  makeMessage,
} from "@/lib/simulation/logic";

interface OperationsState {
  flights: FlightDTO[];
  resources: ReturnType<typeof createInitialResources>;
  events: ReturnType<typeof createInitialEvents>;
  messages: ReturnType<typeof createInitialMessages>;
}

const globalStore = globalThis as unknown as {
  aoccStore?: OperationsState;
};

function getStore(): OperationsState {
  if (!globalStore.aoccStore) {
    globalStore.aoccStore = {
      flights: createInitialFlights(),
      resources: createInitialResources(),
      events: createInitialEvents(),
      messages: createInitialMessages(),
    };
  }

  return globalStore.aoccStore;
}

export function getDemoUser(role: UserDTO["role"] = "ATC"): UserDTO {
  const user = demoUsers.find((item) => item.role === role) ?? demoUsers[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    shift: user.shift,
  };
}

export function buildMemorySnapshot(currentUser = getDemoUser()): OperationsSnapshot {
  const store = getStore();

  return {
    generatedAt: new Date().toISOString(),
    airport,
    currentUser,
    flights: [...store.flights],
    resources: [...store.resources],
    events: capFeed(store.events, 32),
    messages: capFeed(store.messages, 28),
    metrics: computeMetrics(store.flights, store.resources),
    disclaimer: educationalDisclaimer,
  };
}

export function tickMemorySimulation(tickMs: number) {
  const store = getStore();
  store.flights = advanceFlights(store.flights, tickMs);
  return buildMemorySnapshot();
}

export function applyMemoryCommand(input: FlightCommandInput) {
  const store = getStore();
  const before = store.flights.find((flight) => flight.id === input.flightId);
  store.flights = applyFlightCommand(store.flights, input);
  const after = store.flights.find((flight) => flight.id === input.flightId);
  store.events = capFeed([commandToEvent(input, after ?? before), ...store.events], 64);
  return { flight: after, snapshot: buildMemorySnapshot() };
}

export function addMemoryMessage(input: RadioMessageInput) {
  const store = getStore();
  const flight = store.flights.find((item) => item.id === input.flightId);
  const message = makeMessage({
    flight,
    text: input.text,
    direction: input.direction,
    priority: input.priority,
    channel: input.channel,
  });
  store.messages = capFeed([message, ...store.messages], 64);
  store.events = capFeed(
    [
      {
        id: `evt-${message.id}`,
        type: input.direction === "ATC_TO_PILOT" ? "ATC_MESSAGE" : "PILOT_MESSAGE",
        severity: input.priority ?? "INFO",
        title: `${message.callsign ?? "Aircraft"} radio message`,
        detail: input.text,
        flightId: input.flightId,
        createdAt: message.createdAt,
      },
      ...store.events,
    ],
    64,
  );

  return { message, snapshot: buildMemorySnapshot() };
}

export function resetMemoryStore() {
  globalStore.aoccStore = undefined;
  return buildMemorySnapshot();
}
