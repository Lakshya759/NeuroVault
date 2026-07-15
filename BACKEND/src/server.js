import {app} from "./app.js"
import dotenv from "dotenv"
dotenv.config();
import pool from "./db/pool.js"

const startServer=async()=>{
    try{
        await pool.query("SELECT 1")
        console.log("-------Database connected successfully------");
        app.listen(8000, () => {
            console.log("-------Server running on port 8000-------");
        });
    }catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};
startServer();
