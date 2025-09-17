// SWAPI Person type
export interface Person {
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  birth_year: string;
  gender: string;
  homeworld: string;
  films: string[];
  species: string[];
  vehicles: string[];
  starships: string[];
  created: string;
  edited: string;
  url: string;
}

// Processed person type
export interface ProcessedPerson {
  name: string;
  height: number;
  mass: number;
  bmi: string | null;
  filmCount: number;
  vehicleCount: number;
  starshipCount: number;
  species: string;
  homeworld: string;
  processedAt: string;
}

// Message types for worker communication
export interface WorkerMessage {
  type: WorkerMessageType;
  data?: ProcessedPerson;
  message?: string;
  done?: number;
  total?: number | string;
}

export interface MainThreadMessage {
  type: MainThreadMessageType;
  data?: Person;
  message?: string;
  totalToBeProcessed?: number;
}

export enum WorkerEvent {
  MESSAGE = "message",
  ERROR = "error",
  EXIT = "exit",
}

export enum WorkerMessageType {
  STARTED = "started",
  PROCESS = "process",
  DONE = "done",
  LOG = "log",
  RESULT = "result",
  PROGRESS = "progress",
}

export enum MainThreadMessageType {
  DONE = "done",
  PROCESS = "process",
}
