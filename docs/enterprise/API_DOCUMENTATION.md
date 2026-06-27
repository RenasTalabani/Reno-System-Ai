# Reno System — API Documentation Index v1.0.0

---

## Interactive Documentation

Full interactive API documentation is available at runtime:

```
https://api.yourdomain.com/docs
```

This is an OpenAPI 3.0.3 spec rendered with Swagger UI, including:
- All endpoints with request/response schemas
- Authentication instructions
- Live "Try it out" capability
- Code examples in curl, JavaScript, Python

Download the raw spec:
```bash
curl https://api.yourdomain.com/docs/json > reno-openapi.json
curl https://api.yourdomain.com/docs/yaml > reno-openapi.yaml
```

---

## API Base URL

```
https://api.yourdomain.com/api/v1
```

---

## Authentication

All endpoints require authentication:

```
Authorization: Bearer <access-token>
```

Or API key:
```
X-API-Key: reno_key_<your-key>
```

---

## Module Route Index

### Core / Auth
| Method | Path | Description |
|---|---|---|
| POST | /auth/login | Login and receive tokens |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout / revoke session |
| GET | /auth/me | Get current user |
| POST | /auth/2fa/enable | Enable 2FA |
| POST | /auth/2fa/verify | Verify TOTP code |

### System / Admin
| Method | Path | Description |
|---|---|---|
| GET | /admin/tenants | List tenants (SUPER_ADMIN) |
| POST | /admin/tenants | Create tenant |
| GET | /health | API health check |
| GET | /health/detailed | Full system health |
| GET | /metrics | Prometheus metrics |

### HR
| Method | Path | Description |
|---|---|---|
| GET | /hr/employees | List employees |
| POST | /hr/employees | Create employee |
| GET | /hr/employees/:id | Get employee |
| PUT | /hr/employees/:id | Update employee |
| GET | /hr/leave/requests | List leave requests |
| POST | /hr/leave/requests | Submit leave request |
| PUT | /hr/leave/requests/:id/approve | Approve/reject leave |
| GET | /hr/payroll | List payroll runs |
| POST | /hr/payroll | Create payroll run |
| GET | /hr/performance/reviews | List reviews |

### CRM
| Method | Path | Description |
|---|---|---|
| GET | /crm/contacts | List contacts |
| POST | /crm/contacts | Create contact |
| GET | /crm/contacts/:id | Get contact |
| PUT | /crm/contacts/:id | Update contact |
| DELETE | /crm/contacts/:id | Delete contact |
| GET | /crm/companies | List companies |
| POST | /crm/companies | Create company |
| GET | /crm/opportunities | List opportunities |
| POST | /crm/opportunities | Create opportunity |
| PUT | /crm/opportunities/:id | Update opportunity |
| GET | /crm/pipelines | List pipelines |
| GET | /crm/activities | List activities |
| POST | /crm/activities | Log activity |

### Sales
| Method | Path | Description |
|---|---|---|
| GET | /sales/quotations | List quotations |
| POST | /sales/quotations | Create quotation |
| POST | /sales/quotations/:id/confirm | Convert to order |
| GET | /sales/orders | List orders |
| GET | /sales/invoices | List invoices |
| POST | /sales/invoices | Create invoice |
| POST | /sales/invoices/:id/send | Send to customer |
| POST | /sales/invoices/:id/pay | Register payment |
| GET | /sales/payments | List payments |
| GET | /sales/subscriptions | List subscriptions |

### Finance
| Method | Path | Description |
|---|---|---|
| GET | /finance/accounts | Chart of accounts |
| GET | /finance/journals | List journal entries |
| POST | /finance/journals | Create journal entry |
| GET | /finance/budgets | List budgets |
| POST | /finance/budgets | Create budget |
| GET | /finance/bank/accounts | List bank accounts |
| POST | /finance/bank/reconcile | Run reconciliation |

### Inventory
| Method | Path | Description |
|---|---|---|
| GET | /inventory/products | List products |
| POST | /inventory/products | Create product |
| GET | /inventory/warehouses | List warehouses |
| GET | /inventory/movements | List stock movements |
| POST | /inventory/movements | Record movement |
| GET | /inventory/stock | Current stock levels |
| GET | /inventory/alerts | Stock alerts |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | /projects | List projects |
| POST | /projects | Create project |
| GET | /projects/:id | Get project |
| PUT | /projects/:id | Update project |
| GET | /projects/:id/tasks | List tasks |
| POST | /projects/:id/tasks | Create task |
| PUT | /tasks/:id | Update task |
| GET | /projects/:id/milestones | List milestones |
| POST | /time-logs | Log time |

### Procurement
| Method | Path | Description |
|---|---|---|
| GET | /procurement/rfqs | List RFQs |
| POST | /procurement/rfqs | Create RFQ |
| GET | /procurement/orders | List purchase orders |
| POST | /procurement/orders | Create PO |
| PUT | /procurement/orders/:id/approve | Approve PO |
| GET | /procurement/suppliers | List suppliers |

