# 🚀 **HABITUS v5 - INICIO RÁPIDO**

## ⚡ **Implementación en 5 Minutos**

### **1. Crear Proyecto Supabase (2 min)**
1. Ve a [supabase.com](https://supabase.com)
2. Crea cuenta y nuevo proyecto
3. Copia **Project URL** y **anon key**

### **2. Configurar Habitus (1 min)**
Edita `config/supabase.js`:
```javascript
production: {
    url: 'https://tu-proyecto.supabase.co', // Tu URL
    anonKey: 'tu-anon-key-aqui' // Tu key
}
```

### **3. Ejecutar Base de Datos (2 min)**
En Supabase → SQL Editor:
1. Copia contenido de `supabase/migrations/001_initial_schema.sql`
2. Ejecuta el script
3. ¡Listo!

---

## 🔐 **Probar Autenticación**

1. **Recarga** la página de Habitus
2. **Click** en "🔐 Iniciar Sesión"
3. **Regístrate** con tu email
4. **Confirma** tu email (revisa bandeja)

---

## 🔄 **Migrar Datos Existentes**

1. **Inicia sesión** en Habitus
2. **Menú** (☰) → "☁️ Migrar a la Nube"
3. **Espera** a que se complete
4. **¡Datos en la nube!**

---

## ✅ **Verificar Funcionamiento**

```javascript
// En la consola del navegador:
console.log('Auth:', window.HabitusSupabase.auth.isAuthenticated());
console.log('User:', window.HabitusSupabase.auth.getCurrentUser());
console.log('Config:', window.HabitusSupabase.getConfig());
```

---

## 🎯 **¡LISTO!**

**Habitus v5** ahora tiene:
- ✅ Usuarios que se registran
- ✅ Datos en la nube
- ✅ Sincronización automática
- ✅ Funcionalidad offline mantenida

**¡Tu app está lista para escalar!** 🚀

