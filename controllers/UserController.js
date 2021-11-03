const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authSecret } = require('../.env');
const { existsOrError, notExistsOrError, equalsOrError } = require('./validation');

const User = require('../models/User');

// helpers
const getUserByToken = require('../helpers/get-user-by-token');
const getToken = require('../helpers/get-token');
const createUserToken = require('../helpers/create-user-token');

module.exports = class UserController {
    static async register(req, res) {
        const userData = { ...req.body };

        // validations
        try {
            existsOrError(userData.name, 'Nome não informado!');
            existsOrError(userData.email, 'E-mail não informado!');
            existsOrError(userData.phone, 'Telefone não informado!');
            existsOrError(userData.password, 'Senha não informada!');
            existsOrError(userData.confirmPassword, 'Confirmação de Senha inválida!');
            equalsOrError(userData.password, userData.confirmPassword, 'Senhas não conferem!');

            // check if user exists
            const userExists = await User.findOne({ email: userData.email });
            notExistsOrError(userExists, 'Por favor, utilize outro e-mail!');

        } catch (msg) {
            return res.status(422).send(msg);
        }

        // create password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(userData.password, salt);

        // create user
        const user = new User({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: passwordHash,
        });

        try {
            const newUser = await user.save();

            await createUserToken(newUser, req, res);
        } catch (error) {
            res.status(500).json({ msg: error });
        }
    }

    static async login(req, res) {
        const email = req.body.email;
        const password = req.body.password;

        if (!email) {
            res.status(422).json({ msg: 'O e-mail é obrigatório!' });
            return;
        }

        if (!password) {
            res.status(422).json({ msg: 'A senha é obrigatória!' });
            return;
        }

        // check if user exists
        const user = await User.findOne({ email: email });

        if (!user) {
            return res
                .status(422)
                .json({ msg: 'Não há usuário cadastrado com este e-mail!' });
        }

        // check if password match
        const checkPassword = await bcrypt.compare(password, user.password);

        if (!checkPassword) {
            return res.status(422).json({ msg: 'Senha inválida!' });
        }

        await createUserToken(user, req, res);
    }

    static async checkUser(req, res) {
        let currentUser;

        console.log(req.headers.authorization);

        if (req.headers.authorization) {
            const token = getToken(req);
            const decoded = jwt.verify(token, authSecret);

            currentUser = await User.findById(decoded.id);

            currentUser.password = undefined;
        } else {
            currentUser = null;
        }

        res.status(200).send(currentUser);
    }

    static async getUserById(req, res) {
        const id = req.params.id;

        const user = await User.findById(id);

        if (!user) {
            res.status(422).json({ msg: 'Usuário não encontrado!' });
            return;
        }

        res.status(200).json({ user });
    }

    static async editUser(req, res) {
        const token = getToken(req);

        const user = await getUserByToken(token);

        const userData = { ...req.body };

        let image = '';

        if (req.file) {
            user.image = req.file.filename;
        }

        // validations
        try {
            existsOrError(userData.name, 'Nome não informado!');
            user.name = userData.name;

            existsOrError(userData.email, 'E-mail não informado!');
            const userExists = await User.findOne({ email: userData.email });

            if (user.email !== userData.email && userExists) {
                res.status(422).json({ msg: 'Por favor, utilize outro e-mail!' });
                return;
            }

            user.email = userData.email;

            existsOrError(userData.phone, 'Telefone não informado!');
            user.phone = userData.phone;

            existsOrError(userData.password, 'Senha não informada!');
            equalsOrError(userData.password, userData.confirmPassword, 'Senhas não conferem');

            if (userData.password === userData.confirmPassword && userData.password != null) {

                const salt = await bcrypt.genSalt(12);
                const passwordHash = await bcrypt.hash(userData.password, salt);

                user.password = passwordHash;
            }

            try {

                // returns user updated data
                await User.findOneAndUpdate(
                    { _id: user._id },
                    { $set: user },
                    { new: true }
                );

                res.status(200).json({ msg: 'Usuário atualizado com sucesso!' });

            } catch (err) {
                res.status(500).json({ msg: err });
                return;
            }

            // check if user exists

        } catch (msg) {
            return res.status(422).send(msg);
        }
    }
};