// import {Redis} from "ioredis"
//


// export const connection = new Redis({
//     host: "127.0.0.1",
//     port: 6379
// })
//
import {createClient} from 'redis';


const redisClient = createClient({
    url: process.env.REDIS_URL,
    username: "default",
    password: "GK96KqOi1KaCujHJjPxNojnconzFfuKX"
});

redisClient.on("error", (err) => {
    console.log("Redis client error:", err);
    process.exit(1);
})

await redisClient.connect();

export default redisClient;
