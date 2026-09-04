const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const host = process.env.DATA_CACHE_HOST || '127.0.0.1';
const port = process.env.DATA_CACHE_PORT || 6379;
const password = process.env.DATA_CACHE_PASSWORD;

const RedisClient = createClient({
    username: 'default',
    password: password,
    socket: {
        host: host,
        port: Number(port)
    }
});

RedisClient.on('connect', () => {
    console.log("Data Cache Redis connected");
});

RedisClient.on('error', (err) => {
    console.log("Data Cache Redis error: ", err);
});

module.exports = RedisClient;
