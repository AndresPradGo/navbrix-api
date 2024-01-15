import express from 'express';

import addMiddleware from './startup/addMiddleware';
import addRoutes from './startup/addRoutes';
import config from './startup/config'

const app = express();

config()
addMiddleware(app)
addRoutes(app)

const port = parseInt(process.env.PORT as string || "3000", 10);
app.listen(port, () => console.log(`Listening on port ${port}...`))