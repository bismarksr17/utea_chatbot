const Data_Accesos_Agrocittca = require('./data_accesos_agrocittca')

async function buscar_acceso_agrocittca(codigo_canero) {
    const fila = await Data_Accesos_Agrocittca.findOne({ where : { cod_ca : codigo_canero } })
    if (!fila){
        return {}
    }
    const acceso = {
        usuario : fila.dataValues.usuario,
        password : fila.dataValues.password
    }
    return acceso
}

module.exports = { buscar_acceso_agrocittca }