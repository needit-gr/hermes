import Redis from "ioredis";

interface HermesConstructor {
    host: string;
    port: number;
    db?: number;
}

class Hermes {
    private redis: Redis;
    private signature: string = "hermes";
    private listener: Redis;
    private handlers: Record<string, (args: unknown) => unknown>;

    constructor({ host, port, db = 1 }: HermesConstructor) {
        const initRedis = (): Redis =>
            new Redis({
                host,
                port,
                db,
            });

        this.redis = initRedis();
        this.redis.on("ready", () =>
            this.redis.config("SET", "notify-keyspace-events", "Ex")
        );
        this.listener = initRedis();

        this.listener.psubscribe("__keyevent@" + db + "__:expired");
        this.listener.on("pmessage", (_, __, message) => {
            if (message.startsWith(`${this.signature}:`)) {
                this.execute(message);
            }
        });

        this.addHandler({
            name: "console_log",
            func: ({ message }: { message: string }) => console.log(message),
        });
    }

    async schedule({
        handler,
        args,
        id,
        expiration,
    }: {
        handler: string;
        args?: Record<string, string | number>;
        id: string | number;
        expiration: number;
    }) {
        /* validate */
        if (handler.includes("__")) {
            throw new Error(`ERROR: Handler cannot contain "__".`);
        }
        if (this.handlers[handler] === undefined) {
            throw new Error(`ERROR: Handler "${handler}" does not exist.`);
        }
        /************/
        this.redis.set(
            `${this.signature}:${handler}__${id}`,
            "",
            "EX",
            expiration
        );
        this.redis.set(
            `shadow:${this.signature}:${handler}__${id}`,
            JSON.stringify(args),
            "EX",
            expiration + 60
        );
    }

    scheduleAt({
        handler,
        args,
        id,
        expiration,
    }: {
        handler: string;
        args?: Record<string, string | number>;
        id: string | number;
        expiration: Date;
    }) {
        const diffInSeconds =
            (expiration.getTime() - new Date().getTime()) / 1000;
        if (diffInSeconds <= 0) {
            throw new Error("Error: Date must be in the future");
        }
        this.schedule({ handler, args, id, expiration: diffInSeconds });
    }

    // TODO: reschedule
    // TODO: schedule at
    // TODO: cancel
    // TODO: cleanup

    async execute(key: string) {
        const handler = new RegExp(`${this.signature}\:(.*)__`, "g").exec(key);
        const args = JSON.parse(await this.redis.get(`shadow:${key}`));
        if (this.handlers[handler[1]] === undefined) {
            throw new Error(`ERROR: Handler "${handler[1]}" does not exist.`);
        }
        this.handlers[handler[1]](args);
        this.redis.del(`shadow:${key}`);
    }

    addHandler({
        name,
        func,
    }: {
        name: string;
        func: (args: unknown) => unknown;
    }) {
        if (name.includes("__")) {
            throw new Error(`ERROR: Handler cannot contain "__".`);
        }
        if (this.handlers === undefined) {
            this.handlers = {};
        }
        this.handlers[name] = func;
    }

    cancel(key: string) {
        this.redis.del(key);
        this.redis.del(`shadow:${key}`);
    }
}

export default Hermes;

const hermes = new Hermes({
    host: "127.0.0.1",
    port: 6379,
});

const main = async () => {
    hermes.schedule({
        handler: "console_log",
        id: 13,
        expiration: 5,
        args: { message: "hello world" },
    });
};

main();
