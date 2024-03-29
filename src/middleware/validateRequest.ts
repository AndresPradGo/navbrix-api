import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject } from "zod";

const validateRequest = (schema: AnyZodObject) => 
    (req: Request, res: Response, next: NextFunction) => {
        try {
          schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
          });
          next();
        } catch (e: any) {
          return res.status(422).send(e.errors);
        }
    }

export default validateRequest