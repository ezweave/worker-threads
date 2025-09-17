import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";
import { Person, ProcessedPerson, WorkerEvent, WorkerMessage, WorkerMessageType } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPersonFromSWAPI = async (personId: number): Promise<Person> => {
  const response = await fetch(`https://swapi.dev/api/people/${personId}`);
  const data = await response.json();
  return data;
};

const runJob = async (numberOfPeople: number): Promise<ProcessedPerson[]> => {
  return new Promise((resolve, reject) => {
    const results: ProcessedPerson[] = [];
    let processedCount = 0;

    // Create a worker
    const worker = new Worker(path.resolve(__dirname, "workers/worker-one.js"));

    // Handle messages from worker
    worker.on(WorkerEvent.MESSAGE, (msg: WorkerMessage) => {
      switch (msg.type) {
        case WorkerMessageType.DONE:
          console.log("Worker finished processing");
          worker.terminate();
          resolve(results);
          break;
        case WorkerMessageType.LOG:
          console.log(`[WORKER] ${msg.message}`, msg.data || "");
          break;
        case WorkerMessageType.PROGRESS:
          console.log(`Progress: ${msg.done}/${msg.total}`);
          break;
        case WorkerMessageType.RESULT:
          console.log("Processed person:", (msg.data as ProcessedPerson).name);
          results.push(msg.data as ProcessedPerson);
          processedCount++;
          break;
      }
    });

    worker.on(WorkerEvent.ERROR, (error: Error) => {
      console.error("Worker error:", error);
      reject(error);
    });

    worker.on(WorkerEvent.EXIT, (code: number) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    console.log("Starting worker...");

    setTimeout(async () => {
      console.log("Worker started, beginning data processing...");

      for (let i = 1; i <= numberOfPeople; i++) {
        try {
          const person = await getPersonFromSWAPI(i);
          console.log(`Fetched person ${i}: ${person.name}`);

          console.log(`Sending person ${i} to worker...`);
          worker.postMessage({ type: "process", data: person });
        } catch (error) {
          console.log(`Failed to fetch person ${i}:`, (error as Error).message);
        }
      }

      console.log("Sending done signal to worker...");
      worker.postMessage({ type: "done" });
    }, 100);
  });
};

runJob(5).then((result) => {
  console.log("Final results:", result);
  console.log(`Processed ${result.length} people`);
});
