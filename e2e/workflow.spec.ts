import { test, expect, type Page } from '@playwright/test';
import { mkdir, copyFile } from 'node:fs/promises';

async function login(page: Page, email = 'admin@stockflow.test') {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('StockFlowDemo!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Warehouse dashboard' })).toBeVisible();
}
test('real browser catalog, stock, fulfillment, cancellation, reports and evidence', async ({
  page,
}) => {
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/demo', { recursive: true });
  await login(page);
  await page.getByRole('link', { name: 'Categories', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Demo stationery');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Demo stationery', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Suppliers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suppliers', exact: true })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('North Supply');
  await page.getByLabel('Email', { exact: true }).fill('contact@north.example');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'North Supply', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await page.getByRole('link', { name: 'Create product' }).click();
  await page.getByLabel('SKU', { exact: true }).fill('DEMO-01');
  await page.getByLabel('Name', { exact: true }).fill('Notebook');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Demo stationery' });
  await page.getByLabel('Supplier', { exact: true }).selectOption({ label: 'North Supply' });
  await page.getByLabel('Unit price (USD cents)').fill('450');
  await page.getByLabel('Reorder level', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('heading', { name: 'Notebook', exact: true })).toBeVisible();
  const productId = page.url().split('/').at(-1)!;
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();
  await page.getByLabel('Product', { exact: true }).selectOption(productId);
  await page.getByLabel('Units received').fill('5');
  await page.getByLabel('Reason', { exact: true }).fill('Demo delivery of five notebooks');
  await page.getByRole('button', { name: 'Record stock change' }).click();
  await expect(
    page.getByText('Stock change recorded. Product now has 5 units.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Stock movements', exact: true }).click();
  await expect(page.getByRole('cell', { name: /Demo delivery/ })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/movements.png', fullPage: true });
  const draft = async (quantity: number) => {
    await page.getByRole('link', { name: 'Orders', exact: true }).click();
    await page.getByRole('link', { name: 'Create draft order' }).click();
    await page.getByLabel('Product 1', { exact: true }).selectOption(productId);
    await page.getByLabel('Quantity', { exact: true }).fill(String(quantity));
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByRole('button', { name: 'Confirm order', exact: true })).toBeVisible();
  };
  await draft(4);
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fulfill order', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fulfill order', exact: true }).click();
  await expect(page.getByText('fulfilled', { exact: true }).first()).toBeVisible();
  expect((await (await page.request.get(`/api/products/${productId}`)).json()).data.quantity).toBe(
    1,
  );
  await draft(1);
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fulfill order', exact: true })).toBeVisible();
  await page.getByLabel('Cancellation reason').fill('Demo customer changed plans');
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await expect(page.getByText('cancelled', { exact: true }).first()).toBeVisible();
  expect((await (await page.request.get(`/api/products/${productId}`)).json()).data.quantity).toBe(
    1,
  );
  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'fulfilled', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/orders.png', fullPage: true });
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Notebook', exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export filtered CSV' }).click();
  expect((await downloaded).suggestedFilename()).toBe('inventory.csv');
  await page.screenshot({ path: 'docs/screenshots/reports.png', fullPage: true });
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Warehouse dashboard' })).toBeVisible();
  await expect(page.getByText('Demo delivery of five notebooks').first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  const video = page.video();
  await page.close();
  if (video) await copyFile(await video.path(), 'docs/demo/stockflow-workflow.webm');
});
test('staff permissions remain enforced through the API and protected navigation', async ({
  page,
}) => {
  await login(page, 'staff@stockflow.test');
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/users')).status()).toBe(403);
  expect(
    (
      await page.request.post('/api/inventory/adjust', {
        headers: { Origin: 'http://localhost:4200' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Warehouse dashboard' })).toBeVisible();
});
