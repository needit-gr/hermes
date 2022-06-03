const { Hermes } = require("../dist");

const hermes = new Hermes({
    host: "127.0.0.1",
    port: 6379,
});

const main = async () => {
    hermes.addHandler({
        name: "console_log",
        func: ({ message }) => console.log(message),
    });

    hermes.schedule({
        handler: "console_log",
        id: 13,
        expiration: 5,
        args: { message: "hello world" },
    });
};

main();
