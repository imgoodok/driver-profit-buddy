import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Car, DollarSign, Fuel, History, LogOut, User as UserIcon, Crown } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import PricingModal from "./PricingModal";
import { useSubscription } from "@/hooks/use-subscription";

const UberCalculator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [totalEarnings, setTotalEarnings] = useState<string>("");
  const [kmDriven, setKmDriven] = useState<string>("");
  const [kmPerLiter, setKmPerLiter] = useState<string>("");
  const [fuelPrice, setFuelPrice] = useState<string>("");
  const [results, setResults] = useState<{
    fuelLiters: number;
    fuelCost: number;
    netProfit: number;
  }>({
    fuelLiters: 0,
    fuelCost: 0,
    netProfit: 0
  });
  const [saving, setSaving] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const { subscribed, subscription_tier, loading: subLoading } = useSubscription(user);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Load usage count from localStorage
    const savedUsageCount = localStorage.getItem('uber-calculator-usage');
    if (savedUsageCount) {
      setUsageCount(parseInt(savedUsageCount, 10));
    }

    return () => subscription.unsubscribe();
  }, []);

  const calculateProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se o usuário tem acesso PRO
    if (user && !subscribed) {
      toast({
        title: "Acesso Restrito",
        description: "Você precisa de uma assinatura PRO para fazer cálculos ilimitados",
        variant: "destructive",
      });
      navigate('/subscription');
      return;
    }
    
    const earnings = parseFloat(totalEarnings);
    const km = parseFloat(kmDriven);
    const efficiency = parseFloat(kmPerLiter);
    const price = parseFloat(fuelPrice);

    if (isNaN(earnings) || isNaN(km) || isNaN(efficiency) || isNaN(price)) {
      toast({
        title: "Erro nos dados",
        description: "Por favor, preencha todos os campos com valores válidos",
        variant: "destructive",
      });
      return;
    }

    const fuelLiters = km / efficiency;
    const fuelCost = fuelLiters * price;
    const netProfit = earnings - fuelCost;

    const calculationResults = {
      fuelLiters: Number(fuelLiters.toFixed(2)),
      fuelCost: Number(fuelCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    };

    setResults(calculationResults);

    // Update usage count for non-logged users
    if (!user) {
      const newUsageCount = usageCount + 1;
      setUsageCount(newUsageCount);
      localStorage.setItem('uber-calculator-usage', newUsageCount.toString());
      
      // Show pricing modal after 3 uses
      if (newUsageCount >= 3) {
        setShowPricingModal(true);
      }
    }

    // Save to database only if user is logged in
    if (user) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('calculations')
          .insert({
            user_id: user.id,
            date: new Date().toLocaleDateString('en-CA'), // Today's date in YYYY-MM-DD format
            total_earnings: earnings,
            km_driven: km,
            km_per_liter: efficiency,
            fuel_price: price,
            fuel_liters: calculationResults.fuelLiters,
            fuel_cost: calculationResults.fuelCost,
            net_profit: calculationResults.netProfit,
          });

        if (error) throw error;

        toast({
          title: "Cálculo salvo!",
          description: "Seu cálculo foi salvo no histórico com sucesso",
        });
      } catch (error: any) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o cálculo no histórico",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    } else {
      toast({
        title: "Cálculo realizado!",
        description: "Faça login para salvar seus cálculos no histórico",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              Calculadora Uber
            </h1>
            <p className="text-muted-foreground text-lg">
              Calcule seus ganhos líquidos descontando combustível e custos
            </p>
          </div>
          <div className="flex gap-2">
            {user ? (
              <>
                {!subscribed && (
                  <Button variant="default" onClick={() => navigate('/subscription')}>
                    <Crown className="w-4 h-4 mr-2" />
                    Assinar PRO
                  </Button>
                )}
                {subscribed && (
                  <Button variant="outline" onClick={() => navigate('/subscription')}>
                    <Crown className="w-4 h-4 mr-2" />
                    {subscription_tier || 'PRO'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/history')}>
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => navigate('/auth')}>
                <UserIcon className="w-4 h-4 mr-2" />
                Entrar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Dados do Dia
              </CardTitle>
              <CardDescription>
                Preencha as informações do seu dia de trabalho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={calculateProfit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="totalEarnings" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor Total Faturado (R$)
                  </Label>
                  <Input
                    id="totalEarnings"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 250.00"
                    value={totalEarnings}
                    onChange={(e) => setTotalEarnings(e.target.value)}
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmDriven" className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Quilômetros Rodados
                  </Label>
                  <Input
                    id="kmDriven"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 180"
                    value={kmDriven}
                    onChange={(e) => setKmDriven(e.target.value)}
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmPerLiter" className="flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    KM por Litro do Carro
                  </Label>
                  <Input
                    id="kmPerLiter"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12.5"
                    value={kmPerLiter}
                    onChange={(e) => setKmPerLiter(e.target.value)}
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuelPrice" className="flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    Preço do Combustível (R$/L)
                  </Label>
                  <Input
                    id="fuelPrice"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.50"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    required
                    className="text-lg"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={saving}>
                  <Calculator className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Calcular Ganhos"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {(
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Relatório do Dia
                </CardTitle>
                <CardDescription>
                  Resumo dos seus ganhos e custos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-warning/10 rounded-lg p-4 text-center border border-warning/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Fuel className="w-5 h-5 text-warning" />
                      <span className="font-medium">Combustível Consumido</span>
                    </div>
                    <p className="text-2xl font-bold text-warning">
                      {results.fuelLiters} Litros
                    </p>
                  </div>

                  <div className="bg-destructive/10 rounded-lg p-4 text-center border border-destructive/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-destructive" />
                      <span className="font-medium">Gasto com Combustível</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(results.fuelCost)}
                    </p>
                  </div>

                  <div className={`rounded-lg p-4 text-center border ${
                    results.netProfit >= 0 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-destructive/10 border-destructive/20'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <DollarSign className={`w-5 h-5 ${results.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
                      <span className="font-medium">Lucro Líquido</span>
                    </div>
                    <p className={`text-3xl font-bold ${results.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(results.netProfit)}
                    </p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Resumo Detalhado
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Faturamento total:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(totalEarnings) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quilometragem:</span>
                      <span className="font-medium">{parseFloat(kmDriven) || 0} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eficiência do veículo:</span>
                      <span className="font-medium">{parseFloat(kmPerLiter) || 0} km/l</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preço do combustível:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(fuelPrice) || 0)}/l</span>
                    </div>
                    <div className="border-t pt-2 mt-3">
                      <div className="flex justify-between text-base font-semibold">
                        <span>Resultado final:</span>
                        <span className={results.netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                          {formatCurrency(results.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onSelectPlan={() => navigate('/auth')}
        />
      </div>
    </div>
  );
};

export default UberCalculator;