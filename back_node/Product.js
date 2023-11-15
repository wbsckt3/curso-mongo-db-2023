const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  titulo: String,
  precio: Number,
  descripcion: String,
  categoria: String,
  imagen: String
})

module.exports = mongoose.model('Product', productSchema);
