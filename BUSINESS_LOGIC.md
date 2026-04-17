# BUSINESS_LOGIC.md - ReserFlow Marketing Auto-Dashboard

> Generado por SaaS Factory | Fecha: 2026-04-16

## 1. Problema de Negocio
**Dolor:** Rolando pierde demasiado tiempo creando manualmente carruseles de Instagram para RESER+, empleando múltiples herramientas fragmentadas y gestionando flujos desconectados.
**Costo actual:** Gasta $100 dólares mensuales externalizando el diseño de los carruseles y pierde horas de productividad cada semana publicándolo manualmente.

## 2. Solución
**Propuesta de valor:** Un dashboard web con IA y Remotion que autogenera, renderiza y publica carruseles visuales de Instagram para RESER+, respetando estrictamente el Brand Kit de la marca.

**Flujo principal (Happy Path):**
1. Selecciona tipo de contenido y describe el tema en el dashboard.
2. El sistema construye el prompt completo integrando Brand Context + tema + tipo de contenido.
3. La IA genera el copy y sugerencias de diseño mediante Structured Outputs en formato JSON estructurado.
4. El dashboard renderiza visualmente la Preview utilizando Remotion para generar vistas dinámicas in-browser.
5. Se envía un aviso vía WhatsApp (a través de yCloud) notificando que el borrador está listo para revisión.
6. Entra al dashboard en PC: edita el JSON/copy, regenera o aprueba el carrusel.
7. Mediante la vista de calendario, programa los posts decidiendo fecha y hora de publicación para todo el mes.
8. Recibe notificación vía Ycloud y correo al completarse con éxito cada publicación en el feed de Instagram.

## 3. Usuario Objetivo
**Rol:** Emprendedor ("Solo-preneur") y desarrollador.
**Contexto:** Rolando gestiona exclusivamente "RESER+", una aplicación dedicada a reserva de canchas deportivas y amenities. Solo él utilizará el software actualmente para automatizar el marketing y evitar invertir en editores.

## 4. Arquitectura de Datos
**Input:**
- Formulario de ideación: Tema o idea central para el post.
- Configuración de la cuenta: Brand Kit preconfigurado de RESER+ (Logos, paletas, tipografías base).
- Conexión: API Graph de Meta u OAuth Token de Instagram temporal.

**Output:**
- Renderizado: Frames/imágenes o short videos renderizados mediante código con Remotion.
- Alertas externas: Mensajes vía Ycloud hacia su WhatsApp personal alertando aprobaciones pendientes o publicaciones exitosas.
- Publicación directa: Automática en el feed de Instagram en la fecha definida en el calendario.

**Storage (Supabase tables sugeridas):**
- `brand_settings`: Configuración del brand kit e integraciones de API (Ycloud, Meta).
- `content_ideas`: Conceptos e ideas ingresadas (en estado draft, processing, review, scheduled).
- `carousels`: Post procesados, data JSON estructurada (texto de títulos, índices visuales elegidos), estados para el calendario.

## 5. KPI de Éxito
**Métrica principal:** Poder generar, revisar, renderizar mediante Remotion y programar un *mes entero* de contenido para Instagram de RESER+ en *menos de 30 minutos*, sin gastar 1 dólar extra en agencia/diseñadores.

## 6. Especificación Técnica (Para el Agente)

### Features a Implementar (Feature-First)
```text
src/features/
├── auth/           # Autenticación Email/Password restrictiva (Supabase)
├── generation/     # AI Engine (Vercel AI SDK para emitir JSON estructurado del carrusel)
├── remotion/       # Configuración de los componentes react que hacen render de frames a png/mp4
├── scheduler/      # Vista de calendario e integraciones con Instagram Publish / cronjobs
└── notifications/  # Servicios para despachar notificaciones con la API REST de Ycloud WhatsApp
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Media Engine:** Remotion (para renderizado nativo en código reactivo con los datos JSON)
- **WhatsApp API:** Ycloud API
- **AI Engine:** Vercel AI SDK v5 + OpenRouter (generación JSON estricta y predecible).
- **Backend/DB:** Supabase (Auth + Database + Storage)
- **Validación:** Zod
- **Testing:** Playwright MCP
- **Deploy:** Vercel

### Próximos Pasos Recomendados (Bucle Agentico)
1. [ ] Setup proyecto base con variables secretas integradas
2. [ ] Crear base de datos y esquemas RLS en Supabase
3. [ ] Integrar capa de autenticación básica controlada
4. [ ] Feature `generation`: Flujo generativo llamando a API para construir JSON de Diapositivas
5. [ ] Feature `remotion`: Ingestión de ese JSON para previsualización dinámica.
6. [ ] Feature `scheduler` + Integración Meta IG
7. [ ] Feature `notifications` por WhatsApp (Ycloud)
