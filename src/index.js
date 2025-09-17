import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPersonFromSWAPI = async (personId) => {
  const response = await fetch(`https://swapi.dev/api/people/${personId}`);
  const data = await response.json();
  return data;
};

const runJob = async (numberOfPeople) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let processedCount = 0;

    // Create a worker
    const worker = new Worker(path.resolve(__dirname, "workers/worker-one.js"));

    // Handle messages from worker
    worker.on("message", (msg) => {
      if (msg.type === "progress") {
        console.log(`Progress: ${msg.done}/${msg.total}`);
      } else if (msg.type === "result") {
        console.log("Processed person:", msg.data.name);
        results.push(msg.data);
        processedCount++;
      } else if (msg.type === "log") {
        console.log(`[WORKER] ${msg.message}`, msg.data || "");
      } else if (msg.type === "done") {
        console.log("Worker finished processing");
        worker.terminate();
        resolve(results);
      }
    });

    // Handle worker errors
    worker.on("error", (error) => {
      console.error("Worker error:", error);
      reject(error);
    });

    // Handle worker exit
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Start processing
    console.log("Starting worker...");

    // Give the worker a moment to initialize
    setTimeout(async () => {
      console.log("Worker started, beginning data processing...");

      // Fetch people one by one and send them to the worker
      for (let i = 1; i <= numberOfPeople; i++) {
        try {
          const person = await getPersonFromSWAPI(i);
          console.log(`Fetched person ${i}: ${person.name}`);

          // Send person data to worker for processing
          console.log(`Sending person ${i} to worker...`);
          worker.postMessage({ type: "process", data: person });
        } catch (error) {
          console.log(`Failed to fetch person ${i}:`, error.message);
        }
      }

      // Signal that we're done sending data
      console.log("Sending done signal to worker...");
      worker.postMessage({ type: "done" });
    }, 100);
  });
};

runJob(5).then((result) => {
  console.log("Final results:", result);
  console.log(`Processed ${result.length} people`);
});
