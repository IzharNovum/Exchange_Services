import express from "express";
import router from "./routes/route.js";
import sequelize from "./Database/DB/database.js";

const app = express();
app.use(express.json());
app.use(router);

export default app;
