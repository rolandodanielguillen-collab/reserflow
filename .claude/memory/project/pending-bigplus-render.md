---
name: Pendiente - BigPlus render fidelidad
description: El símbolo + decorativo en slides publicados a Instagram se ve levemente más prominente que en el preview de Content Studio
type: project
originSessionId: f06291a3-635f-4cb3-b652-42466d929d1a
---
El BigPlus (símbolo + grande decorativo en slides cover y cta) renderiza con leve diferencia entre el preview y la imagen publicada.

**Why:** html2canvas captura a 1080px full-size. El preview en Content Studio muestra los slides a ~34% escala (~370px). A escala reducida, el 8% de opacidad mint es casi imperceptible por el anti-aliasing del browser. A full-size, el mismo 8% es claramente visible. Se redujo a 4% como compromiso — se acercó bastante pero no es idéntico.

**How to apply:** Si el usuario retoma este tema, la solución correcta es reemplazar html2canvas con Playwright server-side (screenshot de la página de preview real) o Remotion renderStill. Está dispuesto a evaluar ese cambio si el problema sigue molestando.
