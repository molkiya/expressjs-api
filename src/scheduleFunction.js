import { CronJob } from 'cron'
import { writeFile } from 'fs'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { pool } from './mysql.js'

const __dirname = dirname(fileURLToPath(import.meta.url));

const cron = new CronJob(
    '1 * * * * *',
	function() {
        const hrTime = process.hrtime()
        const hrTimeMillisecond = hrTime[0] * 1000000 + hrTime[1] / 1000
		pool.query(
            'DELETE FROM trades',
            (...result) => {
                console.log(result);
                writeFile(path.resolve(__dirname, "../logs", `${Date.now()}_schedule_deleting_trades.json`), JSON.stringify({ result, time: hrTimeMillisecond }), () => {
                    console.log(`Schedule delete trades: ${hrTimeMillisecond}`)
                })
            }
        )
	},
    null,
	true,
	'Europe/Moscow'
)

export default cron