/**
 * ejemploGuionART.js (Release 1.11.0 — §7 guion de ejemplo ART)
 *
 * Fuente literal: `Guion_interactivo_AppSeguimiento_ART.md` (raíz del repo).
 * El contenido de speeches, respuestas sugeridas y reglas se transcribe del
 * documento; los textos de las opciones se abrevian solo para que quepan como
 * botones, sin cambiar el sentido.
 *
 * Decisiones:
 * - IDs deterministas (`art-e1…art-e8`, `art-est-1…art-est-9`,
 *   `art-obj-1…art-obj-12`, etc.) para que crear el ejemplo dos veces en
 *   instalaciones distintas produzca el mismo grafo y para que el seed sea
 *   idempotente por id.
 * - `crearEjemploART()` devuelve una copia profunda con fechas actuales: el
 *   llamador puede mutarla sin tocar la constante del módulo.
 * - Se carga SOLO desde el botón del estado vacío (nunca automático ni
 *   duplicado). Las 12 objeciones se exportan aparte en
 *   `OBJECIONES_EJEMPLO_ART` para fusionarlas sin sobrescribir las del usuario.
 * - `validarSpeech(crearEjemploART())` debe devolver [] (test §7).
 */

/** Opción con TODOS los campos v2, para que la validación no falle. */
const op = (id, texto, extra = {}) => ({
  id,
  texto,
  targetStepId: null,
  orden: 0,
  respuestaSugerida: "",
  accion: "",
  datosARegistrar: "",
  asignaciones: [],
  requiereAclaracion: false,
  finalizaLlamada: false,
  estadoFinalId: null,
  moduloId: null,
  ...extra,
});

/** Pregunta v2 con opciones anidadas. */
const pr = (id, texto, opciones = [], extra = {}) => ({
  id,
  texto,
  obligatoria: false,
  opciones,
  ...extra,
});

/** Campo de registro (§3) con los 8 tipos del modelo. */
const campo = (id, nombre, tipo, extra = {}) => ({
  id,
  nombre,
  tipo,
  obligatorio: false,
  opciones: [],
  ...extra,
});

const LESIONES = [
  "Lesión traumatológica",
  "Lesión muscular",
  "Lesión en columna o espalda",
  "Lesión en brazo, mano u hombro",
  "Lesión en pierna, rodilla o pie",
  "Otra lesión",
  "No sabe cómo describirla",
];

const ESTUDIOS = ["Estudio A — Zona Norte", "Estudio B — Zona Sur", "Estudio C — CABA"];

