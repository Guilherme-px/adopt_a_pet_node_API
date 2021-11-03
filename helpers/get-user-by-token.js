const jwt = require('jsonwebtoken');
const { authSecret } = require('../.env');
const User = require('../models/User');

// get user by jwt token
const getUserByToken = async (token, res) => {

    if (!token) return res.status(401).send('Acesso negado!');

    const decoded = jwt.verify(token, authSecret);

    const userId = decoded.id;

    const user = await User.findOne({ _id: userId });

    return user;
};

module.exports = getUserByToken;
