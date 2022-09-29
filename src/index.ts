import Redis from "ioredis";

interface HermesConstructor {
    host?: string;
    port?: number;
    db?: number;
}

export class Hermes {
    private redis: Redis;
    private signature = "hermes";
    private listener: Redis;
    private handlers: Record<string, (args: unknown) => unknown>;

    constructor({
        host = "127.0.0.1",
        port = 6379,
        db = 0,
    }: HermesConstructor) {
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
    }

    close() {
        this.redis.disconnect();
        this.listener.disconnect();
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

        if (this.handlers?.[handler] === undefined) {
            throw new Error(`ERROR: Handler "${handler}" does not exist.`);
        }
        /************/
        this.redis.set(
            `${this.signature}:${handler}__${id}`,
            "",
            "EX",
            Math.round(expiration)
        );
        this.redis.set(
            `shadow:${this.signature}:${handler}__${id}`,
            JSON.stringify(args),
            "EX",
            Math.round(expiration) + 60
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

    private async execute(key: string) {
        const handler = new RegExp(`${this.signature}:(.*)__`, "g").exec(key);
        const args = JSON.parse(await this.redis.get(`shadow:${key}`));
        if (this.handlers[handler[1]] === undefined) {
            throw new Error(`ERROR: Handler "${handler[1]}" does not exist.`);
        }
        this.handlers[handler[1]](args);
        this.redis.del(`shadow:${key}`);
    }

    addHandler({ name, func }: { name: string; func: (args: any) => void }) {
        if (name.includes("__")) {
            throw new Error(`ERROR: Handler cannot contain "__".`);
        }
        if (this.handlers === undefined) {
            this.handlers = {};
        }
        this.handlers[name] = func;
    }

    cancel({ handler, id }: { handler: string; id: string }) {
        const key: string = `${this.signature}:${handler}__${id}`;
        this.redis.del(key);
        this.redis.del(`shadow:${key}`);
    }
}
