import { z } from "zod";

function parseRequestBody(schema){
    try {
        return (req, res, next) => {
            const result = schema.safeParse(req.body);
    
            if(!result.success){
                return res.status(400).json({
                    message: "Validation Failed",
                    errors: JSON.parse(result.error.message),
                });
            }
    
            res.locals.validated = result.data;
            next();
        }
    } catch (error) {
        next(error);
    }
}

export {
    parseRequestBody
}