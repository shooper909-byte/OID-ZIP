import re
from pathlib import Path
schema=Path('/mnt/data/oid_complete/oid-app/prisma/schema.prisma').read_text()

def enum_blocks():
    return re.findall(r'enum\s+(\w+)\s*\{([^}]*)\}', schema, re.S)

def model_blocks():
    return re.findall(r'model\s+(\w+)\s*\{(.*?)\n\}', schema, re.S)

enums=dict(enum_blocks())
models_raw=dict(model_blocks())
model_names=set(models_raw)

def table_name(name,body):
    m=re.search(r'@@map\("([^"]+)"\)',body)
    return m.group(1) if m else name

def field_col(name,attrs):
    m=re.search(r'@map\("([^"]+)"\)',attrs)
    return m.group(1) if m else name

tables={n:table_name(n,b) for n,b in models_raw.items()}
fields_meta={}
for mn,b in models_raw.items():
    fm={}
    for raw in b.splitlines():
        line=raw.strip()
        if not line or line.startswith('@@') or line.startswith('//'): continue
        parts=line.split(None,2)
        if len(parts)<2: continue
        fn,ft=parts[0],parts[1]
        attrs=parts[2] if len(parts)>2 else ''
        fm[fn]=(ft,attrs,field_col(fn,attrs))
    fields_meta[mn]=fm

out=['CREATE EXTENSION IF NOT EXISTS pgcrypto;','']
for en,body in enums.items():
    vals=[v for v in re.findall(r'\b[A-Z][A-Z0-9_]*\b', body) if v not in {'ENUM'}]
    out.append(f'DO $$ BEGIN CREATE TYPE "{en}" AS ENUM ({", ".join(repr(v) for v in vals)}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;')
out.append('')

def sql_type(ft):
    base=ft.rstrip('?').rstrip('[]')
    if base in enums: return f'"{base}"'
    return {'String':'text','Int':'integer','BigInt':'bigint','Decimal':'numeric','Boolean':'boolean','DateTime':'timestamptz','Json':'jsonb','Bytes':'bytea','Float':'double precision'}.get(base,'text')

def default_sql(attrs,ft):
    if '@default(uuid())' in attrs:return ' DEFAULT gen_random_uuid()'
    if '@default(now())' in attrs:return ' DEFAULT now()'
    m=re.search(r'@default\((true|false|-?\d+(?:\.\d+)?)\)',attrs)
    if m:return ' DEFAULT '+m.group(1)
    m=re.search(r'@default\("([^"]*)"\)',attrs)
    if m:return " DEFAULT '"+m.group(1).replace("'","''")+"'"
    m=re.search(r'@default\((\w+)\)',attrs)
    if m and ft.rstrip('?') in enums:return " DEFAULT '"+m.group(1)+"'"
    if '@updatedAt' in attrs:return ' DEFAULT now()'
    return ''

relations=[]
indexes=[]
for mn,body in models_raw.items():
    tn=tables[mn]
    cols=[]; table_constraints=[]
    fm=fields_meta[mn]
    for fn,(ft,attrs,col) in fm.items():
        base=ft.rstrip('?').rstrip('[]')
        if ft.endswith('[]') or (base in model_names and '@relation' in attrs):
            if '@relation' in attrs:
                mf=re.search(r'fields:\s*\[([^\]]+)\]',attrs); mr=re.search(r'references:\s*\[([^\]]+)\]',attrs); md=re.search(r'onDelete:\s*(\w+)',attrs)
                if mf and mr:
                    local=[x.strip() for x in mf.group(1).split(',')]; remote=[x.strip() for x in mr.group(1).split(',')]
                    relations.append((mn,base,local,remote,md.group(1).upper() if md else None))
            continue
        typ=sql_type(ft)
        if '@db.Uuid' in attrs: typ='uuid'
        if '@db.Date' in attrs: typ='date'
        null='' if ft.endswith('?') else ' NOT NULL'
        default=default_sql(attrs,ft)
        extra=''
        if '@id' in attrs: extra+=' PRIMARY KEY'
        if '@unique' in attrs: extra+=' UNIQUE'
        cols.append(f'  "{col}" {typ}{null}{default}{extra}')
    for line in body.splitlines():
        s=line.strip()
        m=re.match(r'@@id\(\[([^\]]+)\]\)',s)
        if m:
            cs=[fm[x.strip()][2] for x in m.group(1).split(',')]
            table_constraints.append('  PRIMARY KEY ('+', '.join(f'"{c}"' for c in cs)+')')
        m=re.match(r'@@unique\(\[([^\]]+)\]',s)
        if m:
            cs=[fm[x.strip()][2] for x in m.group(1).split(',')]
            table_constraints.append('  UNIQUE ('+', '.join(f'"{c}"' for c in cs)+')')
        m=re.match(r'@@index\(\[([^\]]+)\]',s)
        if m:
            cs=[fm[x.strip()][2] for x in m.group(1).split(',')]
            indexes.append((tn,cs))
    all_defs=cols+table_constraints
    out.append(f'CREATE TABLE IF NOT EXISTS "{tn}" (\n'+',\n'.join(all_defs)+'\n);')
    out.append('')

