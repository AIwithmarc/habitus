
# 🎯 Habitus - Planificador Semanal v4.0.0

**Organiza tu semana con claridad y propósito usando el sistema de 4 pasos de Habitus.**

## 🆕 **VERSIÓN 4.0.0 - Mejoras Principales**

### **📱 Navegación Móvil Rediseñada**
- **Barra de navegación fija inferior** para smartphones
- **Navegación unificada** entre PC y móvil
- **Tabs responsivos** que se adaptan al tamaño de pantalla

### **📊 Nueva Pestaña Dashboard**
- **Panel de Productividad** movido a pestaña dedicada
- **Información del Check-in** integrada en el dashboard
- **Vista más limpia** en las pestañas principales

### **🔧 Correcciones de Funcionalidad**
- **Eliminación de botones de debug** del Perhaps List
- **Corrección del salto automático** a la pestaña check-in
- **Lógica de check-in mejorada** (solo disponible viernes-domingo)
- **Bloqueo de acciones** hasta completar check-in (lunes)

### **💬 Bubble de Feedback Mejorado**
- **Posicionamiento optimizado** para no interferir con botones
- **Estilo unificado** entre PC y móvil
- **Colores azules sutiles** para mejor integración visual

## ✨ **FUNCIONALIDAD: Sistema de Metas**

### **🎭 Sistema de 4 Pasos**

1. **Roles** - Define tus roles de vida importantes
2. **Metas** - Crea metas específicas para cada rol
3. **Tareas y Prioridad** - Asigna tareas a metas con prioridad Eisenhower
4. **Check-in Semanal** - Revisa y reflexiona sobre tu semana

### **🎯 Sistema de Metas**

- **Metas por defecto**: Cada rol tiene automáticamente una meta "Otras Prioridades (ROL)"
- **Metas personalizadas**: Crea metas específicas para objetivos concretos
- **Colores personalizables**: Cada meta tiene un color único para mejor identificación
- **Asociación de tareas**: Las tareas se asocian a metas específicas, no solo a roles

## 🚀 **Características Principales**

### **Gestión de Roles**
- Define roles importantes en tu vida (Padre, Profesional, Amigo, etc.)
- Sistema de validación robusto
- Gestión completa de roles

### **Sistema de Metas**
- Metas asociadas a roles específicos
- Meta por defecto automática para cada rol
- Colores personalizables para mejor organización
- Edición y eliminación de metas personalizadas

### **Gestión de Tareas**
- Tareas asociadas a metas específicas
- Sistema de priorización Eisenhower (4 cuadrantes)
- Drag & Drop para reorganización
- Vista agrupada por roles y metas

### **Check-in Semanal**
- Revisión obligatoria antes de nueva semana
- Reflexión sobre logros y aprendizajes
- Sistema de recordatorios inteligente
- Bloqueo de acciones hasta completar check-in

### **Métricas y Análisis**
- Dashboard de productividad en tiempo real
- Gráficos de distribución Eisenhower
- Seguimiento de progreso semanal
- Exportación de datos completa

## 🎨 **Interfaz de Usuario**

### **Diseño Responsivo**
- Optimizado para móviles y escritorio
- Interfaz táctil mejorada
- Navegación por pasos intuitiva
- Indicadores visuales de progreso

### **Sistema de Colores**
- Paleta coherente con el diseño existente
- Colores personalizables para metas
- Indicadores visuales claros
- Modo oscuro/claro

## 📱 **PWA (Progressive Web App)**

- Instalable en dispositivos móviles
- Funcionalidad offline
- Service Worker para caché
- Manifest para instalación

## 🔧 **Instalación y Uso**

### **Requisitos**
- Navegador web moderno
- JavaScript habilitado
- Almacenamiento local disponible

### **Instalación**
1. Descarga los archivos
2. Abre `index.html` en tu navegador
3. Sigue el sistema de 4 pasos para configurar Habitus

### **Primer Uso**
1. **Paso 1**: Define tus roles principales
2. **Paso 2**: Revisa las metas por defecto y crea metas personalizadas
3. **Paso 3**: Añade tareas asociadas a metas específicas
4. **Paso 4**: Completa tu primer check-in semanal

## 📊 **Estructura de Datos**

### **Rol**
```javascript
"Nombre del rol" // String
```

### **Meta**
```javascript
{
  id: "unique_id",
  name: "Nombre de la meta",
  role: "Nombre del rol",
  description: "Descripción opcional",
  isDefault: false,
  color: "#4F46E5",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### **Tarea**
```javascript
{
  id: "unique_id",
  description: "Descripción de la tarea",
  role: "Nombre del rol",
  goal: "meta_id",
  quadrant: "1", // "1", "2", "3", "4"
  completed: false,
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

## 🔄 **Migración de Datos**

### **Migración Automática**
- Las tareas existentes se migran automáticamente a metas por defecto
- No se pierden datos durante la actualización
- Sistema de respaldo automático

### **Exportación/Importación**
- Exporta todos tus datos para migrar a otro dispositivo
- Formato CSV compatible
- Respaldo completo de configuración

## 🌐 **Internacionalización**

- Soporte para español e inglés
- Sistema de traducciones completo
- Detección automática de idioma

## 🛠️ **Desarrollo**

### **Arquitectura**
- Módulos JavaScript ES6+
- Patrón Module Pattern
- Sistema de eventos personalizado
- Validación robusta de datos

### **Módulos Principales**
- `App.js` - Aplicación principal y navegación
- `Roles.js` - Gestión de roles
- `Goals.js` - Sistema de metas
- `Tasks.js` - Gestión de tareas
- `CheckIn.js` - Check-in semanal
- `Migration.js` - Migración de datos
- `Validator.js` - Validación de datos

## 📈 **Roadmap Futuro**

- [ ] Metas con fechas límite
- [ ] Seguimiento de progreso de metas
- [ ] Notificaciones push
- [ ] Sincronización en la nube
- [ ] API para integraciones
- [ ] Temas personalizables

## 🤝 **Contribuir**

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 **Agradecimientos**

- Inspirado en la Matriz de Eisenhower
- Basado en principios de productividad personal
- Diseño optimizado para experiencia de usuario

---

**🎯 Habitus - Transforma tu productividad, un paso a la vez.**
