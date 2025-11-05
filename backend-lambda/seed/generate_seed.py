import random, uuid, csv, sys
from datetime import datetime, timedelta

first_names = ["Juan","María","Carlos","Ana","Luis","Sofía","Pedro","Lucía","Jorge","Elena"]
last_names = ["García","Hernández","Martínez","López","González","Pérez","Sánchez","Ramírez","Cruz","Flores"]
departments = ["Engineering","Sales","HR","Finance","Operations"]
roles = ["IC","Manager","Director","VP"]
locations = ["CDMX","Guadalajara","Monterrey","Puebla"]
statuses = ["Active","Leave","Inactive"]

n = int(sys.argv[1]) if len(sys.argv) > 1 else 200

rows = []
for _ in range(n):
    fn = random.choice(first_names)
    ln = random.choice(last_names)
    email = f"{fn.lower()}.{ln.lower()}@example.com"
    rows.append({
        'id': str(uuid.uuid4()),
        'first_name': fn,
        'last_name': ln,
        'email': email,
        'phone': f"55{random.randint(10000000,99999999)}",
        'department': random.choice(departments),
        'role': random.choice(roles),
        'location': random.choice(locations),
        'status': random.choice(statuses),
        'hire_date': (datetime.utcnow() - timedelta(days=random.randint(0, 3650))).isoformat(),
        'tags': '{"{" + ",".join(random.sample(["remote","hybrid","fulltime","contract"], k=random.randint(0,2))) + "}"}',
        'avatar_url': ''
    })

writer = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()))
writer.writeheader()
writer.writerows(rows)

