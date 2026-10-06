/* datos/ordena.js — secuencias cronológicas de "Ordena la historia".
   Cada secuencia: id, nivel (1-3), titulo, eventos (con "orden" numérico AAAAMMDD para ordenar) y explicacion.
   El motor baraja las tarjetas; aquí se escriben en el orden correcto. Para ampliar: añade una secuencia. */
(function (raiz, fabrica) {
  const d = fabrica();
  if (typeof module === "object" && module.exports) module.exports = d;
  else (raiz.Datos = raiz.Datos || {}).ordena = d;
})(typeof self !== "undefined" ? self : this, function () {
  const E = (id, orden, fecha, titulo, desc) => ({ id, orden, fecha, titulo, desc });
  return {
    limites: { 1: 90, 2: 120, 3: 150 }, // segundos de referencia por nivel (bonificación por tiempo)
    secuencias: [
      { id: "s1", nivel: 1, titulo: "Del Grito a la Alhóndiga",
        eventos: [
          E("s1a", 18100916, "16 de septiembre de 1810", "Grito de Dolores", "Miguel Hidalgo convoca al pueblo de Dolores a levantarse en armas."),
          E("s1b", 18100928, "28 de septiembre de 1810", "Toma de la Alhóndiga de Granaditas", "Los insurgentes toman el edificio de Guanajuato donde se refugiaron los realistas."),
          E("s1c", 18101030, "30 de octubre de 1810", "Batalla del Monte de las Cruces", "Los insurgentes vencen a fuerzas realistas y quedan cerca de la Ciudad de México."),
          E("s1d", 18110730, "30 de julio de 1811", "Fusilamiento de Miguel Hidalgo", "Tras ser capturado en Coahuila, Hidalgo es ejecutado en Chihuahua.")
        ],
        explicacion: "Todo empezó con el Grito de Dolores (16 de septiembre). Doce días después los insurgentes tomaron la Alhóndiga, y a fines de octubre vencieron en el Monte de las Cruces. En 1811 Hidalgo fue capturado y fusilado, pero la lucha continuó." },
      { id: "s2", nivel: 1, titulo: "Documentos de la Independencia",
        eventos: [
          E("s2a", 18130914, "14 de septiembre de 1813", "Sentimientos de la Nación", "Morelos presenta sus ideas ante el Congreso reunido en Chilpancingo."),
          E("s2b", 18141022, "22 de octubre de 1814", "Constitución de Apatzingán", "El Congreso insurgente promulga el Decreto Constitucional para la Libertad de la América Mexicana."),
          E("s2c", 18210224, "24 de febrero de 1821", "Plan de Iguala", "Se proclaman las tres garantías: Religión, Independencia y Unión."),
          E("s2d", 18210928, "28 de septiembre de 1821", "Acta de Independencia", "Se declara la independencia del Imperio Mexicano.")
        ],
        explicacion: "Los documentos muestran cómo maduró la idea de nación: los Sentimientos (1813), la primera constitución insurgente (1814), el Plan de Iguala que unió a insurgentes y realistas (febrero de 1821) y, por último, el Acta que declaró la independencia (septiembre de 1821)." },
      { id: "s3", nivel: 2, titulo: "La guerra insurgente",
        eventos: [
          E("s3a", 18100916, "16 de septiembre de 1810", "Grito de Dolores", "Inicia el levantamiento encabezado por Miguel Hidalgo."),
          E("s3b", 18110117, "17 de enero de 1811", "Batalla de Puente de Calderón", "El ejército realista de Calleja derrota a los insurgentes cerca de Guadalajara."),
          E("s3c", 18110321, "21 de marzo de 1811", "Captura de los jefes insurgentes", "Hidalgo, Allende y otros son capturados en Acatita de Baján, Coahuila."),
          E("s3d", 18120219, "Febrero a mayo de 1812", "Cerco de Cuautla", "Morelos resiste el sitio realista durante más de dos meses."),
          E("s3e", 18151222, "22 de diciembre de 1815", "Fusilamiento de Morelos", "Morelos es ejecutado en San Cristóbal Ecatepec.")
        ],
        explicacion: "Después del Grito, la derrota de Puente de Calderón (enero de 1811) y la captura de los primeros jefes (marzo de 1811) debilitaron al movimiento. Morelos lo continuó desde el sur: resistió en Cuautla (1812) y fue fusilado en 1815." },
      { id: "s4", nivel: 2, titulo: "De la crisis de 1808 al Congreso de Chilpancingo",
        eventos: [
          E("s4a", 18080505, "Mayo de 1808", "Abdicaciones de Bayona", "Napoleón obliga a la familia real española a ceder la Corona; España queda sin rey legítimo."),
          E("s4b", 18080915, "15 de septiembre de 1808", "Golpe contra el virrey Iturrigaray", "Un grupo de peninsulares depone al virrey, que había aceptado reunir una junta."),
          E("s4c", 18100916, "16 de septiembre de 1810", "Grito de Dolores", "Hidalgo llama a la lucha armada."),
          E("s4d", 18120319, "19 de marzo de 1812", "Constitución de Cádiz", "Las Cortes españolas aprueban una constitución para todos los territorios de la monarquía."),
          E("s4e", 18130914, "14 de septiembre de 1813", "Congreso de Chilpancingo", "Morelos instala el Congreso de Anáhuac y presenta los Sentimientos de la Nación.")
        ],
        explicacion: "La crisis de la monarquía española en 1808 abrió el debate sobre quién debía gobernar. En 1810 estalló la guerra; en 1812 las Cortes de Cádiz aprobaron su constitución y en 1813 los insurgentes se organizaron políticamente en Chilpancingo." },
      { id: "s5", nivel: 3, titulo: "La consumación de la Independencia",
        eventos: [
          E("s5a", 18210210, "10 de febrero de 1821", "Abrazo de Acatempan", "Iturbide y Guerrero sellan su alianza."),
          E("s5b", 18210224, "24 de febrero de 1821", "Plan de Iguala", "Se proclaman Religión, Independencia y Unión."),
          E("s5c", 18210824, "24 de agosto de 1821", "Tratados de Córdoba", "Iturbide y O'Donojú acuerdan reconocer la independencia."),
          E("s5d", 18210927, "27 de septiembre de 1821", "Entrada del Ejército Trigarante", "El ejército entra a la Ciudad de México."),
          E("s5e", 18210928, "28 de septiembre de 1821", "Acta de Independencia", "Se declara la independencia del Imperio Mexicano."),
          E("s5f", 18241004, "4 de octubre de 1824", "Constitución Federal", "Se promulga la primera constitución de la república federal.")
        ],
        explicacion: "Los acuerdos de 1821 se encadenaron: primero la alianza (Acatempan), luego el plan (Iguala), el reconocimiento (Córdoba), la entrada a la capital y el Acta, un día después. En 1824, con la Constitución, México se organizó como república federal." },
      { id: "s6", nivel: 3, titulo: "De la conspiración a la consumación",
        eventos: [
          E("s6a", 18100913, "13 al 15 de septiembre de 1810", "Se descubre la conspiración de Querétaro", "Las autoridades se enteran de los planes y los conspiradores reciben aviso."),
          E("s6b", 18100916, "16 de septiembre de 1810", "Grito de Dolores", "Hidalgo convoca al pueblo."),
          E("s6c", 18130914, "14 de septiembre de 1813", "Sentimientos de la Nación", "Morelos expone sus ideas en Chilpancingo."),
          E("s6d", 18141022, "22 de octubre de 1814", "Constitución de Apatzingán", "El Congreso insurgente promulga su decreto constitucional."),
          E("s6e", 18210224, "24 de febrero de 1821", "Plan de Iguala", "Iturbide y Guerrero proponen una independencia con tres garantías."),
          E("s6f", 18210928, "28 de septiembre de 1821", "Acta de Independencia", "Se declara la independencia.")
        ],
        explicacion: "El Grito fue consecuencia directa del descubrimiento de la conspiración de Querétaro. Los años siguientes dieron forma política al movimiento (1813-1814) hasta el Plan de Iguala y el Acta de 1821." }
    ]
  };
});
