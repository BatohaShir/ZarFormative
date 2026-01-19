"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  useFindManycategories,
  useCreatecategories,
  useUpdatecategories,
  useDeletecategories,
} from "@/lib/hooks/categories";
import {
  uploadCategoryIcon,
  uploadSubcategoryIcon,
  deleteCategoryIcon,
  deleteSubcategoryIcon,
} from "@/lib/storage/categories";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Loader2,
  Search,
  X,
  FolderTree,
  Check,
  Upload,
  ImageIcon,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
  parent?: Category | null;
};

type FormData = {
  slug: string;
  name: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

const initialFormData: FormData = {
  slug: "",
  name: "",
  icon: "",
  parent_id: null,
  sort_order: 0,
  is_active: true,
};

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories with parent info for subcategories
  const { data: categories, isLoading, refetch } = useFindManycategories({
    orderBy: { sort_order: "asc" },
    include: {
      children: {
        orderBy: { sort_order: "asc" },
      },
      parent: true,
    },
  });

  // Mutations
  const createMutation = useCreatecategories();
  const updateMutation = useUpdatecategories();
  const deleteMutation = useDeletecategories();

  // Filter root categories (no parent)
  const rootCategories = categories?.filter((c) => !c.parent_id) || [];

  // Filter by search (search in both root and children)
  const filteredCategories = search
    ? rootCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase()) ||
          c.children?.some(
            (child: Category) =>
              child.name.toLowerCase().includes(search.toLowerCase()) ||
              child.slug.toLowerCase().includes(search.toLowerCase())
          )
      )
    : rootCategories;

  // Toggle expand
  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Open modal for create
  const openCreateModal = (parentId: string | null = null) => {
    setEditingCategory(null);
    setFormData({ ...initialFormData, parent_id: parentId });
    setPreviewUrl(null);
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      slug: category.slug,
      name: category.name,
      icon: category.icon || "",
      parent_id: category.parent_id,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    // Set preview if there's an existing icon that's a URL
    if (category.icon && category.icon.startsWith("http")) {
      setPreviewUrl(category.icon);
    } else {
      setPreviewUrl(null);
    }
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(initialFormData);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        setUploadError("Поддерживаются только PNG, JPG, WebP, SVG и GIF");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Максимальный размер файла: 5MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      setUploadError(null);

      // If we have a slug, upload immediately
      if (formData.slug) {
        await uploadFile(file, formData.slug, formData.parent_id);
      }
    },
    [formData.slug, formData.parent_id]
  );

  // Upload file to storage
  const uploadFile = async (
    file: File,
    slug: string,
    parentId: string | null
  ) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      let result;

      if (parentId) {
        // Find parent category to get its slug
        const parentCategory = categories?.find((c) => c.id === parentId);
        if (!parentCategory) {
          throw new Error("Родительская категория не найдена");
        }
        result = await uploadSubcategoryIcon(parentCategory.slug, slug, file);
      } else {
        result = await uploadCategoryIcon(slug, file);
      }

      if (result.error) {
        setUploadError(result.error);
      } else if (result.url) {
        setFormData((prev) => ({ ...prev, icon: result.url! }));
        setPreviewUrl(result.url);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Ошибка загрузки"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle slug change - auto-upload if file is selected
  const handleSlugChange = async (newSlug: string) => {
    const formattedSlug = newSlug.toLowerCase().replace(/\s+/g, "-");
    setFormData((prev) => ({ ...prev, slug: formattedSlug }));

    // If we have a pending file and valid slug, upload it
    if (fileInputRef.current?.files?.[0] && formattedSlug) {
      await uploadFile(
        fileInputRef.current.files[0],
        formattedSlug,
        formData.parent_id
      );
    }
  };

  // Remove icon
  const handleRemoveIcon = async () => {
    if (!formData.icon) return;

    // If it's a URL (uploaded file), delete from storage
    if (formData.icon.startsWith("http") && formData.slug) {
      if (formData.parent_id) {
        const parentCategory = categories?.find(
          (c) => c.id === formData.parent_id
        );
        if (parentCategory) {
          await deleteSubcategoryIcon(parentCategory.slug, formData.slug);
        }
      } else {
        await deleteCategoryIcon(formData.slug);
      }
    }

    setFormData((prev) => ({ ...prev, icon: "" }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload pending file if exists
    if (fileInputRef.current?.files?.[0] && formData.slug && !formData.icon) {
      await uploadFile(
        fileInputRef.current.files[0],
        formData.slug,
        formData.parent_id
      );
    }

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          where: { id: editingCategory.id },
          data: {
            slug: formData.slug,
            name: formData.name,
            icon: formData.icon || null,
            parent_id: formData.parent_id,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      } else {
        await createMutation.mutateAsync({
          data: {
            slug: formData.slug,
            name: formData.name,
            icon: formData.icon || null,
            parent_id: formData.parent_id,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          },
        });
      }
      closeModal();
      refetch();
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  // Handle delete
  const handleDelete = async (category: Category) => {
    if (deleteConfirm !== category.id) {
      setDeleteConfirm(category.id);
      return;
    }

    try {
      // Delete icon from storage if exists
      if (category.icon?.startsWith("http")) {
        if (category.parent_id) {
          const parentCategory = categories?.find(
            (c) => c.id === category.parent_id
          );
          if (parentCategory) {
            await deleteSubcategoryIcon(parentCategory.slug, category.slug);
          }
        } else {
          await deleteCategoryIcon(category.slug);
        }
      }

      await deleteMutation.mutateAsync({ where: { id: category.id } });
      setDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Toggle active status directly
  const toggleActive = async (category: Category) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: category.id },
        data: { is_active: !category.is_active },
      });
      refetch();
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  // Render icon preview
  const renderIcon = (icon: string | null, size = "w-8 h-8") => {
    if (!icon) {
      return (
        <div
          className={cn(
            size,
            "rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          )}
        >
          <ImageIcon className="h-4 w-4 text-gray-400" />
        </div>
      );
    }

    // URL (uploaded image)
    if (icon.startsWith("http")) {
      return (
        <div
          className={cn(
            size,
            "rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden relative"
          )}
        >
          <Image
            src={icon}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }

    // Emoji or text
    return (
      <div
        className={cn(
          size,
          "rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg"
        )}
      >
        {icon}
      </div>
    );
  };

  // Render category row
  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isDeleting = deleteConfirm === category.id;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 transition-colors",
            level > 0 && "bg-gray-50/50 dark:bg-gray-800/30",
            !category.is_active && "opacity-60"
          )}
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {/* Expand button */}
          <button
            onClick={() => toggleExpand(category.id)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700",
              !hasChildren && "invisible"
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>

          {/* Icon */}
          {renderIcon(category.icon)}

          {/* Name & slug */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {category.name}
              </span>
              {!category.is_active && (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                  скрыт
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">{category.slug}</span>
          </div>

          {/* Sort order */}
          <span className="text-sm text-gray-400 w-12 text-center">
            #{category.sort_order}
          </span>

          {/* Toggle active */}
          <button
            onClick={() => toggleActive(category)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              category.is_active
                ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            title={category.is_active ? "Скрыть" : "Показать"}
          >
            {category.is_active ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {level === 0 && (
              <button
                onClick={() => openCreateModal(category.id)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Добавить подкатегорию"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => openEditModal(category)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"
              title="Редактировать"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(category)}
              onBlur={() => setTimeout(() => setDeleteConfirm(null), 200)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDeleting
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600"
              )}
              title={isDeleting ? "Нажмите ещё раз для подтверждения" : "Удалить"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) =>
              renderCategory(child as Category, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Категории
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Управление категориями услуг
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск категорий..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {rootCategories.length}
          </div>
          <div className="text-sm text-gray-500">Категорий</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {categories?.filter((c) => c.parent_id).length || 0}
          </div>
          <div className="text-sm text-gray-500">Подкатегорий</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">
            {categories?.filter((c) => c.is_active).length || 0}
          </div>
          <div className="text-sm text-gray-500">Активных</div>
        </div>
      </div>

      {/* Categories list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FolderTree className="h-12 w-12 mb-4 text-gray-300" />
            <p>Категории не найдены</p>
            <button
              onClick={() => openCreateModal()}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Создать первую категорию
            </button>
          </div>
        ) : (
          <div>
            {filteredCategories.map((cat) => renderCategory(cat as Category))}
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
                {editingCategory ? "Редактировать категорию" : "Новая категория"}
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
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Иконка категории
                </label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="relative">
                    {previewUrl ? (
                      <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : formData.icon && !formData.icon.startsWith("http") ? (
                      <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-4xl">
                        {formData.icon}
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {(previewUrl || formData.icon) && (
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>
                        {isUploading ? "Загрузка..." : "Загрузить изображение"}
                      </span>
                    </button>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WebP, SVG или GIF. Макс. 5MB
                    </p>
                    {uploadError && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Or emoji input */}
                    <div className="pt-2">
                      <label className="text-xs text-gray-500 mb-1 block">
                        Или введите emoji:
                      </label>
                      <input
                        type="text"
                        value={
                          formData.icon?.startsWith("http") ? "" : formData.icon
                        }
                        onChange={(e) => {
                          setFormData({ ...formData, icon: e.target.value });
                          setPreviewUrl(null);
                        }}
                        placeholder="🚗"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-center text-2xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  required
                  placeholder="Тээвэрлэлт, хүргэлт"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white font-mono"
                  required
                  pattern="[a-z0-9-]+"
                  title="Только латинские буквы, цифры и дефисы"
                  placeholder="transport"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Только латинские буквы, цифры и дефисы
                </p>
              </div>

              {/* Parent category */}
              {!editingCategory?.parent_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Родительская категория
                  </label>
                  <select
                    value={formData.parent_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parent_id: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  >
                    <option value="">Нет (корневая категория)</option>
                    {rootCategories
                      .filter((cat) => cat.id !== editingCategory?.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Порядок сортировки
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
                  Чем меньше число, тем выше в списке
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
                    Активная категория
                  </label>
                  <p className="text-xs text-gray-500">
                    Неактивные категории скрыты от пользователей
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
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    isUploading
                  }
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : editingCategory ? (
                    "Сохранить"
                  ) : (
                    "Создать"
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
