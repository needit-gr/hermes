import Redis from "ioredis";

interface HermesConstructor {
    host: string;
    port: number;
    db?: number;
}

class Hermes {
    private redis: Redis;
    private listener: Redis;

    constructor({ host, port, db = 0 }: HermesConstructor) {
        const initRedis = (): Redis =>
            new Redis({
                host,
                port,
                db,
            });

        this.redis = initRedis();
        this.listener = initRedis();

        this.listener.on("message", (channel, message) => {
            console.log({ channel, message });
        });
        this.listener.subscribe("__keyevent@" + db + "__:expired");
    }

    schedule() {
        this.redis.set("test_key", "", "PX", 1000);
    }
}

export default Hermes;

const hermes = new Hermes({
    host: "127.0.0.1",
    port: 6379,
});

console.log("hermes");
hermes.schedule();
