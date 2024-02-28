import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import type {Express} from 'express'
import config from 'config'


const addRequestHandler = (app: Express) => {
    const sentry_dsn: string | undefined = config.get('sentry_dsn') as string | undefined
    Sentry.init({
        dsn: sentry_dsn,
        integrations: [
          // enable HTTP calls tracing
          new Sentry.Integrations.Http({ tracing: true }),
          // enable Express.js middleware tracing
          new Sentry.Integrations.Express({ app }),
          new ProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set sampling rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: 1.0,
      });
      
      // The request handler must be the first middleware on the app
      app.use(Sentry.Handlers.requestHandler());
      
      // TracingHandler creates a trace for every incoming request
      app.use(Sentry.Handlers.tracingHandler());
}

export default addRequestHandler