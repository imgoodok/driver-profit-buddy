import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Calculator, ArrowLeft, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription } from "@/hooks/use-subscription";

interface Calculation {
  id: string;
  date: string;
  total_earnings: number;
  km_driven: number;
  km_per_liter: number;
  fuel_price: number;
  fuel_liters: number;
  fuel_cost: number;
  net_profit: number;
}

const HistoryPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [filteredCalculations, setFilteredCalculations] = useState<Calculation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [countFilter, setCountFilter] = useState<'all' | '7' | '15' | '30' | '50'>('all');
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [editFormData, setEditFormData] = useState({
    total_earnings: "",
    km_driven: "",
    km_per_liter: "",
    fuel_price: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const { subscribed, subscription_tier } = useSubscription(user);

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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  useEffect(() => {
    applyCountFilter();
  }, [calculations, countFilter]);

  const fetchCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCountFilter = () => {
    if (countFilter === 'all') {
      setFilteredCalculations(calculations);
      return;
    }

    const count = parseInt(countFilter);
    const limited = calculations.slice(0, count);
    setFilteredCalculations(limited);
  };

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCalculations(prev => prev.filter(calc => calc.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      toast({
        title: "Sucesso",
        description: "Cálculo excluído com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cálculo",
        variant: "destructive",
      });
    }
  };

  const updateCalculation = async () => {
    if (!editingCalc) return;

    try {
      const totalEarnings = parseFloat(editFormData.total_earnings);
      const kmDriven = parseFloat(editFormData.km_driven);
      const kmPerLiter = parseFloat(editFormData.km_per_liter);
      const fuelPrice = parseFloat(editFormData.fuel_price);

      const fuelLiters = kmDriven / kmPerLiter;
      const fuelCost = fuelLiters * fuelPrice;
      const netProfit = totalEarnings - fuelCost;

      const { error } = await supabase
        .from('calculations')
        .update({
          total_earnings: totalEarnings,
          km_driven: kmDriven,
          km_per_liter: kmPerLiter,
          fuel_price: fuelPrice,
          fuel_liters: fuelLiters,
          fuel_cost: fuelCost,
          net_profit: netProfit,
        })
        .eq('id', editingCalc.id);

      if (error) throw error;

      await fetchCalculations();
      setEditingCalc(null);
      
      toast({
        title: "Sucesso",
        description: "Cálculo atualizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cálculo",
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCalculations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCalculations.map(calc => calc.id)));
    }
  };

  const getSelectedTotals = () => {
    if (selectedIds.size === 0) {
      return { totalEarnings: 0, fuelCost: 0, netProfit: 0, days: 0 };
    }
    const selectedCalcs = filteredCalculations.filter(calc => selectedIds.has(calc.id));
    return selectedCalcs.reduce(
      (acc, calc) => ({
        totalEarnings: acc.totalEarnings + calc.total_earnings,
        fuelCost: acc.fuelCost + calc.fuel_cost,
        netProfit: acc.netProfit + calc.net_profit,
        days: acc.days + 1,
      }),
      { totalEarnings: 0, fuelCost: 0, netProfit: 0, days: 0 }
    );
  };

  const openEditDialog = (calculation: Calculation) => {
    setEditingCalc(calculation);
    setEditFormData({
      total_earnings: calculation.total_earnings.toString(),
      km_driven: calculation.km_driven.toString(),
      km_per_liter: calculation.km_per_liter.toString(),
      fuel_price: calculation.fuel_price.toString(),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando histórico...</div>
      </div>
    );
  }

  const selectedTotals = getSelectedTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Histórico de Cálculos</h1>
          </div>
          <div className="flex gap-2">
            {user && !subscribed && (
              <Button variant="default" onClick={() => navigate('/subscription')}>
                <Crown className="w-4 h-4 mr-2" />
                Assinar PRO
              </Button>
            )}
            {user && subscribed && (
              <Button variant="outline" onClick={() => navigate('/subscription')}>
                <Crown className="w-4 h-4 mr-2" />
                {subscription_tier || 'PRO'}
              </Button>
            )}
            <Button onClick={() => navigate('/')}>
              <Calculator className="w-4 h-4 mr-2" />
              Nova Calculação
            </Button>
          </div>
        </div>

        {(
          <Card className="mb-6 border-2 border-dashed border-muted">
            <CardHeader>
              <CardTitle>Resumo {selectedIds.size > 0 ? `dos selecionados (${selectedTotals.days} cálculos)` : `(nenhum selecionado)`}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(selectedIds.size > 0 ? selectedTotals.totalEarnings : 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Combustível</p>
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(selectedIds.size > 0 ? selectedTotals.fuelCost : 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Lucro Líquido Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedIds.size > 0 ? selectedTotals.netProfit : 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico Completo</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredCalculations.length > 0 && selectedIds.size === filteredCalculations.length}
                    onCheckedChange={selectAll}
                  />
                  <Label>Selecionar todos ({filteredCalculations.length})</Label>
                </div>
                <Select value={countFilter} onValueChange={(value: 'all' | '7' | '15' | '30' | '50') => setCountFilter(value)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Últimos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCalculations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {calculations.length === 0 
                  ? "Nenhum cálculo encontrado. Faça sua primeira calculação!"
                  : "Nenhum cálculo encontrado para o período selecionado."
                }
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                  {filteredCalculations.map((calculation) => (
                    <Card key={calculation.id} className="relative">
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedIds.has(calculation.id)}
                          onCheckedChange={() => toggleSelection(calculation.id)}
                        />
                      </div>
                      <CardHeader className="pt-6 pb-2">
                        <CardTitle className="text-base">{formatDate(calculation.date)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Faturamento</span>
                          <span className="font-medium">{formatCurrency(calculation.total_earnings)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">KM</span>
                          <span className="font-medium">{calculation.km_driven} km</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Combustível</span>
                          <span className="font-medium">{formatCurrency(calculation.fuel_cost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lucro</span>
                          <span className={calculation.net_profit >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                            {formatCurrency(calculation.net_profit)}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openEditDialog(calculation)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Cálculo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-earnings">Faturamento do Dia (R$)</Label>
                                  <Input
                                    id="edit-earnings"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.total_earnings}
                                    onChange={(e) => setEditFormData(prev => ({
                                      ...prev,
                                      total_earnings: e.target.value
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-km">KM Rodados no Dia</Label>
                                  <Input
                                    id="edit-km"
                                    type="number"
                                    step="0.1"
                                    value={editFormData.km_driven}
                                    onChange={(e) => setEditFormData(prev => ({
                                      ...prev,
                                      km_driven: e.target.value
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-efficiency">KM por Litro do Carro</Label>
                                  <Input
                                    id="edit-efficiency"
                                    type="number"
                                    step="0.1"
                                    value={editFormData.km_per_liter}
                                    onChange={(e) => setEditFormData(prev => ({
                                      ...prev,
                                      km_per_liter: e.target.value
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-fuel-price">Preço do Combustível (R$)</Label>
                                  <Input
                                    id="edit-fuel-price"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.fuel_price}
                                    onChange={(e) => setEditFormData(prev => ({
                                      ...prev,
                                      fuel_price: e.target.value
                                    }))}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={updateCalculation} className="flex-1">
                                    Salvar Alterações
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setEditingCalc(null)}
                                    className="flex-1"
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => deleteCalculation(calculation.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoryPage;