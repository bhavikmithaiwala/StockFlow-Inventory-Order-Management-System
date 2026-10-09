import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'node:fs';
const path = new URL('../docs/openapi.json', import.meta.url);
const document = await SwaggerParser.validate(JSON.parse(readFileSync(path, 'utf8')));
const operations = Object.values(document.paths).flatMap((path) => Object.values(path));
if (operations.length !== 36)
  throw new Error(`Expected 36 implemented API operations; found ${operations.length}`);
console.log(`Validated OpenAPI ${document.openapi}: ${operations.length} operations`);
