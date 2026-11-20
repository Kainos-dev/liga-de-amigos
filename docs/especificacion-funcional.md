# Liga de Amigos — Documento funcional y técnico (v0.1)

> Estado: definición inicial del producto.
> Objetivo: establecer las bases para diseñar y desarrollar el MVP.

## 1. Visión del producto

Liga de Amigos es una plataforma para que cada grupo de amigos registre sus juntadas, acumule estadísticas y compita internamente mediante una liga de puntos basada en la participación y las contribuciones de sus integrantes.

El producto busca transformar los recuerdos informales del grupo en un historial compartido: quién estuvo, quién puso casa, quién cocinó, quién suele organizar y cómo evolucionó la participación de cada integrante a lo largo del año.

A futuro, podrá evolucionar hacia una red social privada para grupos de amigos, pero esa expansión no forma parte del MVP.

## 2. Problema que resuelve

Los grupos de amigos suelen tener recuerdos y opiniones sobre quién participa más, quién organiza todo o quién nunca aparece, pero no tienen un registro objetivo y acumulativo.

La plataforma permitirá:

- Registrar las juntadas y sus participantes.
- Reconocer las contribuciones de cada integrante.
- Crear una competencia interna con reglas compartidas.
- Consultar estadísticas mensuales y anuales.
- Generar resúmenes que reflejen la historia del grupo durante el año.

## 3. Usuarios y estructura

- **Grupo**: espacio privado donde se registran juntadas, se definen las reglas y se calculan los puntos.
- **Integrante**: persona que forma parte de uno o más grupos. Cada integrante tiene estadísticas y una posición en la liga de cada grupo.
- **Administrador del grupo**: puede crear el grupo, gestionar integrantes, configurar reglas y corregir registros. Los permisos definitivos están pendientes de definición.

**Decisión confirmada:** la competencia es interna a cada grupo. No hay una tabla global que mezcle a todos los usuarios.

## 4. Funcionalidades del MVP

### 4.1. Creación y administración de grupos

- Crear un grupo con nombre e identidad visual básica.
- Invitar integrantes.
- Consultar la lista de miembros.
- Mantener un historial correspondiente al año de competencia.
- Gestionar permisos de administración.

### 4.2. Registro de juntadas

Cada juntada deberá contar, como mínimo, con:

- Fecha.
- Grupo al que pertenece.
- Integrantes que asistieron.
- Integrantes que no asistieron, si corresponde.
- Quién puso la casa.
- Quién cocinó.
- Otras contribuciones que el grupo decida registrar.
- Observaciones opcionales.

Se deberá distinguir entre una **ausencia confirmada**, una persona que **no fue invitada** y un **dato todavía no registrado**. No asistir no debe interpretarse automáticamente como una falta si la persona no estaba invitada.

El sistema deberá permitir corregir registros, con permisos definidos y sin duplicar puntos.

### 4.3. Sistema de puntos

La liga se construye a partir de reglas configurables. Ejemplos de eventos puntuables:

- Asistir a una juntada.
- Poner la casa.
- Cocinar.
- Organizar una juntada.
- Cumplir una contribución adicional definida por el grupo.

Cada evento suma puntos según las reglas vigentes. **No se fijan valores arbitrarios en el código**: las ponderaciones deben poder configurarse.

El sistema debe evitar que un mismo evento genere puntos duplicados y conservar el motivo de cada asignación.

Pendiente: valores iniciales, límites por evento, desempates, quién puede editar reglas y qué sucede cuando se modifica una juntada ya puntuada.

### 4.4. Tabla de posiciones

- Posición actual de cada integrante.
- Puntos acumulados durante el año.
- Desglose de puntos por categoría.
- Cambios de posición respecto de períodos anteriores.
- Estadísticas individuales relevantes.

La tabla es anual. Los resúmenes mensuales la complementan, sin reiniciar los puntos anuales.

### 4.5. Resumen mensual

- Cantidad de juntadas.
- Integrantes con mayor asistencia.
- Quién puso más veces la casa.
- Quién cocinó más veces.
- Ganadores o destacados de distintas categorías.
- Mayores subidas y bajadas en la tabla.
- Hitos y estadísticas curiosas del grupo.

Los reconocimientos deben basarse en datos reales. Si hay pocos registros, el sistema **no debe inventar ganadores ni conclusiones**.

### 4.6. Resumen anual

**Rendimiento individual**

- Tabla final y puntos de cada integrante.
- Asistencia y contribuciones acumuladas.
- Posición inicial y final, cuando exista información.
- Mayor ascenso y mayor descenso.
- Reconocimientos por categorías.

**Historia del grupo**

- Meses con más y menos juntadas.
- Evolución de la actividad a lo largo del año.
- Participación media por juntada.
- Integrantes más constantes.
- Hitos y estadísticas destacadas.
- Comparaciones mensuales y tendencias.

