# 🚨 GUÍA URGENTE: Aplicar Migración de Supabase

## ⚠️ **PROBLEMA CRÍTICO**
Las metas no se pueden crear porque faltan columnas en la tabla `user_goals` de Supabase.

## 🔧 **SOLUCIÓN INMEDIATA**

### **Paso 1: Acceder a Supabase**
1. Abre [supabase.com](https://supabase.com) en tu navegador
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto Habitus
4. Ve a **SQL Editor** en el menú lateral

### **Paso 2: Ejecutar Migración**
Copia y pega **EXACTAMENTE** este código en el SQL Editor:

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

### **Paso 3: Ejecutar**
1. Haz clic en **Run** (botón azul)
2. Espera a que aparezca "Success" en verde
3. Si hay errores, lee el mensaje y avísame

### **Paso 4: Verificar**
Ejecuta esta consulta para confirmar que funcionó:

```sql
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

## ✅ **RESULTADO ESPERADO**
Deberías ver estas columnas en la lista:
- `role_id` (UUID, nullable)
- `is_default` (BOOLEAN, default false)
- `color` (TEXT, default '#4F46E5')

## 🧪 **PRUEBA DESPUÉS**
1. Recarga tu aplicación
2. Intenta crear una meta
3. Debería funcionar sin errores

## 🚨 **SI HAY ERRORES**
Si ves errores como:
- "column already exists" → Las columnas ya están agregadas
- "permission denied" → Usa el rol correcto
- "table does not exist" → Verifica el nombre de la tabla

## 📞 **CONTACTO**
Si tienes problemas, envíame:
1. El mensaje de error exacto
2. Una captura de pantalla del SQL Editor
3. El resultado de la consulta de verificación

**🎯 OBJETIVO: Aplicar esta migración para que las metas funcionen correctamente**