const base = {
  id: "art-ejemplo",
  nombre: "Asistente de llamadas ART (ejemplo)",
  descripcion:
    "Guion operativo de ingreso a ART: presentación, lesión, derechos, asesoramiento y derivación a un estudio.",
  archivado: false,
  version: 2,
  startStepId: "art-e1",
  estadosFinales: [
    { id: "art-est-1", nombre: "Derivación coordinada" },
    { id: "art-est-2", nombre: "Interesado, pendiente de horario" },
    { id: "art-est-3", nombre: "Interesado, pendiente de asignación de estudio" },
    { id: "art-est-4", nombre: "Solicita seguimiento posterior" },
    { id: "art-est-5", nombre: "Ya cuenta con abogado" },
    { id: "art-est-6", nombre: "No desea derivación" },
    { id: "art-est-7", nombre: "No desea nuevos contactos" },
    { id: "art-est-8", nombre: "Llamada interrumpida" },
    { id: "art-est-9", nombre: "No contesta / número no disponible" },
  ],
  reglas: [
    "No registrar una derivación como confirmada si el trabajador no aceptó expresamente.",
    "No asignar un estudio sin confirmar que atiende la localidad.",
    "No inventar disponibilidad horaria.",
    "No asegurar que existe una indemnización.",
    "No asegurar que el abogado es obligatorio en todos los casos.",
    "No garantizar que nunca habrá gastos: las condiciones deben estar confirmadas por el estudio.",
    "No garantizar que el empleador nunca se enterará ni que no habrá consecuencias laborales.",
    "No insistir cuando el trabajador rechaza la propuesta.",
    "Mantener el texto del speech editable desde la aplicación, para poder actualizarlo sin modificar la lógica del asistente.",
  ],
  modulos: [
    {
      id: "art-mod-objeciones",
      tipo: "objeciones",
      titulo: "Módulos transversales. Objeciones.",
    },
    {
      id: "art-mod-inconvenientes",
      tipo: "inconvenientes",
      titulo: "Inconvenientes con la ART",
    },
    {
      id: "art-mod-dinerarias",
      tipo: "prestaciones",
      titulo: "Prestaciones dinerarias",
    },
  ],
  steps: [
    // ---------------------------------------------------------------- E1
    {
      id: "art-e1",
      titulo: "Presentación",
      objetivo:
        "Identificarse, explicar por qué se realiza el llamado y generar un marco de confianza sin extenderse demasiado.",
      orden: 0,
      contenido: `Hola, mi nombre es (NOMBRE). Me comunico por el ingreso a la ART que realizaste a raíz del accidente laboral que tuviste.

Te cuento brevemente: a nosotros nos llegan ingresos de trabajadores de distintas partes del país y, según la lesión y el tiempo de tratamiento, les explicamos cuáles son sus derechos y cómo manejarse con la empresa, la ART y los estudios jurídicos.

Para poder orientarte mejor, te consulto: ¿qué lesión tuviste?`,
      preguntas: [
        pr("art-e1-p1", "", [
          op("art-e1-o1", "El trabajador explica la lesión.", {
            accion: "Registrar lo que menciona y avanzar a la etapa 2.",
            targetStepId: "art-e2",
            asignaciones: [
              { campoId: "art-e1-c3", valor: "Continúa" },
            ],
          }),
          op("art-e1-o2", "No recuerda o no sabe describirla.", {
            respuestaSugerida:
              "No hay problema. Contame con tus palabras qué te pasó o qué parte del cuerpo te afectó.",
            accion:
              "Registrar la descripción textual, sin exigir términos médicos.",
            targetStepId: "art-e2",
            asignaciones: [
              { campoId: "art-e1-c3", valor: "Continúa" },
            ],
          }),
          op("art-e1-o3", "Pregunta quién llama o de dónde obtuvieron sus datos.", {
            respuestaSugerida:
              "Te llamo por el ingreso a ART relacionado con el accidente laboral. Si querés, primero te explico brevemente cuál es el motivo de nuestro contacto y después decidís si te interesa continuar.",
            accion:
              "Explicar el motivo con claridad. Si no desea continuar, cerrar cordialmente.",
            targetStepId: "art-e2",
            asignaciones: [
              { campoId: "art-e1-c3", valor: "Continúa" },
            ],
          }),
          op("art-e1-o4", "El trabajador está ocupado.", {
            respuestaSugerida:
              "Está bien, no hay problema. ¿Preferís que intentemos comunicarnos en otro momento?",
            accion: "Registrar horario solicitado o resultado de llamada.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-4",
            asignaciones: [
              { campoId: "art-e1-c3", valor: "Solicita otro horario" },
            ],
          }),
          op("art-e1-o5", "El trabajador no quiere hablar.", {
            respuestaSugerida:
              "Entiendo, no hay problema. Gracias por atender. Que tengas una buena tarde.",
            accion:
              "Finalizar sin insistir y registrar que no desea continuar.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-7",
            asignaciones: [
              { campoId: "art-e1-c3", valor: "No desea continuar" },
            ],
          }),
        ]),
      ],
      camposRegistro: [
        campo("art-e1-c1", "Lesión mencionada", "texto-corto"),
        campo("art-e1-c2", "Descripción libre", "texto-largo"),
        campo("art-e1-c3", "Resultado de la presentación", "seleccion-unica", {
          opciones: ["Continúa", "Solicita otro horario", "No desea continuar"],
        }),
      ],
    },

    // ---------------------------------------------------------------- E2
    {
      id: "art-e2",
      titulo: "Identificación de la lesión",
      objetivo:
        "Conocer la lesión de manera general y, si el trabajador puede precisarlo, identificar la zona afectada. No convertir la llamada en un interrogatorio médico.",
      orden: 1,
      contenido:
        "Conocer la lesión de manera general y, si el trabajador puede precisarlo, identificar la zona afectada. No convertir la llamada en un interrogatorio médico.",
      preguntas: [
        pr(
          "art-e2-p1",
          "¿Qué lesión tuviste?",
          LESIONES.map((lesion, i) =>
            op(`art-e2-o1-${i + 1}`, lesion, {
              asignaciones: [{ campoId: "art-e2-c1", valor: lesion }],
            })
          )
        ),
        pr("art-e2-p2", "¿Actualmente seguís en tratamiento o ya te dieron el alta?", [
          op("art-e2-o2-1", "Continúa en tratamiento.", {
            accion: 'Registrar "En tratamiento".',
            asignaciones: [
              { campoId: "art-e2-c3", valor: "En tratamiento" },
            ],
          }),
          op("art-e2-o2-2", "Ya finalizó el tratamiento.", {
            accion: 'Registrar "Tratamiento finalizado".',
            asignaciones: [
              { campoId: "art-e2-c3", valor: "Tratamiento finalizado" },
            ],
          }),
          op("art-e2-o2-3", "Todavía no recibió atención.", {
            accion:
              'Registrar "Sin atención médica" y considerar el módulo de inconvenientes con ART.',
            moduloId: "art-mod-inconvenientes",
            asignaciones: [
              { campoId: "art-e2-c3", valor: "Sin atención médica" },
            ],
          }),
          op("art-e2-o2-4", "No sabe / no recuerda.", {
            accion: 'Registrar "No sabe".',
            asignaciones: [{ campoId: "art-e2-c3", valor: "No sabe" }],
          }),
        ]),
        pr("art-e2-p3", "¿Ya te dieron el alta médica?", [
          op("art-e2-o3-1", "Sí.", {
            asignaciones: [{ campoId: "art-e2-c4", valor: "Sí" }],
          }),
          op("art-e2-o3-2", "No.", {
            asignaciones: [{ campoId: "art-e2-c4", valor: "No" }],
          }),
          op("art-e2-o3-3", "No sabe.", {
            asignaciones: [{ campoId: "art-e2-c4", valor: "No sabe" }],
          }),
        ]),
      ],
      camposRegistro: [
        campo("art-e2-c1", "Tipo de lesión", "seleccion-unica", {
          opciones: LESIONES,
        }),
        campo("art-e2-c2", "Zona afectada", "texto-corto"),
        campo("art-e2-c3", "Situación del tratamiento", "seleccion-unica", {
          opciones: [
            "En tratamiento",
            "Tratamiento finalizado",
            "Sin atención médica",
            "No sabe",
          ],
        }),
        campo("art-e2-c4", "Alta médica", "seleccion-unica", {
          opciones: ["Sí", "No", "No sabe"],
        }),
        campo("art-e2-c5", "Observaciones del operador", "observaciones"),
      ],
    },

    // ---------------------------------------------------------------- E3
    {
      id: "art-e3",
      titulo: "Explicación de la ART",
      objetivo:
        "Explicar de forma sencilla qué es la ART y consultar si el trabajador está recibiendo la atención correspondiente.",
      orden: 2,
      contenido: `Bien, te explico. La ART es un seguro que tu empleador tiene contratado para cubrir los accidentes laborales.

Mientras estés en tratamiento, la ART tiene que hacerse cargo de las prestaciones médicas que necesites para recuperarte, como consultas, estudios, medicamentos, rehabilitación y traslados cuando correspondan.

También tiene obligaciones respecto de tus ingresos durante el período de incapacidad laboral, según corresponda.

Te consulto, ¿hasta ahora la ART te está brindando toda la atención que necesitás o tuviste algún inconveniente?`,
      preguntas: [
        pr(
          "art-e3-p1",
          "¿Hasta ahora la ART te está brindando toda la atención que necesitás o tuviste algún inconveniente?",
          [
            op("art-e3-o1", "Está recibiendo atención sin inconvenientes.", {
              respuestaSugerida:
                "Bueno, perfecto. Lo importante es que puedas continuar con tu tratamiento y recuperarte bien. De todas maneras, hay algunas cuestiones sobre tus derechos que es importante que conozcas, incluso si hasta ahora la ART está cumpliendo correctamente.",
              accion: "Continuar a la etapa 4.",
              targetStepId: "art-e4",
            }),
            op("art-e3-o2", "Tiene problemas con la atención médica.", {
              respuestaSugerida:
                "Entiendo. ¿Qué inconveniente estás teniendo con la atención? ¿Tiene que ver con los turnos, los estudios, el tratamiento o con alguna otra cuestión?",
              accion:
                "Registrar el problema y abrir el módulo de inconvenientes médicos. Luego, si el trabajador acepta, volver al recorrido principal.",
              targetStepId: "art-e4",
              moduloId: "art-mod-inconvenientes",
            }),
            op("art-e3-o3", "La ART demora los turnos o estudios.", {
              respuestaSugerida:
                "Entiendo. ¿Qué es lo que está demorado: un turno, un estudio o la continuidad del tratamiento?",
              accion:
                "Registrar qué prestación está demorada y desde cuándo, si el trabajador lo sabe. No prometer una solución.",
              targetStepId: "art-e4",
              moduloId: "art-mod-inconvenientes",
            }),
            op("art-e3-o4", "La ART rechazó el accidente o la lesión.", {
              respuestaSugerida:
                "Entiendo. ¿Te informaron que rechazaban el accidente o que no reconocían alguna lesión en particular?",
              accion:
                "Registrar qué fue rechazado y si recibió una notificación. Derivar la consulta específica al profesional correspondiente, sin adelantar una conclusión legal.",
              targetStepId: "art-e4",
            }),
            op("art-e3-o5", "No está cobrando correctamente.", {
              respuestaSugerida:
                "Entiendo. ¿El problema es que no estás cobrando, que te están pagando menos de lo que esperabas o que hubo una demora?",
              accion:
                "Registrar la situación y activar el módulo de prestaciones dinerarias.",
              targetStepId: "art-e4",
              moduloId: "art-mod-dinerarias",
            }),
            op("art-e3-o6", "No sabe qué cobertura le corresponde.", {
              respuestaSugerida:
                "Claro, por eso te lo explico. La ART debe cubrir las prestaciones que correspondan por el accidente laboral, tanto médicas como dinerarias cuando se cumplen las condiciones previstas. Si querés, podemos revisar qué situación estás atravesando.",
              accion: "Aclarar dudas generales y continuar.",
              targetStepId: "art-e4",
            }),
            op("art-e3-o7", "No quiere hablar de los problemas.", {
              respuestaSugerida:
                "Está bien, no hace falta que me cuentes algo que no quieras. Te explico entonces cuáles son los derechos que es importante que conozcas.",
              accion: "Continuar sin insistir.",
              targetStepId: "art-e4",
            }),
          ]
        ),
      ],
      camposRegistro: [
        campo("art-e3-c1", "Tipo de inconveniente", "texto-corto"),
        campo("art-e3-c2", "Descripción del trabajador", "texto-largo"),
        campo("art-e3-c3", "Tiempo de demora", "texto-corto"),
        campo("art-e3-c4", "Recibió notificación", "si-no"),
        campo("art-e3-c5", "Observaciones", "observaciones"),
      ],
    },

    // ---------------------------------------------------------------- E4
    {
      id: "art-e4",
      titulo: "Secuelas e indemnización",
      objetivo:
        "Explicar que una lesión puede dejar secuelas y que, si existe una incapacidad laboral permanente, podría corresponder una indemnización. No asegurar que el trabajador cobrará ni estimar importes.",
      orden: 3,
      contenido: `Ahora, hay algo más que quiero explicarte.

Cuando un accidente laboral deja una secuela permanente que afecta tu capacidad de trabajo, puede corresponderte una indemnización económica por parte de la ART.

Esto no significa que cualquier lesión genere automáticamente una indemnización. Para determinarlo, se evalúa cómo evolucionaste, qué secuelas quedaron y si existe una incapacidad laboral permanente.

Por eso es importante que conozcas tus derechos y que tengas asesoramiento durante todo el proceso.

¿Vos sabías que, si te quedan secuelas permanentes por el accidente, podés tener derecho a cobrar una indemnización?`,
      preguntas: [
        pr(
          "art-e4-p1",
          "¿Vos sabías que, si te quedan secuelas permanentes por el accidente, podés tener derecho a cobrar una indemnización?",
          [
            op("art-e4-o1", "No sabía que podía cobrar una indemnización.", {
              respuestaSugerida:
                "Claro, es algo que muchos trabajadores no tienen presente. Por eso te estamos explicando cómo funciona y qué aspectos conviene tener en cuenta. La posibilidad de una indemnización depende de la evaluación de las secuelas y de la incapacidad que pueda determinarse.",
              accion: "Avanzar a la etapa 5.",
              targetStepId: "art-e5",
            }),
            op("art-e4-o2", "Ya estaba informado.", {
              respuestaSugerida:
                "Perfecto. Entonces seguramente ya conocés una parte del tema. Lo importante es que tengas claro cómo se evalúa tu situación y quién puede acompañarte durante el procedimiento.",
              accion: "Avanzar a la etapa 5.",
              targetStepId: "art-e5",
            }),
            op("art-e4-o3", "Quiere saber cuánto le corresponde.", {
              respuestaSugerida:
                "Eso depende de varios factores, como las secuelas que puedan quedar, el porcentaje de incapacidad que se determine y otros datos de tu situación laboral. Sin una evaluación no sería correcto darte un monto. Justamente, un asesoramiento especializado puede ayudarte a entender cómo se determina.",
              accion:
                "No estimar importes. Avanzar a la etapa 5 si acepta.",
              targetStepId: "art-e5",
            }),
            op("art-e4-o4", "La ART le dijo que no le corresponde nada.", {
              respuestaSugerida:
                "Entiendo. ¿Te lo informaron porque todavía estás en tratamiento, porque te dieron el alta o porque ya evaluaron tu incapacidad?",
              accion:
                "Registrar qué le dijeron y en qué instancia está. No contradecir automáticamente a la ART ni asegurar que sí corresponde una indemnización. Ofrecer que consulte su situación con un profesional.",
              targetStepId: "art-e5",
            }),
            op("art-e4-o5", "Todavía está en tratamiento y no sabe.", {
              respuestaSugerida:
                "Claro, es entendible. Mientras seguís en tratamiento todavía hay que ver cómo evoluciona la lesión. Lo importante ahora es que puedas completar la atención médica y que conozcas qué pasos pueden venir después.",
              accion:
                "Avanzar a la etapa 5 sin sugerir que ya tiene una incapacidad definitiva.",
              targetStepId: "art-e5",
            }),
            op("art-e4-o6", "No quiere hablar de indemnización.", {
              respuestaSugerida:
                "Está bien, no hay problema. La idea es que tengas la información y puedas decidir con tranquilidad si querés recibir asesoramiento.",
              accion:
                "Preguntar si desea escuchar cómo funciona el asesoramiento. Si no, respetar su decisión.",
              targetStepId: "art-e5",
            }),
          ]
        ),
      ],
      camposRegistro: [
        campo("art-e4-c1", "Respuesta sobre indemnización", "texto-largo"),
        campo("art-e4-c2", "Interés en asesoramiento", "si-no"),
      ],
    },
    // ---------------------------------------------------------------- E5
    {
      id: "art-e5",
      titulo: "Explicación del asesoramiento jurídico",
      objetivo:
        "Explicar por qué puede ser útil contar con asesoramiento especializado y qué función cumple el abogado durante el procedimiento. Evitar presentar la contratación de un abogado como una obligación si no se verificó que corresponda al caso concreto.",
      orden: 4,
      contenido: `Para entender bien cómo se desarrolla este procedimiento y qué puede corresponderte, es importante contar con asesoramiento de alguien que trabaje específicamente con accidentes laborales.

La intervención de un abogado puede ayudarte a revisar la documentación, entender los pasos del trámite y acompañarte si surge algún inconveniente con la ART o durante la evaluación de una posible incapacidad.

No significa necesariamente que tengas que iniciar un juicio. Muchos de estos trámites se desarrollan en el ámbito administrativo, ante las Comisiones Médicas.

La idea es que puedas conocer tus opciones y tomar una decisión con información clara.`,
      preguntas: [
        pr(
          "art-e5-p1",
          "¿Actualmente estás trabajando con algún abogado o estudio jurídico por este accidente?",
          [
            op("art-e5-o1", "No tiene abogado.", {
              respuestaSugerida:
                "Bien. Si te interesa, podemos comentarte cómo trabaja un estudio especializado y coordinar un contacto informativo para que puedas hacer tus consultas.",
              accion: "Avanzar a la etapa 6.",
              targetStepId: "art-e6",
            }),
            op("art-e5-o2", "Ya tiene abogado.", {
              respuestaSugerida:
                "Perfecto. En ese caso, es importante que puedas continuar con el asesoramiento que ya tenés. No queremos interferir en el trabajo de otro profesional.",
              accion:
                "Registrar que cuenta con representación. No insistir con otra derivación.",
              finalizaLlamada: true,
              estadoFinalId: "art-est-5",
            }),
            op("art-e5-o3", "Está hablando con varios estudios.", {
              respuestaSugerida:
                "Entiendo. Es común que recibas distintos llamados cuando se registra un accidente. Lo importante es que puedas comparar con tranquilidad, entender cómo trabaja cada estudio y elegir con quién te sentís cómodo.",
              accion:
                "Ofrecer información concreta, sin desacreditar a otros estudios.",
              targetStepId: "art-e6",
            }),
            op("art-e5-o4", "No quiere contratar un abogado.", {
              respuestaSugerida:
                "Está bien, es una decisión personal. Mi intención es explicarte qué opciones existen para que puedas decidir con tranquilidad. Si preferís, podemos dejarlo acá.",
              accion: "Respetar la decisión. No presionar.",
              finalizaLlamada: true,
              estadoFinalId: "art-est-6",
            }),
            op("art-e5-o5", "Pregunta si es obligatorio.", {
              respuestaSugerida:
                "Depende del trámite y de la situación concreta. En determinados procedimientos ante las Comisiones Médicas se exige patrocinio letrado. Un profesional puede confirmarte qué corresponde en tu caso.",
              accion:
                "No afirmar que todos los trabajadores necesitan abogado para cualquier gestión.",
              targetStepId: "art-e6",
            }),
            op("art-e5-o6", "Pregunta si tiene que iniciar un juicio.", {
              respuestaSugerida:
                "No necesariamente. Hay procedimientos que se realizan de manera administrativa ante las Comisiones Médicas. El estudio puede explicarte qué instancia corresponde según tu situación.",
              accion: "Avanzar si desea conocer el estudio.",
              targetStepId: "art-e6",
            }),
            op(
              "art-e5-o7",
              "Tiene miedo de que su empleador se entere o lo eche.",
              {
                respuestaSugerida:
                  "Entiendo tu preocupación. Es lógico que quieras cuidar tu trabajo. La consulta con un profesional no significa por sí sola que estés iniciando un juicio contra tu empleador. De todos modos, si te preocupa cómo puede impactar en tu situación laboral, es importante que lo consultes directamente con el abogado antes de avanzar.",
                accion:
                  "No garantizar confidencialidad absoluta ni ausencia de consecuencias. Registrar la inquietud.",
                targetStepId: "art-e6",
              }
            ),
          ]
        ),
      ],
      camposRegistro: [
        campo("art-e5-c1", "Cuenta con abogado", "si-no"),
        campo("art-e5-c2", "Estudio actual", "texto-corto"),
        campo("art-e5-c3", "Inquietud manifestada", "texto-largo"),
      ],
    },

    // ---------------------------------------------------------------- E6
    {
      id: "art-e6",
      titulo: "Presentación del estudio y modalidad de trabajo",
      objetivo:
        "Explicar las características del estudio propuesto, su especialización y la modalidad de honorarios informada por el propio estudio. No prometer resultados ni afirmar condiciones que no hayan sido verificadas.",
      orden: 5,
      contenido: `El estudio con el que trabajamos se especializa en accidentes laborales. La idea es que puedas contar con profesionales que conozcan este tipo de trámites y que puedan acompañarte durante el proceso, revisar tu historia clínica y orientarte si aparece algún inconveniente con la ART.

También es importante que conozcas desde el principio cómo trabajan y cuáles son sus honorarios.

En este caso, el estudio nos informa que trabaja bajo una modalidad de principio de gratuidad: no te cobra por adelantado y sus honorarios dependen del resultado y de las condiciones que te expliquen antes de aceptar. Lo mejor es que puedas consultarles directamente cómo se aplica en tu caso.`,
      preguntas: [
        pr(
          "art-e6-p1",
          "¿Te interesaría que coordinemos un llamado informativo para que puedas conocer cómo trabajan y hacerles las preguntas que tengas?",
          [
            op("art-e6-o1", "Acepta recibir el llamado.", {
              respuestaSugerida:
                "Perfecto. Te voy a pedir algunos datos para buscar un estudio que trabaje en tu zona y coordinar el contacto.",
              accion: "Avanzar a la etapa 7.",
              targetStepId: "art-e7",
            }),
            op("art-e6-o2", "Pregunta si le van a cobrar.", {
              respuestaSugerida:
                "Es importante que lo tengas claro antes de avanzar. La modalidad que nos informa este estudio es que no cobra por adelantado, pero los honorarios y las condiciones concretas te los tienen que explicar directamente antes de que aceptes trabajar con ellos.",
              accion:
                "No asegurar que nunca tendrá gastos. Recomendar que pida las condiciones por escrito.",
              targetStepId: "art-e7",
            }),
            op("art-e6-o3", "Pregunta qué pasa si no cobra indemnización.", {
              respuestaSugerida:
                "Según la modalidad que nos informa el estudio, si no hay un resultado que genere honorarios, no cobrarían sus honorarios. De todas maneras, conviene que el estudio te confirme exactamente las condiciones y si existe algún gasto que pudiera quedar a tu cargo.",
              accion:
                "Registrar la consulta y pedir al estudio que aclare las condiciones.",
              targetStepId: "art-e7",
            }),
            op("art-e6-o4", "Quiere pensarlo.", {
              respuestaSugerida:
                "Por supuesto. Es importante que estés tranquilo con la decisión. Si querés, te podemos dejar la información por WhatsApp para que la revises y después nos decís si te interesa que coordinemos el contacto.",
              accion:
                "Registrar seguimiento pendiente solo si el trabajador acepta recibir un mensaje.",
              targetStepId: "art-e7",
            }),
            op("art-e6-o5", "No confía en los estudios jurídicos.", {
              respuestaSugerida:
                "Te entiendo. Si venís recibiendo muchos llamados, es lógico que quieras tener cuidado. No hace falta que decidas nada ahora. La idea es que puedas conocer quiénes son, cómo trabajan y cuáles son sus condiciones antes de aceptar.",
              accion:
                "Ofrecer información verificable. No desacreditar a otros estudios ni presionar.",
              targetStepId: "art-e7",
            }),
            op("art-e6-o6", "No quiere recibir más llamados.", {
              respuestaSugerida:
                "Entiendo, no hay problema. No vamos a coordinar una derivación si no te interesa. Gracias por tu tiempo.",
              accion:
                "Finalizar y registrar que no desea derivación ni nuevos contactos, según el procedimiento interno.",
              finalizaLlamada: true,
              estadoFinalId: "art-est-7",
            }),
          ]
        ),
      ],
      camposRegistro: [
        campo("art-e6-c1", "Acepta llamado informativo", "si-no"),
        campo("art-e6-c2", "Consulta sobre honorarios", "texto-largo"),
      ],
    },

    // ---------------------------------------------------------------- E7
    {
      id: "art-e7",
      titulo: "Localidad y asignación del estudio",
      objetivo:
        "Identificar la localidad del trabajador y seleccionar un estudio que efectivamente cubra esa zona y cuya modalidad esté confirmada.",
      orden: 6,
      contenido:
        "Comentame, ¿en qué localidad te encontrás? Así me fijo si tenemos algún estudio que trabaje en tu zona para recomendarte.",
      preguntas: [
        pr(
          "art-e7-p1",
          "Comentame, ¿en qué localidad te encontrás? Así me fijo si tenemos algún estudio que trabaje en tu zona para recomendarte.",
          []
        ),
        pr("art-e7-p2", "¿Te gustaría que coordinemos ese llamado?", [
          op("art-e7-o2-1", "Acepta.", {
            accion: "Avanzar a la etapa 8.",
            targetStepId: "art-e8",
          }),
          op("art-e7-o2-2", "Quiere conocer más sobre el estudio.", {
            respuestaSugerida:
              "Claro. Puedo comentarte la información que tenemos y, durante el llamado, también vas a poder consultarles directamente sobre su experiencia, modalidad de trabajo y honorarios.",
            accion: "Mostrar datos verificados del estudio.",
            targetStepId: "art-e8",
          }),
          op("art-e7-o2-3", "No hay estudio disponible en la localidad.", {
            respuestaSugerida:
              "Por el momento no tengo confirmado un estudio que trabaje en tu localidad. Prefiero no recomendarte uno sin verificarlo. Si te parece, podemos revisar si hay alguna alternativa que pueda atender tu zona.",
            accion:
              "Dejar pendiente de revisión. No inventar recomendaciones.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-3",
          }),
          op("art-e7-o2-4", "No quiere una derivación.", {
            accion: "Finalizar respetando la decisión.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-6",
          }),
        ]),
      ],
      camposRegistro: [
        campo("art-e7-c1", "Localidad", "texto-corto", { obligatorio: true }),
        campo("art-e7-c2", "Provincia", "texto-corto"),
        campo("art-e7-c3", "Estudio asignado", "seleccion-unica", {
          opciones: ESTUDIOS,
        }),
        campo("art-e7-c4", "El estudio recibe casos de la zona", "si-no"),
      ],
    },

    // ---------------------------------------------------------------- E8
    {
      id: "art-e8",
      titulo: "Coordinación y cierre",
      objetivo:
        "Coordinar el contacto, confirmar los datos y explicar qué sucederá después.",
      orden: 7,
      contenido: `Perfecto. Decime, ¿en qué horario te quedaría cómodo recibir el llamado del estudio?

En unos minutos te voy a enviar un mensaje por WhatsApp para confirmarte la derivación. Recordá que, si después te surge alguna duda, podés comunicarte con nosotros por ese mismo medio.

Muchas gracias por tu tiempo. Espero que puedas continuar bien con tu recuperación. Que tengas un buen día.`,
      preguntas: [
        pr("art-e8-p1", "¿Confirmás la derivación al estudio?", [
          op("art-e8-o1", "Sí, confirmo la derivación.", {
            accion:
              "Registrar la aceptación expresa y confirmar el envío por WhatsApp.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-1",
          }),
          op("art-e8-o2", "No puede definir un horario.", {
            respuestaSugerida:
              "No hay problema. Podemos dejar pendiente la coordinación hasta que tengas un horario más cómodo.",
            accion:
              "Registrar pendiente, sin confirmar una derivación que todavía no se coordinó.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-2",
          }),
          op("art-e8-o3", "Cambió de opinión.", {
            respuestaSugerida:
              "Está bien, no hay problema. No avanzamos con la derivación. Gracias por atender y que tengas un buen día.",
            accion:
              "Cancelar la derivación antes de enviarla y registrar el resultado.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-6",
          }),
          op("art-e8-o4", "No contesta / número no disponible.", {
            accion:
              "Registrar el intento de contacto sin confirmar la derivación.",
            finalizaLlamada: true,
            estadoFinalId: "art-est-9",
          }),
        ]),
      ],
      camposRegistro: [
        campo("art-e8-c1", "Horario preferido", "hora"),
        campo("art-e8-c2", "Teléfono de contacto", "texto-corto"),
        campo("art-e8-c3", "Aceptación expresa de la derivación", "si-no", {
          obligatorio: true,
        }),
        campo("art-e8-c4", "Observaciones para el estudio", "observaciones"),
      ],
    },
  ],
};

