import { expect, test, vi } from 'vitest';

import { IMGatewayManager } from './imGatewayManager';

type TestManager = IMGatewayManager & {
  getOpenClawGatewayClient: () => { request: <T>(method: string, params?: unknown) => Promise<T> } | null;
  ensureOpenClawGatewayReady: () => Promise<void>;
  openClawConfigSchemaCache: { schema: Record<string, unknown>; uiHints: Record<string, Record<string, unknown>> } | null;
  openClawConfigSchemaFailureUntil: number;
};

const createManager = (): TestManager => {
  const manager = Object.create(IMGatewayManager.prototype) as TestManager;
  manager.openClawConfigSchemaCache = null;
  manager.openClawConfigSchemaFailureUntil = 0;
  return manager;
};

test('does not start OpenClaw gateway when reading schema by default', async () => {
  const manager = createManager();
  const ensureReady = vi.fn(async () => undefined);
  manager.ensureOpenClawGatewayReady = ensureReady;
  manager.getOpenClawGatewayClient = () => null;

  await expect(manager.getOpenClawConfigSchema()).resolves.toBeNull();
  expect(ensureReady).not.toHaveBeenCalled();
});

test('starts OpenClaw gateway only when schema read explicitly allows it', async () => {
  const schema = { schema: { type: 'object' }, uiHints: {} };
  const ensureReady = vi.fn(async () => undefined);
  let clientReady = false;
  const manager = createManager();
  manager.ensureOpenClawGatewayReady = async () => {
    await ensureReady();
    clientReady = true;
  };
  manager.getOpenClawGatewayClient = () => (
    clientReady
      ? {
        request: async <T>() => schema as T,
      }
      : null
  );

  await expect(manager.getOpenClawConfigSchema({ allowRuntimeStart: true })).resolves.toEqual(schema);
  expect(ensureReady).toHaveBeenCalledTimes(1);
  expect(manager.openClawConfigSchemaCache).toEqual(schema);
});
