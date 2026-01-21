"use client";

import { useState } from "react";
import {
  useFindManykhoroos,
  useCreatekhoroos,
  useUpdatekhoroos,
  useDeletekhoroos,
} from "@/lib/hooks/khoroos";
import { useFindManyaimags } from "@/lib/hooks/aimags";
import { useFindManydistricts } from "@/lib/hooks/districts";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Home,
  Check,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Khoroo = {
  id: string;
  district_id: string;
  name: string;
  number: number | null;
  sort_order: number;
  is_active: boolean;
  district?: {
    id: string;
    name: string;
    aimag?: {
      id: string;
      name: string;
    };
  };
};

type FormData = {
  district_id: string;
  name: string;
  number: number | null;
  sort_order: number;
  is_active: boolean;
};

const initialFormData: FormData = {
  district_id: "",
  name: "",
  number: null,
  sort_order: 0,
  is_active: true,
};

export default function KhoroosPage() {
  const [search, setSearch] = useState("");
  const [filterAimagId, setFilterAimagId] = useState<string>("");
  const [filterDistrictId, setFilterDistrictId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKhoroo, setEditingKhoroo] = useState<Khoroo | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch aimags for dropdown
  const { data: aimags } = useFindManyaimags({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

  // Fetch districts for dropdown (filtered by aimag)
  const { data: districts } = useFindManydistricts({
    where: filterAimagId ? { aimag_id: filterAimagId, is_active: true } : { is_active: true },
    orderBy: { sort_order: "asc" },
    include: {
      aimag: {
        select: { id: true, name: true },
      },
    },
  });

  // All districts for modal (not filtered)
  const { data: allDistricts } = useFindManydistricts({
    where: { is_active: true },
    orderBy: [{ aimag: { sort_order: "asc" } }, { sort_order: "asc" }],
    include: {
      aimag: {
        select: { id: true, name: true },
      },
    },
  });

  // Fetch khoroos
  const { data: khoroos, isLoading, refetch } = useFindManykhoroos({
    where: filterDistrictId
      ? { district_id: filterDistrictId }
      : filterAimagId
      ? { district: { aimag_id: filterAimagId } }
      : undefined,
    orderBy: [
      { district: { aimag: { sort_order: "asc" } } },
      { district: { sort_order: "asc" } },
      { sort_order: "asc" },
    ],
    include: {
      district: {
        select: {
          id: true,
          name: true,
          aimag: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Mutations
  const createMutation = useCreatekhoroos();
  const updateMutation = useUpdatekhoroos();
  const deleteMutation = useDeletekhoroos();

  // Filter by search
  const filteredKhoroos = khoroos?.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.district?.name.toLowerCase().includes(search.toLowerCase()) ||
      k.district?.aimag?.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Open modal for create
  const openCreateModal = () => {
    setEditingKhoroo(null);
    setFormData({
      ...initialFormData,
      district_id: filterDistrictId || (allDistricts?.[0]?.id ?? ""),
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (khoroo: Khoroo) => {
    setEditingKhoroo(khoroo);
    setFormData({
      district_id: khoroo.district_id,
      name: khoroo.name,
      number: khoroo.number,
      sort_order: khoroo.sort_order,
      is_active: khoroo.is_active,
    });
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingKhoroo(null);
    setFormData(initialFormData);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingKhoroo) {
        await updateMutation.mutateAsync({
          where: { id: editingKhoroo.id },
          data: {
            district_id: formData.district_id,
            name: formData.name,
            number: formData.number,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      } else {
        await createMutation.mutateAsync({
          data: {
            district_id: formData.district_id,
            name: formData.name,
            number: formData.number,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      }
      closeModal();
      refetch();
    } catch (error) {
      console.error("Error saving khoroo:", error);
    }
  };

  // Handle delete
  const handleDelete = async (khoroo: Khoroo) => {
    if (deleteConfirm !== khoroo.id) {
      setDeleteConfirm(khoroo.id);
      return;
    }

    try {
      await deleteMutation.mutateAsync({ where: { id: khoroo.id } });
      setDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error("Error deleting khoroo:", error);
    }
  };

  // Toggle active status
  const toggleActive = async (khoroo: Khoroo) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: khoroo.id },
        data: { is_active: !khoroo.is_active },
      });
      refetch();
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  // Handle aimag filter change
  const handleAimagFilterChange = (aimagId: string) => {
    setFilterAimagId(aimagId);
    setFilterDistrictId(""); // Reset district filter when aimag changes
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Хороо / Баг
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Хороо, багийн удирдлага
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Нэмэх</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Хороо хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
        </div>

        {/* Aimag filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterAimagId}
            onChange={(e) => handleAimagFilterChange(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white appearance-none min-w-40"
          >
            <option value="">Бүх аймаг</option>
            {aimags?.map((aimag) => (
              <option key={aimag.id} value={aimag.id}>
                {aimag.name}
              </option>
            ))}
          </select>
        </div>

        {/* District filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterDistrictId}
            onChange={(e) => setFilterDistrictId(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white appearance-none min-w-44"
          >
            <option value="">Бүх дүүрэг</option>
            {districts?.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {khoroos?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Нийт хороо/баг</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {khoroos?.filter((k) => k.number).length || 0}
          </div>
          <div className="text-sm text-gray-500">Дугаартай</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">
            {khoroos?.filter((k) => k.is_active).length || 0}
          </div>
          <div className="text-sm text-gray-500">Идэвхтэй</div>
        </div>
      </div>

      {/* Khoroos list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredKhoroos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Home className="h-12 w-12 mb-4 text-gray-300" />
            <p>Хороо олдсонгүй</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Эхний хороогоо нэмэх
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredKhoroos.map((khoroo) => {
              const isDeleting = deleteConfirm === khoroo.id;
              return (
                <div
                  key={khoroo.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    !khoroo.is_active && "opacity-60"
                  )}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {khoroo.number ? (
                      <span className="font-bold">{khoroo.number}</span>
                    ) : (
                      <Home className="h-5 w-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {khoroo.name}
                      </span>
                      {!khoroo.is_active && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          нуусан
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{khoroo.district?.aimag?.name}</span>
                      <span>•</span>
                      <span>{khoroo.district?.name}</span>
                    </div>
                  </div>

                  {/* Sort order */}
                  <span className="text-sm text-gray-400 w-12 text-center">
                    #{khoroo.sort_order}
                  </span>

                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(khoroo)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      khoroo.is_active
                        ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={khoroo.is_active ? "Нуух" : "Харуулах"}
                  >
                    {khoroo.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(khoroo)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"
                      title="Засах"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(khoroo)}
                      onBlur={() => setTimeout(() => setDeleteConfirm(null), 200)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isDeleting
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600"
                      )}
                      title={isDeleting ? "Дахин дарж устгана уу" : "Устгах"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingKhoroo ? "Хороо засах" : "Шинэ хороо"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дүүрэг / Сум *
                </label>
                <select
                  value={formData.district_id}
                  onChange={(e) =>
                    setFormData({ ...formData, district_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  required
                >
                  <option value="">Дүүрэг сонгох</option>
                  {allDistricts?.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.aimag?.name} - {district.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Нэр *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  required
                  placeholder="1-р хороо"
                />
              </div>

              {/* Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дугаар
                </label>
                <input
                  type="number"
                  value={formData.number ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      number: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  min={1}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Хорооны дугаар (жишээ: 1, 2, 3)
                </p>
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Эрэмбэ
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Бага тоо эхэнд харагдана
                </p>
              </div>

              {/* Is active */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, is_active: !formData.is_active })
                  }
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    formData.is_active
                      ? "bg-green-600 border-green-600"
                      : "border-gray-300 dark:border-gray-600"
                  )}
                >
                  {formData.is_active && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Идэвхтэй
                  </label>
                  <p className="text-xs text-gray-500">
                    Идэвхгүй хороо хэрэглэгчдэд харагдахгүй
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : editingKhoroo ? (
                    "Хадгалах"
                  ) : (
                    "Үүсгэх"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