# Foreign keys after all tables exist
for mn,target,local,remote,ondelete in relations:
    ltn=tables[mn]; rtn=tables[target]
    lcols=[fields_meta[mn][x][2] for x in local]
    rcols=[fields_meta[target][x][2] for x in remote]
    cname=('fk_'+ltn+'_'+'_'.join(lcols))[:55]
    clause=f'ALTER TABLE "{ltn}" ADD CONSTRAINT "{cname}" FOREIGN KEY ('+', '.join(f'"{c}"' for c in lcols)+') REFERENCES "'+rtn+'" ('+', '.join(f'"{c}"' for c in rcols)+')'
    if ondelete and ondelete in {'CASCADE','RESTRICT','SETNULL','NOACTION'}:
        clause+=' ON DELETE '+{'SETNULL':'SET NULL','NOACTION':'NO ACTION'}.get(ondelete,ondelete)
    out.append('DO $$ BEGIN '+clause+'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;')
for i,(tn,cs) in enumerate(indexes,1):
    name=('idx_'+tn+'_'+'_'.join(cs))[:55]
    out.append(f'CREATE INDEX IF NOT EXISTS "{name}" ON "{tn}" ('+', '.join(f'"{c}"' for c in cs)+');')

# Additional foreign keys for scalar cross-domain references intentionally kept relation-light in Prisma.
custom_fks = [
 ('capas','exception_id','Exception','id','RESTRICT'),
 ('customer_orders','organization_id','organizations','id','RESTRICT'),
 ('customer_order_items','customer_order_id','customer_orders','id','CASCADE'),
 ('customer_order_items','product_id','Product','id','RESTRICT'),
 ('customer_order_items','sku_id','Sku','id','RESTRICT'),
 ('market_observations','product_id','Product','id','SET NULL'),
 ('market_observations','competitor_id','competitors','id','SET NULL'),
 ('market_observations','source_document_id','Document','id','SET NULL'),
 ('research_sources','product_id','Product','id','SET NULL'),
 ('migration_conflicts','import_batch_id','import_batches','id','CASCADE'),
 ('legacy_import_map','import_batch_id','import_batches','id','CASCADE'),
 ('Allocation','customerOrderItemId','customer_order_items','id','RESTRICT'),
]
for lt,lc,rt,rc,od in custom_fks:
    cname=('fk_'+lt+'_'+lc)[:55]
    out.append(f'DO $$ BEGIN ALTER TABLE \"{lt}\" ADD CONSTRAINT \"{cname}\" FOREIGN KEY (\"{lc}\") REFERENCES \"{rt}\" (\"{rc}\") ON DELETE {od}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;')

# critical DB-level guards compatible with Prisma table/field naming
out += ['', '-- OID critical database-level controls',
'''CREATE OR REPLACE FUNCTION oid_allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ls "LotStatus"; gs "GateStatus"; available numeric;
BEGIN
  SELECT "status", "releaseGateStatus" INTO ls, gs FROM "Lot" WHERE "id"=NEW."lotId" FOR UPDATE;
  IF ls IS DISTINCT FROM 'RELEASED' THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:LOT_NOT_RELEASED'; END IF;
  IF gs IS DISTINCT FROM 'PASS' THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:RELEASE_GATE_NOT_PASS'; END IF;
  SELECT COALESCE(SUM("quantityIn"-"quantityOut"),0) INTO available FROM "InventoryMovement" WHERE "lotId"=NEW."lotId";
  IF available < NEW."quantity" THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:INSUFFICIENT_INVENTORY'; END IF;
  RETURN NEW;
END $$;''',
'''DROP TRIGGER IF EXISTS allocation_guard ON "Allocation";
CREATE TRIGGER allocation_guard BEFORE INSERT ON "Allocation" FOR EACH ROW EXECUTE FUNCTION oid_allocation_guard();''',
'''CREATE OR REPLACE FUNCTION oid_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE'; END $$;''',
'''DROP TRIGGER IF EXISTS audit_immutable_update ON "AuditLog";
CREATE TRIGGER audit_immutable_update BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION oid_audit_immutable();''']

path=Path('/mnt/data/oid_complete/oid-app/prisma/migrations/202608070001_oid_v1_init')
path.mkdir(parents=True,exist_ok=True)
(path/'migration.sql').write_text('\n'.join(out)+'\n')
print('generated',len(out),'statements/blocks')
