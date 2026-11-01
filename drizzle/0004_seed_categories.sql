-- Accounts made before the sign-up hook existed get the default categories too.
INSERT INTO "category" ("id", "user_id", "name", "color")
SELECT gen_random_uuid()::text, "user"."id", defaults.name, defaults.color
FROM "user"
CROSS JOIN (VALUES
  ('Design', '#5b8def'),
  ('Development', '#4fc1be'),
  ('Coding', '#b9a5f2'),
  ('Meeting', '#ffc94a'),
  ('Research', '#f47258'),
  ('Office Time', '#d6d6d1'),
  ('User Experience', '#7fd3ce')
) AS defaults(name, color)
ON CONFLICT DO NOTHING;
