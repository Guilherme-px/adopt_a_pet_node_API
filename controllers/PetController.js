const Pet = require("../models/Pet");
const Category = require("../models/Category");

const ObjectId = require("mongoose").Types.ObjectId;

// helpers
const { existsOrError } = require("../helpers/validation");
const getToken = require("../helpers/get-token");
const getUserByToken = require("../helpers/get-user-by-token");

module.exports = class PetController {
    // Create a pet
    static async create(req, res) {
        const petData = { ...req.body };
        const images = req.files;

        const available = true;

        // images upload

        // validations
        try {
            existsOrError(images, "Imagem obrigatória!");
            existsOrError(petData.name, "Nome não informado!");
            existsOrError(petData.age, "Idade não informada!");
            existsOrError(petData.weight, "Peso não informado!");
            existsOrError(petData.color, "Cor não informado!");
            existsOrError(petData.category, "Informe a categoria!");

            // check if category exists
            const checkCategory = await Category.findOne({
                name: petData.category,
            });
            existsOrError(checkCategory, "Está categoria não existe");
        } catch (msg) {
            return res.status(422).send(msg);
        }

        const category = await Category.findOne({ name: petData.category });

        // get pet owner
        const token = getToken(req);
        const user = await getUserByToken(token);

        // create a pet
        const pet = new Pet({
            name: petData.name,
            age: petData.age,
            weight: petData.weight,
            color: petData.color,
            available,
            images: [],
            category: {
                _id: category._id,
                name: category.name,
            },
            user: {
                _id: user._id,
                name: user.name,
                image: user.image,
                phone: user.phone,
            },
        });

        images.map((image) => {
            pet.images.push(image.filename);
        });

        try {
            await pet.save();
            res.status(201).json({ msg: "Pet cadastrado com sucesso!" });
        } catch (msg) {
            res.status(500).send(msg);
        }
    }

    static async getAll(req, res) {
        const { page = 1, limit = 20 } = req.query;

        const pets = await Pet.find()
            .sort("-createdAt")
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.status(200).json({ pets: pets, page, limit });
    }

    static async getAllUserPets(req, res) {
        // get token
        const token = getToken(req);
        const user = await getUserByToken(token);

        const pets = await Pet.find({ "user._id": user._id }).sort(
            "-createdAt"
        );

        res.status(200).json({ pets });
    }

    static async getAllUserAdoptions(req, res) {
        // get user from token
        const token = getToken(req);
        const user = await getUserByToken(token);

        const pets = await Pet.find({ "adopter._id": user._id }).sort(
            "-createdAt"
        );

        res.status(200).json({ pets });
    }

    static async getPetById(req, res) {
        const id = req.params.id;

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ msg: "ID inválido" });
            return;
        }

        // check if pet exists
        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ msg: "Pet não encontrado!" });
            return;
        }

        res.status(200).json({ pet });
    }

    static async removePetById(req, res) {
        const id = req.params.id;

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ msg: "ID inválido" });
            return;
        }

        // check if pet exists
        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ msg: "Pet não encontrado!" });
            return;
        }

        // check if current user registered the pet
        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({
                msg: "Oops ocorreu um erro!! tente novamente mais tarde!",
            });
            return;
        }

        await Pet.findByIdAndRemove(id);

        res.status(200).json({ msg: "Pet removido com sucesso!" });
    }

    static async updatePet(req, res) {
        const id = req.params.id;
        const petData = { ...req.body };
        const images = req.files;

        const updatedData = {};

        // check if pet exists
        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ msg: "Pet não encontrado!" });
            return;
        }

        // check if current user registered the pet
        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({
                msg: "Oops ocorreu um erro!! tente novamente mais tarde!",
            });
            return;
        }

        // validations
        try {
            existsOrError(petData.name, "Nome não informado!");
            updatedData.name = petData.name;
            existsOrError(petData.age, "Idade não informada!");
            updatedData.age = petData.age;
            existsOrError(petData.weight, "Peso não informado!");
            updatedData.weight = petData.weight;
            existsOrError(petData.color, "Cor não informado!");
            updatedData.color = petData.color;
            if (images.length > 0) {
                updatedData.images = [];
                images.map((image) => {
                    updatedData.images.push(image.filename);
                });
            }
        } catch (msg) {
            return res.status(422).send(msg);
        }

        await Pet.findByIdAndUpdate(id, updatedData);

        res.status(200).json({ msg: "Pet atualizado com sucesso!" });
    }

    static async schedule(req, res) {
        const id = req.params.id;

        // check if pet exists
        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ msg: "Pet não encontrado!" });
            return;
        }

        // check if user register the pet
        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.equals(user._id)) {
            res.status(422).json({
                msg: "Você não pode agendar uma visita com seu próprio pet!",
            });
            return;
        }

        // check if user has already schedule a visit
        if (pet.adopter) {
            if (pet.adopter._id.equals(user._id)) {
                res.status(422).json({
                    msg: "Você já agendou uma visita com esse pet!",
                });
                return;
            }
        }

        // add user to pet
        pet.adopter = {
            _id: user._id,
            name: user.name,
            image: user.image,
        };

        await Pet.findByIdAndUpdate(id, pet);

        res.status(200).json({
            msg: `A visita foi agendada com sucesso, entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone}`,
        });
    }

    static async concludeAdoption(req, res) {
        const id = req.params.id;

        // check if pet exists
        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ msg: "Pet não encontrado!" });
            return;
        }

        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({
                msg: "Oops ocorreu um erro!! tente novamente mais tarde!",
            });
            return;
        }

        pet.available = false;

        await Pet.findByIdAndUpdate(id, pet);

        res.status(200).json({
            msg: "Parabéns! a adoção foi realizada com sucesso!",
        });
    }

    static async getByCategory(req, res) {
        const id = req.params.id;

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ msg: "ID inválido" });
            return;
        }

        const pets = await Pet.find({ "category._id": ObjectId(id) });

        res.status(200).json({ pets });
    }
};
