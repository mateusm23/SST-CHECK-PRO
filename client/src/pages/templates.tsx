import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  LayoutTemplate,
  Edit3,
  Trash2,
  ChevronRight,
  FileText,
  Layers,
  AlertTriangle,
  X,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: number;
  name: string;
  description?: string;
  sectionCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/templates", {
        name: "Novo Template",
        description: "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setLocation(`/templates/${data.id}/edit`);
    },
    onError: () => {
      toast({ title: "Erro ao criar template", variant: "destructive" });
    },
  });

  const newInspectionFromTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const res = await apiRequest("POST", "/api/inspections", {
        title: "Nova Inspeção",
        checklistData: { templateId, responses: {} },
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      setLocation(`/inspection/${data.id}`);
    },
    onError: () => {
      toast({ title: "Erro ao criar inspeção", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setDeleteConfirm(null);
      toast({ title: "Template deletado" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar template", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Delete Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <button onClick={() => setDeleteConfirm(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Deletar template?</h2>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
                onClick={() => deleteMutation.mutate(deleteConfirm!)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deletando..." : "Deletar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Formulários personalizados de inspeção
            </p>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#FFD100]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate className="w-8 h-8 text-[#FFD100]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Nenhum template ainda
            </h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Crie formulários personalizados com seus próprios itens, pesos e seções.
            </p>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <Link href={`/templates/${template.id}/edit`}>
                  <div className="flex items-center gap-4 p-4 cursor-pointer">
                    <div className="w-12 h-12 bg-[#1a1d23] rounded-xl flex items-center justify-center flex-shrink-0">
                      <LayoutTemplate className="w-5 h-5 text-[#FFD100]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-gray-400 truncate">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Layers className="w-3 h-3" />
                          {template.sectionCount} {template.sectionCount === 1 ? "seção" : "seções"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FileText className="w-3 h-3" />
                          {template.itemCount} {template.itemCount === 1 ? "item" : "itens"}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </Link>

                {/* Actions bar */}
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold gap-1.5 text-xs"
                    onClick={() => newInspectionFromTemplateMutation.mutate(template.id)}
                    disabled={newInspectionFromTemplateMutation.isPending}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Nova Inspeção
                  </Button>
                  <div className="flex-1" />
                  <Link href={`/templates/${template.id}/edit`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-600 hover:text-[#1a1d23] gap-1.5 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
                    onClick={() => setDeleteConfirm(template.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Deletar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
