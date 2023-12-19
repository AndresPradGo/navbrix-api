import express from 'express';

import addMiddleware from './startup/addMiddleware';

const app = express();

addMiddleware(app)

const port = parseInt(process.env.PORT as string || "3000", 10);
app.listen(port, () => console.log(`Listening on port ${port}...`))