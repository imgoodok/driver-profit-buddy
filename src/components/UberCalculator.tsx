import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Car, DollarSign, Fuel, History, LogOut, User as UserIcon, Crown, Moon, Sun, Plus } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import PricingModal from "./PricingModal";
import { useSubscription } from "@/hooks/use-subscription";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/hooks/use-theme";

const UberCalculator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [totalEarnings, setTotalEarnings] = useState<string>("");
  const [kmDriven, setKmDriven] = useState<string>("");
  const [kmPerLiter, setKmPerLiter] = useState<string>("");
  const [fuelPrice, setFuelPrice] = useState<string>("");
  const [saveKmPerLiter, setSaveKmPerLiter] = useState<boolean>(false);
  const [saveFuelPrice, setSaveFuelPrice] = useState<boolean>(false);
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
  const [savingExpenses, setSavingExpenses] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  // Gastos adicionais state
  const [additionalExpenses, setAdditionalExpenses] = useState({
    maintenance: "",
    food: "",
    toll: "",
    parking: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const { subscribed, subscription_tier, loading: subLoading } = useSubscription(user);
  const { theme, toggleTheme } = useTheme();

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

  // Load user preferences when user changes
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    } else {
      // Clear preferences when no user
      setKmPerLiter("");
      setFuelPrice("");
      setSaveKmPerLiter(false);
      setSaveFuelPrice(false);
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('saved_km_per_liter, saved_fuel_price')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.saved_km_per_liter) {
        setKmPerLiter(data.saved_km_per_liter.toString());
        setSaveKmPerLiter(true);
      }

      if (data?.saved_fuel_price) {
        setFuelPrice(data.saved_fuel_price.toString());
        setSaveFuelPrice(true);
      }
    } catch (error) {
      console.log('Error loading preferences:', error);
    }
  };

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
            date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`,
            total_earnings: earnings,
            km_driven: km,
            km_per_liter: efficiency,
            fuel_price: price,
            fuel_liters: calculationResults.fuelLiters,
            fuel_cost: calculationResults.fuelCost,
            net_profit: calculationResults.netProfit,
            maintenance_cost: 0,
            food_cost: 0,
            toll_cost: 0,
            parking_cost: 0,
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

  const handleKmPerLiterSave = async (checked: boolean) => {
    setSaveKmPerLiter(checked);
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ saved_km_per_liter: checked && kmPerLiter ? parseFloat(kmPerLiter) : null })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.log('Error saving km per liter preference:', error);
      }
    }
  };

  const handleFuelPriceSave = async (checked: boolean) => {
    setSaveFuelPrice(checked);
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ saved_fuel_price: checked && fuelPrice ? parseFloat(fuelPrice) : null })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.log('Error saving fuel price preference:', error);
      }
    }
  };

  const handleKmPerLiterChange = async (value: string) => {
    setKmPerLiter(value);
    if (saveKmPerLiter && value && user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ saved_km_per_liter: parseFloat(value) })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.log('Error updating km per liter:', error);
      }
    }
  };

  const handleFuelPriceChange = async (value: string) => {
    setFuelPrice(value);
    if (saveFuelPrice && value && user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ saved_fuel_price: parseFloat(value) })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.log('Error updating fuel price:', error);
      }
    }
  };

  const saveAdditionalExpenses = async () => {
    if (!user) return;
    
    // Check if at least one additional expense has value > 0
    const hasAdditionalExpenses = Object.values(additionalExpenses).some(value => 
      value !== "" && parseFloat(value) > 0
    );
    
    if (!hasAdditionalExpenses) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um gasto adicional para salvar",
        variant: "destructive",
      });
      return;
    }
    
    const maintenance = additionalExpenses.maintenance ? parseFloat(additionalExpenses.maintenance) : 0;
    const food = additionalExpenses.food ? parseFloat(additionalExpenses.food) : 0;
    const toll = additionalExpenses.toll ? parseFloat(additionalExpenses.toll) : 0;
    const parking = additionalExpenses.parking ? parseFloat(additionalExpenses.parking) : 0;
    const totalCost = maintenance + food + toll + parking;
    
    setSavingExpenses(true);
    try {
      const { error } = await supabase
        .from('additional_expenses')
        .insert({
          user_id: user.id,
          date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`,
          maintenance_cost: maintenance,
          food_cost: food,
          toll_cost: toll,
          parking_cost: parking,
          total_cost: totalCost,
        });

      if (error) throw error;

      // Clear additional expenses after saving
      setAdditionalExpenses({
        maintenance: "",
        food: "",
        toll: "",
        parking: ""
      });

      toast({
        title: "Gastos salvos!",
        description: "Seus gastos adicionais foram salvos no histórico",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os gastos adicionais",
        variant: "destructive",
      });
    } finally {
      setSavingExpenses(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="mr-4">
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
          </div>
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

        {/* Relatório do Dia - Sempre visível horizontal no topo */}
        <Card className="shadow-[var(--shadow-elevated)] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Relatório do Dia
            </CardTitle>
            <CardDescription>
              Resumo dos seus ganhos e custos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-warning/10 rounded-lg p-4 text-center border border-warning/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Fuel className="w-5 h-5 text-warning" />
                  <span className="font-medium text-sm">Combustível Consumido</span>
                </div>
                <p className="text-xl font-bold text-warning">
                  {results.fuelLiters || 0} L
                </p>
              </div>

              <div className="bg-destructive/10 rounded-lg p-4 text-center border border-destructive/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-sm">Gasto Combustível</span>
                </div>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(results.fuelCost || 0)}
                </p>
              </div>

              <div className={`rounded-lg p-4 text-center border ${
                (results.netProfit || 0) >= 0 
                  ? 'bg-success/10 border-success/20' 
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className={`w-5 h-5 ${(results.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`} />
                  <span className="font-medium text-sm">Lucro Líquido</span>
                </div>
                <p className={`text-xl font-bold ${(results.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(results.netProfit || 0)}
                </p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Car className="w-4 h-4" />
                  Resumo
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Faturamento:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(totalEarnings) || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KM:</span>
                    <span className="font-medium">{parseFloat(kmDriven) || 0} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eficiência:</span>
                    <span className="font-medium">{parseFloat(kmPerLiter) || 0} km/l</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="kmPerLiter" className="flex items-center gap-2">
                      <Fuel className="w-4 h-4" />
                      KM por Litro do Carro
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="save-km-per-liter"
                        checked={saveKmPerLiter}
                        onCheckedChange={handleKmPerLiterSave}
                      />
                      <Label htmlFor="save-km-per-liter" className="text-sm text-muted-foreground">
                        Salvar
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="kmPerLiter"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12.5"
                    value={kmPerLiter}
                    onChange={(e) => handleKmPerLiterChange(e.target.value)}
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fuelPrice" className="flex items-center gap-2">
                      <Fuel className="w-4 h-4" />
                      Preço do Combustível (R$/L)
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="save-fuel-price"
                        checked={saveFuelPrice}
                        onCheckedChange={handleFuelPriceSave}
                      />
                      <Label htmlFor="save-fuel-price" className="text-sm text-muted-foreground">
                        Salvar
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="fuelPrice"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.50"
                    value={fuelPrice}
                    onChange={(e) => handleFuelPriceChange(e.target.value)}
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

          {user && (
            <Card className="shadow-[var(--shadow-card)] mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Gastos Adicionais
                </CardTitle>
                <CardDescription>
                  Adicione gastos extras do seu dia de trabalho
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance">Manutenção (R$)</Label>
                    <Input
                      id="maintenance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalExpenses.maintenance}
                      onChange={(e) => setAdditionalExpenses(prev => ({
                        ...prev,
                        maintenance: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="food">Alimentação (R$)</Label>
                    <Input
                      id="food"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalExpenses.food}
                      onChange={(e) => setAdditionalExpenses(prev => ({
                        ...prev,
                        food: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="toll">Pedágio (R$)</Label>
                    <Input
                      id="toll"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalExpenses.toll}
                      onChange={(e) => setAdditionalExpenses(prev => ({
                        ...prev,
                        toll: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parking">Estacionamento (R$)</Label>
                    <Input
                      id="parking"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalExpenses.parking}
                      onChange={(e) => setAdditionalExpenses(prev => ({
                        ...prev,
                        parking: e.target.value
                      }))}
                    />
                  </div>
                </div>
                
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong>Nota:</strong> Os gastos adicionais devem ter pelo menos um valor para serem salvos.
                  </p>
                  <Button 
                    onClick={saveAdditionalExpenses} 
                    className="w-full" 
                    size="lg" 
                    disabled={savingExpenses}
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {savingExpenses ? "Salvando..." : "Salvar Gastos Adicionais"}
                  </Button>
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