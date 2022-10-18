import "dotenv/config"

const config = {
    port: process.env.__port__,
    mysql_host: process.env.__mysql_host__,
    mysql_db: process.env.__mysql_db__,
    mysql_user: process.env.__mysql_user__,
    mysql_pass: process.env.__mysql_pass__
};
 
if (Object.values(config).includes(undefined)) {
    throw new Error("Environment variables missing: " + JSON.stringify(config));
};

export default config;