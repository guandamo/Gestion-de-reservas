-- El campo telefono fue creado originalmente como NOT NULL en la migración init.
-- Esta migración lo convierte en nullable (opcional) para permitir el registro
-- sin teléfono y que sea un dato que el usuario complete luego desde su perfil.

ALTER TABLE "Usuario" ALTER COLUMN "telefono" DROP NOT NULL;
