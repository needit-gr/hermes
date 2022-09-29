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

test("create a hermes handler with __", () => {
    try {
        hermes.addHandler({
            name: "console__log",
            func: ({ message }) => console.log(message),
        });
        expect(true).toBe(false);
    } catch (e) {
        expect(e.message).toContain("__");
    }
});

test("schedules using nonexisting handler", async () => {
    try {
        await hermes.schedule({
            handler: "console_log_fake",
            id: 13,
            expiration: 5,
            args: {},
        });
        expect(true).toBe(false);
    } catch (e) {
        expect(e.message).toContain("exist");
    }
});

test("schedules using date in the past", async () => {
    const [message, expiration] = ["hello world from a past date", -2];

    console.log = jest.fn();
    hermes.addHandler({
        name: "log",
        func: ({ message }) => console.log(message),
    });

    const currentDate = new Date();
    const dateToExecute = new Date(currentDate.getTime() + expiration * 1000); // ms

    try {
        hermes.scheduleAt({
            handler: "log",
            id: 13,
            expiration: dateToExecute,
            args: { message },
        });
        expect(true).toBe(false);
    } catch (e) {
        expect(e.message).toContain("future");
    }
});
