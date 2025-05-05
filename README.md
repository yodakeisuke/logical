# MCP Logical Thinking Server

A Model Context Protocol (MCP) server implementation with tools for logical thinking and calculation, using standard input/output for communication.

## Overview

This project implements a server using the Model Context Protocol (MCP) SDK with StdioServerTransport, which allows Large Language Models (LLMs) to access data and functionality via standard input/output streams.

## Features

- **Calculator Tool**: Safely evaluates arithmetic expressions
- **Logical Thinking Tool**: Helps structure logical problem solving

## Prerequisites

- Node.js (v18 or later)
- npm

## Installation

1. Clone this repository
2. Install dependencies

```bash
npm install
```

## Development

Start the development server with:

```bash
npm run dev
```

## Building

Build the TypeScript code with:

```bash
npm run build
```

## Running in Production

Start the server in production mode:

```bash
npm start
```

## Usage

This MCP server uses standard input/output for communication, making it ideal for integration with CLI tools or as a subprocess for other applications.

Example tools available:

- `calculator`: Evaluates arithmetic expressions
  - Parameters: `expression` (string)

- `logical_thinking`: Helps structure thinking about problems
  - Parameters: `problem` (string)

## License

ISC