"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthRoutes = void 0;
const setupAuthRoutes = (app) => {
    app.get('/api/oauth/authorize', (req, res) => {
        res.send('Authorization Endpoint');
    });
    app.post('/api/oauth/token', (req, res) => {
        res.send('Token Endpoint');
    });
};
exports.setupAuthRoutes = setupAuthRoutes;
