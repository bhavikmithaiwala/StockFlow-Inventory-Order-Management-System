import { writeFileSync } from 'node:fs';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const str = (maxLength, minLength = 0) => ({ type: 'string', minLength, maxLength });
const integer = (minimum = 0, maximum = 1000000) => ({ type: 'integer', minimum, maximum });
const object = (properties, required = Object.keys(properties), strict = true) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: !strict,
});
const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const money = integer(0, 100000000);
const status = { type: 'string', enum: ['draft', 'confirmed', 'fulfilled', 'cancelled'] };
const movementType = {
  type: 'string',
  enum: ['receipt', 'adjustment', 'order-confirmed', 'order-cancelled'],
};
const preferences = object({ pageSize: { type: 'integer', enum: [10, 20, 50, 100] } });
const schemas = {
  Error: object({
    error: object({
      code: str(100, 1),
      message: str(1000, 1),
      requestId: { type: 'string', format: 'uuid' },
    }),
  }),
  Meta: object({
    page: integer(1, 100000),
    limit: integer(1, 100),
    total: integer(0, Number.MAX_SAFE_INTEGER),
  }),
  LoginInput: object({ email: { type: 'string', format: 'email' }, password: str(128, 1) }),
  ProfileInput: object({ name: str(100, 1), preferences }),
  UserInput: object(
    {
      name: str(100, 1),
      email: { type: 'string', format: 'email' },
      password: str(128, 12),
      role: { type: 'string', enum: ['admin', 'staff'], default: 'staff' },
    },
    ['name', 'email', 'password'],
  ),
  UserPatch: object(
    {
      name: str(100, 1),
      role: { type: 'string', enum: ['admin', 'staff'] },
      active: { type: 'boolean' },
    },
    [],
  ),
  PublicUser: object({
    id,
    name: str(100),
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'staff'] },
    preferences,
  }),
  UserRecord: object(
    {
      _id: id,
      name: str(100),
      emailNormalized: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'staff'] },
      active: { type: 'boolean' },
      preferences,
    },
    ['_id', 'name', 'emailNormalized', 'role', 'active'],
    false,
  ),
  CategoryInput: object({ name: str(100, 1), active: { type: 'boolean', default: true } }, [
    'name',
  ]),
  SupplierInput: object(
    {
      name: str(120, 1),
      contactName: str(100),
      email: { type: 'string', description: 'Email address or empty string' },
      phone: str(40),
      address: str(500),
      active: { type: 'boolean', default: true },
    },
    ['name'],
  ),
  ProductInput: object(
    {
      sku: {
        ...str(64, 1),
        description:
          'Whitespace removed and uppercased; normalized characters A-Z, 0-9, dot, underscore, hyphen',
      },
      name: str(150, 1),
      description: str(2000),
      categoryId: id,
      supplierId: id,
      unitPriceCents: money,
      reorderLevel: integer(),
      active: { type: 'boolean', default: true },
    },
    ['sku', 'name', 'categoryId', 'supplierId', 'unitPriceCents'],
  ),
  Category: object(
    { _id: id, name: str(100), normalizedName: str(100), active: { type: 'boolean' } },
    ['_id', 'name', 'active'],
    false,
  ),
  Supplier: object(
    {
      _id: id,
      name: str(120),
      contactName: str(100),
      email: { type: 'string' },
      phone: str(40),
      address: str(500),
      active: { type: 'boolean' },
    },
    ['_id', 'name', 'active'],
    false,
  ),
  Product: object(
    {
      _id: id,
      skuNormalized: str(64),
      name: str(150),
      description: str(2000),
      categoryId: { oneOf: [id, ref('Category')] },
      supplierId: { oneOf: [id, ref('Supplier')] },
      unitPriceCents: money,
      quantity: integer(),
      reorderLevel: integer(),
      active: { type: 'boolean' },
    },
    ['_id', 'skuNormalized', 'name', 'unitPriceCents', 'quantity', 'active'],
    false,
  ),
  ReceiptInput: object({ productId: id, quantity: integer(1), reason: str(500, 1) }),
  AdjustmentInput: object({
    productId: id,
    delta: { ...integer(-1000000), not: { enum: [0] } },
    reason: str(500, 1),
  }),
  StockResult: object({ productId: id, quantity: integer(), movementId: id }),
  DraftInput: object({
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: object({ productId: id, quantity: integer(1) }),
      description: 'Distinct product IDs; no supplied prices or totals',
    },
  }),
  CancelInput: object({ reason: str(500, 1) }),
  EmptyInput: object({}),
  Order: object(
    {
      _id: id,
      orderNumber: str(100),
      status,
      items: {
        type: 'array',
        items: object(
          {
            productId: id,
            quantity: integer(1),
            skuSnapshot: str(64),
            nameSnapshot: str(150),
            unitPriceCents: money,
          },
          ['productId', 'quantity', 'unitPriceCents'],
          false,
        ),
      },
      totalCents: integer(0, Number.MAX_SAFE_INTEGER),
      createdBy: { oneOf: [id, { type: 'object' }] },
      history: {
        type: 'array',
        items: object(
          {
            action: { type: 'string' },
            actorId: { oneOf: [id, { type: 'object' }] },
            at: { type: 'string', format: 'date-time' },
            reason: str(500),
          },
          ['action', 'actorId', 'at'],
          false,
        ),
      },
    },
    ['_id', 'orderNumber', 'status', 'items', 'totalCents', 'history'],
    false,
  ),
  Movement: object(
    {
      _id: id,
      productId: { oneOf: [id, { type: 'object', nullable: true }] },
      actorId: { oneOf: [id, { type: 'object', nullable: true }] },
      orderId: id,
      type: movementType,
      delta: integer(-1000000),
      beforeQuantity: integer(),
      afterQuantity: integer(),
      reason: str(500),
      createdAt: { type: 'string', format: 'date-time' },
    },
    ['_id', 'productId', 'actorId', 'type', 'delta', 'beforeQuantity', 'afterQuantity'],
    false,
  ),
  Dashboard: object({
    productCount: integer(),
    totalUnits: integer(0, Number.MAX_SAFE_INTEGER),
    inventoryValueCents: integer(0, Number.MAX_SAFE_INTEGER),
    lowStockCount: integer(),
    orderStatuses: { type: 'array', items: object({ _id: status, count: integer() }) },
    recentOrders: { type: 'array', items: { type: 'object' } },
    recentMovements: { type: 'array', items: ref('Movement') },
    categoryBreakdown: {
      type: 'array',
      items: object({
        _id: id,
        name: str(100),
        products: integer(),
        units: integer(0, Number.MAX_SAFE_INTEGER),
      }),
    },
  }),
};
for (const name of ['Category', 'Supplier', 'Product'])
  schemas[`${name}Patch`] = { ...schemas[`${name}Input`], required: [], minProperties: 1 };
