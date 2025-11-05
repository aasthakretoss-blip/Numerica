#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect(
    host='gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
    port=5432,
    database='GSAUDB',
    user='postgres',
    password='SanNicolasTotolapan23_Gloria5!',
    sslmode='require'
)

cursor = conn.cursor()

# Verificar que los campos son diferentes
cursor.execute('''
SELECT 
    "CURP",
    "Nombre completo",
    " SUELDO CLIENTE " as sueldo_cliente,
    " TOTAL DE PERCEPCIONES " as total_percepciones,
    CASE 
        WHEN " SUELDO CLIENTE " = " TOTAL DE PERCEPCIONES " THEN 'IGUALES'
        ELSE 'DIFERENTES'
    END as comparacion
FROM historico_nominas_gsau
WHERE " TOTAL DE PERCEPCIONES " IS NOT NULL
LIMIT 10
''')

print('CURP | Nombre | Sueldo Cliente | Total Percepciones | Comparación')
print('-' * 100)
for row in cursor.fetchall():
    print(f'{row[0]} | {row[1][:20]} | {row[2]} | {row[3]} | {row[4]}')

cursor.close()
conn.close()

