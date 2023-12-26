import type {Express} from 'express'

import briefings from '../routes/briefings.routes'
import reports from '../routes/reports.routes'

function addRoutes(app: Express) {
    app.use('/api/briefings', briefings);
    app.use('/api/reports', reports);
}

export default addRoutes