schemas.UserPatch.minProperties = 1;
const query = (name, schema) => ({ name, in: 'query', schema });
const paging = [
  query('page', { ...integer(1, 100000), default: 1 }),
  query('limit', { ...integer(1, 100), default: 20 }),
];
const dates = ['from', 'to'].map((name) =>
  query(name, {
    type: 'string',
    format: 'date',
    description: 'Inclusive UTC date; from must not exceed to',
  }),
);
const orderFilters = [...paging, query('status', status), query('search', str(100)), ...dates];
const movementFilters = [...paging, query('productId', id), query('type', movementType), ...dates];
const productFilters = [
  ...paging,
  query('search', str(100)),
  ...['categoryId', 'supplierId'].map((name) => query(name, id)),
  query('active', { type: 'string', enum: ['true', 'false'] }),
  query('sort', {
    type: 'string',
    enum: ['name', 'skuNormalized', 'quantity', 'unitPriceCents', 'createdAt'],
    default: 'name',
  }),
  query('direction', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
];
const paths = {};
const data = (name, list = false) =>
  object({
    data: list ? { type: 'array', items: ref(name) } : ref(name),
    ...(list ? { meta: ref('Meta') } : {}),
  });
function operation(path, method, summary, response, options = {}) {
  const parameters = [
    ...(path.includes('{id}') ? [{ name: 'id', in: 'path', required: true, schema: id }] : []),
    ...(options.query ?? []),
  ];
  if (!['get', 'head'].includes(method))
    parameters.push({
      name: 'Origin',
      in: 'header',
      required: true,
      schema: { type: 'string' },
      description: 'Must exactly equal configured APP_ORIGIN; no arbitrary write query parameters',
    });
  const responses = {
    [options.code ?? 200]:
      options.code === 204
        ? { description: 'Session revoked; cookie cleared' }
        : {
            description: 'Success',
            content: {
              'application/json': { schema: response },
              ...(options.csv ? { 'text/csv': { schema: { type: 'string' } } } : {}),
            },
          },
  };
  for (const code of [400, 401, 403, 404, 409, 413, 429, 500])
    responses[code] = {
      description: {
        400: 'Invalid input',
        401: 'Missing, expired, revoked session or invalid credentials',
        403: 'Forbidden role or origin',
        404: 'Not found',
        409: 'Uniqueness, stock or transition conflict',
        413: 'Request or export too large',
        429: 'Login rate limited',
        500: 'Internal error',
      }[code],
      content: { 'application/json': { schema: ref('Error') } },
    };
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    tags: [path.split('/')[1]],
    parameters,
    responses,
    ...(options.public ? { security: [] } : {}),
    ...(options.input
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ref(options.input) } },
          },
        }
      : {}),
    'x-roles': options.admin ? ['admin'] : ['admin', 'staff'],
    ...(options.csv
      ? {
          description:
            'format=csv exports all matching rows, ignores page/limit and rejects more than 10,000 rows. Quoted UTF-8 BOM CSV with spreadsheet formula neutralization.',
        }
      : {}),
  };
}
operation(
  '/health',
  'get',
  'Process liveness',
  object({ data: object({ status: { type: 'string', enum: ['ok'] } }) }),
  { public: true },
);
operation(
  '/openapi.json',
  'get',
  'Download this OpenAPI contract',
  { type: 'object' },
  { public: true },
);
operation(
  '/ready',
  'get',
  'Database replica-set primary readiness (503 when unavailable)',
  object({
    data: object({ status: { type: 'string', enum: ['ready'] }, replicaSet: { type: 'string' } }),
  }),
  { public: true },
);
paths['/ready'].get.responses['503'] = {
  description: 'Database unavailable or not a writable replica-set primary',
  content: { 'application/json': { schema: ref('Error') } },
};
operation('/auth/login', 'post', 'Create an eight-hour opaque cookie session', data('PublicUser'), {
  input: 'LoginInput',
  public: true,
});
operation('/auth/me', 'get', 'Get authenticated active user', data('PublicUser'));
operation('/auth/profile', 'patch', 'Update own name and page preference', data('PublicUser'), {
  input: 'ProfileInput',
});
operation('/auth/logout', 'post', 'Revoke current session', null, { code: 204 });
for (const [path, name] of [
  ['categories', 'Category'],
  ['suppliers', 'Supplier'],
  ['products', 'Product'],
  ['users', 'User'],
]) {
  const record = name === 'User' ? 'UserRecord' : name;
  operation(`/${path}`, 'get', `List ${path}`, data(record, true), {
    query: path === 'products' ? productFilters : paging,
    admin: name === 'User',
  });
  operation(`/${path}`, 'post', `Create ${name.toLowerCase()}`, data(record), {
    input: `${name}Input`,
    code: 201,
    admin: true,
  });
  operation(`/${path}/{id}`, 'patch', `Edit ${name.toLowerCase()}`, data(record), {
    input: `${name}Patch`,
    admin: true,
  });
}
operation('/products/{id}', 'get', 'Product detail', data('Product'));
operation('/products/{id}', 'delete', 'Soft deactivate product', data('Product'), { admin: true });
operation(
  '/inventory/receive',
  'post',
  'Atomically receive stock and append movement',
  data('StockResult'),
  { input: 'ReceiptInput', code: 201 },
);
operation('/inventory/adjust', 'post', 'Atomically adjust stock with reason', data('StockResult'), {
  input: 'AdjustmentInput',
  code: 201,
  admin: true,
});
operation(
  '/inventory/low-stock',
  'get',
  'Active quantity at or below reorder threshold',
  data('Product', true),
  { query: paging },
);
operation('/inventory/movements', 'get', 'Audit movement history', data('Movement', true), {
  query: movementFilters,
});
operation('/orders', 'get', 'List orders', data('Order', true), { query: orderFilters });
operation('/orders', 'post', 'Create draft without reserving stock', data('Order'), {
  input: 'DraftInput',
  code: 201,
});
operation('/orders/{id}', 'get', 'Order detail and actor history', data('Order'));
operation('/orders/{id}', 'patch', 'Replace draft lines and recalculate total', data('Order'), {
  input: 'DraftInput',
});
for (const action of ['confirm', 'fulfill', 'cancel'])
  operation(
    `/orders/{id}/${action}`,
    'post',
    {
      confirm: 'Confirm once: conditional stock deduction and ledger transaction',
      fulfill: 'Fulfill confirmed order without another stock deduction',
      cancel: 'Cancel draft or atomically restore confirmed stock once',
    }[action],
    data('Order'),
    { input: action === 'cancel' ? 'CancelInput' : 'EmptyInput', admin: action === 'fulfill' },
  );