export function crearEjemploART() {
  const ahora = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(base)),
    fechaCreacion: ahora,
    fechaModificacion: ahora,
  };
}

/** Las 12 objeciones frecuentes del documento (§7). Se fusionan por id. */
export const OBJECIONES_EJEMPLO_ART = [
  {
    id: "art-obj-1",
    titulo: "No quiero contratar un abogado.",
    contenido:
      "Está bien, es una decisión personal. La idea es que conozcas qué opciones tenés y puedas decidir con tranquilidad. No hace falta que avances si no estás convencido.",
  },
  {
    id: "art-obj-2",
    titulo: "Tengo miedo de tener problemas en mi trabajo.",
    contenido:
      "Entiendo tu preocupación. Es lógico que quieras cuidar tu trabajo. La consulta con un profesional no significa por sí sola que estés iniciando un juicio contra tu empleador. Podés plantearle directamente esa inquietud al abogado antes de tomar cualquier decisión.",
  },
  {
    id: "art-obj-3",
    titulo: "La ART ya me está atendiendo.",
    contenido:
      "Perfecto, es importante que estés recibiendo la atención que necesitás. El asesoramiento también puede servirte para conocer tus derechos y entender qué puede pasar si quedan secuelas después del tratamiento.",
  },
  {
    id: "art-obj-4",
    titulo: "No quiero iniciar un juicio.",
    contenido:
      "Te entiendo. No necesariamente se trata de iniciar un juicio. Existen trámites administrativos ante las Comisiones Médicas. El profesional puede explicarte qué procedimiento corresponde en tu situación.",
  },
  {
    id: "art-obj-5",
    titulo: "No tengo tiempo.",
    contenido:
      "No hay problema. Podemos buscar un horario que te resulte cómodo o dejar el contacto para otro momento, si te interesa.",
  },
  {
    id: "art-obj-6",
    titulo: "¿Me van a cobrar algo?",
    contenido:
      "El estudio nos informa que trabaja sin cobrar por adelantado. De todas maneras, es importante que te expliquen directamente sus honorarios y las condiciones antes de que aceptes.",
  },
  {
    id: "art-obj-7",
    titulo: "No quiero dar mis datos.",
    contenido:
      "Lo entiendo. No hace falta que compartas información con la que no te sientas cómodo. Para una derivación sí necesitamos algunos datos básicos, pero podés decidir si querés continuar.",
  },
  {
    id: "art-obj-8",
    titulo: "Quiero pensarlo.",
    contenido:
      "Por supuesto. Es una decisión que tenés que tomar con tranquilidad. Si querés, podemos enviarte la información por WhatsApp y después nos contactás si te interesa.",
  },
  {
    id: "art-obj-9",
    titulo: "Ya me llamaron muchos abogados.",
    contenido:
      "Sí, entiendo. Cuando ocurre un accidente laboral es posible que recibas distintos llamados y puede resultar molesto. No queremos apurarte ni que decidas sin conocer las condiciones. Mi intención es explicarte cómo trabaja este estudio para que puedas evaluarlo.",
  },
  {
    id: "art-obj-10",
    titulo: "¿Cuánto voy a cobrar?",
    contenido:
      "No sería correcto darte un monto sin conocer la evaluación de tu caso. La indemnización, si corresponde, depende de distintos factores, entre ellos la incapacidad que se determine y los datos laborales. El estudio puede explicarte cómo se calcula.",
  },
  {
    id: "art-obj-11",
    titulo: "¿Me garantizan que voy a cobrar?",
    contenido:
      "No sería responsable garantizarte un resultado. Primero hay que evaluar la situación, la evolución de la lesión y si existe una incapacidad indemnizable.",
  },
  {
    id: "art-obj-12",
    titulo: "¿Por qué me están llamando?",
    contenido:
      "Nos comunicamos por el ingreso a ART relacionado con tu accidente laboral. Queremos explicarte qué derechos pueden corresponderte y, si te interesa, ofrecerte información sobre un estudio especializado.",
  },
];
