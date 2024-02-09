import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import type {Express} from 'express'


const addRequestHandler = (app: Express) => {
    Sentry.init({
        dsn: "https://e8931349729c17847cfab47e43e08d6e@o1258167.ingest.sentry.io/4506713665110016",
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