operation(
  '/dashboard/stats',
  'get',
  'Live inventory, order and category aggregates',
  data('Dashboard'),
);
const format = query('format', { type: 'string', enum: ['json', 'csv'], default: 'json' });
const inventoryResponse = {
  ...data('Product', true),
  properties: {
    ...data('Product', true).properties,
    summary: object({
      quantity: integer(0, Number.MAX_SAFE_INTEGER),
      valueCents: integer(0, Number.MAX_SAFE_INTEGER),
    }),
  },
};
operation(
  '/reports/inventory',
  'get',
  'Inventory valuation and low-stock report',
  inventoryResponse,
  {
    csv: true,
    query: [
      ...paging,
      ...['active', 'lowStock'].map((name) =>
        query(name, {
          type: 'string',
          enum: ['true', 'false'],
          default: name === 'active' ? 'true' : 'false',
        }),
      ),
      ...['categoryId', 'supplierId'].map((name) => query(name, id)),
      format,
    ],
  },
);
operation('/reports/orders', 'get', 'Order report', data('Order', true), {
  csv: true,
  query: [...orderFilters, format],
});
operation('/reports/stock-movements', 'get', 'Stock audit report', data('Movement', true), {
  csv: true,
  query: [...movementFilters, format],
});
function removeEmptyRequired(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.required) && !value.required.length) delete value.required;
  for (const child of Object.values(value)) removeEmptyRequired(child);
}
removeEmptyRequired(schemas);
removeEmptyRequired(paths);
writeFileSync(
  new URL('../docs/openapi.json', import.meta.url),
  JSON.stringify(
    {
      openapi: '3.0.3',
      info: {
        title: 'StockFlow API',
        version: '1.0.0',
        description:
          'Integer cents and quantities. MongoDB replica-set transactions. All writes require exact APP_ORIGIN. Repeated lifecycle actions return 409 and never repeat stock effects. Admin accounts cannot be deactivated or demoted.',
      },
      servers: [
        { url: 'http://localhost:3000/api', description: 'Local development API' },
        { url: '/api', description: 'Same-origin production' },
      ],
      security: [{ sessionCookie: [] }],
      paths,
      components: {
        securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'sf_session' } },
        schemas,
      },
    },
    null,
    2,
  ) + '\n',
);
