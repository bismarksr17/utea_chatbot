const { DataTypes } = require("sequelize");
const sequelize = require('./conexxion_db')

const Accesos_Agrocittca = sequelize.define('Data_Accesos_Agrocittca', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cod_cos: {
        type: DataTypes.INTEGER
    },
    cod_ca: {
        type: DataTypes.INTEGER
    },
    nom_ca: {
        type: DataTypes.STRING
    },
    usuario: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    propiedad: {
        type: DataTypes.STRING
    },
    correo_nax: {
        type: DataTypes.STRING
    },
    password_nax: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'data_accesos_agrocittca',
    schema: 'data',
    timestamps: false
});

module.exports = Accesos_Agrocittca;