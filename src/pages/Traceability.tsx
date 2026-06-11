import { useState } from 'react';
import { FeaturePage, StatusBadge, formatDate, formatCurrency } from './FeaturePage.js';
import { traceabilityApi } from '../lib/api.js';
import { ShoppingCart, QrCode, Truck, Package, Search } from 'lucide-react';
import type { Order } from '../types.js';

export const Traceability = () => {
  const [searchCode, setSearchCode] = useState('');

  const columns = [
    { key: 'orderNo', label: '订单号' },
    { key: 'zoneName', label: '养殖区' },
    { key: 'species', label: '产品品种', render: (row: Order) => (
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-teal-400" />
        <span className="text-white font-medium">{row.species}</span>
      </div>
    )},
    { key: 'quantity', label: '数量', render: (row: Order) => `${row.quantity.toLocaleString()} kg` },
    { key: 'unitPrice', label: '单价', render: (row: Order) => formatCurrency(row.unitPrice) },
    { key: 'totalAmount', label: '总金额', render: (row: Order) => (
      <span className="text-green-400 font-medium">{formatCurrency(row.totalAmount)}</span>
    )},
    { key: 'customerName', label: '客户' },
    { key: 'traceCode', label: '溯源码', render: (row: Order) => (
      <span className="font-mono text-sm text-teal-300">{row.traceCode}</span>
    )},
    { key: 'status', label: '状态', render: (row: Order) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: '创建时间', render: (row: Order) => formatDate(row.createdAt) },
  ];

  const handleGenerateQR = async (row: Order) => {
    const res = await traceabilityApi.generateQRCode(row.traceCode);
    if (res.success && res.data) {
      const img = new Image();
      img.src = res.data;
      const w = window.open('');
      if (w) {
        w.document.write(`<img src="${res.data}" />`);
      }
    }
  };

  const handleTraceSearch = () => {
    if (searchCode) {
      alert(`查询溯源码: ${searchCode}`);
    }
  };

  return (
    <FeaturePage
      title="产品溯源"
      description="在线销售产品，自动生成溯源码，客户扫码查看养殖全过程"
      addButtonText="新增订单"
      columns={columns}
      fetchData={() => traceabilityApi.getOrders()}
      onView={handleGenerateQR}
      extraActions={
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="输入溯源码查询"
              className="input-field w-64"
            />
            <button onClick={handleTraceSearch} className="btn-secondary flex items-center gap-2">
              <Search className="w-4 h-4" />
              查询
            </button>
          </div>
        </div>
      }
    />
  );
};
