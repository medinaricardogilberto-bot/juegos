/* datos/sopa.js — vocabulario de la Sopa de letras, por categoría.
   t: palabra tal como se escribe en el tablero (MAYÚSCULAS, sin acentos ni espacios) · m: cómo se muestra · d: definición breve.
   Para ampliar: añade palabras a una categoría (o crea otra categoría nueva). */
(function (raiz, fabrica) {
  const d = fabrica();
  if (typeof module === "object" && module.exports) module.exports = d;
  else (raiz.Datos = raiz.Datos || {}).sopa = d;
})(typeof self !== "undefined" ? self : this, function () {
  const W = (t, m, d) => ({ t, m, d });
  return {
    categorias: { personajes: "Personajes", lugares: "Lugares", conceptos: "Conceptos", mezcla: "Mezcla de temas" },
    bancos: {
      personajes: [
        W("HIDALGO", "Hidalgo", "Cura de Dolores que inició la lucha en 1810."),
        W("ALLENDE", "Allende", "Capitán de dragones y jefe militar insurgente."),
        W("ALDAMA", "Aldama", "Capitán insurgente nacido en San Miguel el Grande."),
        W("ABASOLO", "Abasolo", "Capitán del primer movimiento; murió preso en Cádiz."),
        W("MORELOS", "Morelos", "Sacerdote y jefe insurgente; autor de los Sentimientos de la Nación."),
        W("MATAMOROS", "Matamoros", "Capitán de Morelos, vencido en Puruarán."),
        W("GUERRERO", "Guerrero", "Jefe insurgente del sur; segundo presidente de México."),
        W("ITURBIDE", "Iturbide", "Jefe del Ejército Trigarante."),
        W("VICARIO", "Vicario", "Leona Vicario, apoyo de la insurgencia desde la capital."),
        W("BRAVO", "Bravo", "Nicolás Bravo, insurgente de Chilpancingo."),
        W("VICTORIA", "Victoria", "Guadalupe Victoria, primer presidente de México."),
        W("RAYON", "Rayón", "Ignacio López Rayón, abogado y jefe de la Junta de Zitácuaro."),
        W("MINA", "Mina", "Francisco Javier Mina, expedicionario liberal de 1817."),
        W("GALEANA", "Galeana", "Hermenegildo Galeana, capitán de Morelos."),
        W("CALLEJA", "Calleja", "Jefe realista vencedor en Puente de Calderón."),
        W("CORREGIDORA", "Corregidora", "Apodo de Josefa Ortiz de Domínguez.")
      ],
      lugares: [
        W("DOLORES", "Dolores", "Pueblo de Guanajuato donde se dio el Grito."),
        W("QUERETARO", "Querétaro", "Ciudad donde se organizó la conspiración de 1810."),
        W("GUANAJUATO", "Guanajuato", "Ciudad de la Alhóndiga de Granaditas."),
        W("CHILPANCINGO", "Chilpancingo", "Sede del Congreso de Anáhuac en 1813."),
        W("APATZINGAN", "Apatzingán", "Lugar donde se promulgó la constitución insurgente de 1814."),
        W("IGUALA", "Iguala", "Ciudad donde se proclamó el Plan de 1821."),
        W("CORDOBA", "Córdoba", "Ciudad veracruzana de los Tratados de 1821."),
        W("CUAUTLA", "Cuautla", "Ciudad que resistió el cerco de 1812."),
        W("ZITACUARO", "Zitácuaro", "Sede de la Suprema Junta Nacional Americana."),
        W("CHIHUAHUA", "Chihuahua", "Ciudad donde fueron fusilados Hidalgo y Allende."),
        W("VALLADOLID", "Valladolid", "Antiguo nombre de Morelia."),
        W("ACATEMPAN", "Acatempan", "Pueblo del abrazo entre Iturbide y Guerrero."),
        W("CALDERON", "Calderón", "Puente donde fueron derrotados los insurgentes en 1811."),
        W("ALHONDIGA", "Alhóndiga", "Almacén de granos de Guanajuato tomado en 1810.")
      ],
      conceptos: [
        W("INDEPENDENCIA", "Independencia", "Libertad de un país frente a otro que lo gobernaba."),
        W("LIBERTAD", "Libertad", "Derecho a decidir y actuar sin sometimiento."),
        W("INSURGENTE", "Insurgente", "Quien se levantó en armas contra el gobierno virreinal."),
        W("REALISTA", "Realista", "Partidario de la Corona española."),
        W("VIRREINATO", "Virreinato", "Territorio gobernado por un virrey en nombre del rey."),
        W("ESCLAVITUD", "Esclavitud", "Sistema que privaba de libertad a las personas."),
        W("CONSTITUCION", "Constitución", "Ley fundamental de un país."),
        W("TRIGARANTE", "Trigarante", "De las tres garantías del Plan de Iguala."),
        W("ESTANDARTE", "Estandarte", "Bandera de un ejército o grupo."),
        W("CAMPANA", "Campana", "Se tocó en Dolores para convocar al pueblo."),
        W("GRITO", "Grito", "Llamado a la lucha del 16 de septiembre de 1810."),
        W("CRIOLLO", "Criollo", "Persona de ascendencia española nacida en América."),
        W("PENINSULAR", "Peninsular", "Español nacido en la península ibérica."),
        W("CONSPIRACION", "Conspiración", "Plan secreto de varias personas."),
        W("REPUBLICA", "República", "Forma de gobierno sin rey."),
        W("GARANTIAS", "Garantías", "Principios que el Plan de Iguala aseguraba."),
        W("UNION", "Unión", "Una de las tres garantías."),
        W("RELIGION", "Religión", "Una de las tres garantías."),
        W("SENTIMIENTOS", "Sentimientos", "Documento que Morelos presentó en 1813.")
      ]
    },
    niveles: {
      facil:      { tam: 10, palabras: 7,  dirs: [[0, 1], [1, 0]],                                        nombre: "Fácil (10×10)" },
      intermedia: { tam: 12, palabras: 9,  dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]],                      nombre: "Intermedia (12×12)" },
      dificil:    { tam: 14, palabras: 12, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], nombre: "Difícil (14×14)" }
    }
  };
});
