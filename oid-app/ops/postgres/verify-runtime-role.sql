SELECT current_user AS runtime_role,
       has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage,
       has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create;

SELECT bool_and(has_table_privilege(current_user, format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE')) AS expected_dml,
       bool_or(has_table_privilege(current_user, format('%I.%I', schemaname, tablename), 'TRUNCATE,TRIGGER,REFERENCES')) AS forbidden_extra_table_privileges
FROM pg_tables
WHERE schemaname = 'public';
