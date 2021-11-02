const jwt = require('jsonwebtoken');
const { authSecret } = require('../.env');

const createUserToken = async (user, req, res) => {

    // create a token
    const token = jwt.sign(
        {
            name: user.name,
            id: user._id
        },
        authSecret
    );

    // return token
    res.status(200).json({
        msg: 'Você está autenticado',
        token: token,
        userId: user._id
    });
};

module.exports = createUserToken;