import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { emptyValues, OrderForm, valuesFromOrder } from '../src/components/OrderForm';
import { useOrders } from '../src/hooks/useOrders';
import { OrderInput } from '../src/types';
import { parseDateParts } from '../src/utils/format';

export default function NewOrderScreen() {
  const params = useLocalSearchParams<{ date?: string; clientName?: string; clientPhone?: string; sourceChannel?: string; duplicate?: string }>();
  const { create, getById } = useOrders();
  const duplicateId = typeof params.duplicate === 'string' ? params.duplicate : '';

  const [initial, setInitial] = useState(() =>
    emptyValues({
      ...parseDateParts(typeof params.date === 'string' ? params.date : ''),
      clientName: params.clientName ?? '',
      clientPhone: params.clientPhone ?? '',
      sourceChannel: params.sourceChannel === 'Instagram' ? 'Instagram' : 'WhatsApp',
    }),
  );
  const [loading, setLoading] = useState(!!duplicateId);

  // Duplicar: copia tudo menos a data, a foto e o pagamento.
  useEffect(() => {
    if (!duplicateId) return;
    getById(duplicateId).then((o) => {
      if (o) setInitial(valuesFromOrder(o, true));
      setLoading(false);
    });
  }, [duplicateId, getById]);

  const handleSubmit = async (input: OrderInput) => {
    const id = await create({ ...input, status: 'Pendente' });
    router.replace(`/order/${id}`);
  };

  return (
    <OrderForm
      title={duplicateId ? 'Duplicar encomenda' : 'Nova encomenda'}
      initial={initial}
      loading={loading}
      saveLabel="Guardar encomenda"
      onSubmit={handleSubmit}
    />
  );
}
