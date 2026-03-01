import { describe, expect, it, vi } from 'vitest';

import { ProductSendService } from '../../../src/tools/communication/product-send.service';

describe('ProductSendService', () => {
  it('resolves internal DB ids to WhatsApp ids before sending', async () => {
    const backendClient = {
      getProductByAnyId: vi.fn().mockResolvedValue({
        id: 'cmm6aiemj003ys02rifs8isp2',
        name: 'Barcelone Domicile',
        retailer_id: 'barcelone-domicile',
        whatsapp_product_id: '25095720553426064',
      }),
    };

    const connectorClient = {
      executeScript: vi.fn().mockResolvedValue({ success: true }),
    };

    const scriptService = {
      getScript: vi.fn().mockReturnValue('// send-products script'),
    };

    const service = new ProductSendService(
      backendClient as any,
      connectorClient as any,
      scriptService as any,
    );

    const result = await service.sendProducts('64845667926032@lid', [
      'cmm6aiemj003ys02rifs8isp2',
    ]);

    expect(backendClient.getProductByAnyId).toHaveBeenCalledWith(
      'cmm6aiemj003ys02rifs8isp2',
    );
    expect(scriptService.getScript).toHaveBeenCalledWith('chat/sendProductsMessage', {
      TO: '64845667926032@lid',
      PRODUCT_IDS: '25095720553426064',
    });
    expect(connectorClient.executeScript).toHaveBeenCalledTimes(1);
    expect(result.resolvedProductIds).toEqual(['25095720553426064']);
    expect(result.resolution[0].source).toBe('backend_whatsapp_product_id');
  });

  it('keeps passthrough ids when backend has no mapping', async () => {
    const backendClient = {
      getProductByAnyId: vi.fn().mockResolvedValue(null),
    };

    const connectorClient = {
      executeScript: vi.fn().mockResolvedValue({ success: true }),
    };

    const scriptService = {
      getScript: vi.fn().mockReturnValue('// send-products script'),
    };

    const service = new ProductSendService(
      backendClient as any,
      connectorClient as any,
      scriptService as any,
    );

    const resolution = await service.resolveProductIdsForWhatsApp([
      '25095720553426064',
    ]);

    expect(resolution.resolvedIds).toEqual(['25095720553426064']);
    expect(resolution.mappings[0].source).toBe('passthrough');
  });
});

