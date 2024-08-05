import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {router1, router2, router3, router4, router5, router6, router7} from "./routes/route.js";


const app = express();
dotenv.config({ path: "./config/config.env" });

app.use(
    cors({
        origin:["https://www.okx.com",
                "http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true,
        })
);
app.use(express.json());
app.use('/trial', router1);
app.use('/balance', router2);
app.use('/place-order', router3);
app.use('/cancel-order', router4);
app.use('/fetch-order', router5);
app.use('/trades', router6);
app.use('/Klines', router7);



export default app; 