### Manufacturing
| Method | Path | Description |
|---|---|---|
| GET | /manufacturing/boms | List BOMs |
| POST | /manufacturing/boms | Create BOM |
| GET | /manufacturing/orders | List production orders |
| POST | /manufacturing/orders | Create production order |
| PUT | /manufacturing/orders/:id/start | Start production |
| PUT | /manufacturing/orders/:id/complete | Complete production |
| GET | /manufacturing/quality | Quality checks |

### Helpdesk
| Method | Path | Description |
|---|---|---|
| GET | /helpdesk/tickets | List tickets |
| POST | /helpdesk/tickets | Create ticket |
| GET | /helpdesk/tickets/:id | Get ticket |
| PUT | /helpdesk/tickets/:id | Update ticket |
| POST | /helpdesk/tickets/:id/messages | Add message |
| PUT | /helpdesk/tickets/:id/assign | Assign ticket |
| PUT | /helpdesk/tickets/:id/close | Close ticket |
| GET | /helpdesk/sla-policies | List SLA policies |

### Knowledge Base
| Method | Path | Description |
|---|---|---|
| GET | /kb/articles | List articles |
| POST | /kb/articles | Create article |
| GET | /kb/articles/:id | Get article |
| PUT | /kb/articles/:id | Update article |
| POST | /kb/articles/:id/publish | Publish article |
| GET | /kb/categories | List categories |
| POST | /kb/search | Search articles |

### Communications
| Method | Path | Description |
|---|---|---|
| GET | /comm/threads | List inbox threads |
| POST | /comm/threads | Create thread |
| GET | /comm/threads/:id | Get thread with messages |
| POST | /comm/threads/:id/messages | Send message |
| PUT | /comm/threads/:id/assign | Assign thread |
| GET | /comm/channels | List channels |

### Documents
| Method | Path | Description |
|---|---|---|
| GET | /docs | List documents |
| POST | /docs/upload | Upload document |
| GET | /docs/:id | Get document |
| DELETE | /docs/:id | Delete document |
| GET | /docs/:id/versions | Version history |
| POST | /docs/:id/versions/:versionId/restore | Restore version |

### Automation
| Method | Path | Description |
|---|---|---|
| GET | /automation/workflows | List workflows |
| POST | /automation/workflows | Create workflow |
| PUT | /automation/workflows/:id/activate | Activate |
| PUT | /automation/workflows/:id/deactivate | Deactivate |
| GET | /automation/executions | Execution history |

### Reno Brain / AI
| Method | Path | Description |
|---|---|---|
| POST | /brain/ask | Ask Brain a question |
| GET | /brain/actions | List brain actions |
| PUT | /brain/actions/:id/approve | Approve brain action |
| PUT | /brain/actions/:id/reject | Reject brain action |
| GET | /brain/recommendations | List recommendations |
| POST | /brain/feedback | Submit recommendation feedback |
| GET | /brain/accuracy | Accuracy summary |
| GET | /brain/accuracy/trend | Accuracy trend |
| GET | /brain/briefing/today | Today's briefing |
| POST | /brain/briefing/generate | Force generate briefing |
| GET | /brain/board | Board sessions |
| POST | /brain/board | Create board session |
| POST | /brain/board/:id/simulate | Run AI simulation |
| GET | /brain/memory/business | List business memories |
| POST | /brain/memory/business | Create memory |
| GET | /brain/memory/business/context | Get context memories |
| GET | /brain/search/semantic | Semantic search |
| POST | /brain/embeddings | Index entity |

### Backup & DR
| Method | Path | Description |
|---|---|---|
| GET | /backup/status | Backup system status |
| GET | /backup/jobs | List backup jobs |
| POST | /backup/jobs | Create backup job |
| POST | /backup/jobs/:id/verify | Verify backup integrity |
| POST | /backup/restore | Restore from backup |
| GET | /dr/readiness | DR readiness score |
| GET | /dr/playbooks | List DR playbooks |
| POST | /dr/playbooks/:id/execute | Execute playbook |

### Developer / Webhooks
| Method | Path | Description |
|---|---|---|
| GET | /webhooks | List webhooks |
| POST | /webhooks | Create webhook |
| DELETE | /webhooks/:id | Delete webhook |
| GET | /api-keys | List API keys |
| POST | /api-keys | Create API key |
| DELETE | /api-keys/:id | Revoke API key |
| GET | /plugins | List plugins |
| POST | /plugins/install | Install plugin |
| DELETE | /plugins/:id | Uninstall plugin |

---

## Standard Response Formats

### Success — single resource
```json
{ "data": { "id": "...", ... } }
```

### Success — collection
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
}
```

### Error
```json
{ "statusCode": 422, "error": "Unprocessable Entity", "message": "Validation failed", "details": [...] }
```

---

## Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1751020800
```
