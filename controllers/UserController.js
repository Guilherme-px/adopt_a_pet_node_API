const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authSecret, myEmail } = require("../.env");
const crypto = require("crypto");

// models
const User = require("../models/User");

// helpers
const getUserByToken = require("../helpers/get-user-by-token");
const getToken = require("../helpers/get-token");
const createUserToken = require("../helpers/create-user-token");

const {
    existsOrError,
    notExistsOrError,
    equalsOrError,
} = require("../helpers/validation");
const mailer = require("../modules/mailer");

module.exports = class UserController {
    static async register(req, res) {
        const userData = { ...req.body };

        // validations
        try {
            existsOrError(userData.name, "Nome não informado!");
            existsOrError(userData.phone, "Telefone não informado!");
            existsOrError(userData.email, "E-mail não informado!");
            existsOrError(userData.password, "Senha não informada!");
            existsOrError(
                userData.confirmPassword,
                "Confirmação de Senha inválida!"
            );
            equalsOrError(
                userData.password,
                userData.confirmPassword,
                "Senhas não conferem!"
            );

            // check if user exists
            const userExists = await User.findOne({ email: userData.email });
            notExistsOrError(userExists, "Por favor, utilize outro e-mail!");
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
        } catch (msg) {
            res.status(500).send(msg);
        }
    }

    static async login(req, res) {
        const email = req.body.email;
        const password = req.body.password;

        if (!email) {
            res.status(422).send("O e-mail é obrigatório!");
            return;
        }

        if (!password) {
            res.status(422).send("A senha é obrigatória!");
            return;
        }

        // check if user exists
        const user = await User.findOne({ email: email });

        if (!user) {
            return res
                .status(422)
                .send("Não há usuário cadastrado com este e-mail!");
        }

        // check if password match
        const checkPassword = await bcrypt.compare(password, user.password);

        if (!checkPassword) {
            return res.status(422).send("Senha inválida!");
        }

        await createUserToken(user, req, res);
    }

    static async checkUser(req, res) {
        let currentUser;

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
            res.status(422).send({ msg: "Usuário não encontrado!" });
            return;
        }

        res.status(200).json({ user });
    }

    static async editUser(req, res) {
        const token = getToken(req);

        const user = await getUserByToken(token);

        const userData = { ...req.body };

        let image = "";

        if (req.file) {
            user.image = req.file.filename;
        }

        // validations
        try {
            existsOrError(userData.name, "Nome não informado!");
            user.name = userData.name;

            existsOrError(userData.email, "E-mail não informado!");
            const userExists = await User.findOne({ email: userData.email });

            if (user.email !== userData.email && userExists) {
                res.status(422).send("Por favor, utilize outro e-mail!");
                return;
            }

            user.email = userData.email;

            existsOrError(userData.phone, "Telefone não informado!");
            user.phone = userData.phone;

            equalsOrError(
                userData.password,
                userData.confirmPassword,
                "Senhas não conferem"
            );

            if (
                userData.password === userData.confirmPassword &&
                userData.password != null
            ) {
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

                res.status(200).send("Usuário atualizado com sucesso!");
            } catch (msg) {
                res.status(500).send(msg);
                return;
            }

            // check if user exists
        } catch (msg) {
            return res.status(422).send(msg);
        }
    }

    static async forgotPassword(req, res) {
        const { email } = req.body;

        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res
                    .status(422)
                    .send("Não há usuário cadastrado com este e-mail!");
            }

            // create token with crypto
            const token = crypto.randomBytes(20).toString("hex");

            // expires token
            const now = new Date();
            now.setHours(now.getHours() + 1);

            await User.findByIdAndUpdate(user.id, {
                $set: {
                    passwordResetToken: token,
                    passwordResetExpires: now,
                },
            });

            const userId = user._id;

            mailer.sendMail(
                {
                    to: email,
                    from: myEmail,
                    template: "auth/forgot_password",
                    context: { token, userId },
                },
                (err) => {
                    if (err)
                        return res
                            .status(400)
                            .send("Cannot send forgot password email");

                    return res.send("E-mail enviado!");
                }
            );
        } catch (msg) {
            return res.status(422).send(msg);
        }
    }

    static async resetPassword(req, res) {
        const { id, token } = req.params;
        const { password, confirmPassword } = req.body;

        try {
            existsOrError(password, "Senha não informada!");
            existsOrError(confirmPassword, "Confirmação de Senha inválida!");
            equalsOrError(password, confirmPassword, "Senhas não conferem!");

            // check if user exists
            const user = await User.findById({ _id: id }).select(
                "+passwordResetToken passwordResetExpires"
            );
            notExistsOrError(!user, "Usuário não encontrado!");

            if (token !== user.passwordResetToken) {
                return res.status(400).send("Token inválido");
            }

            const now = new Date();

            if (now > user.passwordResetExpires) {
                return res
                    .status(400)
                    .send("Token expirou!, gere um novo token");
            }

            // create password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(password, salt);

            user.password = passwordHash;

            await user.save();

            res.send("Nova senha salva com sucesso!");
        } catch (msg) {
            console.log(msg);
            return res.status(422).send(msg);
        }
    }
};
