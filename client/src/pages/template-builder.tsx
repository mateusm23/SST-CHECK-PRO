import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Download,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type ResponseType = "conformity" | "boolean" | "text";
type RequiredMode = "always" | "if_nc" | "never";

interface TemplateItem {
  id: string; // client-side ID para drag
  text: string;
  responseType: ResponseType;
  weight: number;
  obsRequired: RequiredMode;
  photoRequired: RequiredMode;
}

interface TemplateSection {
  id: string; // client-side ID para drag
  name: string;
  items: TemplateItem[];
  collapsed: boolean;
}

interface NRChecklist {
  id: number;
  nrNumber: string;
  nrName: string;
  items: { id: string; text: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `tmp-${++_uid}-${Date.now()}`;

const RESPONSE_LABELS: Record<ResponseType, string> = {
  conformity: "Conf / NC / N/A",
  boolean: "Sim / Não",
  text: "Texto livre",
};

const REQUIRED_LABELS: Record<RequiredMode, string> = {
  always: "Sempre",
  if_nc: "Se NC",
  never: "Nunca",
};

// ── Sortable Item ──────────────────────────────────────────────────
function SortableItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: TemplateItem;
  onUpdate: (id: string, updates: Partial<TemplateItem>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-start bg-white border border-gray-100 rounded-lg p-3 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Texto do item */}
        <Input
          value={item.text}
          onChange={(e) => onUpdate(item.id, { text: e.target.value })}
          placeholder="Descrição do item..."
          className="text-sm border-gray-200 focus:border-[#FFD100] focus:ring-[#FFD100]/20"
        />

        {/* Configurações do item */}
        <div className="flex flex-wrap gap-2">
          {/* Tipo de resposta */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium uppercase">Resposta</span>
            <select
              value={item.responseType}
              onChange={(e) => onUpdate(item.id, { responseType: e.target.value as ResponseType })}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#FFD100]"
            >
              {(Object.entries(RESPONSE_LABELS) as [ResponseType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Peso */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium uppercase">Peso</span>
            <input
              type="number"
              min={1}
              max={10}
              value={item.weight}
              onChange={(e) => onUpdate(item.id, { weight: Math.max(1, Number(e.target.value)) })}
              className="w-14 text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 text-center focus:outline-none focus:border-[#FFD100]"
            />
          </div>

          {/* Obs obrigatória */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium uppercase">Obs</span>
            <select
              value={item.obsRequired}
              onChange={(e) => onUpdate(item.id, { obsRequired: e.target.value as RequiredMode })}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#FFD100]"
            >
              {(Object.entries(REQUIRED_LABELS) as [RequiredMode, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Foto obrigatória */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium uppercase">Foto</span>
            <select
              value={item.photoRequired}
              onChange={(e) => onUpdate(item.id, { photoRequired: e.target.value as RequiredMode })}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#FFD100]"
            >
              {(Object.entries(REQUIRED_LABELS) as [RequiredMode, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Deletar item */}
      <button
        onClick={() => onDelete(item.id)}
        className="mt-0.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Sortable Section ───────────────────────────────────────────────
function SortableSection({
  section,
  onUpdateName,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleCollapse,
  onReorderItems,
}: {
  section: TemplateSection;
  onUpdateName: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddItem: (sectionId: string) => void;
  onUpdateItem: (sectionId: string, itemId: string, updates: Partial<TemplateItem>) => void;
  onDeleteItem: (sectionId: string, itemId: string) => void;
  onToggleCollapse: (id: string) => void;
  onReorderItems: (sectionId: string, items: TemplateItem[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.items.findIndex((i) => i.id === active.id);
      const newIndex = section.items.findIndex((i) => i.id === over.id);
      onReorderItems(section.id, arrayMove(section.items, oldIndex, newIndex));
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1d23]">
        <button
          {...attributes}
          {...listeners}
          className="text-white/40 hover:text-white/70 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="w-1 h-5 bg-[#FFD100] rounded-full" />

        <Input
          value={section.name}
          onChange={(e) => onUpdateName(section.id, e.target.value)}
          placeholder="Nome da seção..."
          className="flex-1 bg-transparent border-0 border-b border-white/20 rounded-none text-white text-sm font-semibold placeholder:text-white/30 focus-visible:ring-0 focus:border-[#FFD100] px-0"
        />

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-white/40 text-xs">{section.items.length} itens</span>
          <button
            onClick={() => onToggleCollapse(section.id)}
            className="text-white/50 hover:text-white p-1"
          >
            {section.collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="text-white/30 hover:text-red-400 p-1 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {!section.collapsed && (
        <div className="p-3 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={section.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onUpdate={(itemId, updates) => onUpdateItem(section.id, itemId, updates)}
                  onDelete={(itemId) => onDeleteItem(section.id, itemId)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={() => onAddItem(section.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-[#FFD100] hover:text-[#1a1d23] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal importar NR ──────────────────────────────────────────────
function ImportNRModal({
  nrChecklists,
  onImport,
  onClose,
}: {
  nrChecklists: NRChecklist[];
  onImport: (nr: NRChecklist) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-[#1a1d23] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold">Importar de NR</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {nrChecklists.map((nr) => (
            <button
              key={nr.id}
              onClick={() => { onImport(nr); onClose(); }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#FFD100] hover:bg-[#FFD100]/5 text-left transition-all group"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{nr.nrNumber}</p>
                <p className="text-xs text-gray-500">{nr.nrName}</p>
              </div>
              <span className="text-xs text-gray-400 group-hover:text-[#1a1d23]">
                {nr.items.length} itens →
              </span>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 text-center">
            Os itens são copiados e podem ser editados livremente
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function TemplateBuilderPage() {
  const [, params] = useRoute("/templates/:id/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const templateId = params?.id ? Number(params.id) : null;

  const [name, setName] = useState("Novo Template");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [showImportNR, setShowImportNR] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: nrChecklists = [] } = useQuery<NRChecklist[]>({
    queryKey: ["/api/nr-checklists"],
  });

  const { isLoading: loadingTemplate } = useQuery({
    queryKey: ["/api/templates", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const res = await fetch(`/api/templates/${templateId}`, { credentials: "include" });
      return res.json();
    },
    onSuccess: (data: any) => {
      setName(data.name || "");
      setDescription(data.description || "");
      setSections(
        (data.sections || []).map((s: any) => ({
          id: uid(),
          name: s.name,
          collapsed: false,
          items: (s.items || []).map((item: any) => ({
            id: uid(),
            text: item.text,
            responseType: item.responseType || "conformity",
            weight: item.weight ?? 1,
            obsRequired: item.obsRequired || "if_nc",
            photoRequired: item.photoRequired || "never",
          })),
        }))
      );
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        sections: sections.map((s) => ({
          name: s.name,
          items: s.items.map((i) => ({
            text: i.text,
            responseType: i.responseType,
            weight: i.weight,
            obsRequired: i.obsRequired,
            photoRequired: i.photoRequired,
          })),
        })),
      };
      await apiRequest("PUT", `/api/templates/${templateId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsDirty(false);
      toast({ title: "Template salvo!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Section operations ──
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: uid(), name: "Nova Seção", items: [], collapsed: false },
    ]);
    markDirty();
  };

  const updateSectionName = (id: string, name: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    markDirty();
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    markDirty();
  };

  const toggleCollapse = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  // ── Item operations ──
  const addItem = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: [
                ...s.items,
                {
                  id: uid(),
                  text: "",
                  responseType: "conformity",
                  weight: 1,
                  obsRequired: "if_nc",
                  photoRequired: "never",
                },
              ],
            }
          : s
      )
    );
    markDirty();
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<TemplateItem>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
          : s
      )
    );
    markDirty();
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
      )
    );
    markDirty();
  };

  const reorderItems = (sectionId: string, items: TemplateItem[]) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, items } : s)));
    markDirty();
  };

  // ── Import NR ──
  const importNR = (nr: NRChecklist) => {
    const newSection: TemplateSection = {
      id: uid(),
      name: `${nr.nrNumber} — ${nr.nrName}`,
      collapsed: false,
      items: nr.items.map((item) => ({
        id: uid(),
        text: item.text,
        responseType: "conformity",
        weight: 1,
        obsRequired: "if_nc",
        photoRequired: "never",
      })),
    };
    setSections((prev) => [...prev, newSection]);
    markDirty();
    toast({ title: `${nr.nrNumber} importada`, description: `${nr.items.length} itens adicionados` });
  };

  // ── Section drag & drop ──
  const sectionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      setSections(arrayMove(sections, oldIndex, newIndex));
      markDirty();
    }
  };

  if (loadingTemplate) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFD100]" />
      </div>
    );
  }

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {showImportNR && (
        <ImportNRModal
          nrChecklists={nrChecklists}
          onImport={importNR}
          onClose={() => setShowImportNR(false)}
        />
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setLocation("/templates")}
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); markDirty(); }}
              placeholder="Nome do template..."
              className="text-base font-bold border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 hidden sm:block">
              {sections.length} seções · {totalItems} itens
            </span>
            {isDirty && (
              <span className="text-xs text-orange-500 font-medium">não salvo</span>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold gap-2"
              size="sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        {/* Descrição */}
        <div className="max-w-3xl mx-auto mt-1 pl-10">
          <Input
            value={description}
            onChange={(e) => { setDescription(e.target.value); markDirty(); }}
            placeholder="Descrição opcional..."
            className="text-sm text-gray-500 border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {/* Toolbar */}
        <div className="flex gap-2">
          <Button
            onClick={addSection}
            variant="outline"
            size="sm"
            className="gap-1.5 border-dashed border-gray-300 text-gray-600 hover:border-[#1a1d23] hover:text-[#1a1d23]"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova seção
          </Button>
          <Button
            onClick={() => setShowImportNR(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 border-dashed border-gray-300 text-gray-600 hover:border-[#FFD100] hover:text-[#1a1d23]"
          >
            <Download className="w-3.5 h-3.5" />
            Importar NR
          </Button>
        </div>

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="bg-white rounded-xl p-10 text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-sm mb-3">
              Nenhuma seção ainda. Crie uma seção ou importe uma NR para começar.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={addSection}
                size="sm"
                className="bg-[#1a1d23] text-white hover:bg-[#1a1d23]/90 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova seção
              </Button>
              <Button
                onClick={() => setShowImportNR(true)}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Importar NR
              </Button>
            </div>
          </div>
        )}

        {/* Sections com drag & drop */}
        <DndContext
          sensors={sectionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                onUpdateName={updateSectionName}
                onDelete={deleteSection}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onToggleCollapse={toggleCollapse}
                onReorderItems={reorderItems}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Legenda */}
        {totalItems > 0 && (
          <div className="bg-white/60 rounded-xl p-4 text-xs text-gray-400 space-y-1">
            <p><strong>Obs / Foto:</strong> <span className="text-gray-600">Sempre</span> = obrigatório em qualquer resposta · <span className="text-gray-600">Se NC</span> = obrigatório só quando não conforme · <span className="text-gray-600">Nunca</span> = opcional</p>
            <p><strong>Peso:</strong> Contribuição do item no score final (padrão = 1)</p>
          </div>
        )}
      </div>
    </div>
  );
}
