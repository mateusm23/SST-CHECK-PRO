import { Settings, Hammer } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta e preferências</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-[#FFD100]/10 rounded-3xl flex items-center justify-center mb-5">
          <Hammer className="w-9 h-9 text-[#FFD100]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Em desenvolvimento</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Esta seção está sendo construída. Em breve você poderá gerenciar logo da empresa,
          dados da conta e preferências aqui.
        </p>
      </div>
    </div>
  );
}
