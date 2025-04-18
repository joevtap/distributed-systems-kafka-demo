import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const program = new Command();

  fs.mkdirSync("files", { recursive: true });

  program
    .version(process.env.KD_VERION ?? "0.1.0")
    .name("kafka-demo")
    .description("A simple demo for Apache Kafka with Node.js using KafkaJs");

  program
    .command("hello <name>")
    .description(
      'Send "hello" to the server with a name, the server responds with a "Hello, <name>!"'
    )
    .action((name) => {
      console.log(`Hello, ${name}!`);
    });

  program
    .command("eval <expression>")
    .description(
      "Send an expression to the server to evaluate using the eval() javascript function"
    )
    .action((expression) => {
      console.log(eval(expression));
    });

  program
    .command("file-write <file-name> <contents>")
    .description("Write contents to a file in the server")
    .action((fileName, contents) => {
      fs.writeFile(path.join("files", fileName), contents, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`File ${fileName} written successfully!`);
      });
    });

  program
    .command("file-read <file-name>")
    .description("Read contents from a file in the server")
    .action((fileName) => {
      fs.readFile(path.join("files", fileName), "utf8", (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`Contents of ${fileName}:\n\n${data}`);
      });
    });

  program
    .command("file-delete <file-name>")
    .description("Delete a file in the server")
    .action((fileName) => {
      fs.unlink(path.join("files", fileName), (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`File ${fileName} deleted successfully!`);
      });
    });

  program
    .command("file-list")
    .description("List all files in the server")
    .action(() => {
      fs.readdir("files", (err, files) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`Files in the server: ${files.join(", ")}`);
      });
    });

  program
    .command("file-update <file-name> <contents>")
    .description("Update contents of a file in the server")
    .action((fileName, contents) => {
      fs.writeFile(path.join("files", fileName), contents, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`File ${fileName} updated successfully!`);
      });
    });

  program.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
