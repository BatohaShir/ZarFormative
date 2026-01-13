"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Plus, Pencil, Trash2 } from "lucide-react";
import { AutocompleteInput } from "./autocomplete-input";
import { SCHOOLS_DB, DEGREES_DB } from "./constants";
import { useEducations, type Education } from "@/hooks/use-educations";
import { formatMonthYear } from "@/lib/utils";

interface NewEducationForm {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const emptyForm: NewEducationForm = {
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
  const [formData, setFormData] = React.useState<NewEducationForm>(emptyForm);

  const resetForm = React.useCallback(() => {
    setFormData(emptyForm);
  }, []);

  const handleAdd = React.useCallback(async () => {
    if (educations.length >= 5) return;
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
  }, [educations.length, formData, createEducation, resetForm]);

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

  const handleCancel = React.useCallback(() => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  }, [resetForm]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      await deleteEducation(id);
    },
    [deleteEducation]
  );

  const updateField = React.useCallback(
    <K extends keyof NewEducationForm>(field: K, value: NewEducationForm[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const sortedEducations = React.useMemo(() => {
    return [...educations].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [educations]);

  const renderForm = (isEdit: boolean) => (
    <div className="p-3 border rounded-lg space-y-3 bg-muted/20">
      <AutocompleteInput
        placeholder="Сургуулийн нэр"
        value={formData.institution}
        onChange={(value) => updateField("institution", value)}
        suggestions={SCHOOLS_DB}
        className="h-9 text-sm"
      />
      <AutocompleteInput
        placeholder="Мэргэжил, зэрэг"
        value={formData.degree}
        onChange={(value) => updateField("degree", value)}
        suggestions={DEGREES_DB}
        className="h-9 text-sm"
      />
      <Input
        placeholder="Чиглэл/Мэргэжил (заавал биш)"
        value={formData.field_of_study}
        onChange={(e) => updateField("field_of_study", e.target.value)}
        className="h-9 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
          <Input
            type="month"
            value={formData.start_date}
            onChange={(e) => updateField("start_date", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Төгссөн</label>
          <Input
            type="month"
            value={formData.end_date}
            onChange={(e) => updateField("end_date", e.target.value)}
            disabled={formData.is_current}
            className="h-9 text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={formData.is_current}
          onChange={(e) => {
            updateField("is_current", e.target.checked);
            if (e.target.checked) updateField("end_date", "");
          }}
          className="rounded"
        />
        Одоо суралцаж байгаа
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={isEdit ? handleSave : handleAdd}
          disabled={
            (isEdit ? isUpdating : isCreating) ||
            !formData.institution ||
            !formData.degree ||
            !formData.start_date
          }
        >
          {(isEdit ? isUpdating : isCreating) ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCancel}>
          Болих
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Боловсрол</h4>
        </div>
        {educations.length < 5 && !showAddForm && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Нэмэх
          </Button>
        )}
      </div>

      {showAddForm && renderForm(false)}

      {isLoading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : sortedEducations.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Боловсролын мэдээлэл нэмээгүй байна
        </p>
      ) : (
        <div className="space-y-2">
          {sortedEducations.map((edu) =>
            editingId === edu.id ? (
              <React.Fragment key={edu.id}>{renderForm(true)}</React.Fragment>
            ) : (
              <div
                key={edu.id}
                className="p-3 bg-muted/30 rounded-lg group relative cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleEdit(edu)}
              >
                <div className="pr-16">
                  <p className="font-medium text-sm">{edu.degree}</p>
                  <p className="text-xs text-muted-foreground">{edu.institution}</p>
                  {edu.field_of_study && (
                    <p className="text-xs text-muted-foreground">{edu.field_of_study}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMonthYear(new Date(edu.start_date).toISOString().slice(0, 7))} -{" "}
                    {edu.is_current
                      ? "Одоог хүртэл"
                      : edu.end_date
                        ? formatMonthYear(new Date(edu.end_date).toISOString().slice(0, 7))
                        : ""}
                  </p>
                </div>
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(edu);
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(edu.id);
                    }}
                    disabled={isDeleting}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 transition-opacity disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {educations.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">{educations.length}/5 боловсрол</p>
      )}
    </div>
  );
});
