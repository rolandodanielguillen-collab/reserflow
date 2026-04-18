export type Lang = 'es' | 'en' | 'pt'

export interface LandingDict {
  nav: { how: string; features: string; sports: string; videos: string; contact: string; cta: string }
  hero: {
    eyebrow: string; title_a: string; title_b: string; title_c: string; lead: string
    primary: string; secondary: string
    meta1_n: string; meta1_l: string; meta2_n: string; meta2_l: string; meta3_n: string; meta3_l: string
  }
  chat: { contact: string; online: string; in1: string; out1: string; in2: string; out2: string }
  compare: {
    title: string; lead: string; before_eb: string; after_eb: string; before_t: string; after_t: string
    before: string[]; after: string[]
  }
  steps: {
    eyebrow: string; title: string; lead: string; nav: string[]
    step1_t: string; step1_p: string; step2_t: string; step2_p: string; step3_t: string; step3_p: string
    flow: {
      back: string; bot: string
      s1_title: string; s1_head: string; s1_items: string[]; s1_cta: string
      s2_title: string; s2_head: string; s2_items: string[]; s2_cta: string
      s3_title: string; s3_head: string; s3_items: string[]; s3_cta: string
      admin: string
    }
  }
  features: { eyebrow: string; title: string; lead: string; f: [string, string][] }
  sports: { eyebrow: string; title: string; items: [string, string][] }
  videos: { eyebrow: string; title: string; lead: string }
  stats: { eyebrow: string; title: string; items: [string, string, string][] }
  testimonial: { quote: string; attrib: string }
  cta: { eyebrow: string; title: string; lead: string; primary: string }
  footer: {
    tagline: string
    col1: string; col1_items: string[]; col2: string; col2_items: string[]
    col3: string; col3_items: string[]; copy: string; madein: string
  }
}

