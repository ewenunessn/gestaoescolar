import type { EscolaRota, OfflineEntregaBundle } from '../api/rotas';
import { cacheService } from './cacheService';
import { loadDeliveryOutboxOperations } from './deliveryOutbox';
import { mergeItemsWithOutbox } from './deliveryOutboxCore';
import { saveSchoolItemsSnapshot } from './deliveryProjectionStore';
import { saveRouteProjectionSnapshot } from './deliveryRouteProjectionStore';
import { setRemoteDeliverySyncCursor } from './deliveryRemoteChanges';

export async function applyDeliveryOfflineBundle(bundle: OfflineEntregaBundle): Promise<void> {
  await cacheService.set('rotas', bundle.rotas);
  const outboxOperations = await loadDeliveryOutboxOperations();

  for (const rota of bundle.rotas) {
    const escolas = bundle.escolasPorRota[String(rota.id)] || [];
    await cacheService.set(`escolas_rota_${rota.id}`, escolas);

    const projectionsBySchool = new Map();
    for (const escola of escolas) {
      const rawItems = bundle.itensPorEscola[String(escola.escola_id)] || [];
      const itemsWithOutbox = mergeItemsWithOutbox(rawItems, outboxOperations, {
        escolaId: escola.escola_id,
      });
      const projections = await saveSchoolItemsSnapshot(escola.escola_id, rawItems, itemsWithOutbox);
      projectionsBySchool.set(escola.escola_id, projections);
    }

    await saveRouteProjectionSnapshot(rota.id, escolas as EscolaRota[], projectionsBySchool);
  }

  if (bundle.serverTime) {
    await setRemoteDeliverySyncCursor(bundle.serverTime);
  }
}
