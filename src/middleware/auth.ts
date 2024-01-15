import type { Request, Response, NextFunction } from "express";
import jwt from'jsonwebtoken'
import config from 'config'

interface JWTPayload {
    email: string;
    active: boolean;
    permissions: ('admin' | 'master')[];
}

const auth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('x-auth-token')
    if (!token) return res.status(401).send('Login with valid user credentials.')
    try {
        const decoded = jwt.verify(token, config.get('jwt_secret_key')) as JWTPayload
        req.query.userEmail = decoded.email
        next()
    } catch (e: any) {
        return res.status(400).send('Login with valid user credentials.');
    }
}

export default auth