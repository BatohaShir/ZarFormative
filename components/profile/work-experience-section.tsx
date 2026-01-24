"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Briefcase, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useWorkExperiences, type WorkExperience } from "@/hooks/use-work-experiences";
import { COMPANIES_DB, POSITIONS_DB, formatWorkDate } from "@/lib/data/suggestions";

interface NewWorkExperienceForm {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const initialWorkForm: NewWorkExperienceForm = {
  company: "",
  position: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export function WorkExperienceSection() {
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
  const [formData, setFormData] = React.useState<NewWorkExperienceForm>(initialWorkForm);

  const sortedWorkExperiences = React.useMemo(() => {
    return [...workExperiences].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [workExperiences]);

  const resetForm = React.useCallback(() => {
    setFormData(initialWorkForm);
  }, []);

  const handleAdd = React.useCallback(async () => {
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
  }, [formData, createWorkExperience, resetForm]);

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

  const handleCancelEdit = React.useCallback(() => {
    setEditingId(null);
    resetForm();
  }, [resetForm]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      await deleteWorkExperience(id);
    },
    [deleteWorkExperience]
  );

  const renderForm = (isEditing: boolean = false) => (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
      {!isEditing && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Шинэ ажлын туршлага нэмэх</h4>
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
        placeholder="Байгууллагын нэр"
        value={formData.company}
        onChange={(value) => setFormData({ ...formData, company: value })}
        suggestions={COMPANIES_DB}
        className="h-10"
      />
      <AutocompleteInput
        placeholder="Албан тушаал"
        value={formData.position}
        onChange={(value) => setFormData({ ...formData, position: value })}
        suggestions={POSITIONS_DB}
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
          <label className="text-xs text-muted-foreground mb-1 block">Дууссан</label>
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
        <span className="text-sm">Одоо ажиллаж байгаа</span>
      </label>
      {isEditing ? (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={
              isUpdating || !formData.company || !formData.position || !formData.start_date
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
            isCreating || !formData.company || !formData.position || !formData.start_date
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
          <Briefcase className="h-5 w-5 text-primary" />
          Ажлын туршлага
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
              <div className="h-5 bg-muted rounded w-2/5 mb-2" />
              <div className="h-4 bg-muted rounded w-1/3 mb-1" />
              <div className="h-4 bg-muted rounded w-2/5 mt-2" />
            </div>
          ))}
        </div>
      ) : workExperiences.length === 0 && !showAddForm ? (
        <p className="text-muted-foreground text-center py-8">
          Ажлын туршлага нэмээгүй байна
        </p>
      ) : (
        <div className="grid gap-3">
          {sortedWorkExperiences.map((work) =>
            editingId === work.id ? (
              <div key={work.id}>{renderForm(true)}</div>
            ) : (
              <div
                key={work.id}
                className="p-4 bg-muted/30 rounded-lg group relative hover:bg-muted/50 transition-colors"
              >
                <div className="pr-20">
                  <p className="font-medium">{work.position}</p>
                  <p className="text-sm text-muted-foreground">{work.company}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatWorkDate(new Date(work.start_date).toISOString().slice(0, 7))} -{" "}
                    {work.is_current
                      ? "Одоог хүртэл"
                      : work.end_date
                        ? formatWorkDate(new Date(work.end_date).toISOString().slice(0, 7))
                        : ""}
                  </p>
                </div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(work)}
                    className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(work.id)}
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
}
