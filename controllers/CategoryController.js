// models
const Category = require('../models/Category');

// validations
const { existsOrError } = require('../helpers/validation');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = class CategoryController {

    // create category
    static async create(req, res) {

        const petCategory = { ...req.body };
        
        // validations
        try {
            existsOrError(petCategory.name, 'Informe a categoria do pet!');
        } catch (msg) {
            return res.status(422).send(msg);
        }

        const category = new Category({
            name: petCategory.name
        });

        try {
            await category.save();
            res.status(201).json({ msg: 'Categoria adicionada com sucesso!' });
        } catch(msg) {
            res.status(500).send(msg);
        }
    }

    static async getAllCategories(req, res) {

        const category = await Category.find();

        res.status(200).json({ category });
    }

    static async getCategoryById(req, res) {

        const id = req.params.id;

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ msg: 'ID inválido' });
            return;
        }

        // check if category exists
        const category = await Category.findOne({ _id: id });
        
        if (!category) {
            res.status(404).json({ msg: 'Categoria não encontrada' });
            return;
        }

        res.status(200).json({ category });
    }
};