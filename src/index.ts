import express from 'express';

import addMiddleware from './startup/addMiddleware';
import addRoutes from './startup/addRoutes';
import config from './startup/config'
import addDocumentation from './startup/addDocumentation';

const app = express();

const port = parseInt(process.env.PORT as string || "3000", 10);

config()
addDocumentation(app, port)
addMiddleware(app)
addRoutes(app)

app.listen(port, () => console.log(`Listening on port ${port}...`))