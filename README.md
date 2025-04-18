# Kafka Demo

A Node.js application that demonstrates publisher-subscriber communication model using Apache Kafka.

## Table of Contents

- [Overview](#overview)
- [Deployment Model](#deployment-model)
- [Prerequisites](#prerequisites)
- [Running Locally](#running-locally)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)

## Overview

This application demonstrates a message-based communication system using Apache Kafka. The application supports both client and server roles, allowing for asynchronous communication and file processing through a simple command-line interface.

## Deployment Model

The deployment model consists of:

- Kafka Broker (running in Docker)
- Server application (running locally on the host machine)
- Client application (running locally on the host machine)

## Prerequisites

- Node.js 22.x or higher
- Docker and Docker Compose
- npm

## Running Locally

### Step 1: Start Kafka Broker

Start the Kafka broker using Docker Compose:

```bash
docker compose up -d
```

This will start the Kafka broker on port 9092.

### Step 2: Start the Server

In one terminal window, start the server:

```bash
npm run start:server
```

The server will:

- Connect to the Kafka broker
- Create the required topics if they don't exist
- Listen for incoming messages
- Process commands (hello, eval, file operations, etc.)

### Step 3: Run the Client

In another terminal window, run the client with a command:

```bash
npm run start:client <command>
```

For example:

```bash
npm run start:client hello world
```

## Usage Guide

### Client Commands

The client supports the following commands:

#### Basic Commands

```bash
# Send a hello message
npm run start:client hello <name>

# Evaluate a mathematical expression
npm run start:client eval "<expression>"
```

#### File Operations

```bash
# Write to a file
npm run start:client file-write <file-name> "<contents>"

# Read from a file
npm run start:client file-read <file-name>

# Delete a file
npm run start:client file-delete <file-name>

# List all files
npm run start:client file-list

# Update a file
npm run start:client file-update <file-name> "<contents>"
```

## Project Structure

- `src/`
  - `client.js`: Client application that sends commands to the server
  - `server.js`: Server application that handles commands
- `files/`: Directory for file storage
- `compose.yaml`: Docker Compose configuration for Kafka broker
- `.env.development`: Environment variables for development

## Environment Configuration

The application uses the following environment variables:

- `KD_VERSION`: Application version
- `KAFKA_BROKER`: Kafka broker URL (default: localhost:9092)

These variables can be configured in the `.env.development` file.

Developed by [@joevtap](htts://github.com/joevtap) as part of a Distributed Systems course seminar at UNIFEI.

Last updated: April 18, 2025
