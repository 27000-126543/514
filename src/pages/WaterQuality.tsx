import { useState } from "react";
import { FeaturePage, StatusBadge, formatDate } from "./FeaturePage.js";
import { waterQualityApi } from "../lib/api.js";
import { ThermometerSun, Waves, Wind, Droplets, FlaskConical, AlertCircle } from "lucide-react";
import type { WaterQuality as WaterQualityType } from "../types.js";

export const WaterQuality = () => {
  const columns = [
    { key: "zoneName", label: "养殖区" },
    { key: "temperature", label: "水温", render: (row: WaterQualityType) => (
      <div className="flex items-center gap-1">
        <ThermometerSun className="w-4 h-4 text-green-400" />
        <span>{row.temperature.toFixed(1)}°C</span>
      </div>
    )},
    { key: "salinity", label: "盐度", render: (row: WaterQualityType) => (
      <div className="flex items-center gap-1">
        <Waves className="w-4 h-4 text-green-400" />
        <span>{row.salinity.toFixed(1)}‰</span>
      </div>
    )},
    { key: "dissolvedOxygen", label: "溶解氧", render: (row: WaterQualityType) => (
      <div className="flex items-center gap-1">
        <Wind className="w-4 h-4 text-green-400" />
        <span>{row.dissolvedOxygen.toFixed(1)} mg/L</span>
      </div>
    )},
    { key: "ph", label: "pH值", render: (row: WaterQualityType) => (
      <div className="flex items-center gap-1">
        <FlaskConical className="w-4 h-4 text-green-400" />
        <span>{row.ph.toFixed(2)}</span>
      </div>
    )},
    { key: "isNormal", label: "状态", render: (row: WaterQualityType) => (
      row.isNormal ? (
        <StatusBadge status="normal" />
      ) : (
        <span className="flex items-center gap-1 text-coral-400">
          <AlertCircle className="w-4 h-4" />
          异常
        </span>
      )
    )},
    { key: "recordedBy", label: "记录人" },
    { key: "recordedAt", label: "监测时间", render: (row: WaterQualityType) => formatDate(row.recordedAt) },
  ];

  return (
    <FeaturePage
      title="水质监测"
      description="上传水质监测数据，系统实时比对安全阈值，自动生成预警"
      addButtonText="上传数据"
      columns={columns}
      fetchData={() => waterQualityApi.getList()}
    />
  );
};