export const I18N: Record<Lang, LandingDict> = {
  es: {
    nav: { how: 'Cómo funciona', features: 'Funciones', sports: 'Deportes', videos: 'Videos', contact: 'Contacto', cta: 'Probalo gratis' },
    hero: {
      eyebrow: 'RESERVAS POR WHATSAPP · SIN APPS',
      title_a: 'Reservá una cancha',
      title_b: 'en 30 segundos.',
      title_c: 'Sin descargar nada.',
      lead: 'Reser+ convierte WhatsApp en tu agenda de reservas. Tus jugadores eligen cancha, horario y pagan sin salir del chat. Vos dormís tranquilo.',
      primary: 'Conocé más en el link',
      secondary: 'Ver demo',
      meta1_n: '+2.400', meta1_l: 'reservas automáticas',
      meta2_n: '–40%',   meta2_l: 'llamadas al club',
      meta3_n: '30s',    meta3_l: 'para reservar',
    },
    chat: {
      contact: 'Club Central', online: 'en línea',
      in1: '¡Hola! Quiero reservar una cancha para mañana 🎾',
      out1: '¡Claro! ¿Qué deporte y horario?',
      in2: 'Pádel · 20:00',
      out2: 'Listo. Campo 9, 20:00–22:00. Confirmá acá 👇',
    },
    compare: {
      title: 'Menos llamadas.\nMás canchas llenas.',
      lead: 'Así se reserva hoy en la mayoría de los clubes. Así se reserva con Reser+.',
      before_eb: 'ANTES', after_eb: 'CON RESER+',
      before_t: 'Caos operativo', after_t: 'Todo en un chat',
      before: ['Llamadas cruzadas todo el día', 'Planilla de papel con tachones', 'Turnos dobles y malentendidos', 'Cobros a mano, billete a billete', 'Jugadores que no vuelven'],
      after: ['Reservas por WhatsApp 24/7', 'Agenda viva y sincronizada', 'Cero conflictos de horario', 'Pago confirmado en el chat', 'Recordatorios automáticos'],
    },
    steps: {
      eyebrow: 'CÓMO FUNCIONA',
      title: 'Tres pasos.\nUn solo chat.',
      lead: 'Tu cliente escribe a tu número. El flujo de WhatsApp hace el resto.',
      nav: ['Elegí el complejo', 'Seleccioná cancha', 'Confirmá y pagá'],
      step1_t: '1. Elegí dónde jugar', step1_p: 'Departamento, ciudad y complejo. Sin apps, sin registro, sin descargas.',
      step2_t: '2. Cancha, fecha y horario', step2_p: 'Los horarios libres aparecen en tiempo real. Elegís y listo.',
      step3_t: '3. Confirmá desde el chat', step3_p: 'Resumen claro y pago directo. El club recibe la reserva aprobada.',
      flow: {
        back: '‹ Atrás', bot: 'Reser+ · Bot',
        s1_title: 'Elegí complejo', s1_head: '¿Dónde querés jugar?',
        s1_items: ['Club Central', 'Pádel Norte', 'Complejo 360', 'Arena del Sur'], s1_cta: 'Siguiente',
        s2_title: 'Elegí cancha', s2_head: 'Cancha y horario',
        s2_items: ['Campo 9 · Pádel', 'Campo 3 · Pádel', 'Cancha 1 · Fútbol 5', 'Cancha 2 · Fútbol 5'], s2_cta: 'Siguiente',
        s3_title: 'Confirmar', s3_head: 'Todo listo',
        s3_items: ['Campo 9 · 20:00–22:00', 'Mié 24 · 2h · $3.200', 'Pago por MercadoPago'], s3_cta: 'Confirmar reserva',
        admin: 'El admin recibe la notificación en WhatsApp para aprobar',
      },
    },
    features: {
      eyebrow: 'FUNCIONES', title: 'Todo lo que tu club\nnecesita. Nada más.',
      lead: 'Diseñado para clubes, complejos, quinchos y amenities de country.',
      f: [
        ['Flow nativo', 'Reservas dentro del chat con el Flow oficial de WhatsApp. Cero fricción.'],
        ['Agenda en vivo', 'Disponibilidad real al segundo. Imposible duplicar turnos.'],
        ['Aprobación 1-tap', 'El admin aprueba o rechaza desde su WhatsApp, sin abrir nada más.'],
        ['Pagos integrados', 'MercadoPago, Stripe y transferencia. Confirmación automática.'],
        ['Multideporte', 'Pádel, fútbol, tenis, básquet, pileta, quincho, gym. Todo.'],
        ['Recordatorios', 'Avisos automáticos 24h antes. Menos no-shows, más ingresos.'],
      ],
    },
    sports: {
      eyebrow: 'DEPORTES Y AMENITIES', title: 'Si se reserva,\nlo manejamos.',
      items: [['Pádel','canchas por hora'],['Fútbol 5/7','turnos nocturnos'],['Tenis','polvo y carpeta'],['Básquet','cancha completa o ½'],['Piletas','por turnos o días'],['Quincho / SUM','eventos privados'],['Gimnasio','clases y grupos'],['Golf','tee times']],
    },
    videos: { eyebrow: 'EN ACCIÓN', title: 'Videos reales\ndesde el chat.', lead: '10 segundos. Sin filtros. Sin edición falsa.' },
    stats: {
      eyebrow: 'RESULTADOS', title: 'Números de clubes\nque ya usan Reser+.',
      items: [['+2.400','reservas / mes','promedio por complejo'],['–40%','llamadas al club','y mensajes sueltos'],['97%','satisfacción','de jugadores finales']],
    },
    testimonial: {
      quote: 'Pasamos de perder 3 turnos por semana a tener la agenda llena. Y mi teléfono dejó de sonar a las 11 de la noche.',
      attrib: 'DIRECTOR DE COMPLEJO DE PÁDEL',
    },
    cta: {
      eyebrow: 'EMPEZÁ HOY', title: 'Tu primera reserva\npor WhatsApp\nen 24 horas.',
      lead: 'Te conectamos tu número de WhatsApp Business, cargamos tus canchas y armamos el flow. Sin costos de setup.',
      primary: 'Conocé más en el link',
    },
    footer: {
      tagline: 'Reservas que pasan donde tus jugadores ya están: en WhatsApp.',
      col1: 'Producto', col1_items: ['Cómo funciona','Funciones','Deportes','Precios'],
      col2: 'Empresa',  col2_items: ['Nosotros','Clientes','Blog','Contacto'],
      col3: 'Legal',    col3_items: ['Términos','Privacidad','Cookies'],
      copy: '© 2025 Reser+ · Todos los derechos reservados', madein: 'Hecho con + en LATAM',
    },
  },

  en: {
    nav: { how: 'How it works', features: 'Features', sports: 'Sports', videos: 'Videos', contact: 'Contact', cta: 'Try it free' },
    hero: {
      eyebrow: 'WHATSAPP BOOKINGS · NO APPS',
      title_a: 'Book a court', title_b: 'in 30 seconds.', title_c: 'No download needed.',
      lead: 'Reser+ turns WhatsApp into your booking engine. Players pick a court, time and pay — all inside the chat. You finally sleep through the night.',
      primary: 'Learn more', secondary: 'Watch demo',
      meta1_n: '+2,400', meta1_l: 'automated bookings',
      meta2_n: '–40%',   meta2_l: 'calls to the club',
      meta3_n: '30s',    meta3_l: 'to book',
    },
    chat: {
      contact: 'Central Club', online: 'online',
      in1: 'Hi! I want to book a court for tomorrow 🎾',
      out1: 'Sure! Which sport and time?',
      in2: 'Padel · 8pm',
      out2: 'Done. Court 9, 8–10pm. Confirm here 👇',
    },
    compare: {
      title: 'Fewer calls.\nFuller courts.',
      lead: "That's how most clubs book today. This is how clubs book with Reser+.",
      before_eb: 'BEFORE', after_eb: 'WITH RESER+',
      before_t: 'Operational chaos', after_t: 'One single chat',
      before: ['Non-stop crossed phone calls','Paper spreadsheet with scribbles','Double bookings and arguments','Cash payments, bill by bill','Players who never come back'],
      after: ['24/7 WhatsApp bookings','Live, synced calendar','Zero schedule conflicts','Payment confirmed in chat','Automatic reminders'],
    },
    steps: {
      eyebrow: 'HOW IT WORKS', title: 'Three steps.\nOne chat.',
      lead: 'Your customer messages your number. The WhatsApp flow does the rest.',
      nav: ['Pick the venue','Pick the court','Confirm & pay'],
      step1_t: '1. Pick where to play', step1_p: 'State, city and venue. No apps, no signup, no downloads.',
      step2_t: '2. Court, date and time', step2_p: "Open slots show up live. Pick one and you're in.",
      step3_t: '3. Confirm in the chat', step3_p: 'Clear summary and direct payment. The club gets an approved booking.',
      flow: {
        back: '‹ Back', bot: 'Reser+ · Bot',
        s1_title: 'Pick venue', s1_head: 'Where do you want to play?',
        s1_items: ['Central Club','Padel North','360 Complex','Southern Arena'], s1_cta: 'Next',
        s2_title: 'Pick court', s2_head: 'Court & time',
        s2_items: ['Court 9 · Padel','Court 3 · Padel','Field 1 · 5-a-side','Field 2 · 5-a-side'], s2_cta: 'Next',
        s3_title: 'Confirm', s3_head: 'All set',
        s3_items: ['Court 9 · 8:00–10:00pm','Wed 24 · 2h · $32','MercadoPago / Card'], s3_cta: 'Confirm booking',
        admin: 'The admin gets a WhatsApp notification to approve',
      },
    },
    features: {
      eyebrow: 'FEATURES', title: 'Everything your club\nneeds. Nothing more.',
      lead: 'Built for clubs, complexes, BBQ rooms and country-club amenities.',
      f: [
        ['Native Flow','In-chat bookings with the official WhatsApp Flow. Zero friction.'],
        ['Live calendar','Real-time availability. Double-bookings are impossible.'],
        ['1-tap approval','Admin approves or rejects from their own WhatsApp.'],
        ['Built-in payments','Stripe, MercadoPago, bank transfer. Auto-confirmed.'],
        ['Multi-sport','Padel, football, tennis, basketball, pool, BBQ, gym. All of it.'],
        ['Reminders','Auto-reminders 24h before. Fewer no-shows, more revenue.'],
      ],
    },
    sports: {
      eyebrow: 'SPORTS & AMENITIES', title: 'If it books,\nwe handle it.',
      items: [['Padel','hourly courts'],['5/7-a-side','night slots'],['Tennis','clay and hard'],['Basketball','full or ½ court'],['Pools','slots or full day'],['BBQ / Lounge','private events'],['Gym','classes & groups'],['Golf','tee times']],
    },
    videos: { eyebrow: 'IN ACTION', title: 'Real videos\nstraight from chat.', lead: '10 seconds. No filters. No fake edits.' },
    stats: {
      eyebrow: 'RESULTS', title: 'Numbers from clubs\nalready on Reser+.',
      items: [['+2,400','bookings / month','average per venue'],['–40%','calls to the club','and loose messages'],['97%','satisfaction','from end players']],
    },
    testimonial: {
      quote: 'We went from losing 3 slots a week to a fully booked calendar. And my phone stopped ringing at 11pm.',
      attrib: 'DIRECTOR · PADEL COMPLEX',
    },
    cta: {
      eyebrow: 'START TODAY', title: 'Your first WhatsApp\nbooking in\n24 hours.',
      lead: 'We connect your WhatsApp Business number, load your courts and set up the flow. No setup fees.',
      primary: 'Learn more',
    },
    footer: {
      tagline: 'Bookings that happen where your players already are: on WhatsApp.',
      col1: 'Product', col1_items: ['How it works','Features','Sports','Pricing'],
      col2: 'Company', col2_items: ['About','Clients','Blog','Contact'],
      col3: 'Legal',   col3_items: ['Terms','Privacy','Cookies'],
      copy: '© 2025 Reser+ · All rights reserved', madein: 'Made with + in LATAM',
    },
  },

  pt: {
    nav: { how: 'Como funciona', features: 'Recursos', sports: 'Esportes', videos: 'Vídeos', contact: 'Contato', cta: 'Teste grátis' },
    hero: {
      eyebrow: 'RESERVAS POR WHATSAPP · SEM APPS',
      title_a: 'Reserve uma quadra', title_b: 'em 30 segundos.', title_c: 'Sem baixar nada.',
      lead: 'Reser+ transforma o WhatsApp na sua agenda de reservas. Seus jogadores escolhem quadra, horário e pagam sem sair do chat. Você dorme tranquilo.',
      primary: 'Saiba mais', secondary: 'Ver demo',
      meta1_n: '+2.400', meta1_l: 'reservas automáticas',
      meta2_n: '–40%',   meta2_l: 'ligações ao clube',
      meta3_n: '30s',    meta3_l: 'para reservar',
    },
    chat: {
      contact: 'Clube Central', online: 'online',
      in1: 'Olá! Quero reservar uma quadra amanhã 🎾',
      out1: 'Claro! Qual esporte e horário?',
      in2: 'Padel · 20h',
      out2: 'Pronto. Quadra 9, 20h–22h. Confirme aqui 👇',
    },
    compare: {
      title: 'Menos ligações.\nMais quadras cheias.',
      lead: 'É assim que a maioria dos clubes reserva hoje. É assim com o Reser+.',
      before_eb: 'ANTES', after_eb: 'COM RESER+',
      before_t: 'Caos operacional', after_t: 'Tudo em um chat',
      before: ['Ligações cruzadas o dia todo','Planilha de papel com rabiscos','Reservas duplicadas e brigas','Cobranças na mão, nota por nota','Jogadores que não voltam'],
      after: ['Reservas por WhatsApp 24/7','Agenda viva e sincronizada','Zero conflito de horários','Pagamento confirmado no chat','Lembretes automáticos'],
    },
    steps: {
      eyebrow: 'COMO FUNCIONA', title: 'Três passos.\nUm só chat.',
      lead: 'Seu cliente manda mensagem. O Flow do WhatsApp faz o resto.',
      nav: ['Escolha o local','Escolha a quadra','Confirme e pague'],
      step1_t: '1. Escolha onde jogar', step1_p: 'Estado, cidade e complexo. Sem apps, sem cadastro, sem downloads.',
      step2_t: '2. Quadra, data e horário', step2_p: 'Horários livres aparecem em tempo real. Escolheu, tá feito.',
      step3_t: '3. Confirme no chat', step3_p: 'Resumo claro e pagamento direto. O clube recebe a reserva aprovada.',
      flow: {
        back: '‹ Voltar', bot: 'Reser+ · Bot',
        s1_title: 'Escolha o local', s1_head: 'Onde você quer jogar?',
        s1_items: ['Clube Central','Padel Norte','Complexo 360','Arena Sul'], s1_cta: 'Avançar',
        s2_title: 'Escolha a quadra', s2_head: 'Quadra e horário',
        s2_items: ['Quadra 9 · Padel','Quadra 3 · Padel','Campo 1 · Futebol','Campo 2 · Futebol'], s2_cta: 'Avançar',
        s3_title: 'Confirmar', s3_head: 'Tudo pronto',
        s3_items: ['Quadra 9 · 20h–22h','Qua 24 · 2h · R$160','Pix / Cartão'], s3_cta: 'Confirmar reserva',
        admin: 'O admin recebe uma notificação no WhatsApp para aprovar',
      },
    },
    features: {
      eyebrow: 'RECURSOS', title: 'Tudo o que seu clube\nprecisa. Nada além.',
      lead: 'Feito para clubes, complexos, churrasqueiras e áreas comuns.',
      f: [
        ['Flow nativo','Reservas dentro do chat com o Flow oficial do WhatsApp.'],
        ['Agenda ao vivo','Disponibilidade em tempo real. Duplicar é impossível.'],
        ['Aprovação 1-toque','O admin aprova ou rejeita direto do próprio WhatsApp.'],
        ['Pagamentos','Pix, cartão, transferência. Confirmação automática.'],
        ['Multi-esporte','Padel, futebol, tênis, basquete, piscina, gym. Tudo.'],
        ['Lembretes','Lembretes 24h antes. Menos faltas, mais receita.'],
      ],
    },
    sports: {
      eyebrow: 'ESPORTES E ÁREAS', title: 'Se tem reserva,\nestá aqui.',
      items: [['Padel','quadras por hora'],['Futebol','horários noturnos'],['Tênis','saibro e rápida'],['Basquete','quadra inteira ou ½'],['Piscinas','turnos ou dia inteiro'],['Churrasqueira','eventos privados'],['Academia','aulas e grupos'],['Golfe','tee times']],
    },
    videos: { eyebrow: 'EM AÇÃO', title: 'Vídeos reais\ndireto do chat.', lead: '10 segundos. Sem filtros. Sem edição falsa.' },
    stats: {
      eyebrow: 'RESULTADOS', title: 'Números de clubes\nque já usam Reser+.',
      items: [['+2.400','reservas / mês','média por complexo'],['–40%','ligações ao clube','e mensagens soltas'],['97%','satisfação','dos jogadores']],
    },
    testimonial: {
      quote: 'Paramos de perder 3 horários por semana e agora a agenda fica cheia. E meu celular parou de tocar às 23h.',
      attrib: 'DIRETOR · COMPLEXO DE PADEL',
    },
    cta: {
      eyebrow: 'COMECE HOJE', title: 'Sua primeira reserva\npor WhatsApp\nem 24 horas.',
      lead: 'Conectamos seu WhatsApp Business, cadastramos suas quadras e montamos o flow. Sem taxa de setup.',
      primary: 'Saiba mais',
    },
    footer: {
      tagline: 'Reservas acontecem onde seus jogadores já estão: no WhatsApp.',
      col1: 'Produto', col1_items: ['Como funciona','Recursos','Esportes','Preços'],
      col2: 'Empresa', col2_items: ['Sobre','Clientes','Blog','Contato'],
      col3: 'Legal',   col3_items: ['Termos','Privacidade','Cookies'],
      copy: '© 2025 Reser+ · Todos os direitos reservados', madein: 'Feito com + na LATAM',
    },
  },
}
