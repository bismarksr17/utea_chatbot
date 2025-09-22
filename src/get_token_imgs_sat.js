async function obtenerToken(email, pass) {
  try {
    const payload = {
      password: pass,
      email: email
    };

    const response = await fetch(
      "https://beta-api.naxsolutions.com/api/v1/token/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    return data["refresh"];
  } catch (error) {
    console.error("Error en la petición:", error.message);
    return null;
  }
}


// Para probarlo directo 
//(async () => { 
//  const res = await obtenerToken("41594@gmail.com", "A123456*"); 
//  console.log(res); 
//})();

module.exports = { obtenerToken };
