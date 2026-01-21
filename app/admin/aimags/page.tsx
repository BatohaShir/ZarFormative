"use client";

import { useState } from "react";
import {
  useFindManyaimags,
  useCreateaimags,
  useUpdateaimags,
  useDeleteaimags,
} from "@/lib/hooks/aimags";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  MapPin,
  Check,
  ToggleLeft,
  ToggleRight,
  Building2,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AimagType } from "@prisma/client";

type Aimag = {
  id: string;
  name: string;
  name_en: string | null;
  code: string;
  type: AimagType;
  sort_order: number;
  is_active: boolean;
  _count?: {
    districts: number;
  };
};

type FormData = {
  name: string;
  name_en: string;
  code: string;
  type: AimagType;
  sort_order: number;
  is_active: boolean;
};

const initialFormData: FormData = {
  name: "",
  name_en: "",
  code: "",
  type: "aimag",
  sort_order: 0,
  is_active: true,
};

export default function AimagsPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAimag, setEditingAimag] = useState<Aimag | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch aimags with district count
  const { data: aimags, isLoading, refetch } = useFindManyaimags({
    orderBy: { sort_order: "asc" },
    include: {
      _count: {
        select: { districts: true },
      },
    },
  });

  // Mutations
  const createMutation = useCreateaimags();
  const updateMutation = useUpdateaimags();
  const deleteMutation = useDeleteaimags();

  // Filter by search
  const filteredAimags = aimags?.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name_en?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Open modal for create
  const openCreateModal = () => {
    setEditingAimag(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (aimag: Aimag) => {
    setEditingAimag(aimag);
    setFormData({
      name: aimag.name,
      name_en: aimag.name_en || "",
      code: aimag.code,
      type: aimag.type,
      sort_order: aimag.sort_order,
      is_active: aimag.is_active,
    });
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAimag(null);
    setFormData(initialFormData);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAimag) {
        await updateMutation.mutateAsync({
          where: { id: editingAimag.id },
          data: {
            name: formData.name,
            name_en: formData.name_en || null,
            code: formData.code,
            type: formData.type,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      } else {
        await createMutation.mutateAsync({
          data: {
            name: formData.name,
            name_en: formData.name_en || null,
            code: formData.code,
            type: formData.type,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      }
      closeModal();
      refetch();
    } catch (error) {
      console.error("Error saving aimag:", error);
    }
  };

  // Handle delete
  const handleDelete = async (aimag: Aimag) => {
    if (deleteConfirm !== aimag.id) {
      setDeleteConfirm(aimag.id);
      return;
    }

    try {
      await deleteMutation.mutateAsync({ where: { id: aimag.id } });
      setDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error("Error deleting aimag:", error);
    }
  };

  // Toggle active status
  const toggleActive = async (aimag: Aimag) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: aimag.id },
        data: { is_active: !aimag.is_active },
      });
      refetch();
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Аймаг / Нийслэл
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Монголын аймаг, нийслэлийн удирдлага
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Аймаг хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {aimags?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Нийт аймаг</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {aimags?.filter((a) => a.type === "capital").length || 0}
          </div>
          <div className="text-sm text-gray-500">Нийслэл</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">
            {aimags?.filter((a) => a.is_active).length || 0}
          </div>
          <div className="text-sm text-gray-500">Идэвхтэй</div>
        </div>
      </div>

      {/* Aimags list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredAimags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Map className="h-12 w-12 mb-4 text-gray-300" />
            <p>Аймаг олдсонгүй</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Эхний аймагаа нэмэх
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredAimags.map((aimag) => {
              const isDeleting = deleteConfirm === aimag.id;
              return (
                <div
                  key={aimag.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    !aimag.is_active && "opacity-60"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      aimag.type === "capital"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {aimag.type === "capital" ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <MapPin className="h-5 w-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {aimag.name}
                      </span>
                      {aimag.type === "capital" && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          Нийслэл
                        </span>
                      )}
                      {!aimag.is_active && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          нуусан
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-mono">{aimag.code}</span>
                      {aimag.name_en && (
                        <>
                          <span>•</span>
                          <span>{aimag.name_en}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Districts count */}
                  <div className="text-sm text-gray-500">
                    {aimag._count?.districts || 0} дүүрэг/сум
                  </div>

                  {/* Sort order */}
                  <span className="text-sm text-gray-400 w-12 text-center">
                    #{aimag.sort_order}
                  </span>

                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(aimag)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      aimag.is_active
                        ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={aimag.is_active ? "Нуух" : "Харуулах"}
                  >
                    {aimag.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(aimag)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"
                      title="Засах"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(aimag)}
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
                {editingAimag ? "Аймаг засах" : "Шинэ аймаг"}
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Нэр (Монгол) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  required
                  placeholder="Улаанбаатар"
                />
              </div>

              {/* Name EN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Нэр (Англи)
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) =>
                    setFormData({ ...formData, name_en: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="Ulaanbaatar"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Код *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white font-mono"
                  required
                  placeholder="UB"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Богино код (жишээ: UB, DU, OR)
                </p>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Төрөл
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as AimagType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                >
                  <option value="aimag">Аймаг</option>
                  <option value="capital">Нийслэл</option>
                </select>
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
                    Идэвхгүй аймаг хэрэглэгчдэд харагдахгүй
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
                  ) : editingAimag ? (
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
