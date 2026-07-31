# Conectar Meta Ads (Marketing API)

El sistema ya guarda las intenciones de boost (`AdIntent`, botón "🚀 promocionar"
en Campañas). Para que se ejecuten de verdad hay que conectar la Marketing API.
Estos pasos los gestiona el dueño de la cuenta (requieren identidad del negocio):

## Pasos

1. **App de Meta**: https://developers.facebook.com/apps → Crear app → tipo "Business".
2. **Agregar producto**: Marketing API.
3. **Business verification**: Meta Business Suite → Configuración → Centro de seguridad → Verificar negocio (documentos de la empresa; tarda días).
4. **App review**: pedir permisos `ads_management` y `ads_read` (mostrar en un video cómo la app crea/gestiona anuncios). Alternativa sin review: mientras la app esté en modo desarrollo, funciona con usuarios administradores del Business (suficiente para uso propio).
5. **System User**: Business Settings → Users → System users → crear + generar token con `ads_management`, `ads_read`, `instagram_basic`, `pages_read_engagement` — sin vencimiento.
6. **Ad Account**: Business Settings → Accounts → Ad accounts → anotar el ID (`act_XXXXXXXXX`) y dar acceso al system user.
7. **Vincular la página de Facebook** asociada a la cuenta de Instagram de cada tenant (el boost de IG pasa por la página).

## Al terminar

Agregar al `.env` del VPS (`/var/www/reserflow/.env`):

```
META_ADS_ACCESS_TOKEN=<token del system user>
META_AD_ACCOUNT_ID=act_XXXXXXXXX
```

y `pm2 restart reserflow`. El servicio a completar es
`src/features/ads/meta-ads-service.ts` (`executePendingIntents`) — la cabecera
del archivo documenta los 5 endpoints del boost.
