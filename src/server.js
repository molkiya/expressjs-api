import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { appendFile } from 'fs/promises'
import MySQLEvents from '@rodrigogs/mysql-events'

import config from './config.js'
import { pool } from './mysql.js';
import schedule from './scheduleFunction.js'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

app.set("view engine", "ejs")

app.get('/securityList', async (req, res) => {
    if (req.query.count > 20) {
        return res.json({
            "Error": "Count number is >20"
        })
    }
    pool.query( 
        'SELECT * FROM security_list LIMIT ?;', 
        [Number(req.query.count)], 
        (e, r) => {
            if (e) {
                console.log(e);
                return res.json({
                    "Error": e
                })
            }
            return res.json(r)
        }
    )
})

app.get('/security', (req, res) => {
    pool.query(
        'SELECT * FROM security_list WHERE id=?', 
        [Number(req.query.id)], 
        (e, r) => {
            if (e) {
                console.log(e);
                return res.json({
                    "Error": e
                })
            }
            return res.json(r[0])
        }
    )
})

app.post('/security', (req, res) => {
    pool.query(
        'INSERT INTO security_list (seccode, price, isin, lotsize) VALUES (?, ?, ?, ?);', 
        [req.body.seccode, parseFloat(req.body.price), req.body.isin, req.body.lotsize], 
        (e, r) => {
            if (e) {
                console.log(e);
                return res.json({
                    "Error": e
                })
            }
            pool.query(
                'SELECT * FROM security_list WHERE id=?', 
                [r.insertId],
                (e, r) => {
                    if (e) {
                        console.log(e);
                        return res.json({
                            "Error": e
                        })
                    }
                    return res.json(...r)
                }
            )
        }
    )
})

app.get('/trades', (req, res) => {
    res.render('index')
});

const server = app.listen(config.port, async () => {
    console.log(`Server is running on ${config.port}`)
    schedule.start()
})

const io = new Server(createServer(app), { cors: { origin: '*' }}).listen(server)

io.of("/trades")
io.on('connection', async (socket) => {
        console.log("A user connected to socket!")
        
        const mysqlEventWatcher = new MySQLEvents({
            host: 'localhost',
            user: 'root',
            password: 'password',
          }, {
          startAtEnd: true,
          serverId: Date.now(),
          excludedSchemas: {
            mysql: true,
          },
        });
        
        await mysqlEventWatcher.start();
        
        mysqlEventWatcher.addTrigger({
            name: 'monitoring',
            expression: 'db.trades.*',
            statement: MySQLEvents.STATEMENTS.ALL,
            onEvent: (event) => {
                io.emit('mysql_event', JSON.stringify({event, event_rows: event.affectedRows}))
            },
        });

        socket.on('disconnect', async () => {
            console.log("A user disconnected!")
            await mysqlEventWatcher.stop()
        })
})

async function exitingFromApp(signal) {
    server.close()
    io.close()
    schedule.stop()
    signal === "SIGTERM" 
        ? await appendFile(
            path.resolve(dirname(fileURLToPath(import.meta.url)), "../logs", `${Date.now()}_${signal}_log.json`), 
            JSON.stringify({
                error: "SIGTERM_ERROR",
                date: `${Date.now()}`
            }),
            {
                encoding: "utf8"
            }
        )
        : true 
    process.exit()
}

process
    .on('SIGTERM', () => exitingFromApp("SIGTERM"))
    .on("SIGINT", () => exitingFromApp("SIGINT"))