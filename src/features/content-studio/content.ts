import type { ContentPiece } from './types'

export const CONTENT: ContentPiece[] = [
  // ─── Week 1: Apertura — "sin app, solo WhatsApp" ─────────────────────
  {
    id: 1, day: 1, type: 'carousel', variant: 'bigType', angle: 'no-app',
    audience: 'B2C', sport: 'padel',
    hook: 'Reservar cancha ya no duele',
    slides: [
      { kind: 'cover', eyebrow: 'NUEVO', big: 'Reservar cancha\nya no duele.', foot: 'desliza →' },
      { kind: 'flowScreen', eyebrow: 'ASÍ ES', big: 'Todo\npasa\nadentro\nde WhatsApp.', sub: 'Sin instalar nada.', flowTitle: 'Reservar cancha', progress: 20, flowHeadline: 'Elegí tu complejo', flowItems: [{ text: 'Campo 9 Pádel Club' }, { text: 'Complejo Fedemar' }, { text: 'Padelchopp' }], flowCta: 'Siguiente' },
      { kind: 'flowScreen', eyebrow: 'PASO 2', big: 'Elegís\ncancha\ny horario.', sub: 'Todo con el dedo, en un chat.', flowTitle: 'Seleccionar Cancha', progress: 50, flowHeadline: 'Elegí la cancha', flowItems: [{ text: 'CANCHA 1(T) - PÁDEL', selected: true }, { text: 'CANCHA 2(T) - PÁDEL' }, { text: 'CANCHA 3(T) - PÁDEL' }], flowCta: 'Siguiente' },
      { kind: 'flowScreen', eyebrow: 'LISTO', big: 'Confirmás\ny jugás.', sub: 'Así de simple. Así de Reser+.', flowTitle: 'Confirmar Reserva', progress: 100, flowHeadline: 'Confirmar tu reserva', flowItems: [{ text: '18 Abr · 20:00 a 22:00 hs', selected: true }], flowCta: 'Confirmar reserva' },
      { kind: 'cta', big: 'Probalo.\nEs como mandar un mensaje.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 2, day: 2, type: 'video', variant: 'chatDemo', angle: 'speed',
    audience: 'B2C', sport: 'padel',
    hook: '30 segundos. Una cancha.',
    script: 'chat-demo-padel',
    slides: [
      { kind: 'cover', eyebrow: 'PÁDEL', big: '30 segundos.\nUna cancha.', foot: 'desliza →' },
      { kind: 'chat', msgs: [{ who: 'you', text: 'Quiero pádel sábado 18hs' }, { who: 'bot', text: '🏸 Cancha 2 disponible.\n¿Confirmo?' }, { who: 'you', text: 'Dale' }, { who: 'bot', text: 'Reservado ✅\nSábado 18:00 · Cancha 2' }] },
      { kind: 'stat', top: '30s', big: 'de reserva\na cancha', bottom: 'Sin llamar. Sin esperar.' },
      { kind: 'cta', big: 'Probalo.\nMandá un mensaje.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 3, day: 3, type: 'carousel', variant: 'beforeAfter', angle: 'compare',
    audience: 'B2B', sport: 'mix',
    hook: 'Antes vs. ahora',
    slides: [
      { kind: 'cover', eyebrow: 'ANTES / AHORA', big: 'De la planilla\nal WhatsApp.', foot: 'desliza →' },
      { kind: 'beforeAfter', before: { title: 'Antes', items: ['Llamadas cruzadas', 'Planilla en papel', 'Doble reserva', 'Cobros a mano'] }, after: { title: 'Con Reser+', items: ['Chat directo', 'Agenda al día', 'Cero choques', 'Pago incluido'] } },
      { kind: 'quote', text: 'Pasamos de perder 3 turnos por semana\na tener la agenda llena.', attrib: 'Conocé más en el link →' },
      { kind: 'cta', big: 'Probá Reser+\nen tu club.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 4, day: 4, type: 'carousel', variant: 'plusMotif', angle: 'no-app',
    audience: 'B2C', sport: 'mix',
    hook: 'Sin apps. Sin login. Solo jugar.',
    slides: [
      { kind: 'cover', eyebrow: 'RESER+', big: 'Sin apps.\nSin login.\nSolo jugar.', foot: 'desliza →' },
      { kind: 'flowScreen', eyebrow: 'DENTRO DEL CHAT', big: 'Un menú\nque abre\nreservas.', sub: 'Tocás "Ver opciones" y listo.', flowTitle: 'Ver opciones', progress: 10, flowHeadline: '¿Qué querés hacer?', flowItems: [{ text: '📅 Reservar cancha' }, { text: '📋 Mis reservas' }, { text: '🙋 Hablar con soporte' }], flowCta: 'Seleccionar' },
      { kind: 'stat', top: '1', big: 'chat\nde WhatsApp', bottom: 'Eso es todo lo que necesitás.' },
      { kind: 'cta', big: 'Reservá como\nmandás un meme.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 5, day: 5, type: 'video', variant: 'plusBloom', angle: 'brand',
    audience: 'all', sport: 'mix',
    hook: 'El + que te faltaba',
    script: 'plus-bloom',
    slides: [
      { kind: 'cover', eyebrow: 'RESER+', big: 'El + que\nte faltaba.', foot: 'desliza →' },
      { kind: 'plusGrid', items: [{ t: '+ Reservas', d: 'Por WhatsApp, sin apps' }, { t: '+ Pagos', d: 'Cobrás al reservar' }, { t: '+ Agenda', d: 'Todo en tiempo real' }, { t: '+ Avisos', d: 'Recordatorios automáticos' }] },
      { kind: 'cta', big: 'Sumá el +\na tu club.', cta: 'Conocé más en el link' },
    ],
  },

  // ─── Week 2: Problemas del club ──────────────────────────────────────
  {
    id: 6, day: 6, type: 'carousel', variant: 'question', angle: 'problem',
    audience: 'B2B', sport: 'mix',
    hook: 'Si administrás canchas, leé esto',
    slides: [
      { kind: 'cover', eyebrow: 'CLUB OWNERS', big: '¿Sigues\nanotando\nturnos\nen papel?', foot: 'desliza →' },
      { kind: 'checklist', title: 'Marcá lo que te pasó esta semana:', items: ['Dos grupos para la misma hora', '"¿A nombre de quién estaba?"', 'Cancelaciones por WhatsApp que se perdieron', 'Plata que no cuadra a fin de mes'] },
      { kind: 'stat', top: '+40%', big: 'menos\nllamadas', bottom: 'Clubes que migraron a Reser+.' },
      { kind: 'cta', big: 'Tu agenda,\nen paz.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 7, day: 7, type: 'carousel', variant: 'useCase', angle: 'use-case',
    audience: 'B2C', sport: 'futbol',
    hook: 'Fútbol 5: reservá con los pibes',
    slides: [
      { kind: 'cover', eyebrow: 'FÚTBOL 5/7', big: 'Armar el\npartido del\njueves,\nfácil.', foot: 'desliza →' },
      { kind: 'flowScreen', eyebrow: 'ADENTRO DEL CHAT', big: 'Eligís\ndía\ny cancha.', sub: 'Sin 40 mensajes en el grupo.', flowTitle: 'Seleccionar Fecha', progress: 60, flowHeadline: 'Elegí la fecha', flowItems: [{ text: 'Jueves 23 Abr' }, { text: 'Viernes 24 Abr', selected: true }, { text: 'Sábado 25 Abr' }], flowCta: 'Ver horarios' },
      { kind: 'stat', top: '30s', big: 'y el partido\nestá armado', bottom: 'Sin grupo de 40 mensajes.' },
      { kind: 'cta', big: 'Dejá de\nchatear al pedo.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 8, day: 8, type: 'video', variant: 'typingReveal', angle: 'speed',
    audience: 'B2C', sport: 'tenis',
    hook: 'Escribir. Reservar. Jugar.',
    script: 'typing-reveal',
    slides: [
      { kind: 'cover', eyebrow: 'TENIS', big: 'Escribir.\nReservar.\nJugar.', foot: 'desliza →' },
      { kind: 'chat', msgs: [{ who: 'you', text: 'Quiero una cancha de tenis mañana 9am' }, { who: 'bot', text: '🎾 Cancha 1 disponible.\n¿Confirmo?' }, { who: 'you', text: 'Sí' }, { who: 'bot', text: 'Listo ✅ Mañana 9:00 · Cancha 1' }] },
      { kind: 'stat', top: '3', big: 'mensajes\ny jugás', bottom: 'Así de rápido. Así de Reser+.' },
      { kind: 'cta', big: 'Menos apps.\nMás tenis.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 9, day: 9, type: 'carousel', variant: 'numbers', angle: 'benefit-club',
    audience: 'B2B', sport: 'mix',
    hook: 'Los números del club que cambió',
    slides: [
      { kind: 'cover', eyebrow: 'CASO REAL', big: 'Un club.\nTres meses.\nEstos números.', foot: 'desliza →' },
      { kind: 'bigNumber', number: '+40%', label: 'reservas online', sub: 'vs. mismo trimestre 2025' },
      { kind: 'bigNumber', number: '−70%', label: 'llamadas al mostrador', sub: 'el celu descansa' },
      { kind: 'bigNumber', number: '0', label: 'turnos dobles', sub: 'en 90 días' },
      { kind: 'cta', big: 'Querés estos\nnúmeros también?', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 10, day: 10, type: 'carousel', variant: 'plusMotif', angle: 'feature',
    audience: 'all', sport: 'mix',
    hook: 'El + es todo lo que hace',
    slides: [
      { kind: 'cover', eyebrow: 'QUÉ ES EL +', big: 'El + no\nes decoración.', foot: 'desliza →' },
      {
        kind: 'plusGrid', items: [
          { t: '+ Reservas', d: 'Canchas, amenities, lo que administres' },
          { t: '+ Pagos', d: 'Cobrás al reservar, sin excusas' },
          { t: '+ Agenda', d: 'Todo en un tablero, en tiempo real' },
          { t: '+ Avisos', d: 'Recordatorios automáticos por WhatsApp' },
        ]
      },
      { kind: 'cta', big: 'Un solo chat.\nTodo tu club.', cta: 'Conocé más en el link' },
    ],
  },

  // ─── Week 3: Casos de uso (deportes + amenities) ──────────────────────
  {
    id: 11, day: 11, type: 'carousel', variant: 'useCase', angle: 'use-case',
    audience: 'B2C', sport: 'padel',
    hook: 'Pádel sin drama',
    slides: [
      { kind: 'cover', eyebrow: 'PÁDEL', big: 'Turno de\npádel en\ntres pantallas.', foot: 'desliza →' },
      { kind: 'flowScreen', eyebrow: '01 · UBICACIÓN', big: 'Eligís\ntu ciudad.', sub: 'Todo Paraguay, adentro de un chat.', flowTitle: 'Ciudad', progress: 30, flowHeadline: 'Elegí tu ciudad', flowItems: [{ text: 'CAAGUAZÚ' }, { text: 'CAMPO 9', selected: true }, { text: 'CORONEL OVIEDO' }, { text: 'CURUGUATY' }], flowCta: 'Siguiente' },
      { kind: 'flowScreen', eyebrow: '02 · HORARIO', big: 'Eligís\nla hora.', sub: 'Turnos de 2 horas, ya definidos.', flowTitle: 'Seleccionar Horario', progress: 75, flowHeadline: 'Horarios disponibles', flowItems: [{ text: '18:00 - 20:00 hs' }, { text: '20:00 - 22:00 hs', selected: true }, { text: '22:00 - 00:00 hs' }], flowCta: 'Confirmar horario' },
      { kind: 'cta', big: 'Sin apps.\nSin vueltas.\nSin excusas.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 12, day: 12, type: 'video', variant: 'comparison', angle: 'compare',
    audience: 'B2B', sport: 'mix',
    hook: 'Antes / después en 10s',
    script: 'before-after-10s',
    slides: [
      { kind: 'cover', eyebrow: 'ANTES / DESPUÉS', big: 'Antes /\ndespués\nen 10 segundos.', foot: 'desliza →' },
      { kind: 'beforeAfter', before: { title: 'Antes', items: ['Teléfono sonando todo el día', 'Planilla desactualizada', 'Turnos pisados', '"¿Quién reservó?"'] }, after: { title: 'Con Reser+', items: ['El bot atiende 24/7', 'Agenda en tiempo real', 'Cero choques', 'Todo registrado'] } },
      { kind: 'stat', top: '10s', big: 'para ver\nla diferencia', bottom: 'Los clubes que migraron no vuelven atrás.' },
      { kind: 'cta', big: 'Pasate al +.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 13, day: 13, type: 'carousel', variant: 'useCase', angle: 'use-case',
    audience: 'edificios', sport: 'amenities',
    hook: 'Tu edificio, sin grupo de vecinos',
    slides: [
      { kind: 'cover', eyebrow: 'EDIFICIOS & COUNTRIES', big: 'Reservar\nel SUM\nsin pelearse.', foot: 'desliza →' },
      { kind: 'iconList', title: 'Amenities que reservás por chat:', items: ['Quincho / SUM', 'Pileta', 'Gimnasio', 'Parrilla', 'Cancha'] },
      { kind: 'stat', top: '0', big: 'grupos de\nvecinos', bottom: 'El admin ya sabe quién reservó qué.' },
      { kind: 'cta', big: 'Amenities en\npaz.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 14, day: 14, type: 'carousel', variant: 'bigType', angle: 'no-app',
    audience: 'B2C', sport: 'mix',
    hook: 'Tu teléfono ya tiene todo lo que necesitás',
    slides: [
      { kind: 'cover', eyebrow: 'SIN INSTALAR', big: 'Ya tenés\nla app.\nSe llama\nWhatsApp.', foot: 'desliza →' },
      { kind: 'quote', text: 'No me hagas bajar otra cosa.', attrib: 'Todos, siempre' },
      { kind: 'stat', top: '2 mil M+', big: 'usan\nWhatsApp', bottom: 'Encontremos al cliente donde ya está.' },
      { kind: 'cta', big: 'Reservar\nes mensajear.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 15, day: 15, type: 'video', variant: 'plusBloom', angle: 'brand',
    audience: 'all', sport: 'mix',
    hook: 'Reser, pero con un +',
    script: 'plus-bloom-2',
    slides: [
      { kind: 'cover', eyebrow: 'EL +', big: 'Reser,\npero con\nun +.', foot: 'desliza →' },
      { kind: 'iconList', title: 'Qué significa el +', items: ['+ que una agenda', '+ que un formulario', '+ que una app que nadie baja', '+ que una planilla de Excel'] },
      { kind: 'cta', big: 'Es Reser+.\nEs todo.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 16, day: 16, type: 'carousel', variant: 'numbers', angle: 'benefit-club',
    audience: 'B2B', sport: 'mix',
    hook: '3 números que vas a sentir',
    slides: [
      { kind: 'cover', eyebrow: 'BENEFICIOS', big: 'Tres cosas\nque vas a\nnotar en\n30 días.', foot: 'desliza →' },
      { kind: 'bigNumber', number: '1', label: 'agenda única', sub: 'sin planillas, sin libretitas' },
      { kind: 'bigNumber', number: '2', label: 'cobros al reservar', sub: 'chau "te pago el viernes"' },
      { kind: 'bigNumber', number: '3', label: 'horas libres por día', sub: 'deja de atender el teléfono' },
      { kind: 'cta', big: 'Probalo este\nmes.', cta: 'Conocé más en el link' },
    ],
  },

  // ─── Week 4: Humor + educativo ────────────────────────────────────────
  {
    id: 17, day: 17, type: 'carousel', variant: 'meme', angle: 'problem',
    audience: 'B2B', sport: 'mix',
    hook: 'Lo que NO extrañás',
    slides: [
      { kind: 'cover', eyebrow: 'CLUB LIFE', big: 'Cosas que\nno vas a\nextrañar.', foot: 'desliza →' },
      {
        kind: 'crossList', items: [
          'La libreta de reservas',
          'La llamada a las 23:47',
          '"¿A nombre de quién?"',
          'El cliente que dice que reservó',
          'La planilla de Excel de 2019',
        ]
      },
      { kind: 'cta', big: 'Chau caos.\nHola Reser+.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 18, day: 18, type: 'video', variant: 'chatDemo', angle: 'speed',
    audience: 'B2C', sport: 'basquet',
    hook: 'Cancha de básquet en 4 mensajes',
    script: 'chat-demo-basquet',
    slides: [
      { kind: 'cover', eyebrow: 'BÁSQUET', big: 'Cancha de\nbásquet en\n4 mensajes.', foot: 'desliza →' },
      { kind: 'chat', msgs: [{ who: 'you', text: 'Básquet domingo 10am' }, { who: 'bot', text: '🏀 Cancha techada disponible.\n¿Confirmo?' }, { who: 'you', text: 'Va' }, { who: 'bot', text: 'Reservado ✅\nDomingo 10:00 · Techada' }] },
      { kind: 'stat', top: '4', big: 'mensajes\ny a jugar', bottom: 'Sin llamar. Sin esperar. Sin apps.' },
      { kind: 'cta', big: 'Tu cancha\nen un chat.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 19, day: 19, type: 'carousel', variant: 'feature', angle: 'feature',
    audience: 'B2B', sport: 'mix',
    hook: 'Bonus: aprobás desde tu WhatsApp',
    slides: [
      { kind: 'cover', eyebrow: 'PARA ADMINS', big: 'Aprobar\nreservas\nsin abrir\nla laptop.', foot: 'desliza →' },
      {
        kind: 'chat', msgs: [
          { who: 'bot', text: '🔔 Nueva reserva:\nPádel — Sábado 18hs\n¿Aprobás?' },
          { who: 'you', text: 'Sí' },
          { who: 'bot', text: 'Confirmado al cliente. Pago recibido ✅' },
        ]
      },
      { kind: 'stat', top: '1 tap', big: 'para decir\nque sí', bottom: 'Cero fricción. Cero olvidos.' },
      { kind: 'cta', big: 'Administrá\nsin estar ahí.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 20, day: 20, type: 'carousel', variant: 'plusMotif', angle: 'no-app',
    audience: 'B2C', sport: 'tenis',
    hook: 'Tenis. Un mensaje. Listo.',
    slides: [
      { kind: 'cover', eyebrow: 'TENIS', big: 'Saque\nel teléfono.\nReserve.\nSaque en la cancha.', foot: 'desliza →' },
      { kind: 'imageBlock', label: 'foto cancha de tenis', caption: 'Polvo de ladrillo o cemento: lo tuyo, en tu chat.' },
      { kind: 'cta', big: 'Menos apps.\nMás tenis.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 21, day: 21, type: 'video', variant: 'typingReveal', angle: 'speed',
    audience: 'B2C', sport: 'padel',
    hook: 'Lo escribís y ya está',
    script: 'typing-reveal-2',
    slides: [
      { kind: 'cover', eyebrow: 'PÁDEL', big: 'Lo escribís\ny ya está.', foot: 'desliza →' },
      { kind: 'chat', msgs: [{ who: 'you', text: 'Pádel viernes 20hs para 4' }, { who: 'bot', text: '🏸 Cancha 3 disponible.\nPrecio: $8.000\n¿Confirmo?' }, { who: 'you', text: 'Confirmá' }, { who: 'bot', text: 'Listo ✅ Viernes 20:00 · Cancha 3\nLink de pago enviado 💳' }] },
      { kind: 'stat', top: '1 min', big: 'y el partido\nestá armado', bottom: 'Escribís, confirmás, jugás.' },
      { kind: 'cta', big: 'Reservá\ncomo chatear.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 22, day: 22, type: 'carousel', variant: 'question', angle: 'problem',
    audience: 'B2B', sport: 'mix',
    hook: '¿Perdés reservas sin saberlo?',
    slides: [
      { kind: 'cover', eyebrow: 'DATO', big: '¿Cuántas\nreservas\nperdiste\nhoy?', foot: 'desliza →' },
      { kind: 'stat', top: '1 de cada 3', big: 'clientes\nse rinde', bottom: 'si no puede reservar en menos de 1 minuto.' },
      { kind: 'checklist', title: 'Si alguno te pasó, perdiste plata:', items: ['No atendiste una llamada', 'Tardaste en contestar un WhatsApp', 'El cliente se cansó de esperar confirmación', 'Se fue al club de al lado'] },
      { kind: 'cta', big: 'Reser+ contesta\ncuando vos no podés.', cta: 'Conocé más en el link' },
    ],
  },

  // ─── Week 5: Cierre — recap + CTA fuerte ──────────────────────────────
  {
    id: 23, day: 23, type: 'carousel', variant: 'recap', angle: 'brand',
    audience: 'all', sport: 'mix',
    hook: 'Todo en una sola placa',
    slides: [
      { kind: 'cover', eyebrow: 'RESUMEN', big: 'Reser+\nen 5 frases.', foot: 'desliza →' },
      { kind: 'list', title: null, items: ['1. Reservás por WhatsApp.', '2. No instalás nada.', '3. Pagás al reservar.', '4. El club ve todo en un tablero.', '5. Nadie se pelea por el SUM.'] },
      { kind: 'cta', big: 'Eso es todo.\nEse es el punto.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 24, day: 24, type: 'video', variant: 'comparison', angle: 'compare',
    audience: 'B2B', sport: 'mix',
    hook: 'Planilla vs. Reser+',
    script: 'before-after-10s-2',
    slides: [
      { kind: 'cover', eyebrow: 'VS.', big: 'Planilla\nvs.\nReser+.', foot: 'desliza →' },
      { kind: 'beforeAfter', before: { title: 'Planilla', items: ['Se borra sin querer', 'Nadie sabe quién editó', 'No cobra sola', 'No avisa al cliente'] }, after: { title: 'Reser+', items: ['Historial completo', 'Cada reserva tiene dueño', 'Cobra al confirmar', 'Avisa automático por WA'] } },
      { kind: 'stat', top: '0', big: 'planillas\nnecesarias', bottom: 'Con Reser+ todo pasa en un chat.' },
      { kind: 'cta', big: 'Cerrá la\nplanilla.\nAbrí el chat.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 25, day: 25, type: 'carousel', variant: 'useCase', angle: 'use-case',
    audience: 'B2C', sport: 'futbol',
    hook: 'El grupo de los jueves',
    slides: [
      { kind: 'cover', eyebrow: 'FÚTBOL', big: 'Al grupo\nde los jueves\nle faltaba\nun +.', foot: 'desliza →' },
      { kind: 'imageBlock', label: 'foto cancha de futbol 5', caption: 'Sin pelearse por quién reserva.' },
      {
        kind: 'chat', msgs: [
          { who: 'you', text: 'Somos 10. Jueves 21.' },
          { who: 'bot', text: '⚽ Cancha 1 lista. Mando link de pago al grupo.' },
        ]
      },
      { kind: 'cta', big: 'Que el jueves\nsea sólo jugar.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 26, day: 26, type: 'carousel', variant: 'bigType', angle: 'no-app',
    audience: 'B2C', sport: 'mix',
    hook: 'Tu tiempo, no tu data',
    slides: [
      { kind: 'cover', eyebrow: 'PRIVACIDAD', big: 'No pedimos\nemail.\nNo pedimos\ncuenta.', foot: 'desliza →' },
      { kind: 'stat', top: '0', big: 'formularios', bottom: 'Solo tu número. El que ya usás.' },
      { kind: 'cta', big: 'Reservá.\nNada más.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 27, day: 27, type: 'video', variant: 'plusBloom', angle: 'brand',
    audience: 'all', sport: 'mix',
    hook: 'Reser + vos',
    script: 'plus-bloom-3',
    slides: [
      { kind: 'cover', eyebrow: 'VOS + RESER', big: 'Reser\n+ vos.', foot: 'desliza →' },
      { kind: 'iconList', title: 'Vos ponés el club', items: ['Las canchas', 'Los horarios', 'Los precios', 'Las reglas'] },
      { kind: 'iconList', title: 'Reser+ pone el resto', items: ['La reserva por WhatsApp', 'El cobro automático', 'Los recordatorios', 'El tablero de control'] },
      { kind: 'cta', big: 'Juntos,\nla cancha\nsiempre llena.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 28, day: 28, type: 'carousel', variant: 'quote', angle: 'brand',
    audience: 'B2B', sport: 'mix',
    hook: 'Lo que dicen los clubes',
    slides: [
      { kind: 'cover', eyebrow: 'TESTIMONIO', big: 'Lo que dicen\nlos clubes\nque ya usan\nReser+.', foot: 'desliza →' },
      { kind: 'quote', text: 'En dos semanas recuperé\n10 horas por semana.', attrib: 'Administrador — complejo de pádel' },
      { kind: 'quote', text: 'Mis clientes piensan que lo\nhicimos nosotros. Está buenísimo.', attrib: 'Dueño — club de tenis' },
      { kind: 'cta', big: 'Ellos ya.\n¿Y vos?', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 29, day: 29, type: 'carousel', variant: 'plusMotif', angle: 'feature',
    audience: 'B2B', sport: 'mix',
    hook: 'Todo lo que cabe en un +',
    slides: [
      { kind: 'cover', eyebrow: 'FEATURES', big: 'Un +.\nTodo adentro.', foot: 'desliza →' },
      {
        kind: 'plusGrid', items: [
          { t: '+ Calendario', d: 'Reservas al minuto, sin choques' },
          { t: '+ Cobros', d: 'MercadoPago, transferencia, efectivo' },
          { t: '+ Clientes', d: 'Base de datos construida sola' },
          { t: '+ Reportes', d: 'Cierre de caja automático' },
        ]
      },
      { kind: 'cta', big: 'Administrá\ncomo grande.\nSin ser grande.', cta: 'Conocé más en el link' },
    ],
  },
  {
    id: 30, day: 30, type: 'carousel', variant: 'cta-final', angle: 'no-app',
    audience: 'all', sport: 'mix',
    hook: 'Último del mes: probalo',
    slides: [
      { kind: 'cover', eyebrow: '30 DE ABRIL', big: 'Lo estuviste\nposponiendo\ntodo el mes.', foot: 'desliza →' },
      { kind: 'stat', top: '1 clic', big: 'para dejar\nde perder reservas', bottom: '' },
      { kind: 'cta', big: 'Hoy.\nReser+.\nVos.', cta: 'Conocé más en el link' },
    ],
  },
]
