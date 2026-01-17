import rateLimit from "express-rate-limit"

//Rate Limiter
export const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        if (req.accepts("html")) {
            return res.status(429).render("rateLimit");
        }

        res.status(429).json({
            error: "Too many requests. Please try again later."
        });
    }
});