import { createPool } from "mysql2";
import config from "./config.js";

const pool = createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_pass,
    database: config.mysql_db
});

export { pool };  