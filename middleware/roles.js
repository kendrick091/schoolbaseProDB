module.exports = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).send("Not authenticated");
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).send("Access denied");
        }

        next();
    };
};
