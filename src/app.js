const cors = require("cors");
const express = require("express")
const logger = require("morgan")
const dotenv = require("dotenv")
const helmet = require("helmet")
const createError = require("http-errors")
const fs = require("fs")
const path = require("path")

dotenv.config();

let app = express();
let accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'))
let dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19);

app.use(helmet());
app.use(cors());
app.use(logger('dev'));
app.use(logger('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.status(200).json({
        status: 200,
        message: "[SERVICE-AUTH] Server Berhasil Berjalan",
        date: dateNow
    });
});

app.listen(process.env.APP_PORT, async () => {
    console.log(`[SERVICE-AUTH] Server berjalan di port ${process.env.APP_PORT}`);
    try {
        console.log("Connected!")
    } catch (error) {
        console.error("❌ Unable to start server:");
        console.error(error.message);
        process.exit(1);
    }
});

module.exports = app