El resumen debe conservar el contexto: una persona con menos asistencia no necesariamente participa menos si se incorporó tarde al grupo.

## 5. Reglas temporales

- Cada grupo tiene temporadas anuales.
- Los puntos pertenecen a una temporada determinada.
- El cierre anual conserva los resultados finales.
- La temporada siguiente comienza con una nueva clasificación.
- Los informes de temporadas anteriores siguen disponibles.

Pendiente: si la temporada coincide con el año calendario, cuándo se cierra, si existe un período de gracia para cargar juntadas atrasadas y cómo se tratan las incorporaciones tardías.

## 6. Pantallas principales (propuesta inicial)

- Inicio del grupo: resumen, últimas juntadas y posición propia.
- Tabla de la liga.
- Registro de una juntada.
- Detalle e historial de juntadas.
- Perfil estadístico de cada integrante.
- Resumen mensual.
- Resumen anual.
- Configuración del grupo, miembros y reglas.

La navegación final debe definirse antes de implementar el frontend completo.

## 7. Modelo de datos conceptual

Entidades iniciales: Usuario, Grupo, Membresía y rol, Temporada, Juntada, Participación por integrante, Tipo de contribución, Evento puntuable, Regla de puntuación, Resumen estadístico mensual y anual.

Los puntos deben poder **reconstruirse desde los eventos registrados y sus reglas**, sin depender de un número acumulado editable manualmente.

Debe evaluarse cómo conservar el historial si cambian las reglas de puntuación durante una temporada.

## 8. Requisitos técnicos generales

- Grupos y datos privados por defecto.
- Autenticación y control de acceso.
- Validación de permisos en el servidor, no solamente en la interfaz.
- Prevención de registros duplicados.
- Historial de modificaciones relevantes.
- Cálculos estadísticos consistentes.
- Diseño adaptable a dispositivos móviles.
- Posibilidad de incorporar nuevas categorías y funcionalidades sin rediseñar la plataforma.

## 9. Fuera del MVP

Red social general, feed público, mensajería avanzada, publicaciones/fotos/comentarios, integración con calendarios externos, competiciones entre grupos, automatizaciones sociales complejas.

## 10. Criterios de aceptación del MVP

- Se puede crear un grupo e incorporar integrantes.
- Se puede registrar una juntada con participantes y contribuciones.
- El sistema calcula los puntos correctamente y evita duplicaciones.
- La tabla anual refleja los puntos y las posiciones.
- Se pueden consultar estadísticas mensuales y anuales con datos consistentes.
- Se puede cerrar una temporada y consultar su historial.
- Un integrante no puede consultar ni modificar información de grupos a los que no tiene acceso.

## Anexo técnico — Evolución hacia aplicaciones móviles

Primera versión: aplicación web responsive, con posibilidad de evolucionar hacia PWA y apps nativas Android/iOS.

**Arquitectura**

- Separar la interfaz de usuario de las reglas de negocio.
- Centralizar en el backend los cálculos de puntos, permisos, temporadas y estadísticas.
- Exponer las operaciones necesarias mediante una API documentada.
- Mantener los datos persistentes e independientes de la interfaz.
- Autenticación y sesiones compatibles con clientes web y móviles.
- Versionar las reglas de puntuación y preservar el historial de resultados.
- Evitar que los cálculos importantes dependan del frontend.
- Estructura que permita incorporar notificaciones y funciones sociales.

**Experiencia**

- Mobile-first.
- Registro de juntadas y consulta de posiciones cómodos desde el celular.
- Navegación sencilla.
- Instalable como PWA.
- Adaptable a computadoras y tablets.

Fuera del MVP: apps nativas y notificaciones push avanzadas.

**Criterio de aceptación:** la lógica de negocio y los datos deben poder usarse desde una futura app móvil sin reimplementar las reglas de puntuación, la clasificación ni el cálculo de estadísticas.

## 11. Preguntas pendientes

Ver las propuestas de respuesta en [decisiones.md](./decisiones.md).

- ¿Los puntos serán iguales para todos los grupos o cada grupo podrá crear su propia liga?
- ¿Quién registra la juntada: un administrador, cualquier integrante o cada participante?
- ¿Los asistentes deben confirmar su presencia o basta con que alguien cargue el registro?
- ¿Qué pasa con las juntadas canceladas, los invitados externos y las incorporaciones nuevas?
- ¿Cómo se resuelven los empates?
- ¿La liga se reinicia cada enero o la temporada se configura por grupo?
- ¿La plataforma será web, aplicación móvil o web adaptable inicialmente?

## 12. Primera etapa de desarrollo

1. Definir las reglas mínimas de puntuación.
2. Diseñar el modelo de datos y los permisos.
3. Implementar grupos e integrantes.
4. Implementar registro y edición de juntadas.
5. Implementar cálculo de puntos y clasificación.
6. Implementar estadísticas mensuales y anuales.
7. Probar con un grupo real y ajustar las reglas antes de ampliar funcionalidades.
