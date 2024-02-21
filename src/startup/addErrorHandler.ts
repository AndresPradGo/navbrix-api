import * as Sentry from "@sentry/node";
import type {Express, Request, Response, NextFunction} from 'express'

const addErrorHandler = (app: Express) => {
    // The error handler must be registered before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler());



    // Optional fallthrough error handler
    app.use(function onError(req: Request, res: Response, next: NextFunction) {
        res.status(400).json({detail: "Not Found"})
    });
  
}

export default addErrorHandler