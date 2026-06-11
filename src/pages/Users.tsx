import { useState } from "react";
import { FeaturePage, StatusBadge, formatDate } from "./FeaturePage.js";
import { usersApi } from "../lib/api.js";
import { Users as UsersIcon, User, Shield, Phone, Mail, Edit, Trash2 } from "lucide-react";
import type { User as UserType, UserRole } from "../types.js";

const roleLabels: Record<UserRole, string> = {
  admin: "管理员",
  farmer: "养殖户",
  technician: "技术人员",
  finance: "财务",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  farmer: "bg-green-500/20 text-green-300 border-green-500/30",
  technician: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  finance: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export const Users = () => {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [keyword, setKeyword] = useState("");

  const columns = [
    { key: "name", label: "姓名", render: (row: UserType) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-medium">{row.name}</p>
          <p className="text-xs text-white/50">@{row.username}</p>
        </div>
      </div>
    )},
    { key: "role", label: "角色", render: (row: UserType) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[row.role]}`}>
        <Shield className="w-3 h-3" />
        {roleLabels[row.role]}
      </span>
    )},
    { key: "phone", label: "电话", render: (row: UserType) => (
      <div className="flex items-center gap-1 text-white/70">
        <Phone className="w-4 h-4" />
        {row.phone}
      </div>
    )},
    { key: "email", label: "邮箱", render: (row: UserType) => (
      <div className="flex items-center gap-1 text-white/70">
        <Mail className="w-4 h-4" />
        {row.email}
      </div>
    )},
    { key: "status", label: "状态", render: (row: UserType) => <StatusBadge status={row.status} /> },
    { key: "createdAt", label: "创建时间", render: (row: UserType) => formatDate(row.createdAt) },
  ];

  const fetchData = () => {
    const role = filterRole === "all" ? undefined : filterRole;
    const status = filterStatus === "all" ? undefined : filterStatus;
    return usersApi.getList(role, status, keyword);
  };

  const handleDelete = async (row: UserType) => {
    if (confirm(`确定要删除用户 ${row.name} 吗？`)) {
      await usersApi.delete(row.id);
    }
  };

  return (
    <FeaturePage
      title="用户管理"
      description="管理系统用户，分配角色权限"
      addButtonText="新增用户"
      columns={columns}
      fetchData={fetchData}
      onDelete={handleDelete}
      extraActions={
        <div className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名/用户名/电话"
            className="input-field w-48"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">全部角色</option>
            <option value="admin">管理员</option>
            <option value="farmer">养殖户</option>
            <option value="technician">技术人员</option>
            <option value="finance">财务</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="inactive">未激活</option>
          </select>
        </div>
      }
    />
  );
};
