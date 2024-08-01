export const tables = [
    {
      name: 'users',
      columns: ['id', 'name', 'email', 'age']
    },
    {
      name: 'orders',
      columns: ['order_id', 'user_id', 'product', 'amount']
    },
    {
      name: 'products',
      columns: ['product_id', 'product_name', 'price']
    }
  ];
  