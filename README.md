# Hermes

A persistent but minimal Redis job scheduler

Hermes is a minimal Node.js job scheduler. Hermes uses Redis to ensure reliability and job persistence between reloads and restarts. Hermes uses Typescript by default.

## Install

```bash
# using npm
npm install @hectortav/hermes
# using yarn
yarn add @hectortav/hermes
```

## Usage

```javascript
import { Hermes } from "@hectortav/hermes";
// Connect Redis
const hermes = new Hermes({
    host: "127.0.0.1",
    port: 6379,
});

const main = async () => {
    // Create a handler
    hermes.addHandler({
        name: "console_log",
        func: ({ message }) => console.log(message),
    });
    // Create job
    hermes.schedule({
        // Choose a handler
        handler: "console_log",
        // Add a unique Id
        id: 13,
        // Expire in 45 seconds
        expiration: 45,
        // Add arguments for handler function
        args: { message: "hello world" },
    });
};

main();
```

## Contributors

| Name      | Website                                                      |
| --------- | ------------------------------------------------------------ |
| hectortav | [https://github.com/hectortav](https://github.com/hectortav) |
