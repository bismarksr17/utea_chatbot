const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const qrcode = require("qrcode-terminal");
const { buscar_acceso_agrocittca } = require("./data_accesos_agrocittca_control");

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
                        res = await opcionSeleccionada.proceso(userContext[id].cod_ca)
                        await sock.sendMessage(id, { text: res });
                        await sock.sendMessage(id, { text: "Hasta pronto...!" });
                        delete userContext[id];
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

async function get_acceso_agrocittca(cod_ca){
    const acceso = await buscar_acceso_agrocittca(cod_ca)
    console.log("=======================")
    console.log(acceso)
    if (Object.keys(acceso).length === 0) {
        return `No se encontraron accesos AgroCITTCA para el codigo ${cod_ca}`;
    }
    return `Acceso para codigo Cañero ${cod_ca}: 
    Usuario: ${acceso.usuario}
    Contraseña: ${acceso.password}`
}

async function enviarMenu(sock, id, menuKey) {
    const menu = menuData[menuKey]
    const optionText = Object.entries(menu.options)
        .map(([key, option]) => `- 👉 *${key}*: ${option.text}`)
        .join("\n");
    const menuMensaje = `${menu.mensaje}\n${optionText}\n\n> *Indicanos una opcion*`;
    sock.sendMessage(id, { text: menuMensaje });
}

let menuData = {
    main: {
        mensaje: "*Bienvenido, Como puedo ayudarte?*",
        options: {
            A: {
                text: "Usuario y contraseña para AGROCITTCA",
                proceso: get_acceso_agrocittca
            },
            B: {
                text: "Planos de propiedades",
                respuesta: {
                    tipo: "text",
                    msg: {
                        url: "Planos..."
                    }
                }
            }
        }
    }
}