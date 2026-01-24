"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { GraduationCap, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useEducations, type Education } from "@/hooks/use-educations";
import { SCHOOLS_DB, DEGREES_DB, formatWorkDate } from "@/lib/data/suggestions";

interface NewEducationForm {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const initialEducationForm: NewEducationForm = {
  institution: "",
  degree: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export const EducationSection = React.memo(function EducationSection() {
  const {
    educations,
    isLoading,
    createEducation,
    updateEducation,
    deleteEducation,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEducations();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<NewEducationForm>(initialEducationForm);

  const sortedEducations = React.useMemo(() => {
    return [...educations].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [educations]);

  const resetForm = React.useCallback(() => {
    setFormData(initialEducationForm);
  }, []);

  const handleAdd = React.useCallback(async () => {
    if (!formData.institution || !formData.degree || !formData.start_date) return;

    const { error } = await createEducation({
      degree: formData.degree,
      institution: formData.institution,
      field_of_study: formData.field_of_study || undefined,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      is_current: formData.is_current,
    });

    if (!error) {
      resetForm();
      setShowAddForm(false);
    }
  }, [formData, createEducation, resetForm]);

  const handleEdit = React.useCallback((edu: Education) => {
    setEditingId(edu.id);
    setFormData({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field_of_study || "",
      start_date: edu.start_date ? new Date(edu.start_date).toISOString().slice(0, 7) : "",
      end_date: edu.end_date ? new Date(edu.end_date).toISOString().slice(0, 7) : "",
      is_current: edu.is_current,
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!editingId) return;
    if (!formData.institution || !formData.degree || !formData.start_date) return;

    const { error } = await updateEducation(editingId, {
      degree: formData.degree,
      institution: formData.institution,
      field_of_study: formData.field_of_study || undefined,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      is_current: formData.is_current,
    });

    if (!error) {
      setEditingId(null);
      resetForm();
    }
  }, [editingId, formData, updateEducation, resetForm]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingId(null);
    resetForm();
  }, [resetForm]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      await deleteEducation(id);
    },
    [deleteEducation]
  );

  const renderForm = (isEditing: boolean = false) => (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
      {!isEditing && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Шинэ боловсрол нэмэх</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setShowAddForm(false);
              resetForm();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <AutocompleteInput
        placeholder="Сургуулийн нэр"
        value={formData.institution}
        onChange={(value) => setFormData({ ...formData, institution: value })}
        suggestions={SCHOOLS_DB}
        className="h-10"
      />
      <AutocompleteInput
        placeholder="Мэргэжил, зэрэг"
        value={formData.degree}
        onChange={(value) => setFormData({ ...formData, degree: value })}
        suggestions={DEGREES_DB}
        className="h-10"
      />
      <Input
        placeholder="Чиглэл/Мэргэжил (заавал биш)"
        value={formData.field_of_study}
        onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
        className="h-10"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
          <Input
            type="month"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="h-10"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Төгссөн</label>
          <Input
            type="month"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            disabled={formData.is_current}
            className="h-10"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.is_current}
          onChange={(e) =>
            setFormData({ ...formData, is_current: e.target.checked, end_date: "" })
          }
          className="rounded"
        />
        <span className="text-sm">Одоо суралцаж байгаа</span>
      </label>
      {isEditing ? (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={
              isUpdating || !formData.institution || !formData.degree || !formData.start_date
            }
          >
            {isUpdating ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
          <Button variant="outline" onClick={handleCancelEdit}>
            Болих
          </Button>
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={handleAdd}
          disabled={
            isCreating || !formData.institution || !formData.degree || !formData.start_date
          }
        >
          {isCreating ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-xl border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Боловсрол
        </h3>
        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Нэмэх
          </Button>
        )}
      </div>

      {showAddForm && renderForm(false)}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2 mb-1" />
              <div className="h-4 bg-muted rounded w-2/5 mt-2" />
            </div>
          ))}
        </div>
      ) : educations.length === 0 && !showAddForm ? (
        <p className="text-muted-foreground text-center py-8">
          Боловсролын мэдээлэл нэмээгүй байна
        </p>
      ) : (
        <div className="grid gap-3">
          {sortedEducations.map((edu) =>
            editingId === edu.id ? (
              <div key={edu.id}>{renderForm(true)}</div>
            ) : (
              <div
                key={edu.id}
                className="p-4 bg-muted/30 rounded-lg group relative hover:bg-muted/50 transition-colors"
              >
                <div className="pr-20">
                  <p className="font-medium">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  {edu.field_of_study && (
                    <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatWorkDate(new Date(edu.start_date).toISOString().slice(0, 7))} -{" "}
                    {edu.is_current
                      ? "Одоог хүртэл"
                      : edu.end_date
                        ? formatWorkDate(new Date(edu.end_date).toISOString().slice(0, 7))
                        : ""}
                  </p>
                </div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(edu)}
                    className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
});
