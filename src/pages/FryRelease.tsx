import { useState } from "react";
import { FeaturePage, StatusBadge, formatDate } from "./FeaturePage.js";
import { fryReleaseApi } from "../lib/api.js";
import { Fish, Droplets, Thermometer, Wind, FileText } from "lucide-react";
import type { FryRelease as FryReleaseType } from "../types.js";

export const FryRelease = () => {
  const columns = [
    { key: "zoneName", label: "养殖区" },
    { key: "species", label: "鱼苗品种", render: (row: FryReleaseType) => (
      <div className="flex items-center gap-2">
        <Fish className="w-4 h-4 text-teal-400" />
        <span className="text-white font-medium">{row.species}</span>
      </div>
    )},
    { key: "quantity", label: "投放数量" },
    { key: "recommendedDensity", label: "投放密度" },
    { key: "operator", label: "操作人" },
    { key: "createdAt", label: "投放时间", render: (row: FryReleaseType) => formatDate(row.createdAt) },
  ];

  return (
    <FeaturePage
      title="鱼苗投放"
      description="在线投放鱼苗，系统自动推荐最佳投放密度和饲料配方"
      addButtonText="投放鱼苗"
      columns={columns}
      fetchData={() => fryReleaseApi.getList()}
      onView={(row: FryReleaseType) => {
        alert(`养殖档案:\n${row.feedFormula}`);
      }}
      extraActions={
        <button
          onClick={() => alert("智能推荐功能")}
          className="btn-secondary flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          智能推荐
        </button>
      }
    />
  );
};
