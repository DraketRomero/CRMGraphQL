const { ApolloServer } = require("apollo-server");
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolver');
const conectarDb = require('./config/db');
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

// Conexion a la base de datos
conectarDb();

//Servidor
const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: ({ req }) => {
		// console.log(req.headers['authorization'])

		// console.log(req)

		const token = req.headers['authorization'] || '';

		if(token) {
			try {
				const user = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA);

				console.log(user)

				return {
					user
				}
			} catch (error) {
				console.log("Hubo un error", error);
			}
		}
	}
});

// Inicializa el servidor
server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
	console.log(`Servidor corriendo en ${url}`);
});

// password mongobd: kzHGwjm2Pry4cZtj