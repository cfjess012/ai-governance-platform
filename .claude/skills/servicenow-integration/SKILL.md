---
name: servicenow-integration
description: "ServiceNow REST API integration patterns including Table API, OAuth2 auth, field mapping, and the POC mock layer. Use when working on API sync, field mapping, or ServiceNow client code."
---

# ServiceNow Integration

## Architecture
- `src/lib/servicenow/client.ts` — Interface + mock implementation (in-memory store)
- `src/lib/servicenow/field-mapping.ts` — Config-driven field mapping

## Mock (POC)
In-memory store mimicking ServiceNow Table API. Returns realistic sys_id responses.

## Field Mapping
Config-driven: `{ formField, snowField, table, transform? }`. Add entry to connect form field to ServiceNow field.

## Production (Future)
- Table API: `https://{instance}.service-now.com/api/now/table/{tableName}`
- OAuth2 client credentials
- CRUD: GET, POST, PUT, DELETE
