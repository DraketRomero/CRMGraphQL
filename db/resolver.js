const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Pedido = require("../models/Pedido");
require("dotenv").config({ path: "variables.env" });

const crearToken = (user, secreta, expiresIn) => {
	const { id, email, nombre, apellido } = user;

	return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

// Resolvers
const resolvers = {
	Query: {
		obtenerUsuario: async (_, {}, ctx) => {
			// console.log(ctx)
			return ctx.user;
		},
		obtenerProductos: async () => {
			try {
				const productos = await Producto.find({});

				return productos;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerProducto: async (_, { id }) => {
			// TODO: Rwevisar si el producto existe.
			const producto = await Producto.findById(id);

			if (!producto) {
				throw new Error("Producto no encontrado");
			}

			return producto;
		},
		obtenerClientes: async () => {
			try {
				const clientes = await Cliente.find({});

				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerClientesVendedor: async (_, {}, ctx) => {
			try {
				const clientes = await Cliente.find({
					vendedor: ctx.user.id.toString(),
				});

				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerCliente: async (_, { id }, ctx) => {
			// TODO: Revisar si el cliente existe o no
			const cliente = await Cliente.findById(id);

			if (!cliente) throw new Error("Cliente no encontrado.");

			// Quien lo creo puede verlo
			if (cliente.vendedor.toString() !== ctx.user.id)
				throw new Error("No tienes las credenciales");

			return cliente;
		},
		obtenerPedidos: async () => {
			try {
				const pedidos = await Pedido.find({});
				return pedidos;
			} catch (error) {
				console.log(error)
			}
		},
		obtenerPedidosVendedor: async (_, { }, ctx) => {
			try {
				const pedidos = await Pedido.find( { vendedor: ctx.id } ).populate("cliente");
				return pedidos;
			} catch (error) {
				console.log(error)
			}
		},
		obtenerPedido: async (_, { id }, ctx) => {
			// TODO: Si el pedido existe o no 
			const pedido = await Pedido.findById(id);
			if(!pedido) 
				throw new Error('Pedido no encontrado');

			// TODO: Solo quien lo creo puede verlo
			if(pedido.vendedor.toString() !== ctx.id)
				throw new Error('No tienes las credenciales.');

			// TODO: Retornar el resultado.
			return pedido;

		},
		obtenerPedidosEstado: async(_, { estado }, ctx) => {
			const pedidos = await Pedido.find({ vendedor: ctx.id, estado });

			return pedidos;
		},
		mejoresClientes: async () => {
			const clientes = await Pedido.aggregate([
				{ $match: { estado: "COMPLETO"}},
				{ $group: {
					_id: "$cliente",
					total: { $sum: "$total" }
				}},
				{
					$lookup: {
						from: "clientes",
						localField: "_id",
						foreignField: "_id",
						as: "cliente"
					}
				},
				{
					$sort: { total: -1 } // Ordena los clientes de mayor a menor
				}
			]);

			return clientes;
		},
		mejoresVendedores: async() => {
			const vendedores = await Pedido.aggregate([
				{ $match: { estado: "COMPLETADO" } },
				{ $group: {
					_id: "$vendedor",
					total: { $sum: "$total" },
				}},
				{
					$lookup: {
						from: "usuarios",
						localField: "_id",
						foreignField: "_id",
						as: "vendedor"
					}
				},
				{
					$limit: 3
				},
				{
					$sort: { total: -1 } // Ordena los clientes de mayor a menor
				}
			]);

			return vendedores;
		},
		buscarProducto: async (_, { texto }) => {
			const productos = await Producto.find({ $text: { $search: texto }}).limit(10);

			return productos;
		}
	},
	Mutation: {
		nuevoUsuario: async (_, { input }) => {
			const { email, password } = input;

			// TODO: Revisar si el usuario ya esta registrado en la base de datos
			const existeUsuario = await Usuario.findOne({ email });
			if (existeUsuario) throw new Error("El usuario ya esta registrado");

			// TODO: Hashear su password
			// const salt = await bcryptjs.getSalt(10);
			input.password = await bcryptjs.hash(password, 10);

			// TODO: Guardarlo en la bd
			try {
				const usuario = new Usuario(input); // Instancia del modelo importado

				usuario.save(); // Guarda en la bd.

				return usuario;
			} catch (error) {
				console.log(error);
			}
		},

		autenticarUsuario: async (_, { input }) => {
			const { email, password } = input;

			// Si el usuario existe
			const existeUsuario = await Usuario.findOne({ email });
			if (!existeUsuario) throw new Error("El usuario no existe.");

			// Revisar si el password es correcto
			const passOk = await bcryptjs.compare(password, existeUsuario.password);
			if (!passOk) throw new Error("El password es incorrecto.");

			// Crear el token
			return {
				token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
			};
		},
		nuevoProducto: async (_, { input }) => {
			try {
				const producto = new Producto(input);

				// Almacenar en la bd
				const resultado = await producto.save();

				return resultado;
			} catch (error) {
				console.log(error);
			}
		},
		actualizarProducto: async (_, { id, input }) => {
			// TODO: Revisar si el producto existe.
			let producto = await Producto.findById(id);

			if (!producto) {
				throw new Error("Producto no encontrado");
			}

			// Guardarlo en la bd.
			producto = await Producto.findByIdAndUpdate({ _id: id }, input, {
				new: true,
			});

			return producto;
		},
		eliminarProducto: async (_, { id }) => {
			// TODO: Revisar si el producto existe.
			let producto = await Producto.findById(id);

			if (!producto) {
				throw new Error("Producto no encontrado");
			}

			// Eliminar prducto
			await Producto.findByIdAndDelete({ _id: id });

			return "Producto eliminado";
		},
		nuevoCliente: async (_, { input }, ctx) => {
			const { email } = input;

			// TODO: Verficar si el cliente ya esta registrado
			// console.log(input);
			const cliente = await Cliente.findOne({ email });
			if (cliente) {
				throw new Error("Este cliente ya esta registrado");
			}

			const nuevoCliente = new Cliente(input);

			// TODO: Asignar el vendedor
			nuevoCliente.vendedor = ctx.user.id;

			// TODO: Guardarlo en la base de datos
			try {
				const res = await nuevoCliente.save();
				return res;
			} catch (error) {
				console.log(error);
			}
		},
		actualizarCliente: async (_, { id, input }, ctx) => {
			// TODO: Verficar si existe o no
			let cliente = await Cliente.findById(id);

			if (!cliente) throw new Error("Cliente no existe");

			// TODO: Verificar si el vendedor es quien edita
			if (cliente.vendedor.toString() !== ctx.user.id)
				throw new Error("NO tienes las credenciales.");

			// TODO: Guarda el cliente
			cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
				new: true,
			});
			return cliente;
		},
		eliminarCliente: async (_, { id }, ctx) => {
			// TODO: Verficar si existe o no
			let cliente = await Cliente.findById(id);

			if (!cliente) throw new Error("Cliente no existe");

			// TODO: Verificar si el vendedor es quien edita
			if (cliente.vendedor.toString() !== ctx.user.id)
				throw new Error("NO tienes las credenciales.");

			// TODO: Eliminar cliente
			await Cliente.findOneAndDelete({ _id: id });
			return "Cliente eliminado";
		},
		nuevoPedido: async (_, { input }, ctx) => {
			const { cliente } = input;

			// TODO: Verificar si el ciiente existe
			let clienteExiste = await Cliente.findById(cliente);

			if (!clienteExiste) throw new Error("Cliente no existe");

			// TODO: Verificar si el cliente es el del vendedor
			if (clienteExiste.vendedor.toString() !== ctx.user.id)
				throw new Error("NO tienes las credenciales.");

			// TODO: Revisar que el stock este disponible
			for await (const articulo of input.pedido) {
				// for await es un ciclo asyncrono propio de node js
				const { id } = articulo;

				const producto = await Producto.findById(id);

				if (articulo.cantidad > producto.existencia)
					throw new Error(
						`El articulo: ${producto.nombre} excede la cantidad disponible.`
					);
				else {
					// Restar la cantidad a lo disponible
					producto.existencia = producto.existencia - articulo.cantidad;

					await producto.save();
				}
			}

			// TODO: Asignarle un vendedor
			const nuevoPedido = new Pedido(input);

			// TODO: Guardarlo en la bd
			nuevoPedido.save();
		},
		actualizaPedido: async (_, { id, input }, ctx) => {
			const { cliente } = input;

			// TODO: Si el pedido existe
			const existePedido = await Pedido.findById(id);
			if(!existePedido)
				throw new Error('El cliente no existe.');

			// TODO: Si el cliente existe
			const existeCliente = await Cliente.findById(cliente);
			if(!existeCliente)
				throw new Error('El cliente no existe.');

			// TODO: Si el cliente y pedido pertenece al vendedor
			if(existeCliente.vendedor.toString() !== ctx.user.id)
				throw new Error('No tienes las credenciales');

			// // TODO: Revisar el stock
			// for await (const articulo of input.pedido) {
			// 	// for await es un ciclo asyncrono propio de node js
			// 	const { id, cantidad } = articulo;

			// 	const producto = await Producto.findById(id);
			// 	const { nombre, existencia } = producto;

			// 	if (cantidad > existencia)
			// 		throw new Error(
			// 			`El articulo: ${nombre} excede la cantidad disponible.`
			// 		);
			// 	else {
			// 		// Restar la cantidad a lo disponible
			// 		producto.existencia = existencia - cantidad;

			// 		await producto.save();
			// 	}
			// }

			// TODO: Guardar el pedido
			const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true });
			return resultado;
		},
		eliminarPedido: async (_, { id }, ctx) => {
			// TODO: Verificar si existe el pedido
			const pedido = await Pedido.findById(id);
			if(!pedido) throw new Error('El pedido no existe.');

			// // TODO: Verificar si el vendedor es quien lo borra
			// if(pedido.vendedor.toString() !== ctx.user.id)
			// 	throw new Error('No tienes las credenciales');

			// TODO: Eliminar de la base de datos
			await Pedido.findOneAndDelete({_id: id});
			return "Pedido eliminado";
		}
	},
};

module.exports = resolvers;