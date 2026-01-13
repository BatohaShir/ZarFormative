"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react";
import { AutocompleteInput } from "./autocomplete-input";
import { COMPANIES_DB, POSITIONS_DB } from "./constants";
import { useWorkExperiences, type WorkExperience } from "@/hooks/use-work-experiences";
import { formatMonthYear } from "@/lib/utils";

interface NewWorkExperienceForm {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const emptyForm: NewWorkExperienceForm = {
  company: "",
  position: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export const WorkExperienceSection = React.memo(function WorkExperienceSection() {
  const {
    workExperiences,
    isLoading,
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    isCreating,
    isUpdating,
    isDeleting,
  } = useWorkExperiences();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<NewWorkExperienceForm>(emptyForm);

  const resetForm = React.useCallback(() => {
    setFormData(emptyForm);
  }, []);

  const handleAdd = React.useCallback(async () => {
    if (workExperiences.length >= 5) return;
    if (!formData.company || !formData.position || !formData.start_date) return;

    const { error } = await createWorkExperience({
      company: formData.company,
      position: formData.position,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      is_current: formData.is_current,
    });

    if (!error) {
      resetForm();
      setShowAddForm(false);
    }
  }, [workExperiences.length, formData, createWorkExperience, resetForm]);

  const handleEdit = React.useCallback((work: WorkExperience) => {
    setEditingId(work.id);
    setFormData({
      company: work.company,
      position: work.position,
      start_date: work.start_date ? new Date(work.start_date).toISOString().slice(0, 7) : "",
      end_date: work.end_date ? new Date(work.end_date).toISOString().slice(0, 7) : "",
      is_current: work.is_current,
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!editingId) return;
    if (!formData.company || !formData.position || !formData.start_date) return;

    const { error } = await updateWorkExperience(editingId, {
      company: formData.company,
      position: formData.position,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      is_current: formData.is_current,
    });

    if (!error) {
      setEditingId(null);
      resetForm();
    }
  }, [editingId, formData, updateWorkExperience, resetForm]);

  const handleCancel = React.useCallback(() => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  }, [resetForm]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      await deleteWorkExperience(id);
    },
    [deleteWorkExperience]
  );

  const updateField = React.useCallback(
    <K extends keyof NewWorkExperienceForm>(field: K, value: NewWorkExperienceForm[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const sortedWorkExperiences = React.useMemo(() => {
    return [...workExperiences].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [workExperiences]);

  const renderForm = (isEdit: boolean) => (
    <div className="p-3 border rounded-lg space-y-3 bg-muted/20">
      <AutocompleteInput
        placeholder="Байгууллагын нэр"
        value={formData.company}
        onChange={(value) => updateField("company", value)}
        suggestions={COMPANIES_DB}
        className="h-9 text-sm"
      />
      <AutocompleteInput
        placeholder="Албан тушаал"
        value={formData.position}
        onChange={(value) => updateField("position", value)}
        suggestions={POSITIONS_DB}
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
          <label className="text-xs text-muted-foreground mb-1 block">Дууссан</label>
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
        Одоо ажиллаж байгаа
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={isEdit ? handleSave : handleAdd}
          disabled={
            (isEdit ? isUpdating : isCreating) ||
            !formData.company ||
            !formData.position ||
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
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Ажлын туршлага</h4>
        </div>
        {workExperiences.length < 5 && !showAddForm && !editingId && (
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
      ) : sortedWorkExperiences.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Ажлын туршлага нэмээгүй байна
        </p>
      ) : (
        <div className="space-y-2">
          {sortedWorkExperiences.map((work) =>
            editingId === work.id ? (
              <React.Fragment key={work.id}>{renderForm(true)}</React.Fragment>
            ) : (
              <div
                key={work.id}
                className="p-3 bg-muted/30 rounded-lg group relative cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleEdit(work)}
              >
                <div className="pr-16">
                  <p className="font-medium text-sm">{work.position}</p>
                  <p className="text-xs text-muted-foreground">{work.company}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMonthYear(new Date(work.start_date).toISOString().slice(0, 7))} -{" "}
                    {work.is_current
                      ? "Одоог хүртэл"
                      : work.end_date
                        ? formatMonthYear(new Date(work.end_date).toISOString().slice(0, 7))
                        : ""}
                  </p>
                </div>
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(work);
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(work.id);
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

      {workExperiences.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {workExperiences.length}/5 ажлын туршлага
        </p>
      )}
    </div>
  );
});
