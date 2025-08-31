# 🔧 Instrucciones para Aplicar Migración de Supabase

## 📋 **Problema Identificado**
El error indica que las columnas `color`, `role_id`, e `is_default` no existen en la tabla `user_goals` de Supabase.

## 🛠️ **Solución: Aplicar Migración Manual**

### **Paso 1: Acceder al Panel de Supabase**
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto Habitus
4. Ve a la sección **SQL Editor**

### **Paso 2: Ejecutar la Migración**
Copia y pega el siguiente código SQL en el editor:

```sql
-- Add missing columns to user_goals table
-- Migration to support role_id, is_default, and color columns

-- Add role_id column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN role_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL;

-- Add is_default column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Add color column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN color TEXT DEFAULT '#4F46E5';

-- Create index for role_id for better performance
CREATE INDEX idx_user_goals_role_id ON public.user_goals(role_id);

-- Update existing goals to have default values
UPDATE public.user_goals 
SET 
    is_default = false,
    color = '#4F46E5'
WHERE is_default IS NULL OR color IS NULL;

-- Add comment to document the changes
COMMENT ON COLUMN public.user_goals.role_id IS 'Reference to the role this goal belongs to';
COMMENT ON COLUMN public.user_goals.is_default IS 'Whether this is a default goal for the role';
COMMENT ON COLUMN public.user_goals.color IS 'Color code for the goal display';
```

### **Paso 3: Ejecutar la Consulta**
1. Haz clic en **Run** o presiona `Ctrl+Enter`
2. Verifica que no hay errores en la consola
3. Confirma que las columnas se han agregado

### **Paso 4: Verificar la Migración**
Ejecuta esta consulta para verificar que las columnas se han agregado:

```sql
-- Verificar que las columnas se han agregado
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_goals' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## ✅ **Resultado Esperado**
Después de aplicar la migración, deberías ver:
- ✅ Columna `role_id` (UUID, nullable)
- ✅ Columna `is_default` (BOOLEAN, default false)
- ✅ Columna `color` (TEXT, default '#4F46E5')

## 🧪 **Prueba Después de la Migración**
1. Recarga la aplicación
2. Intenta crear una nueva meta
3. Verifica que no hay errores en la consola
4. Confirma que la meta aparece en la UI

## 🚨 **Si Hay Errores**
Si encuentras errores al ejecutar la migración:

1. **Error de permisos**: Asegúrate de estar usando el rol correcto
2. **Error de sintaxis**: Verifica que el SQL esté bien formateado
3. **Error de referencia**: Asegúrate de que la tabla `user_roles` existe

## 📞 **Soporte**
Si necesitas ayuda adicional, puedes:
- Revisar los logs de Supabase
- Verificar la estructura de la base de datos
- Contactar al soporte de Supabase

**🎉 Una vez aplicada la migración, las metas deberían funcionar correctamente!**
