import express from 'express';

import addMiddleware from './startup/addMiddleware';
import addRoutes from './startup/addRoutes';
import config from './startup/config'
import addDocumentation from './startup/addDocumentation';
import addRequestHandler from './startup/addRequestHandler';
import addErrorHandler from './startup/addErrorHandler';

const app = express();

const port = parseInt(process.env.NAVBRIX_API_PORT as string || "3000", 10);

addRequestHandler(app)
config()
addDocumentation(app, port)
addMiddleware(app)
addRoutes(app)
addErrorHandler(app)

app.listen(port, () => console.log(`Listening on port ${port}...`))