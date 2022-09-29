const { Hermes } = require("../dist");

let hermes = null;

beforeAll(() => {
    hermes = new Hermes({
        host: "127.0.0.1",
        port: 6379,
    });
});
afterAll(async () => {
    await sleep(1);
    hermes.close();
});

const sleep = async (seconds) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

test("connect to Redis", () => {
    expect(hermes instanceof Hermes).toBe(true);
});

test("create a hermes handler", () => {
    expect(() =>
        hermes.addHandler({
            name: "console_log",
            func: ({ message }) => console.log(message),
        })
    ).not.toThrowError();
});

test("schedules using seconds", async () => {
    const [message, expiration] = ["hello world", 2];

    console.log = jest.fn();
    hermes.addHandler({
        name: "log",
        func: ({ message }) => console.log(message),
    });

    hermes.schedule({
        handler: "log",
        id: 13,
        expiration,
        args: { message },
    });

    await sleep(expiration + expiration * 0.1);
    expect(console.log).toHaveBeenCalledWith(message);
});

test("schedules using date", async () => {
    const [message, expiration] = ["hello world from a past date", 2];

    console.log = jest.fn();
    hermes.addHandler({
        name: "log",
        func: ({ message }) => console.log(message),
    });

    const currentDate = new Date();
    const dateToExecute = new Date(currentDate.getTime() + expiration * 1000); // ms

    hermes.scheduleAt({
        handler: "log",
        id: 13,
        expiration: dateToExecute,
        args: { message },
    });

    await sleep(expiration + expiration * 0.1);
    expect(console.log).toHaveBeenCalledWith(message);
});

test("cancel scheduled task", async () => {
    const [message, expiration] = ["goodbye", 2];

    console.log = jest.fn();
    hermes.addHandler({
        name: "log",
        func: ({ message }) => console.log(message),
    });

    hermes.schedule({
        handler: "log",
        id: 15,
        expiration,
        args: { message },
    });
    const halfExpiration = expiration / 2;
    await sleep(halfExpiration);
    hermes.cancel({
        handler: "log",
        id: 15,
    });
    await sleep(halfExpiration + halfExpiration * 0.1);

    expect(console.log).not.toHaveBeenCalledWith(message);
});
