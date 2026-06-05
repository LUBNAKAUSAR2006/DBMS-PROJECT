function isApiRequest(request) {
    return request.originalUrl.startsWith("/api/");
}

function sendDeniedResponse(request, response, statusCode, message) {
    if (isApiRequest(request)) {
        return response.status(statusCode).json({ message });
    }

    return response.redirect("/auth?mode=login");
}

function requireLogin(request, response, next) {
    if (!request.session.user) {
        return sendDeniedResponse(request, response, 401, "Please log in to continue.");
    }

    request.currentUser = request.session.user;
    next();
}

function requireAnyRole(...roles) {
    return (request, response, next) => {
        if (!request.session.user) {
            return sendDeniedResponse(request, response, 401, "Please log in to continue.");
        }

        if (!roles.includes(request.session.user.role)) {
            return sendDeniedResponse(request, response, 403, "You do not have access to this section.");
        }

        request.currentUser = request.session.user;
        next();
    };
}

module.exports = {
    requireLogin,
    requireAnyRole,
};
