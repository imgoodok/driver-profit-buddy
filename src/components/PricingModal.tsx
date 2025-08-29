import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: () => void;
}

const PricingModal = ({ isOpen, onClose, onSelectPlan }: PricingModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  
  const monthlyPrice = 8.90;
  const annualPrice = 74.90;
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - annualPrice;
  const savingsPercentage = Math.round((savings / monthlyTotal) * 100);

  const features = [
    "Histórico ilimitado de cálculos",
    "Relatórios detalhados",
    "Análise de tendências",
    "Exportação de dados",
    "Suporte prioritário",
    "Sem anúncios"
  ];

  const handlePlanSelection = async (plan: 'monthly' | 'annual') => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      onSelectPlan(); // Redirect to auth page
      return;
    }

    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Desbloqueie Todo o Potencial!
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Você já usou a calculadora 3 vezes. Que tal salvar seus dados e ter acesso completo?
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Plano Mensal */}
          <Card className="relative border-2 border-border hover:border-primary/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Plano Mensal</CardTitle>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  R$ {monthlyPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-muted-foreground">por mês</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handlePlanSelection('monthly')}
                disabled={loading === 'monthly'}
              >
                {loading === 'monthly' ? 'Processando...' : 'Escolher Mensal'}
              </Button>
            </CardContent>
          </Card>

          {/* Plano Anual */}
          <Card className="relative border-2 border-primary shadow-[var(--shadow-elevated)]">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Star className="w-3 h-3" />
                Mais Popular
              </div>
            </div>
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Plano Anual</CardTitle>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  R$ {annualPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-muted-foreground">por ano</div>
                <div className="text-xs text-success font-semibold">
                  Economize R$ {savings.toFixed(2).replace('.', ',')} ({savingsPercentage}%)
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90" 
                onClick={() => handlePlanSelection('annual')}
                disabled={loading === 'annual'}
              >
                {loading === 'annual' ? 'Processando...' : 'Escolher Anual'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={onClose} className="text-sm">
            Continuar usando gratuitamente (sem salvamento)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;