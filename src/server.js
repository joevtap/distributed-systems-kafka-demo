import { Kafka, logLevel } from "kafkajs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(__dirname, "..", "files");
fs.mkdirSync(filesDir, { recursive: true });

const kafka = new Kafka({
  clientId: "kafka-demo-server",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

const admin = kafka.admin();
const consumer = kafka.consumer({ groupId: "kafka-demo-server-group" });
const producer = kafka.producer();

const REQUEST_TOPIC = "kafka-demo-requests";
const RESPONSE_TOPIC = "kafka-demo-responses";

const messageHandlers = {
  hello: async ({ name }) => {
    return { message: `Hello, ${name}!` };
  },

  eval: async ({ expression }) => {
    try {
      const result = eval(expression);
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  },

  "file-write": async ({ fileName, contents }) => {
    try {
      await fs.promises.writeFile(path.join(filesDir, fileName), contents);
      return { message: `File ${fileName} written successfully!` };
    } catch (error) {
      return { error: error.message };
    }
  },

  "file-read": async ({ fileName }) => {
    try {
      const data = await fs.promises.readFile(
        path.join(filesDir, fileName),
        "utf8"
      );
      return { contents: data };
    } catch (error) {
      return { error: error.message };
    }
  },

  "file-delete": async ({ fileName }) => {
    try {
      await fs.promises.unlink(path.join(filesDir, fileName));
      return { message: `File ${fileName} deleted successfully!` };
    } catch (error) {
      return { error: error.message };
    }
  },

  "file-list": async () => {
    try {
      const files = await fs.promises.readdir(filesDir);
      return { files };
    } catch (error) {
      return { error: error.message };
    }
  },

  "file-update": async ({ fileName, contents }) => {
    try {
      await fs.promises.writeFile(path.join(filesDir, fileName), contents);
      return { message: `File ${fileName} updated successfully!` };
    } catch (error) {
      return { error: error.message };
    }
  },
};

async function handleMessage(topic, message) {
  try {
    const payload = JSON.parse(message.value.toString());
    console.log(`Received message: ${JSON.stringify(payload)}`);

    const { command, params, requestId } = payload;

    if (!messageHandlers[command]) {
      return { error: `Unknown command: ${command}` };
    }

    const result = await messageHandlers[command](params);

    await producer.send({
      topic: RESPONSE_TOPIC,
      messages: [
        {
          key: requestId,
          value: JSON.stringify({
            requestId,
            result,
          }),
        },
      ],
    });
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

async function run() {
  console.log("Starting Kafka Demo Server...");
  console.log(`Version: ${process.env.KD_VERSION || "0.1.0"}`);
  console.log(`Kafka Broker: ${process.env.KAFKA_BROKER || "localhost:9092"}`);

  await admin.connect();
  await producer.connect();
  await consumer.connect();

  // Create topics if they don't exist
  const existingTopics = await admin.listTopics();

  const topicsToCreate = [];

  if (!existingTopics.includes(REQUEST_TOPIC)) {
    topicsToCreate.push({
      topic: REQUEST_TOPIC,
      numPartitions: 3,
      replicationFactor: 1,
    });
  }

  if (!existingTopics.includes(RESPONSE_TOPIC)) {
    topicsToCreate.push({
      topic: RESPONSE_TOPIC,
      numPartitions: 3,
      replicationFactor: 1,
    });
  }

  if (topicsToCreate.length > 0) {
    await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    });
    console.log(
      `Created topics: ${topicsToCreate.map((t) => t.topic).join(", ")}`
    );
  }

  await consumer.subscribe({ topic: REQUEST_TOPIC, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleMessage(topic, message);
    },
  });

  console.log("Kafka Demo Server is running!");
}

run().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    await admin.disconnect();
    console.log("Server gracefully shut down");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});
