const express = require('express');
const mongoose = require("mongoose");
const objectId = mongoose.Types.ObjectId;
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// También podemos usar la librería de variables de entorno dotenv
const mySecret = process.env['MONGO_URI']
const uri = mySecret;
// conectamos la BD con el mySecret
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("DB connected"))
  .catch(err => console.error(err));

// importamos el modelo mongoose de Product.js:
const Product = require("./Product");

// esquema GraphQl: encargado de definir el tipo de consulta hacia la BD
// al definir los type en los resolvers e invocarlos en este esquema
// ambos quedan disponibles en graphiql
const schema = buildSchema(`

  type Product {
    _id: ID!
    titulo: String
    precio: Float
    descripcion: String
    categoria: String
    imagen: String
  }

  type Query {
    oneProduct(_id: ID!): Product
    allProducts: [Product]
  }

  type Mutation {
      crearProducto ( 
        titulo: String,
        precio: Float,
        descripcion: String,
        categoria: String,
        imagen: String,
      ): Product
      deleteProductById(_id: ID!): String
      updateProduct(
        _id: ID!, 
        titulo: String, 
        precio: Float, 
        descripcion: String, 
        categoria: String, 
        imagen: String): Product

  }

`);

// resolvers: encargados de recuperar a través del modelo obtener aquí para manipular o exponer el resultado de las consultas
const rootValue = {

  crearProducto: async ({ titulo, precio, descripcion,
    categoria,
    imagen }) => {
    const newProduct = new Product({
      titulo,
      precio,
      descripcion,
      categoria,
      imagen
    });
    await newProduct.save();
    return newProduct.toObject();
  },

  allProducts: async () => {
    try {
      // Recupera todos los productos
      const products = await Product.find();
      console.log(products);
      return products;
    } catch (error) {
      throw new Error("No se pudieron recuperar los productos.");
    }
  },

  oneProduct: async (_, { _id }) => {
    try {
      // Recupera un producto por su ID
      const product = await Product.findOne(_id);
      return product;
    } catch (error) {
      throw new Error("No se pudo encontrar el producto.");
    }
  },

  deleteProductById: async (_, { _id }) => {
    try {
      // Intenta borrar el producto por su ID
      const deletedProduct = await Product.deleteOne(_id);

      if (!deletedProduct) {
        // Si el producto no existe, lanza un error
        throw new Error("No se encontró el producto.");
      }

      return `Producto con ID ${_id} borrado correctamente.`;
    } catch (error) {
      console.error("Error al borrar el producto:", error);
      throw new Error("No se pudo borrar el producto.");
    }
  },

  updateProduct: async ({ _id, titulo, precio, descripcion, categoria, imagen }) => {
    try {
      const existingProduct = await Product.findOne({ _id });

      if (!existingProduct) {
        throw new Error('No se encontró el producto.');
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id },
        { $set: { titulo, precio, descripcion, categoria, imagen } },
        { new: true }
      );

      return updatedProduct;
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      throw new Error('No se pudo actualizar el producto.');
    }
  },

};

app.use(cors());
app.use(bodyParser.json());

// Esta es la definición de la ruta de graphql:
// https://conexionbdmongo.mapatagbusqueda.repl.co/graphql
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue,
  graphiql: true,
}));

// endpoint API de consumo desde postman o JS Fetch tienda virtual
const test = require('./data');
app.get('/products', (req, res) => res.json({ total: test.length, status: 200, test }));

// ----------------------
// 3. la ruta del api para cargar desde front /products no desde data.js
// sino con la consulta graphqhl a la BD allProducts
// Habilita el soporte de módulos ES en Node.js
require = require('esm')(module);

// Importa 'node-fetch' utilizando 'import()' en lugar de 'require()'
import('node-fetch').then(({ default: fetch }) => {
    // Definimos la ruta '/productsFromGraphQL' que utiliza fetch desde front con JS
    app.get('/productsFromGraphQL', async (req, res) => {
      try {
        const graphqlResponse = await fetch('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({query:'{allProducts{titulo,precio,descripcion,categoria,imagen}}' }),
        });

        const { data, errors } = await graphqlResponse.json();

        if (errors) {
          throw new Error('Error en la consulta GraphQL');
        }

        res.json({ total: data.allProducts.length, status: 200, products: data.allProducts });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener los productos' });
      }
    });
}).catch((err) => {
    console.error('Error al importar node-fetch:', err);
});

app.listen(3000, () => {
  console.log('Server started on port 4000');
});
