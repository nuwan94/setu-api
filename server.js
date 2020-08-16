const express = require("express");
const axios = require("axios");
const redis = require("redis");

const cors = require("cors");
var bodyParser = require("body-parser");

const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// setup redis client
const client = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_HOST, {
        auth_pass: process.env.REDIS_PASSWORD,
        tls: { servername: process.env.REDIS_HOST },
    }
);

// redis store configs
const storeRedisKey = "store:students"; // cahce key for users
const dataExpireTime = 3600; // 1 hour cache expire time

// main endpoint
app.get("/", (req, res) => res.send("✅ - SETU API working."));

// students endpoint with caching
app.get("/students", (req, res) => {
    // try to fetch the result from redis
    return client.get(storeRedisKey, (err, data) => {
        if (data) {
            return res.json({ source: "cache", data: JSON.parse(data) });
        } else {
            // if cache not available call API get data from remote API
            axios
                .get(process.env.DB_ACCESS_API)
                .then((res) => res.data)
                .then((data) => {
                    // save the API response in redis store
                    client.setex(storeRedisKey, dataExpireTime, JSON.stringify(data));
                    // send JSON response to client
                    return res.json({ source: "api", data });
                })
                .catch((error) => {
                    // send error to the client
                    return res.json(error.toString());
                });
        }
    });
});

var multer = require("multer")();
const FormData = require("form-data");

// file uplaod endpoint
app.post("/reports/upload", multer.single("report"), (req, res) => {
    try {
        axios
            .post(process.env.FUNCTION_URL, {
                filedata: req.file.buffer,
                filename: req.file.originalname,
            })
            .then((Res) => {
                if (Res.status === 200) {
                    return res.status(200).send();
                } else {
                    throw error;
                }
            })
            .catch((e) => {
                return res.status(400).send();
            });
    } catch (e) {
        console.error(e);
    }
});

// start express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Server listening on port:", PORT);
});