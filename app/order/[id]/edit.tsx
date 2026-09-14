import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { emptyValues, FormValues, OrderForm, valuesFromOrder } from '../../../src/components/OrderForm';
import { useOrders } from '../../../src/hooks/useOrders';
import { OrderInput } from '../../../src/types';
import { notify } from '../../../src/utils/alert';

export default function EditOrderScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { getById, update } = useOrders();
  const [initial, setInitial] = useState<FormValues>(() => emptyValues());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getById(id).then((o) => {
      if (o) {
        setInitial(valuesFromOrder(o));
        setLoading(false);
      } else {
        notify('Encomenda não encontrada', 'Pode ter sido apagada.');
        router.back();
      }
    });
  }, [id, getById]);

  const handleSubmit = async (input: OrderInput) => {
    await update(id, input);
    router.back();
  };

  return <OrderForm title="Editar encomenda" initial={initial} loading={loading} showStatus saveLabel="Guardar alterações" onSubmit={handleSubmit} />;
}
