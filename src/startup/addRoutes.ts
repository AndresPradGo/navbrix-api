import type {Express} from 'express'

import briefings from '../routes/briefings'
import reports from '../routes/reports'

function addRoutes(app: Express) {
    app.use('/api/briefings', briefings);
    app.use('/api/reports', reports);
}

export default addRoutes