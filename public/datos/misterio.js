/* datos/misterio.js — casos de "El misterio histórico".
   IMPORTANTE: cada documento lleva "tipo": "hecho" (documentado), "tradicion" (relato popular no plenamente comprobado)
   o "ficcion" (inventado para el juego). La interfaz muestra esa etiqueta siempre.
   Caso: id · titulo · modos ["coop","comp"] · intro · aviso · capitulos · finales
   Capítulo: titulo · escena · docs [{id,tipo,titulo,texto,nota}] · pregunta · decision (solo en el último capítulo) */
(function (raiz, fabrica) {
  const d = fabrica();
  if (typeof module === "object" && module.exports) module.exports = d;
  else (raiz.Datos = raiz.Datos || {}).misterio = d;
})(typeof self !== "undefined" ? self : this, function () {
  const D = (id, tipo, titulo, texto, nota) => ({ id, tipo, titulo, texto, nota });
  return {
    casos: [
      { id: "corregidora", titulo: "El mensaje de la Corregidora", modos: ["comp", "coop"], dificultad: "Fácil",
        intro: "Querétaro, septiembre de 1810. Eres Tomás, aprendiz de escribano. Un pliego sin firma apareció entre los papeles de tu maestro y quieres saber qué dice sobre los planes de unos conspiradores.",
        aviso: "Tomás, su maestro y los documentos marcados como «Ficción» son inventados para el juego. Los hechos de fondo —la conspiración de Querétaro y el Grito de Dolores— sí ocurrieron.",
        capitulos: [
          { titulo: "La carta sin firma", escena: "En la escribanía hay tres papeles sobre la mesa. Examina los documentos antes de responder.",
            docs: [
              D("c1a", "ficcion", "Pliego sin firma", "«Han descubierto lo de las reuniones. Quien manda en la ciudad debe ordenar los registros de casas esta semana.»", "Documento inventado para el juego."),
              D("c1b", "hecho", "Nota histórica: la conspiración", "En 1809 y 1810 se reunieron en Querétaro, y en otros lugares, personas que querían cambiar el gobierno colonial. En septiembre de 1810 las autoridades recibieron denuncias sobre esos planes.", "Hecho documentado."),
              D("c1c", "hecho", "Nota histórica: el corregidor", "El corregidor de Querétaro era Miguel Domínguez, casado con Josefa Ortiz. El corregidor era la autoridad local de la ciudad y tenía a su cargo cumplir órdenes de registros y detenciones.", "Hecho documentado.")
            ],
            pregunta: { tipo: "opciones", texto: "Según tus documentos, ¿qué autoridad local de Querétaro debía ordenar los registros de casas?",
              opciones: ["El corregidor", "El arzobispo de México", "El rey de España en persona", "El capitán de un barco"], correcta: 0, requiere: ["c1a", "c1c"],
              pista: "Revisa la nota sobre Miguel Domínguez: ¿qué cargo tenía?",
              explicacion: "El corregidor era la autoridad local. Miguel Domínguez ocupaba ese cargo en Querétaro, y su esposa, Josefa Ortiz, apoyaba a los conspiradores." } },
          { titulo: "El aviso que cruzó la noche", escena: "El pliego tiene una segunda parte escrita con una pista. Compara los documentos con cuidado.",
            docs: [
              D("c2a", "ficcion", "Billete cifrado", "«La campana que despierta al pueblo está en la parroquia donde sirve el cura. Ve al pueblo que lleva el nombre de sus penas.»", "Documento inventado para el juego. Es un acertijo."),
              D("c2b", "hecho", "Nota histórica: el aviso", "Cuando la conspiración fue descubierta, se avisó a los jefes insurgentes. Se sabe que Ignacio Pérez llevó el mensaje desde Querétaro hacia San Miguel el Grande y Dolores.", "Hecho documentado: los historiadores coinciden en que el aviso se envió, aunque algunos detalles se discuten."),
              D("c2c", "tradicion", "La tradición de los golpes", "Se cuenta que Josefa Ortiz, encerrada en su casa, golpeó el piso con el zapato para llamar al alcaide Ignacio Pérez y darle el aviso.", "Tradición: es un relato muy popular, pero sus detalles no están plenamente comprobados.")
            ],
            pregunta: { tipo: "texto", texto: "Resuelve el acertijo del billete: ¿a qué pueblo debes ir? (escribe una palabra)", respuestas: ["dolores"], requiere: ["c2a"],
              pista: "El cura de esa parroquia fue Miguel Hidalgo. ¿Cómo se llamaba su pueblo? Es el nombre de sus «penas».",
              explicacion: "El pueblo es Dolores, en Guanajuato, donde era cura Miguel Hidalgo. Allí se tocó la campana de la parroquia al amanecer del 16 de septiembre de 1810." } },
          { titulo: "La madrugada del 16", escena: "Tomás llega a Dolores con el último documento. Prepara la respuesta final y decide qué hacer con lo que sabes.",
            docs: [
              D("c3a", "ficcion", "Testimonio de un vecino", "«Antes del amanecer sonó la campana y la gente se juntó frente a la parroquia. Nadie sabía bien qué iba a pasar.»", "Testimonio inventado para el juego, inspirado en el hecho real."),
              D("c3b", "hecho", "Nota histórica: el Grito", "Miguel Hidalgo convocó al pueblo de Dolores en la madrugada del 16 de septiembre de 1810. Ese día se considera el inicio de la guerra de Independencia.", "Hecho documentado.")
            ],
            pregunta: { tipo: "opciones", texto: "¿En qué fecha se dio el Grito de Dolores?",
              opciones: ["16 de septiembre de 1810", "15 de septiembre de 1821", "5 de mayo de 1862", "20 de noviembre de 1910"], correcta: 0, requiere: ["c3b"],
              pista: "Es la fecha que se celebra como inicio de la Independencia.",
              explicacion: "El Grito ocurrió en la madrugada del 16 de septiembre de 1810. La ceremonia moderna se hace la noche del 15." },
            decision: { texto: "Tomás tiene el pliego en la mano. ¿Qué hace? (Es una decisión de ficción: la historia real no cambia.)",
              opciones: [
                { texto: "Corre a avisar a la gente de Dolores", final: "mensajero", puntos: 30 },
                { texto: "Entrega el pliego al corregidor", final: "escribano", puntos: 10 },
                { texto: "Lo guarda y no dice nada", final: "silencio", puntos: 0 }
              ] } }
        ],
        finales: [
          { id: "mensajero", titulo: "Final: El mensajero", texto: "Tomás llega a tiempo para sumarse a la multitud frente a la parroquia. Es un final ficticio: el Grito ocurrió con o sin él." },
          { id: "escribano", titulo: "Final: El escribano prudente", texto: "Tomás entrega el pliego y vuelve a su oficio. Es un final ficticio: la guerra comenzó de todos modos." },
          { id: "silencio", titulo: "Final: El silencio", texto: "Tomás guarda el papel en un cajón. Años después, un historiador lo encuentra. Es un final ficticio." }
        ] },
      { id: "trigarante", titulo: "Los colores de la bandera trigarante", modos: ["coop"], dificultad: "Intermedio",
        intro: "Iguala, febrero de 1821. Eres Soledad, ayudante de un sastre. Te piden coser una bandera con tres colores, pero nadie te explica qué significan. Debes descubrirlo investigando.",
        aviso: "Soledad y los documentos marcados como «Ficción» son inventados. El Plan de Iguala, el Ejército Trigarante y el significado de los colores son hechos históricos.",
        capitulos: [
          { titulo: "El pedido del taller", escena: "En el taller llegan tres papeles. Lee con atención para saber qué debes coser.",
            docs: [
              D("t1a", "ficcion", "Encargo del sastre", "«Tres bandas: una blanca, una verde y una roja. Cada una representa una promesa. Averigua cuál.»", "Documento inventado para el juego."),
              D("t1b", "hecho", "Nota histórica: el Plan de Iguala", "El Plan de Iguala se proclamó el 24 de febrero de 1821. Tenía tres garantías: Religión, Independencia y Unión.", "Hecho documentado."),
              D("t1c", "hecho", "Nota histórica: el Ejército Trigarante", "El ejército se llamó Trigarante, o de las Tres Garantías, porque se comprometía a defender esos tres principios.", "Hecho documentado.")
            ],
            pregunta: { tipo: "opciones", texto: "¿Cuáles eran las tres garantías del Plan de Iguala?",
              opciones: ["Religión, Independencia y Unión", "Tierra, Libertad y Justicia", "Orden, Progreso y Paz", "Libertad, Igualdad y Fraternidad"], correcta: 0, requiere: ["t1b"],
              pista: "El nombre «trigarante» viene de «tres garantías».",
              explicacion: "Las tres garantías fueron Religión, Independencia y Unión." } },
          { titulo: "El color de cada promesa", escena: "Ahora debes decidir qué color corresponde a cada garantía.",
            docs: [
              D("t2a", "hecho", "Nota histórica: los colores", "En la bandera trigarante, el blanco simbolizaba la Religión, el verde la Independencia y el rojo la Unión.", "Hecho documentado."),
              D("t2b", "ficcion", "Nota de Soledad", "«Si me equivoco de hilo, el sastre me regaña. Necesito saber qué color va con la Independencia.»", "Documento inventado para el juego.")
            ],
            pregunta: { tipo: "texto", texto: "¿Qué color simbolizaba la Independencia? (escribe una palabra)", respuestas: ["verde"], requiere: ["t2a"],
              pista: "Es el mismo color que está en el centro de la bandera actual.",
              explicacion: "El verde representaba la Independencia. El blanco, la Religión; y el rojo, la Unión." } },
          { titulo: "El abrazo", escena: "Soledad escucha a los soldados hablar de un encuentro importante. Une los datos y decide cómo contar lo que sabe.",
            docs: [
              D("t3a", "hecho", "Nota histórica: Acatempan", "El 10 de febrero de 1821, Agustín de Iturbide y Vicente Guerrero se encontraron en Acatempan. Su alianza permitió formar el Ejército Trigarante.", "Hecho documentado."),
              D("t3b", "ficcion", "Conversación de unos soldados", "«Dicen que el jefe realista y el jefe del sur se dieron un abrazo, y que por eso ahora marchamos juntos.»", "Conversación inventada para el juego.")
            ],
            pregunta: { tipo: "opciones", texto: "¿Quiénes se encontraron en Acatempan en febrero de 1821?",
              opciones: ["Iturbide y Guerrero", "Hidalgo y Allende", "Morelos y Matamoros", "Mina y Victoria"], correcta: 0, requiere: ["t3a"],
              pista: "Uno había combatido a los insurgentes y el otro era jefe insurgente del sur.",
              explicacion: "Fue el Abrazo de Acatempan, entre Iturbide y Guerrero." },
            decision: { texto: "Soledad termina la bandera. ¿Cómo explica su significado al taller? (Decisión de ficción.)",
              opciones: [
                { texto: "Cuenta las tres garantías con cada color", final: "maestra", puntos: 30 },
                { texto: "Solo dice que es una bandera nueva", final: "costurera", puntos: 5 }
              ] } }
        ],
        finales: [
          { id: "maestra", titulo: "Final: La que explicó los colores", texto: "Soledad enseña a sus compañeros qué significa cada color. Es un final ficticio; los significados son históricos." },
          { id: "costurera", titulo: "Final: La costurera callada", texto: "Soledad termina su trabajo sin hablar. Es un final ficticio." }
        ] }
    ]
  };
});
