import express from "express";
import router from "./routes/route.js";
import sequelize from "./Database/db.js";



const app = express();
app.use(express.json());
app.use(router);
sequelize.authenticate()
    .then(() => console.log("Database connection established"))
    .catch((error) => console.error("Failed to connect to database:", error));

export default app;
