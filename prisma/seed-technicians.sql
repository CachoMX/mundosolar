-- Seed 4 demo technicians + 1 manager
-- Password for all: tech123

INSERT INTO "users" ("id", "name", "email", "password", "role", "isActive", "employeeId", "department", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'Juan Técnico',
    'juan.tecnico@mundosolar.com',
    '$2a$10$vhpBI4kc0mENpK3QQyAWYuBvKqNBkoKWXnvgtKtA.Al.W.eRqdKhO',
    'TECHNICIAN'::"UserRole",
    true,
    'TECH001',
    'Mantenimiento',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'María Técnico',
    'maria.tecnico@mundosolar.com',
    '$2a$10$ndhRuk.t8r.QnIElmFHnrOlGADehhKrKQIW7UMgpSzCJ0QQuhX0qu',
    'TECHNICIAN'::"UserRole",
    true,
    'TECH002',
    'Mantenimiento',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Carlos Técnico',
    'carlos.tecnico@mundosolar.com',
    '$2a$10$u1H0wLFYfNo20h6y63622O/aC58RpUiFkWojh3aGXRK1254RIXU96',
    'TECHNICIAN'::"UserRole",
    true,
    'TECH003',
    'Mantenimiento',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Ana Técnico',
    'ana.tecnico@mundosolar.com',
    '$2a$10$.ko7zCRLInN2h8h1bZaBh.riPTht3EXDAcousdI3Eg9WkRQECKjJu',
    'TECHNICIAN'::"UserRole",
    true,
    'TECH004',
    'Mantenimiento',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'Roberto Manager',
    'roberto.manager@mundosolar.com',
    '$2a$10$rcul5ZNUt3gkGz7CbDGh8OdExVkNEW7WkDaAEhS0JRvivwV0ASlGa',
    'MANAGER'::"UserRole",
    true,
    'MGR001',
    'Operaciones',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
