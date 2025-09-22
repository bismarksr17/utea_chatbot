const Data_Accesos_Agrocittca = require('./data_accesos_agrocittca')

async function buscar_acceso_agrocittca(codigo_canero) {
    const fila = await Data_Accesos_Agrocittca.findOne({ where : { cod_ca : codigo_canero } })
    if (!fila){
        return {}
    }
    const acceso = {
        usuario : fila.dataValues.usuario,
        password : fila.dataValues.password,
        email : fila.dataValues.correo_nax
    }
    return acceso
}

//(async () => {
//    const res = await buscar_acceso_agrocittca(41594);  // usa un cod_ca que exista
//    console.log(res);
//})();

module.exports = { buscar_acceso_agrocittca }
