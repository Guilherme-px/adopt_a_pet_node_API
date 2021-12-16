const mongoose = require('../db/conn');
const { Schema } = require('mongoose');

const Category = mongoose.model(
    'Category',
    new Schema({
        name: {
            type: String,
            required: true
        }
    }, { timestamps: true }),
);

module.exports = Category;