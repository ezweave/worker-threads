
import 'dotenv/config';
import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";
// This is a workaround to use the types file in the worker.
import { MainThreadMessageType, Person, ProcessedPerson, WorkerEvent, WorkerMessage, WorkerMessageType } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const numberOfPeopleFromENV = parseInt(process.env.NUMBER_OF_PEOPLE || "5");

const getRandomDelayInMs = (): number => {
  return Math.floor(Math.random() * 1000) + 1;
};

const getPersonFromSWAPI = async (personId: number): Promise<Person> => {
  const response = await fetch(`https://swapi.dev/api/people/${personId}`);
  const data = await response.json();
  // Simulate long response times
  return new Promise((resolve) => {
    const delay = getRandomDelayInMs();
    console.log(`Simulating long response time for person ${personId}... ${delay}ms`);
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
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
        case WorkerMessageType.STARTED:
          console.log("Worker started, beginning data processing...");

          for (let i = 1; i <= numberOfPeople; i++) {
            getPersonFromSWAPI(i).then((person) => {
              console.log(`Fetched person ${i}: ${person.name}`);

              console.log(`Sending person ${i} to worker...`);
              worker.postMessage({ type: MainThreadMessageType.PROCESS, data: person, totalToBeProcessed: numberOfPeople });
            }).catch((error) => {
              console.log(`Failed to fetch person ${i}:`, (error as Error).message);
            }).finally(() => {
              if (i === numberOfPeople) {
                console.log("Sending done signal to worker...");
                worker.postMessage({ type: MainThreadMessageType.DONE });
              }
            });
          }
          break;
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
  });
};

runJob(numberOfPeopleFromENV).then((result) => {
  console.log("Final results:", result);
  console.log(`Processed ${result.length} people`);
});
