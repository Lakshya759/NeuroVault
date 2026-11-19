import pg from "pg";
const {Pool}=pg;

const pool=new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized:false
    }
});
console.log("Database URL diagnostics:", {
    exists: !!process.env.DATABASE_URL,
    hostname: (() => {
        try {
            return new URL(process.env.DATABASE_URL).hostname;
        } catch {
            return "INVALID URL";
        }
    })()
});


export default pool;
