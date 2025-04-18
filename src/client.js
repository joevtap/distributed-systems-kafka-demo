import { Command } from "commander";
import { Kafka, logLevel } from "kafkajs";
import { randomUUID } from "node:crypto";

const REQUEST_TOPIC = "kafka-demo-requests";
const RESPONSE_TOPIC = "kafka-demo-responses";

const kafka = new Kafka({
  clientId: "kafka-demo-client",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

const admin = kafka.admin();
const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: `kafka-demo-client-${randomUUID()}`,
});

const pendingRequests = new Map();

async function sendKafkaMessage(command, params) {
  const requestId = randomUUID();

  const messagePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("Request timed out"));
    }, 10000);

    pendingRequests.set(requestId, { resolve, reject, timeout });
  });

  await producer.send({
    topic: REQUEST_TOPIC,
    messages: [
      {
        key: requestId,
        value: JSON.stringify({
          requestId,
          command,
          params,
        }),
      },
    ],
  });

  return messagePromise;
}

async function main() {
  const program = new Command();

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

  await consumer.subscribe({
    topic: RESPONSE_TOPIC,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const response = JSON.parse(message.value.toString());
        const { requestId, result } = response;

        const pendingRequest = pendingRequests.get(requestId);
        if (pendingRequest) {
          const { resolve, reject, timeout } = pendingRequest;
          clearTimeout(timeout);
          pendingRequests.delete(requestId);
          resolve(result);
        }
      } catch (error) {
        console.error("Error handling response:", error);
      }
    },
  });

  program
    .version(process.env.KD_VERSION ?? "0.1.0")
    .name("kafka-demo")
    .description("A simple demo for Apache Kafka with Node.js using KafkaJs");

  program
    .command("hello <name>")
    .description(
      'Send "hello" to the server with a name, the server responds with a "Hello, <name>!"'
    )
    .action(async (name) => {
      try {
        const result = await sendKafkaMessage("hello", { name });
        console.log(result.message);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("eval <expression>")
    .description(
      "Send an expression to the server to evaluate using the eval() javascript function"
    )
    .action(async (expression) => {
      try {
        const result = await sendKafkaMessage("eval", { expression });
        if (result.error) {
          console.error("Error:", result.error);
        } else {
          console.log(result.result);
        }
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("file-write <file-name> <contents>")
    .description("Write contents to a file in the server")
    .action(async (fileName, contents) => {
      try {
        const result = await sendKafkaMessage("file-write", {
          fileName,
          contents,
        });
        console.log(result.message);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("file-read <file-name>")
    .description("Read contents from a file in the server")
    .action(async (fileName) => {
      try {
        const result = await sendKafkaMessage("file-read", { fileName });
        if (result.error) {
          console.error("Error:", result.error);
        } else {
          console.log(`Contents of ${fileName}:\n\n${result.contents}`);
        }
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("file-delete <file-name>")
    .description("Delete a file in the server")
    .action(async (fileName) => {
      try {
        const result = await sendKafkaMessage("file-delete", { fileName });
        console.log(result.message);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("file-list")
    .description("List all files in the server")
    .action(async () => {
      try {
        const result = await sendKafkaMessage("file-list", {});
        if (result.error) {
          console.error("Error:", result.error);
        } else {
          console.log(`Files in the server: ${result.files.join(", ")}`);
        }
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("file-update <file-name> <contents>")
    .description("Update contents of a file in the server")
    .action(async (fileName, contents) => {
      try {
        const result = await sendKafkaMessage("file-update", {
          fileName,
          contents,
        });
        console.log(result.message);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program.hook("postAction", () => {
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  program.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    await admin.disconnect();
    console.log("Client gracefully shut down");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});
