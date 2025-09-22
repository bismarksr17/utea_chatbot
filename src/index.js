const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const qrcode = require("qrcode-terminal");
const { buscar_acceso_agrocittca } = require("./data_accesos_agrocittca_control");
const { obtenerToken } = require('./get_token_imgs_sat');

let sock = null; // 🔁 variable global

let userContext = {};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        try {
            const { connection, lastDisconnect, qr } = update;

            if (qr) qrcode.generate(qr, { small: true });

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Conexión cerrada. Reconectando:', shouldReconnect);
                if (shouldReconnect) {
                    await connectToWhatsApp(); // 🔁 actualiza sock global
                }
            } else if (connection === 'open') {
                console.log('✅ Conexión abierta con WhatsApp');
            }
        } catch (err) {
            console.error('❌ Error en connection.update:', err.message);
        }
    });

    // 🎧 Escuchar mensajes entrantes tipo "reporte"
    sock.ev.on('messages.upsert', async (event) => {
        try {
            for (const m of event.messages) {
                const id = m.key.remoteJid;

                if (event.type !== 'notify' || m.key.fromMe || id.includes('@g.us') || id.includes('@broadcast')) {
                    console.log("NO...!!!")
                    return;
                }

                let mensaje = m.message?.conversation || m.message?.extendedTextMessage?.text;
                mensaje = (mensaje + "".trim()).toUpperCase();
                console.log(mensaje)
                
                if(mensaje !== 'UTEA' && !userContext[id]){
                    return;
                }

                if (!userContext[id]) {
                    userContext[id] = { menuActual: "inicio" };
                    await sock.sendMessage(id, { text: "*Hola, ingrese su código cañero:*" });
                    return;
                } else if(userContext[id].menuActual == "inicio"){
                    es_valido = await validar_usuario(mensaje);
                    if (es_valido) {
                        userContext[id] = { cod_ca: Number(mensaje) };
                        userContext[id].menuActual = 'main'
                        await enviarMenu(sock, id, "main");
                        console.log(userContext)
                        return;
                    } else {
                        await sock.sendMessage(id, { text: "El código cañero no es valido." });
                        delete userContext[id];
                        console.log(userContext)
                        return;
                    }
                }

                const menuActual = userContext[id].menuActual;
                const menu = menuData[menuActual];
                
                const opcionSeleccionada = menu.options[mensaje];
                if (opcionSeleccionada) {
                    if (opcionSeleccionada.respuesta) {
                        const tipo = opcionSeleccionada.respuesta.tipo;
                        if(tipo === "text") {
                            await sock.sendMessage(id, {text: opcionSeleccionada.respuesta.msg});
                        }
                        if(tipo === "image") {
                            await sock.sendMessage(id, {image: opcionSeleccionada.respuesta.msg});
                        }
                        if(tipo === "location") {
                            await sock.sendMessage(id, {location: opcionSeleccionada.respuesta.msg});
                        }
                    }
                    if (opcionSeleccionada.proceso){
                        await opcionSeleccionada.proceso(sock, userContext, id)
                        delete userContext[id];
                        
                        //res = await opcionSeleccionada.proceso(userContext[id].cod_ca)
                        //await sock.sendMessage(id, { text: res });
                        //await sock.sendMessage(id, { text: "Hasta pronto...!" });
                        //delete userContext[id];
                    }
                    if (opcionSeleccionada.submenu) {
                        userContext[id].menuActual = opcionSeleccionada.submenu;
                        enviarMenu(sock, id, opcionSeleccionada.submenu);
                    }
                } else {
                    await sock.sendMessage(id, {text: "Por favor, selecciona una opcion valida del menu"});
                }
                //enviarMenu(sock, id, "main");
            }
        } catch (err) {
            console.error('❌ Error en messages.upsert:', err.message);
        }
    });
}

connectToWhatsApp(); // 🚀 Inicia conexión

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada sin manejar:', reason);
});

async function validar_usuario(cod_ca){
    const num = Number(cod_ca)
    if(Number.isInteger(num)){
        return true
    } else {
        return false
    }
}

async function get_acceso_agrocittca(sock_aux, user_aux, idd){
    cod_ca = user_aux[idd].cod_ca
    const acceso = await buscar_acceso_agrocittca(cod_ca)
    if (Object.keys(acceso).length === 0) {
        const msj = `No se encontraron accesos AgroCITTCA para el codigo ${cod_ca}`;
        await sock_aux.sendMessage(idd, { text : msj })
    }
    const msj = `*Tus credenciales para AgroCITTCA son:* 
    👤 *Usuario:* ${acceso.usuario}
    🔑 *Contraseña:* ${acceso.password}.

Descarga la App:
- Androind: https://play.google.com/store/apps/details?id=com.dima.guabira

- IPhone: https://apps.apple.com/us/app/agro-cittca-guabir%C3%A1/id1669149924`
    await sock_aux.sendMessage(idd, { text : msj })
}

async function get_acceso_nax(sock_aux, user_aux, idd){
    cod_ca = user_aux[idd].cod_ca
    const acceso = await buscar_acceso_agrocittca(cod_ca)
    const email = acceso.email
    const pass_temp = "A123456*"
    const token = await obtenerToken(email, pass_temp)
    if (typeof token === "string" && token.trim() !== "") {
        const link = "https://beta.naxsolutions.com/home/smart-models/reports?token=" + token;
        await sock_aux.sendMessage(idd, {
            text: "Ingresa aquí para ver tus propiedades 👆",
            contextInfo: {
                externalAdReply: {
                    title: "Monitoreo Satelital",
                    body: "Accede a tus propiedades",
                    mediaType: 1,
                    //thumbnailUrl: "https://tse1.mm.bing.net/th/id/OIP.5niMVpQQVNH2KZFRaDjRTAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3", // opcional
                    //sourceUrl: link
                    thumbnailUrl: link,
                }
            }
        });
        
    } else {
        const msj = `Su codigo cañero no tiene acceso Monitoreo Satelital`;
        await sock_aux.sendMessage(idd, { text : msj })
    }

    
    console.log(email)
    console.log(pass_temp)
    console.log(token)

}

async function enviarMenu(sock, id, menuKey) {
    const menu = menuData[menuKey]
    const optionText = Object.entries(menu.options)
        .map(([key, option]) => `${key}. ${option.text}`)
        .join("\n");
    const menuMensaje = `${menu.mensaje}\n${optionText}\n\n> *Indicanos una opcion*`;
    sock.sendMessage(id, { text: menuMensaje });
}

let menuData = {
    main: {
        mensaje: "*Bienvenido, Como puedo ayudarte?*",
        options: {
            1: {
                text: "Acceso a *AgroCITTCA* 📲",
                proceso: get_acceso_agrocittca
            },
            2: {
                text: "Monitoreo satelital inteligente 🛰️",
                proceso: get_acceso_nax
            }
        }
    }
}