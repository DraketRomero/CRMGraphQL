const mongoose = require('mongoose');
require('dotenv').config( { path: 'variables.env' });

const conectarDb = async () => {
    try{
        await mongoose.connect(process.env.DB_MONGO, {
        });
        console.log('Db conectada!')
    } catch(error) {
        console.log('Hubo un error al conectar a la base de datos.', error);

        process.exit(1); // Detiene la aplicacion
    }
}

module.exports = conectarDb;