import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarMudancasEntregas, type ItemEntrega } from '../api/rotas';
import { cacheService } from './cacheService';
import { loadDeliveryOutboxOperations } from './deliveryOutbox';
import { mergeItemsWithOutbox } from './deliveryOutboxCore';
import { groupItemsBySchool, mergeChangedItemsIntoCachedItems, type ItemEntregaWithEscola } from './deliveryIncrementalSyncCore';
import { saveSchoolItemsSnapshot } from './deliveryProjectionStore';
import { upsertRouteSchoolProjectionSnapshot } from './deliveryRouteProjectionStore';

const DELIVERY_SYNC_CURSOR_KEY = 'delivery_sync_cursor';

type RemoteItemEntrega = ItemEntregaWithEscola & {
  rota_id?: number;
  escola_nome?: string;
  escola_endereco?: string;
};

export async function syncRemoteDeliveryChanges(): Promise<{ appliedItems: number; serverTime?: string }> {
  const since = await AsyncStorage.getItem(DELIVERY_SYNC_CURSOR_KEY);
  const changes = await listarMudancasEntregas(since || undefined);
  const changedItems = changes.itens.filter((item): item is RemoteItemEntrega => !!item.escola_id);

  if (changedItems.length === 0) {
    await AsyncStorage.setItem(DELIVERY_SYNC_CURSOR_KEY, changes.serverTime);
    return { appliedItems: 0, serverTime: changes.serverTime };
  }

  const outboxOperations = await loadDeliveryOutboxOperations();
  const itemsBySchool = groupItemsBySchool(changedItems);

  for (const [escolaId, schoolItems] of itemsBySchool.entries()) {
    const currentItems = (await cacheService.get<ItemEntrega[]>(`itens_escola_${escolaId}`)) || [];
    const mergedRawItems = mergeChangedItemsIntoCachedItems(currentItems, schoolItems);
    const mergedWithOutbox = mergeItemsWithOutbox(mergedRawItems, outboxOperations, { escolaId });
    const projections = await saveSchoolItemsSnapshot(escolaId, mergedRawItems, mergedWithOutbox);

    const routeId = schoolItems.find((item) => item.rota_id)?.rota_id;
    if (routeId) {
      await upsertRouteSchoolProjectionSnapshot(
        routeId,
        {
          escola_id: escolaId,
          escola_nome: schoolItems[0].escola_nome,
          escola_endereco: schoolItems[0].escola_endereco,
          ordem: undefined,
        },
        projections,
      );
    }
  }

  await AsyncStorage.setItem(DELIVERY_SYNC_CURSOR_KEY, changes.serverTime);
  return { appliedItems: changedItems.length, serverTime: changes.serverTime };
}

export async function setRemoteDeliverySyncCursor(serverTime: string): Promise<void> {
  await AsyncStorage.setItem(DELIVERY_SYNC_CURSOR_KEY, serverTime);
}
