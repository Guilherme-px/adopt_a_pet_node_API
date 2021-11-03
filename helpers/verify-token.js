const jwt = require('jsonwebtoken');
const getToken = require('./get-token');
const { authSecret } = require('../.env');

const checkToken = (req, res, next) => {

    if (!req.headers.authorization) return res.status(401).send('Acesso negado!');

    const token = getToken(req);

    if (!token) return res.status(401).send('Acesso negado!');

    try {

        const verified = jwt.verify(token, authSecret);
        req.user = verified;
        next();
    } catch (err) {
        return res.status(400).send('Token Inválido!');
    }
};

module.exports = checkToken;
