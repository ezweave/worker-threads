import { parentPort } from "worker_threads";
import { Person, ProcessedPerson, WorkerMessage } from "../types.js";

// Process individual person data
const processPerson = async (person: Person): Promise<ProcessedPerson> =>
  new Promise((resolve) => {
    console.log("Processing person:", person.name);
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
      species: person.species && person.species[0] ? person.species[0] : "Unknown",
      homeworld: person.homeworld,
      processedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      resolve(processed);
    }, 10);
  });

let processedCount = 0;

// Send initial log to confirm worker is running
parentPort?.postMessage({
  type: "log",
  message: "Worker started and ready to receive messages",
});

// Listen for messages from the main thread
parentPort?.on("message", async (msg: WorkerMessage) => {
  // Send log message to main thread
  parentPort?.postMessage({
    type: "log",
    message: "Received message:",
    data: msg,
  });

  if (msg.type === "process") {
    // Send log message to main thread
    parentPort?.postMessage({
      type: "log",
      message: `Processing person: ${(msg.data as Person).name}`,
    });

    // Process the person data
    const processedPerson = await processPerson(msg.data as Person);
    processedCount++;

    // Send the processed result back
    parentPort?.postMessage({
      type: "result",
      data: processedPerson,
    });

    // Send progress update
    parentPort?.postMessage({
      type: "progress",
      done: processedCount,
      total: "unknown",
    });
  } else if (msg.type === "done") {
    parentPort?.postMessage({
      type: "log",
      message: "Worker received done signal, waiting for remaining messages...",
    });

    // Give a moment for any remaining messages to be processed
    setTimeout(() => {
      parentPort?.postMessage({
        type: "log",
        message: `Worker finished processing ${processedCount} people`,
      });
      parentPort?.postMessage({ type: "done" });
    }, 100);
  }
});
