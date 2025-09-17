import { parentPort } from "worker_threads";
import {
  MainThreadMessage,
  MainThreadMessageType,
  Person,
  ProcessedPerson,
  WorkerEvent,
  WorkerMessage,
  WorkerMessageType,
} from "../types.js";

const processingDelayInMs = parseInt(
  process.env.PROCESSING_DELAY_IN_MS || "1000",
);
// Process individual person data
const processPerson = async (person: Person): Promise<ProcessedPerson> =>
  new Promise((resolve) => {
    const processed: ProcessedPerson = {
      name: person.name,
      height: parseInt(person.height) || 0,
      mass: parseInt(person.mass) || 0,
      bmi:
        person.mass && person.height
          ? (
              parseInt(person.mass) / Math.pow(parseInt(person.height) / 100, 2)
            ).toFixed(2)
          : null,
      filmCount: person.films ? person.films.length : 0,
      vehicleCount: person.vehicles ? person.vehicles.length : 0,
      starshipCount: person.starships ? person.starships.length : 0,
      species:
        person.species && person.species[0] ? person.species[0] : "Unknown",
      homeworld: person.homeworld,
      processedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      resolve(processed);
    }, processingDelayInMs);
  });

let processedCount = 0;

// Send initial log to confirm worker is running
parentPort?.postMessage({
  type: WorkerMessageType.STARTED,
  message: "Worker started and ready to receive messages",
});

let awaitRemainingMessages: Promise<void>;
let resolveRemainingMessages: () => void;

// Listen for messages from the main thread
parentPort?.on(WorkerEvent.MESSAGE, async (msg: MainThreadMessage) => {
  // Send log message to main thread
  parentPort?.postMessage({
    type: WorkerMessageType.LOG,
    message: "Received message:",
    data: msg,
  });
  switch (msg.type) {
    case MainThreadMessageType.PROCESS:
      if (!awaitRemainingMessages) {
        awaitRemainingMessages = new Promise((resolve) => {
          resolveRemainingMessages = resolve;
        });
      }
      parentPort?.postMessage({
        type: WorkerMessageType.LOG,
        message: `Processing person: ${(msg.data as Person).name} with delay of ${processingDelayInMs}ms`,
      });
      const processedPerson = await processPerson(msg.data as Person);
      processedCount++;
      parentPort?.postMessage({
        type: WorkerMessageType.RESULT,
        data: processedPerson,
      });
      parentPort?.postMessage({
        type: WorkerMessageType.PROGRESS,
        done: processedCount,
        total: "unknown",
      });
      parentPort?.postMessage({
        type: WorkerMessageType.LOG,
        message: `Processed ${processedCount} of ${msg.totalToBeProcessed} people`,
      });
      if (msg.totalToBeProcessed && processedCount === msg.totalToBeProcessed) {
        resolveRemainingMessages();
      }
      break;
    case MainThreadMessageType.DONE:
      // The orchestrator is done sending us data, but we may not be done processing it all yet.
      await awaitRemainingMessages;
      parentPort?.postMessage({
        type: WorkerMessageType.LOG,
        message:
          "Worker received done signal, waiting for remaining messages...",
      });
      parentPort?.postMessage({
        type: WorkerMessageType.LOG,
        message: `Worker finished processing ${processedCount} people`,
      });
      parentPort?.postMessage({ type: WorkerMessageType.DONE });
      break;
  }
});
