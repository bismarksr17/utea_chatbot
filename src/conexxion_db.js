// conexión con base de datos
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('utea', 'postgres', '77663540', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres'
});

async function testConexion() {
    try {
        await sequelize.authenticate();
        console.log('CONEXION EXITOSA...!!!');
    } catch (error) {
        console.error('CONEXION FALLIDA:', error);
}
}

testConexion()

module.exports = sequelize;