import { Command } from "commander";

async function main() {
  const program = new Command();

  program
    .version(process.env.KD_VERION ?? "0.1.0")
    .name("kafka-demo")
    .description("A simple demo for Apache Kafka with Node.js using KafkaJs");

  program.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
