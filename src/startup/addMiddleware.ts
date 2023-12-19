import express from 'express'
import type {Express} from 'express'
import cors from 'cors'

function addMiddleware(app: Express) {
    app.use(cors())
    app.use(express.json())
}

export default addMiddleware